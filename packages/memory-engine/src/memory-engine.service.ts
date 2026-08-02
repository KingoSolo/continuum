import {
  AssignmentStatus,
  CapsuleEntityType,
  DecisionStatus,
  HazardStatus,
  Importance,
  LessonStatus,
  ObjectiveStatus,
  ObservationStatus,
  SnapshotStatus,
  VaultEntryStatus,
  VaultStatus,
} from '@prisma/client';
import type { MemoryCapsule, Prisma, PrismaClient } from '@prisma/client';

import { failure, success, type Result } from './errors.js';
import type {
  AgentContext,
  ContextBuildOptions,
  MissionContextBuild,
  MissionSnapshotBuild,
  OperationalKnowledge,
  RecordMemoryCapsuleInput,
  RecordableCapsuleEntityType,
} from './types.js';

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const ACTIVE_HAZARD_STATUSES = [
  HazardStatus.IDENTIFIED,
  HazardStatus.ASSESSED,
  HazardStatus.MITIGATED,
  HazardStatus.ACCEPTED,
  HazardStatus.ESCALATED,
  HazardStatus.REALIZED,
] as const;

const UNRESOLVED_DECISION_STATUSES = [
  DecisionStatus.PROPOSED,
  DecisionStatus.UNDER_REVIEW,
  DecisionStatus.DECIDED,
] as const;

