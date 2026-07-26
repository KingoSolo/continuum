import type {
  Importance,
  KnowledgeVaultEntry,
  MemoryCapsule,
  MissionContext,
  MissionSnapshot,
} from '@prisma/client';

export type RecordableCapsuleEntityType =
  'OBSERVATION' | 'REASONING' | 'DECISION' | 'DEBATE' | 'HAZARD' | 'LESSON';

export interface RecordMemoryCapsuleInput {
  missionId: string;
  referencedEntityType: RecordableCapsuleEntityType;
  referencedEntityId: string;
  authorAgentId: string;
  occurredAt: Date;
  importance: Importance;
  confidence: number;
  embeddingReference?: string;
}

export interface ContextBuildOptions {
  maxCapsules?: number;
  recentObservationWindowDays?: number;
}

export interface MissionContextBuild {
  context: MissionContext;
  selectedCapsuleIds: readonly string[];
}

export interface MissionSnapshotBuild {
  snapshot: MissionSnapshot;
  selectedCapsuleIds: readonly string[];
}

export interface AgentContext {
  context: MissionContext;
  selectedCapsuleIds: readonly string[];
}

export interface OperationalKnowledge {
  entry: KnowledgeVaultEntry;
  lesson: {
    id: string;
    title: string;
    statement: string;
    applicability: string;
    limitations: string | null;
    importance: Importance;
    confidence: number;
  };
}

export type { MemoryCapsule };
