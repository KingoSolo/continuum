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
// Mirrors prisma ObjectiveStatus. PROPOSED/APPROVED are pending (not started),
// ACTIVE/REVISED are in progress, ACHIEVED is complete, and
// DEPRIORITIZED/ABANDONED are closed without completion.
export type ObjectiveStatus =
  'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'ACHIEVED' | 'REVISED' | 'DEPRIORITIZED' | 'ABANDONED';

export interface Objective {
  id: string;
  title: string;
  status: ObjectiveStatus;
  progressSummary: string | null;
}

export interface MissionContext {
  selectedCapsuleIds: string[];
  context?: { version: number; summary?: string };
}