export class MemoryEngineService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // CockroachDB uses SERIALIZABLE isolation; concurrent transactions that touch
  // the same rows (e.g. the current Mission Context being rebuilt while a
  // snapshot reads it) surface as retryable 40001 errors (Prisma P2034). The
  // documented client contract is to retry them with backoff rather than fail.
  private static readonly RETRYABLE =
    /40001|P2034|restart transaction|write conflict|serializ|deadlock|RETRY_/i;
  private isRetryable(error: unknown): boolean {
    const code = (error as { code?: string })?.code ?? '';
    const message = (error as { message?: string })?.message ?? '';
    return code === 'P2034' || MemoryEngineService.RETRYABLE.test(`${code} ${message}`);
  }
  private async withSerializableRetry<T>(operation: () => Promise<T>, attempts = 5): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  // Context/snapshot builds for a single mission all mutate the same rows (the
  // mission's current MissionContext). Frontend polling + demo calls make these
  // overlap, and SERIALIZABLE then aborts one with a 40001 conflict. Retrying
  // only lowers the odds. Since the API runs as one process, we remove the
  // overlap at its source by serialising these builds per mission id — the DB
  // isolation guarantee is unchanged, it simply never has a conflict to abort.
  private readonly missionBuildLocks = new Map<string, Promise<unknown>>();
  private serializePerMission<T>(missionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.missionBuildLocks.get(missionId) ?? Promise.resolve();
    const result = previous.then(operation, operation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.missionBuildLocks.set(missionId, tail);
    void tail.then(() => {
      if (this.missionBuildLocks.get(missionId) === tail) this.missionBuildLocks.delete(missionId);
    });
    return result;
  }

  async recordMemoryCapsule(input: RecordMemoryCapsuleInput): Promise<Result<MemoryCapsule>> {
    if (input.confidence < 0 || input.confidence > 1) {
      return failure('PERSISTENCE_FAILURE', 'Capsule confidence must be between 0 and 1.');
    }

    try {
      const [mission, author, artifact] = await Promise.all([
        this.prisma.mission.findUnique({ where: { id: input.missionId }, select: { id: true } }),
        this.prisma.agent.findUnique({ where: { id: input.authorAgentId }, select: { id: true } }),
        this.findArtifactMissionId(
          this.prisma,
          input.referencedEntityType,
          input.referencedEntityId,
        ),
      ]);

      if (!mission) {
        return failure('MISSION_NOT_FOUND', 'Mission does not exist.', {
          missionId: input.missionId,
        });
      }
      if (!author) {
        return failure('ARTIFACT_NOT_FOUND', 'Author agent does not exist.', {
          agentId: input.authorAgentId,
        });
      }
      if (!artifact || artifact.missionId !== input.missionId) {
        return failure(
          'ARTIFACT_NOT_FOUND',
          'Referenced artifact does not belong to the mission.',
          {
            missionId: input.missionId,
            entityId: input.referencedEntityId,
            entityType: input.referencedEntityType,
          },
        );
      }

      const capsule = await this.prisma.memoryCapsule.create({ data: input });
      return success(capsule);
    } catch {
      return failure('PERSISTENCE_FAILURE', 'Unable to record the Memory Capsule.');
    }
  }

  async buildMissionContext(
    missionId: string,
    options: ContextBuildOptions = {},
  ): Promise<Result<MissionContextBuild>> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true },
    });
    if (!mission) {
      return failure('MISSION_NOT_FOUND', 'Mission does not exist.', { missionId });
    }

    try {
      return await this.serializePerMission(missionId, () =>
        this.withSerializableRetry(() =>
          this.prisma.$transaction(async (transaction) => {
            const [current, capsules] = await Promise.all([
              transaction.missionContext.findFirst({
                where: { missionId, isCurrent: true },
                orderBy: { version: 'desc' },
              }),
              this.selectContextCapsules(transaction, missionId, options),
            ]);
            const selectedCapsuleIds = capsules.map((capsule) => capsule.id);

            await transaction.missionContext.updateMany({
              where: { missionId, isCurrent: true },
              data: { isCurrent: false },
            });

            const context = await transaction.missionContext.create({
              data: {
                missionId,
                version: (current?.version ?? 0) + 1,
                summary: this.contextSummary(capsules.length),
                isCurrent: true,
                capsules: {
                  create: capsules.map((capsule, index) => ({
                    capsuleId: capsule.id,
                    relevanceRank: capsules.length - index,
                    inclusionReason: 'Curated by Memory Engine relevance policy.',
                  })),
                },
              },
            });

            return success({ context, selectedCapsuleIds });
          }),
        ),
      );
    } catch {
      return failure('PERSISTENCE_FAILURE', 'Unable to build the Mission Context.', { missionId });
    }
  }

  async generateMissionSnapshot(missionId: string): Promise<Result<MissionSnapshotBuild>> {
    try {
      return await this.serializePerMission(missionId, () =>
        this.withSerializableRetry(() =>
          this.prisma.$transaction(async (transaction) => {
            const context = await transaction.missionContext.findFirst({
              where: { missionId, isCurrent: true },
              orderBy: { version: 'desc' },
              include: { capsules: { orderBy: { relevanceRank: 'desc' } } },
            });
            if (!context) {
              return failure(
                'CONTEXT_NOT_FOUND',
                'A current Mission Context is required to create a snapshot.',
                {
                  missionId,
                },
              );
            }

            const latestSnapshot = await transaction.missionSnapshot.findFirst({
              where: { missionId },
              orderBy: { version: 'desc' },
              select: { version: true },
            });
            const occurredAt = this.now();
            const selectedCapsuleIds = context.capsules.map((entry) => entry.capsuleId);
            const snapshot = await transaction.missionSnapshot.create({
              data: {
                missionId,
                missionContextId: context.id,
                version: (latestSnapshot?.version ?? 0) + 1,
                trigger: 'Memory Engine curated continuity handoff',
                summary: context.summary,
                completenessNote: `Curated from ${selectedCapsuleIds.length} Memory Capsules.`,
                status: SnapshotStatus.PUBLISHED,
                generatedAt: occurredAt,
                publishedAt: occurredAt,
                capsules: {
                  create: selectedCapsuleIds.map((capsuleId, inclusionOrder) => ({
                    capsuleId,
                    inclusionOrder,
                  })),
                },
              },
            });

            return success({ snapshot, selectedCapsuleIds });
          }),
        ),
      );
    } catch {
      return failure('PERSISTENCE_FAILURE', 'Unable to generate the Mission Snapshot.', {
        missionId,
      });
    }
  }

  async retrieveMissionTimeline(missionId: string): Promise<Result<readonly MemoryCapsule[]>> {
    try {
      const capsules = await this.prisma.memoryCapsule.findMany({
        where: { missionId },
        orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
      });
      return success(capsules);
    } catch {
      return failure('PERSISTENCE_FAILURE', 'Unable to retrieve the Mission Timeline.', {
        missionId,
      });
    }
  }

  async retrieveContextForAgent(missionId: string, agentId: string): Promise<Result<AgentContext>> {
    try {
      const assignment = await this.prisma.missionAssignment.findFirst({
        where: {
          missionId,
          agentId,
          status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACTIVE] },
        },
        select: { id: true },
      });
      if (!assignment) {
        return failure('AGENT_NOT_ASSIGNED', 'Agent has no active assignment for the mission.', {
          missionId,
          agentId,
        });
      }

      const context = await this.prisma.missionContext.findFirst({
        where: { missionId, isCurrent: true },
        orderBy: { version: 'desc' },
        include: { capsules: { orderBy: { relevanceRank: 'desc' } } },
      });
      if (context) {
        return success({
          context,
          selectedCapsuleIds: context.capsules.map((entry) => entry.capsuleId),
        });
      }

      const built = await this.buildMissionContext(missionId);
      if (!built.ok) {
        return built;
      }
      return success(built.value);
    } catch {
      return failure('PERSISTENCE_FAILURE', 'Unable to retrieve inherited Mission Context.', {
        missionId,
        agentId,
      });
    }
  }

  async retrieveOperationalKnowledge(
    missionId: string,
  ): Promise<Result<readonly OperationalKnowledge[]>> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true },
    });
    if (!mission) {
      return failure('MISSION_NOT_FOUND', 'Mission does not exist.', { missionId });
    }

    try {
      const entries = await this.prisma.knowledgeVaultEntry.findMany({
        where: {
          status: VaultEntryStatus.ACTIVE,
          vault: { status: VaultStatus.ACTIVE },
          lesson: { status: { in: [LessonStatus.ADMITTED, LessonStatus.REAFFIRMED] } },
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              statement: true,
              applicability: true,
              limitations: true,
              importance: true,
              confidence: true,
            },
          },
        },
        orderBy: [{ lesson: { importance: 'asc' } }, { admittedAt: 'desc' }],
        take: 25,
      });
      return success(entries.map(({ lesson, ...entry }) => ({ entry, lesson })));
    } catch {
      return failure('PERSISTENCE_FAILURE', 'Unable to retrieve Operational Knowledge.', {
        missionId,
      });
    }
  }

  private async selectContextCapsules(
    prisma: PrismaExecutor,
    missionId: string,
    options: ContextBuildOptions,
  ) {
    const recentSince = new Date(
      this.now().getTime() - (options.recentObservationWindowDays ?? 7) * 24 * 60 * 60 * 1000,
    );
    const [hazards, objectives, decisions, observations] = await Promise.all([
      prisma.hazard.findMany({
        where: { missionId, status: { in: [...ACTIVE_HAZARD_STATUSES] } },
        select: { id: true },
      }),
      prisma.objective.findMany({
        where: { missionId, status: ObjectiveStatus.ACTIVE },
        select: { id: true },
      }),
      prisma.decision.findMany({
        where: { missionId, status: { in: [...UNRESOLVED_DECISION_STATUSES] } },
        select: { id: true },
      }),
      prisma.observation.findMany({
        where: {
          missionId,
          capturedAt: { gte: recentSince },
          status: {
            in: [
              ObservationStatus.CAPTURED,
              ObservationStatus.VALIDATED,
              ObservationStatus.DISPUTED,
            ],
          },
        },
        select: { id: true },
      }),
    ]);

    return prisma.memoryCapsule.findMany({
      where: {
        missionId,
        OR: [
          { importance: { in: [Importance.CRITICAL, Importance.HIGH] } },
          {
            referencedEntityType: CapsuleEntityType.HAZARD,
            referencedEntityId: { in: hazards.map(({ id }) => id) },
          },
          {
            referencedEntityType: CapsuleEntityType.OBJECTIVE,
            referencedEntityId: { in: objectives.map(({ id }) => id) },
          },
          {
            referencedEntityType: CapsuleEntityType.DECISION,
            referencedEntityId: { in: decisions.map(({ id }) => id) },
          },
          {
            referencedEntityType: CapsuleEntityType.OBSERVATION,
            referencedEntityId: { in: observations.map(({ id }) => id) },
          },
        ],
      },
      orderBy: [{ importance: 'asc' }, { occurredAt: 'desc' }],
      take: options.maxCapsules ?? 64,
    });
  }

  private async findArtifactMissionId(
    prisma: PrismaExecutor,
    entityType: RecordableCapsuleEntityType,
    id: string,
  ): Promise<{ missionId: string } | null> {
    const select = { missionId: true } as const;
    switch (entityType) {
      case CapsuleEntityType.OBSERVATION:
        return prisma.observation.findUnique({ where: { id }, select });
      case CapsuleEntityType.REASONING:
        return prisma.reasoning.findUnique({ where: { id }, select });
      case CapsuleEntityType.DECISION:
        return prisma.decision.findUnique({ where: { id }, select });
      case CapsuleEntityType.DEBATE:
        return prisma.debate.findUnique({ where: { id }, select });
      case CapsuleEntityType.HAZARD:
        return prisma.hazard.findUnique({ where: { id }, select });
      case CapsuleEntityType.LESSON:
        return prisma.lesson.findUnique({ where: { id }, select });
    }

    return null;
  }

  private contextSummary(capsuleCount: number): string {
    return `Curated operational intelligence from ${capsuleCount} Memory Capsules at ${this.now().toISOString()}.`;
  }
}
