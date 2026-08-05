import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import {
  AgentStatus,
  AssignmentStatus,
  CapsuleEntityType,
  DebateStatus,
  DecisionStatus,
  HazardStatus,
  LessonStatus,
} from '@prisma/client';
import type { Importance } from '@prisma/client';
import type { MemoryEngineService, RecordableCapsuleEntityType } from '@continuum/memory-engine';

import type { PrismaService } from '../memory/memory.module.js';
import type {
  CreateDecisionDto,
  CreateReasoningDto,
  RecordLessonDto,
  RecordObservationDto,
  RegisterMissionAgentDto,
  ReportHazardDto,
  ReplaceMissionAgentDto,
  ResolveDebateDto,
  StartDebateDto,
  UpdateObjectiveDto,
} from './dto/mission-actions.dto.js';

@Injectable()
export class MissionDomainService {
  constructor(
    @Inject('PRISMA_SERVICE')
    private readonly prisma: PrismaService,
    @Inject('MEMORY_ENGINE')
    private readonly memoryEngine: MemoryEngineService,
  ) {}

  async recordObservation(missionId: string, dto: RecordObservationDto) {
    const observation = await this.prisma.observation.create({
      data: { ...dto, missionId, capturedAt: new Date(dto.capturedAt), status: 'CAPTURED' },
    });
    await this.recordCapsule(
      missionId,
      CapsuleEntityType.OBSERVATION,
      observation.id,
      dto.authorAgentId,
      dto.importance,
      dto.confidence,
      observation.capturedAt,
    );
    return observation;
  }

  async reportHazard(missionId: string, dto: ReportHazardDto) {
    // reporterAgentId is an authorship concept (the Memory Capsule author and
    // owner fallback), not a Hazard column — keep it out of the persisted row.
    const { reporterAgentId, ...hazardData } = dto;
    const hazard = await this.prisma.hazard.create({
      data: {
        ...hazardData,
        missionId,
        ownerAgentId: dto.ownerAgentId ?? reporterAgentId,
        status: HazardStatus.IDENTIFIED,
        identifiedAt: new Date(),
      },
    });
    await this.recordCapsule(
      missionId,
      CapsuleEntityType.HAZARD,
      hazard.id,
      reporterAgentId,
      dto.importance,
      1,
      hazard.identifiedAt,
    );
    return hazard;
  }

  async resolveHazard(missionId: string, hazardId: string) {
    await this.requireHazard(missionId, hazardId);
    return this.prisma.hazard.update({
      where: { id: hazardId },
      data: { status: HazardStatus.MITIGATED, closedAt: new Date() },
    });
  }

  async createReasoning(missionId: string, dto: CreateReasoningDto) {
    const reasoning = await this.prisma.reasoning.create({
      data: { ...dto, missionId, status: 'SUBMITTED' },
    });
    await this.recordCapsule(
      missionId,
      CapsuleEntityType.REASONING,
      reasoning.id,
      dto.authorAgentId,
      dto.importance,
      dto.confidence,
      reasoning.createdAt,
    );
    return reasoning;
  }

  async startDebate(missionId: string, dto: StartDebateDto) {
    const debate = await this.prisma.debate.create({
      data: {
        missionId,
        question: dto.question,
        admissibilityRules: dto.admissibilityRules,
        importance: dto.importance,
        status: DebateStatus.ACTIVE,
        positions: dto.positions ? { create: dto.positions } : undefined,
      },
    });
    await this.recordCapsule(
      missionId,
      CapsuleEntityType.DEBATE,
      debate.id,
      dto.convenedByAgentId,
      dto.importance,
      1,
      debate.convenedAt,
    );
    return debate;
  }

  async resolveDebate(missionId: string, debateId: string, dto: ResolveDebateDto) {
    await this.requireDebate(missionId, debateId);
    return this.prisma.debate.update({
      where: { id: debateId },
      data: { ...dto, status: DebateStatus.RESOLVED, resolvedAt: new Date() },
    });
  }

  async createDecision(missionId: string, dto: CreateDecisionDto) {
    const decision = await this.prisma.decision.create({
      data: {
        ...dto,
        missionId,
        decidedByAgentId: dto.decidedByAgentId,
        status: DecisionStatus.DECIDED,
        decidedAt: dto.decidedByAgentId ? new Date() : null,
      },
    });
    await this.recordCapsule(
      missionId,
      CapsuleEntityType.DECISION,
      decision.id,
      dto.proposedByAgentId,
      dto.importance,
      1,
      decision.proposedAt,
    );
    return decision;
  }

  async executeDecision(missionId: string, decisionId: string) {
    await this.requireDecision(missionId, decisionId);
    return this.prisma.decision.update({
      where: { id: decisionId },
      data: { status: DecisionStatus.EXECUTED, executedAt: new Date() },
    });
  }

  async recordLesson(missionId: string, dto: RecordLessonDto) {
    const lesson = await this.prisma.lesson.create({
      data: { ...dto, missionId, status: LessonStatus.CANDIDATE },
    });
    await this.recordCapsule(
      missionId,
      CapsuleEntityType.LESSON,
      lesson.id,
      dto.authorAgentId,
      dto.importance,
      dto.confidence,
      lesson.createdAt,
    );
    return lesson;
  }

