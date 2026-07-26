import type {
  Decision,
  Debate,
  Hazard,
  Lesson,
  MissionApi,
  MissionContext,
  MissionSnapshot,
  Observation,
  Reasoning,
  RegisteredAgent,
  ReplacementAgent,
  TimelineCapsule,
} from './types.js';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** REST-only adapter. No simulator code has access to Prisma or database state. */
export class RestMissionApi implements MissionApi {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  registerAgent(missionId: string, body: Record<string, unknown>) {
    return this.request<RegisteredAgent>('POST', missionId, '/agents', body);
  }

  recordObservation(missionId: string, body: Record<string, unknown>) {
    return this.request<Observation>('POST', missionId, '/observations', body);
  }

  reportHazard(missionId: string, body: Record<string, unknown>) {
    return this.request<Hazard>('POST', missionId, '/hazards', body);
  }

  async resolveHazard(missionId: string, hazardId: string) {
    await this.request('PATCH', missionId, `/hazards/${hazardId}/resolve`);
  }

  createReasoning(missionId: string, body: Record<string, unknown>) {
    return this.request<Reasoning>('POST', missionId, '/reasoning', body);
  }

  startDebate(missionId: string, body: Record<string, unknown>) {
    return this.request<Debate>('POST', missionId, '/debates', body);
  }

  async resolveDebate(missionId: string, debateId: string, body: Record<string, unknown>) {
    await this.request('POST', missionId, `/debates/${debateId}/resolve`, body);
  }

  createDecision(missionId: string, body: Record<string, unknown>) {
    return this.request<Decision>('POST', missionId, '/decisions', body);
  }

  async executeDecision(missionId: string, decisionId: string) {
    await this.request('POST', missionId, `/decisions/${decisionId}/execute`);
  }

  async failAgent(missionId: string, agentId: string) {
    await this.request('POST', missionId, `/agents/${agentId}/fail`);
  }

  replaceAgent(missionId: string, agentId: string, body: Record<string, unknown>) {
    return this.request<ReplacementAgent>('POST', missionId, `/agents/${agentId}/replace`, body);
  }

  buildContext(missionId: string) {
    return this.request<MissionContext>('GET', missionId, '/context');
  }

  getAgentContext(missionId: string, agentId: string) {
    return this.request<MissionContext>('GET', missionId, `/agents/${agentId}/context`);
  }

  recordLesson(missionId: string, body: Record<string, unknown>) {
    return this.request<Lesson>('POST', missionId, '/lessons', body);
  }

  promoteLesson(missionId: string, lessonId: string) {
    return this.request('POST', missionId, `/lessons/${lessonId}/promote`);
  }

  generateSnapshot(missionId: string) {
    return this.request<MissionSnapshot>('POST', missionId, '/snapshots');
  }

  getTimeline(missionId: string) {
    return this.request<TimelineCapsule[]>('GET', missionId, '/timeline');
  }

  getKnowledge(missionId: string) {
    return this.request<unknown[]>('GET', missionId, '/knowledge');
  }

  private async request<T>(
    method: string,
    missionId: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}/missions/${missionId}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(
        `API ${method} ${path} failed (${response.status}): ${await response.text()}`,
      );
    }
    return (await response.json()) as T;
  }
}
