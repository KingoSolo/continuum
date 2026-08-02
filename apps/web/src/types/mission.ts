export type Importance = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type AgentStatus = 'ACTIVE' | 'OFFLINE' | 'REPLACEMENT';
export interface TimelineItem {
  id: string;
  occurredAt: string;
  importance: Importance;
  type: string;
  agent: string;
  description: string;
}
export interface FleetAgent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  health: number;
  confidence: number;
  task: string;
  lastMemory: string;
}
export interface MissionContext {
  selectedCapsuleIds: string[];
  context?: { version: number; summary?: string };
}
