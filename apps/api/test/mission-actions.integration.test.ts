import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Importance } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { MissionDomainService } from '../src/mission/mission-domain.service.js';

const missionId = '00000000-0000-4000-8000-000000000001';
const agentId = '00000000-0000-4000-8000-000000000002';
const entityId = '00000000-0000-4000-8000-000000000003';
const domain = {
  recordObservation: vi.fn(),
  reportHazard: vi.fn(),
  resolveHazard: vi.fn(),
  createReasoning: vi.fn(),
  startDebate: vi.fn(),
  resolveDebate: vi.fn(),
  createDecision: vi.fn(),
  executeDecision: vi.fn(),
  recordLesson: vi.fn(),
  promoteLesson: vi.fn(),
  registerAgent: vi.fn(),
  failAgent: vi.fn(),
  replaceAgent: vi.fn(),
  updateObjective: vi.fn(),
};

describe('Mission action API', () => {
  let app: INestApplication;
  beforeAll(async () => {
    Object.values(domain).forEach((method) => method.mockResolvedValue({ id: entityId }));
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MissionDomainService)
      .useValue(domain)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(`/missions/${missionId}${path}`).send(body).expect(201);
  const patch = (path: string, body = {}) =>
    request(app.getHttpServer()).patch(`/missions/${missionId}${path}`).send(body).expect(200);

  it('routes observation and hazard actions', async () => {
    await post('/observations', {
      authorAgentId: agentId,
      statement: 'Signal changed',
      scope: 'ops',
      sourceName: 'sensor',
      isDirectEvidence: true,
      importance: Importance.HIGH,
      confidence: 0.9,
      capturedAt: '2038-09-16T04:12:00.000Z',
    });
    await post('/hazards', {
      reporterAgentId: agentId,
      title: 'Dust',
      description: 'Dust storm',
      impact: 'Relay risk',
      importance: Importance.HIGH,
    });
    await patch(`/hazards/${entityId}/resolve`);
    expect(domain.recordObservation).toHaveBeenCalled();
    expect(domain.reportHazard).toHaveBeenCalled();
    expect(domain.resolveHazard).toHaveBeenCalled();
  });

  it('routes reasoning, debate, and decision actions', async () => {
    await post('/reasoning', {
      authorAgentId: agentId,
      claim: 'Reroute',
      conclusion: 'Use ridge',
      assumptions: 'Weather holds',
      importance: Importance.HIGH,
      confidence: 0.8,
    });
    await post('/debates', {
      convenedByAgentId: agentId,
      question: 'Reroute?',
      importance: Importance.HIGH,
    });
    await post(`/debates/${entityId}/resolve`, {
      resolutionSummary: 'Approved',
      resolutionAuthority: 'Mission lead',
    });
    await post('/decisions', {
      proposedByAgentId: agentId,
      title: 'Reroute',
      chosenOption: 'North',
      rationale: 'Relay',
      effectiveScope: 'Sol 2',
      importance: Importance.HIGH,
    });
    await post(`/decisions/${entityId}/execute`, {});
    expect(domain.createReasoning).toHaveBeenCalled();
    expect(domain.startDebate).toHaveBeenCalled();
    expect(domain.resolveDebate).toHaveBeenCalled();
    expect(domain.createDecision).toHaveBeenCalled();
    expect(domain.executeDecision).toHaveBeenCalled();
  });

  it('routes lesson and objective actions', async () => {
    await post('/lessons', {
      authorAgentId: agentId,
      title: 'Relay lesson',
      statement: 'Preserve geometry',
      applicability: 'Mars',
      importance: Importance.HIGH,
      confidence: 0.8,
    });
    await post(`/lessons/${entityId}/promote`, {});
    await patch(`/objectives/${entityId}`, { progressSummary: 'Complete', status: 'ACHIEVED' });
    expect(domain.recordLesson).toHaveBeenCalled();
    expect(domain.promoteLesson).toHaveBeenCalled();
    expect(domain.updateObjective).toHaveBeenCalled();
  });

  it('routes agent registration, failure, and replacement', async () => {
    const agent = {
      handle: 'nav-replacement',
      displayName: 'Navigation Replacement',
      role: 'Navigation',
      authority: 'PROPOSE',
      capabilities: ['navigation'],
    };
    await post('/agents', agent);
    await post(`/agents/${agentId}/fail`, {});
    await post(`/agents/${agentId}/replace`, agent);
    expect(domain.registerAgent).toHaveBeenCalled();
    expect(domain.failAgent).toHaveBeenCalled();
    expect(domain.replaceAgent).toHaveBeenCalled();
  });
});