  async promoteLesson(missionId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, missionId } });
    if (!lesson) throw new NotFoundException('Lesson not found for mission.');
    const vault = await this.prisma.knowledgeVault.findFirst({ where: { status: 'ACTIVE' } });
    if (!vault) throw new NotFoundException('No active Knowledge Vault is available.');
    const admitted = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { status: LessonStatus.ADMITTED, validatedAt: new Date() },
    });
    const entry = await this.prisma.knowledgeVaultEntry.upsert({
      where: { vaultId_lessonId: { vaultId: vault.id, lessonId } },
      create: { vaultId: vault.id, lessonId, stewardAgentId: lesson.authorAgentId },
      update: { status: 'ACTIVE', reviewAt: lesson.reviewAt },
    });
    return { lesson: admitted, entry };
  }

  async registerAgent(missionId: string, dto: RegisterMissionAgentDto) {
    // Registration is idempotent: the handle is a stable, globally-unique agent
    // identity, so re-registering the same handle converges to the desired
    // active state instead of throwing P2002. This keeps the endpoint retry-safe
    // against double-clicks, client retries, and React StrictMode double-invoke.
    const agent = await this.prisma.agent.upsert({
      where: { handle: dto.handle },
      create: {
        handle: dto.handle,
        displayName: dto.displayName,
        capabilities: dto.capabilities,
        status: AgentStatus.ACTIVE,
      },
      update: {
        displayName: dto.displayName,
        capabilities: dto.capabilities,
        status: AgentStatus.ACTIVE,
      },
    });
    // Reuse a live assignment for the same (mission, agent, role) rather than
    // stacking duplicates on repeated calls within a run.
    const existing = await this.prisma.missionAssignment.findFirst({
      where: {
        missionId,
        agentId: agent.id,
        role: dto.role,
        status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACTIVE] },
      },
    });
    const assignment = existing
      ? await this.prisma.missionAssignment.update({
          where: { id: existing.id },
          data: {
            authority: dto.authority,
            status: AssignmentStatus.ACTIVE,
            activatedAt: existing.activatedAt ?? new Date(),
          },
        })
      : await this.prisma.missionAssignment.create({
          data: {
            missionId,
            agentId: agent.id,
            role: dto.role,
            authority: dto.authority,
            status: AssignmentStatus.ACTIVE,
            activatedAt: new Date(),
          },
        });
    return { agent, assignment };
  }

  async failAgent(missionId: string, agentId: string) {
    const assignment = await this.requireAssignment(missionId, agentId);
    await this.prisma.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.SUSPENDED },
    });
    return this.prisma.missionAssignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.SUSPENDED },
    });
  }

  async replaceAgent(missionId: string, agentId: string, dto: ReplaceMissionAgentDto) {
    const prior = await this.requireAssignment(missionId, agentId);
    const replacement = await this.registerAgent(missionId, {
      ...dto,
      role: dto.role || prior.role,
      authority: dto.authority || prior.authority,
    });
    const inherited = await this.memoryEngine.retrieveContextForAgent(
      missionId,
      replacement.agent.id,
    );
    if (!inherited.ok) throw new ServiceUnavailableException(inherited.error.message);
    return { ...replacement, inheritedContext: inherited.value };
  }

  async listObjectives(missionId: string) {
    return this.prisma.objective.findMany({
      where: { missionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateObjective(missionId: string, objectiveId: string, dto: UpdateObjectiveDto) {
    const objective = await this.prisma.objective.findFirst({
      where: { id: objectiveId, missionId },
    });
    if (!objective) throw new NotFoundException('Objective not found for mission.');
    return this.prisma.objective.update({ where: { id: objectiveId }, data: dto });
  }

  private async recordCapsule(
    missionId: string,
    type: CapsuleEntityType,
    entityId: string,
    authorAgentId: string,
    importance: Importance,
    confidence: number,
    occurredAt: Date,
  ) {
    const result = await this.memoryEngine.recordMemoryCapsule({
      missionId,
      referencedEntityType: type as RecordableCapsuleEntityType,
      referencedEntityId: entityId,
      authorAgentId,
      importance,
      confidence,
      occurredAt,
    });
    if (!result.ok) throw new ServiceUnavailableException(result.error.message);
  }

  private async requireHazard(missionId: string, id: string) {
    const item = await this.prisma.hazard.findFirst({ where: { id, missionId } });
    if (!item) throw new NotFoundException('Hazard not found for mission.');
    return item;
  }
  private async requireDebate(missionId: string, id: string) {
    const item = await this.prisma.debate.findFirst({ where: { id, missionId } });
    if (!item) throw new NotFoundException('Debate not found for mission.');
    return item;
  }
  private async requireDecision(missionId: string, id: string) {
    const item = await this.prisma.decision.findFirst({ where: { id, missionId } });
    if (!item) throw new NotFoundException('Decision not found for mission.');
    return item;
  }
  private async requireAssignment(missionId: string, agentId: string) {
    const item = await this.prisma.missionAssignment.findFirst({
      where: {
        missionId,
        agentId,
        status: {
          in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACTIVE, AssignmentStatus.SUSPENDED],
        },
      },
    });
    if (!item) throw new NotFoundException('Agent assignment not found for mission.');
    return item;
  }
}
