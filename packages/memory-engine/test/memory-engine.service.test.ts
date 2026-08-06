import {
  CapsuleEntityType,
  Importance,
  LessonStatus,
  SnapshotStatus,
  VaultEntryStatus,
  VaultStatus,
} from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { MemoryEngineService } from '../src/memory-engine.service.js';

const missionId = '00000000-0000-0000-0000-000000000001';
const agentId = '00000000-0000-0000-0000-000000000002';
const artifactId = '00000000-0000-0000-0000-000000000003';
const capsuleId = '00000000-0000-0000-0000-000000000004';
const contextId = '00000000-0000-0000-0000-000000000005';

function createPrismaMock() {
  const mock = {
    mission: { findUnique: vi.fn() },
    agent: { findUnique: vi.fn() },
    observation: { findUnique: vi.fn(), findMany: vi.fn() },
    reasoning: { findUnique: vi.fn() },
    decision: { findUnique: vi.fn(), findMany: vi.fn() },
    debate: { findUnique: vi.fn() },
    hazard: { findUnique: vi.fn(), findMany: vi.fn() },
    lesson: { findUnique: vi.fn() },
    objective: { findMany: vi.fn() },
    memoryCapsule: { create: vi.fn(), findMany: vi.fn() },
    missionContext: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    missionSnapshot: { findFirst: vi.fn(), create: vi.fn() },
    missionAssignment: { findFirst: vi.fn() },
    knowledgeVaultEntry: { findMany: vi.fn() },
    $executeRaw: vi.fn(async () => undefined), // For row-level locking
  };

  return { ...mock, $transaction: vi.fn(async (callback) => callback(mock)) };
}

describe('MemoryEngineService', () => {
  it('records a capsule after validating the mission, author, and source artifact', async () => {
    const prisma = createPrismaMock();
    prisma.mission.findUnique.mockResolvedValue({ id: missionId });
    prisma.agent.findUnique.mockResolvedValue({ id: agentId });
    prisma.observation.findUnique.mockResolvedValue({ missionId });
    prisma.memoryCapsule.create.mockResolvedValue({ id: capsuleId, missionId });
    const service = new MemoryEngineService(prisma as never);

    const result = await service.recordMemoryCapsule({
      missionId,
      referencedEntityType: CapsuleEntityType.OBSERVATION,
      referencedEntityId: artifactId,
      authorAgentId: agentId,
      occurredAt: new Date('2038-09-16T04:12:00.000Z'),
      importance: Importance.CRITICAL,
      confidence: 0.91,
    });

    expect(result).toEqual({ ok: true, value: { id: capsuleId, missionId } });
    expect(prisma.memoryCapsule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referencedEntityId: artifactId }),
      }),
    );
  });

  it('builds a curated context rather than selecting every capsule', async () => {
    const prisma = createPrismaMock();
    prisma.mission.findUnique.mockResolvedValue({ id: missionId });
    prisma.missionContext.findFirst.mockResolvedValue({ version: 2 });
    prisma.hazard.findMany.mockResolvedValue([{ id: 'hazard-1' }]);
    prisma.objective.findMany.mockResolvedValue([{ id: 'objective-1' }]);
    prisma.decision.findMany.mockResolvedValue([{ id: 'decision-1' }]);
    prisma.observation.findMany.mockResolvedValue([{ id: 'observation-1' }]);
    prisma.memoryCapsule.findMany.mockResolvedValue([
      { id: 'critical-capsule', importance: Importance.CRITICAL },
      { id: 'hazard-capsule', importance: Importance.HIGH },
    ]);
    prisma.missionContext.updateMany.mockResolvedValue({ count: 1 });
    prisma.missionContext.create.mockResolvedValue({ id: contextId, missionId, version: 3 });
    const service = new MemoryEngineService(
      prisma as never,
      () => new Date('2038-09-16T09:00:00.000Z'),
    );

    const result = await service.buildMissionContext(missionId, { maxCapsules: 12 });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        context: { id: contextId, missionId, version: 3 },
        selectedCapsuleIds: ['critical-capsule', 'hazard-capsule'],
        ruleBasedCapsuleCount: expect.any(Number),
        vectorAdditionalCapsuleCount: expect.any(Number),
      }),
    });
    // take is reduced to reserve slots for vector additions (maxCapsules - 5)
    expect(prisma.memoryCapsule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ missionId }), take: 7 }),
    );
    expect(prisma.missionContext.updateMany).toHaveBeenCalledWith({
      where: { missionId, isCurrent: true },
      data: { isCurrent: false },
    });
  });

  it('generates a published snapshot from the current context capsule selection', async () => {
    const prisma = createPrismaMock();
    prisma.missionContext.findFirst.mockResolvedValue({
      id: contextId,
      summary: 'Current operational intelligence.',
      capsules: [{ capsuleId: 'capsule-a' }, { capsuleId: 'capsule-b' }],
    });
    prisma.missionSnapshot.findFirst.mockResolvedValue({ version: 4 });
    prisma.missionSnapshot.create.mockResolvedValue({ id: 'snapshot-1', missionId, version: 5 });
    const service = new MemoryEngineService(
      prisma as never,
      () => new Date('2038-09-16T09:00:00.000Z'),
    );

    const result = await service.generateMissionSnapshot(missionId);

    expect(result).toEqual({
      ok: true,
      value: {
        snapshot: { id: 'snapshot-1', missionId, version: 5 },
        selectedCapsuleIds: ['capsule-a', 'capsule-b'],
      },
    });
    expect(prisma.missionSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SnapshotStatus.PUBLISHED, version: 5 }),
      }),
    );
  });

  it('returns the mission timeline in chronological capsule order', async () => {
    const prisma = createPrismaMock();
    const timeline = [{ id: 'first' }, { id: 'second' }];
    prisma.memoryCapsule.findMany.mockResolvedValue(timeline);
    const service = new MemoryEngineService(prisma as never);

    const result = await service.retrieveMissionTimeline(missionId);

    expect(result).toEqual({ ok: true, value: timeline });
    expect(prisma.memoryCapsule.findMany).toHaveBeenCalledWith({
      where: { missionId },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('retrieves active Operational Knowledge from the Knowledge Vault', async () => {
    const prisma = createPrismaMock();
    prisma.mission.findUnique.mockResolvedValue({ id: missionId });
    prisma.knowledgeVaultEntry.findMany.mockResolvedValue([
      {
        id: 'entry-1',
        status: VaultEntryStatus.ACTIVE,
        lesson: {
          id: 'lesson-1',
          title: 'Protect relay geometry',
          statement: 'Use alternate relay geometry during dust events.',
          applicability: 'Surface missions',
          limitations: null,
          importance: Importance.HIGH,
          confidence: 0.81,
        },
      },
    ]);
    const service = new MemoryEngineService(prisma as never);

    const result = await service.retrieveOperationalKnowledge(missionId);

    expect(result.ok).toBe(true);
    expect(prisma.knowledgeVaultEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: VaultEntryStatus.ACTIVE,
          vault: { status: VaultStatus.ACTIVE },
          lesson: { status: { in: [LessonStatus.ADMITTED, LessonStatus.REAFFIRMED] } },
        }),
      }),
    );
  });

  it('rejects inherited-context access for an agent without an active assignment', async () => {
    const prisma = createPrismaMock();
    prisma.missionAssignment.findFirst.mockResolvedValue(null);
    const service = new MemoryEngineService(prisma as never);

    const result = await service.retrieveContextForAgent(missionId, agentId);

    expect(result).toMatchObject({ ok: false, error: { code: 'AGENT_NOT_ASSIGNED' } });
  });
});
