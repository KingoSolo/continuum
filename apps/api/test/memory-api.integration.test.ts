import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CapsuleEntityType, Importance } from '@prisma/client';
import { MemoryEngineService } from '@continuum/memory-engine';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module.js';

const missionId = '00000000-0000-0000-0000-000000000001';
const agentId = '00000000-0000-4000-8000-000000000002';
const entityId = '00000000-0000-4000-8000-000000000003';

const memoryEngine = {
  recordMemoryCapsule: vi.fn(),
  buildMissionContext: vi.fn(),
  generateMissionSnapshot: vi.fn(),
  retrieveMissionTimeline: vi.fn(),
  retrieveContextForAgent: vi.fn(),
  retrieveOperationalKnowledge: vi.fn(),
};

describe('Memory API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MemoryEngineService)
      .useValue(memoryEngine)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /missions/:missionId/memory/capsules records a validated capsule', async () => {
    memoryEngine.recordMemoryCapsule.mockResolvedValue({ ok: true, value: { id: 'capsule-1' } });

    const response = await request(app.getHttpServer())
      .post(`/missions/${missionId}/memory/capsules`)
      .send({
        referencedEntityType: CapsuleEntityType.OBSERVATION,
        referencedEntityId: entityId,
        authorAgentId: agentId,
        occurredAt: '2038-09-16T04:12:00.000Z',
        importance: Importance.HIGH,
        confidence: 0.91,
      })
      .expect(201);

    expect(response.body).toEqual({ id: 'capsule-1' });
    expect(memoryEngine.recordMemoryCapsule).toHaveBeenCalledWith(
      expect.objectContaining({ missionId, occurredAt: expect.any(Date) }),
    );
  });

  it('rejects invalid capsule confidence before calling the engine', async () => {
    await request(app.getHttpServer())
      .post(`/missions/${missionId}/memory/capsules`)
      .send({
        referencedEntityType: CapsuleEntityType.OBSERVATION,
        referencedEntityId: entityId,
        authorAgentId: agentId,
        occurredAt: '2038-09-16T04:12:00.000Z',
        importance: Importance.HIGH,
        confidence: 1.1,
      })
      .expect(400);
  });

  it('GET /missions/:missionId/context builds curated Mission Context', async () => {
    memoryEngine.buildMissionContext.mockResolvedValue({
      ok: true,
      value: { context: { id: 'context-1' }, selectedCapsuleIds: ['capsule-1'] },
    });

    const response = await request(app.getHttpServer())
      .get(`/missions/${missionId}/context`)
      .expect(200);

    expect(response.body.selectedCapsuleIds).toEqual(['capsule-1']);
    expect(memoryEngine.buildMissionContext).toHaveBeenCalledWith(missionId);
  });

  it('POST /missions/:missionId/snapshots publishes a snapshot', async () => {
    memoryEngine.generateMissionSnapshot.mockResolvedValue({
      ok: true,
      value: { snapshot: { id: 'snapshot-1' }, selectedCapsuleIds: ['capsule-1'] },
    });

    await request(app.getHttpServer()).post(`/missions/${missionId}/snapshots`).expect(201);

    expect(memoryEngine.generateMissionSnapshot).toHaveBeenCalledWith(missionId);
  });

  it('GET /missions/:missionId/timeline returns chronological capsules', async () => {
    memoryEngine.retrieveMissionTimeline.mockResolvedValue({
      ok: true,
      value: [{ id: 'first' }, { id: 'second' }],
    });

    const response = await request(app.getHttpServer())
      .get(`/missions/${missionId}/timeline`)
      .expect(200);

    expect(response.body).toEqual([{ id: 'first' }, { id: 'second' }]);
  });

  it('GET /missions/:missionId/knowledge returns Operational Knowledge', async () => {
    memoryEngine.retrieveOperationalKnowledge.mockResolvedValue({
      ok: true,
      value: [{ lesson: { title: 'Protect relay geometry' } }],
    });

    const response = await request(app.getHttpServer())
      .get(`/missions/${missionId}/knowledge`)
      .expect(200);

    expect(response.body[0].lesson.title).toBe('Protect relay geometry');
  });

  it('GET /missions/:missionId/agents/:agentId/context returns inherited context', async () => {
    memoryEngine.retrieveContextForAgent.mockResolvedValue({
      ok: true,
      value: { context: { id: 'context-1' }, selectedCapsuleIds: ['capsule-1'] },
    });

    const response = await request(app.getHttpServer())
      .get(`/missions/${missionId}/agents/${agentId}/context`)
      .expect(200);

    expect(response.body.context.id).toBe('context-1');
    expect(memoryEngine.retrieveContextForAgent).toHaveBeenCalledWith(missionId, agentId);
  });
});
