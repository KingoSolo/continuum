export type Importance = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface Agent {
  id: string;
  handle: string;
  displayName: string;
}

export interface Observation {
  id: string;
}

export interface Hazard {
  id: string;
}

export interface Reasoning {
  id: string;
}

export interface Debate {
  id: string;
}

export interface Decision {
  id: string;
}

export interface Lesson {
  id: string;
}

export interface MissionContext {
  context: { id: string; version: number };
  selectedCapsuleIds: string[];
}

export interface MissionSnapshot {
  snapshot: { id: string; version: number };
  selectedCapsuleIds: string[];
}

export interface TimelineCapsule {
  id: string;
  occurredAt: string;
}

export interface RegisteredAgent {
  agent: Agent;
}

export interface ReplacementAgent extends RegisteredAgent {
  inheritedContext: MissionContext;
}

export interface MissionApi {
  registerAgent(missionId: string, body: Record<string, unknown>): Promise<RegisteredAgent>;
  recordObservation(missionId: string, body: Record<string, unknown>): Promise<Observation>;
  reportHazard(missionId: string, body: Record<string, unknown>): Promise<Hazard>;
  resolveHazard(missionId: string, hazardId: string): Promise<void>;
  createReasoning(missionId: string, body: Record<string, unknown>): Promise<Reasoning>;
  startDebate(missionId: string, body: Record<string, unknown>): Promise<Debate>;
  resolveDebate(missionId: string, debateId: string, body: Record<string, unknown>): Promise<void>;
  createDecision(missionId: string, body: Record<string, unknown>): Promise<Decision>;
  executeDecision(missionId: string, decisionId: string): Promise<void>;
  failAgent(missionId: string, agentId: string): Promise<void>;
  replaceAgent(
    missionId: string,
    agentId: string,
    body: Record<string, unknown>,
  ): Promise<ReplacementAgent>;
  buildContext(missionId: string): Promise<MissionContext>;
  getAgentContext(missionId: string, agentId: string): Promise<MissionContext>;
  recordLesson(missionId: string, body: Record<string, unknown>): Promise<Lesson>;
  promoteLesson(missionId: string, lessonId: string): Promise<unknown>;
  generateSnapshot(missionId: string): Promise<MissionSnapshot>;
  getTimeline(missionId: string): Promise<TimelineCapsule[]>;
  getKnowledge(missionId: string): Promise<unknown[]>;
}

export interface ScenarioConfig {
  apiBaseUrl: string;
  missionId: string;
  runId: string;
}

export interface ScenarioSummary {
  missionDuration: string;
  observations: number;
  hazards: number;
  debates: number;
  decisions: number;
  lessons: number;
  memoryCapsules: number;
  missionSnapshotCreated: boolean;
  operationalKnowledgeAdded: boolean;
  replacementAgentSuccess: boolean;
}
