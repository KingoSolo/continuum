import { describe, expect, it } from 'vitest';

import type { MissionApi, MissionContext, ScenarioConfig, TimelineCapsule } from '../src/types.js';
import { Ares7LavaTubeScenario } from '../src/scenario.js';
import type { DemoLogger } from '../src/presentation-logger.js';

class RecordingApi implements MissionApi {
  readonly calls: string[] = [];
  private sequence = 0;
  private readonly timeline: TimelineCapsule[] = [];

  private next(kind: string) {
    this.sequence += 1;
    const id = `${kind}-${this.sequence}`;
    this.calls.push(kind);
    return { id };
  }

  async registerAgent(_missionId: string, body: Record<string, unknown>) {
    const agent = this.next('registerAgent');
    return {
      agent: { ...agent, handle: String(body.handle), displayName: String(body.displayName) },
    };
  }
  async recordObservation() {
    const item = this.next('observation');
    this.timeline.push({
      id: item.id,
      occurredAt: `2042-07-14T09:00:${this.sequence.toString().padStart(2, '0')}.000Z`,
    });
    return item;
  }
  async reportHazard() {
    return this.next('hazard');
  }
  async resolveHazard() {
    this.calls.push('resolveHazard');
  }
  async createReasoning() {
    return this.next('reasoning');
  }
  async startDebate() {
    return this.next('debate');
  }
  async resolveDebate() {
    this.calls.push('resolveDebate');
  }
  async createDecision() {
    return this.next('decision');
  }
  async executeDecision() {
    this.calls.push('executeDecision');
  }
  async failAgent() {
    this.calls.push('failAgent');
  }
  async replaceAgent() {
    const agent = this.next('replacement');
    return {
      agent: { ...agent, handle: 'replacement', displayName: 'Replacement Navigation Agent' },
      inheritedContext: this.context(),
    };
  }
  async buildContext() {
    this.calls.push('buildContext');
    return this.context();
  }
  async getAgentContext() {
    this.calls.push('getAgentContext');
    return this.context();
  }
  async recordLesson() {
    return this.next('lesson');
  }
  async promoteLesson() {
    this.calls.push('promoteLesson');
    return {};
  }
  async generateSnapshot() {
    this.calls.push('snapshot');
    return { snapshot: { id: 'snapshot-1', version: 1 }, selectedCapsuleIds: ['capsule-1'] };
  }
  async getTimeline() {
    this.calls.push('timeline');
    return [...this.timeline];
  }
  async getKnowledge() {
    this.calls.push('knowledge');
    return [{}];
  }

  private context(): MissionContext {
    return {
      context: { id: 'context-1', version: 2 },
      selectedCapsuleIds: ['capsule-1', 'capsule-2'],
    };
  }
}

class RecordingLogger implements DemoLogger {
  readonly entries: string[] = [];
  tick(value: number) {
    this.entries.push(`tick:${value}`);
  }
  event(actor: string, message: string) {
    this.entries.push(`${actor}:${message}`);
  }
  summary(values: Record<string, string | number | boolean>) {
    this.entries.push(`summary:${values['Replacement Agent Success']}`);
  }
}

const config: ScenarioConfig = {
  apiBaseUrl: 'http://localhost:3001',
  missionId: '00000000-0000-0000-0000-000000000007',
  runId: 'test-demo',
};

async function runScenario() {
  const api = new RecordingApi();
  const logger = new RecordingLogger();
  const summary = await new Ares7LavaTubeScenario(api, config, logger).run();
  return { api, logger, summary };
}

describe('ARES-7 lava-tube demo scenario', () => {
  it('recovers from navigation failure with inherited Mission Context', async () => {
    const { api, logger, summary } = await runScenario();

    expect(api.calls).toContain('failAgent');
    expect(api.calls).toContain('getAgentContext');
    expect(api.calls.indexOf('failAgent')).toBeLessThan(api.calls.indexOf('getAgentContext'));
    expect(logger.entries).toContain('Mission Control:Mission Resumed — no full replay required');
    expect(summary.replacementAgentSuccess).toBe(true);
  });

  it('records a complete replay timeline and produces a snapshot', async () => {
    const { api, summary } = await runScenario();

    const timeline = await api.getTimeline(config.missionId);
    expect(timeline).toHaveLength(6);
    expect([...timeline].map((item) => item.occurredAt)).toEqual(
      timeline.map((item) => item.occurredAt),
    );
    expect(summary.memoryCapsules).toBe(6);
    expect(summary.missionSnapshotCreated).toBe(true);
    expect(summary.operationalKnowledgeAdded).toBe(true);
  });

  it('executes the same deterministic action sequence for the same configuration', async () => {
    const first = await runScenario();
    const second = await runScenario();

    expect(first.api.calls).toEqual(second.api.calls);
    expect(first.logger.entries).toEqual(second.logger.entries);
    expect(first.summary).toEqual(second.summary);
  });
});
