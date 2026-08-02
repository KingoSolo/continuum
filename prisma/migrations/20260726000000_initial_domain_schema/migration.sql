-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('REGISTERED', 'ELIGIBLE', 'ASSIGNED', 'ACTIVE', 'SUSPENDED', 'RELEASED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACTIVE', 'SUSPENDED', 'RELEASED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuthorityLevel" AS ENUM ('OBSERVE', 'CONTRIBUTE', 'PROPOSE', 'DECIDE', 'ADMIN');

-- CreateEnum
CREATE TYPE "Importance" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('CAPTURED', 'VALIDATED', 'SUPERSEDED', 'DISPUTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReasoningStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHALLENGED', 'ACCEPTED', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'DECIDED', 'EXECUTED', 'REVISED', 'SUPERSEDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DebateStatus" AS ENUM ('CONVENED', 'ACTIVE', 'EVIDENCE_REVIEW', 'RESOLVED', 'DEFERRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DebatePositionStance" AS ENUM ('SUPPORT', 'OPPOSE', 'CONDITIONAL', 'ALTERNATIVE');

-- CreateEnum
CREATE TYPE "HazardStatus" AS ENUM ('IDENTIFIED', 'ASSESSED', 'MITIGATED', 'ACCEPTED', 'TRANSFERRED', 'ESCALATED', 'REALIZED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('PROPOSED', 'APPROVED', 'ACTIVE', 'ACHIEVED', 'REVISED', 'DEPRIORITIZED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('CANDIDATE', 'VALIDATED', 'MISSION_LOCAL', 'ADMITTED', 'SUPERSEDED', 'RETIRED', 'REAFFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VaultStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VaultEntryStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('REQUESTED', 'GENERATED', 'VALIDATED', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CapsuleEntityType" AS ENUM ('OBSERVATION', 'REASONING', 'DECISION', 'DEBATE', 'HAZARD', 'OBJECTIVE', 'LESSON', 'MISSION_SNAPSHOT');

-- CreateEnum
CREATE TYPE "EvidenceStance" AS ENUM ('SUPPORTS', 'CHALLENGES', 'CONTEXT');

-- CreateTable
CREATE TABLE "Mission" (
    "id" UUID NOT NULL,
    "code" STRING NOT NULL,
    "name" STRING NOT NULL,
    "description" STRING NOT NULL,
    "sponsorName" STRING NOT NULL,
    "authorityPolicy" STRING NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INT4 NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" UUID NOT NULL,
    "handle" STRING NOT NULL,
    "displayName" STRING NOT NULL,
    "description" STRING,
    "status" "AgentStatus" NOT NULL DEFAULT 'REGISTERED',
    "capabilities" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAssignment" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "role" STRING NOT NULL,
    "authority" "AuthorityLevel" NOT NULL DEFAULT 'CONTRIBUTE',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMPTZ(3),
    "releasedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "handoffAcknowledgedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "parentObjectiveId" UUID,
    "title" STRING NOT NULL,
    "description" STRING NOT NULL,
    "successCriteria" STRING NOT NULL,
    "priority" "Importance" NOT NULL DEFAULT 'NORMAL',
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'PROPOSED',
    "constraints" JSONB,
    "progressSummary" STRING,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "authorAgentId" UUID NOT NULL,
    "supersedesId" UUID,
    "statement" STRING NOT NULL,
    "scope" STRING NOT NULL,
    "sourceName" STRING NOT NULL,
    "provenanceUri" STRING,
    "isDirectEvidence" BOOL NOT NULL DEFAULT false,
    "status" "ObservationStatus" NOT NULL DEFAULT 'CAPTURED',
    "importance" "Importance" NOT NULL DEFAULT 'NORMAL',
    "confidence" FLOAT8 NOT NULL,
    "classification" "Classification" NOT NULL DEFAULT 'INTERNAL',
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reasoning" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "authorAgentId" UUID NOT NULL,
    "supersedesId" UUID,
    "claim" STRING NOT NULL,
    "conclusion" STRING NOT NULL,
    "assumptions" STRING NOT NULL,
    "alternatives" STRING,
    "uncertainty" STRING,
    "status" "ReasoningStatus" NOT NULL DEFAULT 'DRAFT',
    "importance" "Importance" NOT NULL DEFAULT 'NORMAL',
    "confidence" FLOAT8 NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reasoning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "proposedByAgentId" UUID NOT NULL,
    "decidedByAgentId" UUID,
    "supersedesId" UUID,
    "title" STRING NOT NULL,
    "chosenOption" STRING NOT NULL,
    "rationale" STRING NOT NULL,
    "effectiveScope" STRING NOT NULL,
    "reviewTrigger" STRING,
    "reversalConditions" STRING,
    "status" "DecisionStatus" NOT NULL DEFAULT 'PROPOSED',
    "importance" "Importance" NOT NULL DEFAULT 'HIGH',
    "proposedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "executedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "reopenedFromId" UUID,
    "question" STRING NOT NULL,
    "admissibilityRules" STRING,
    "resolutionSummary" STRING,
    "resolutionAuthority" STRING,
    "status" "DebateStatus" NOT NULL DEFAULT 'CONVENED',
    "importance" "Importance" NOT NULL DEFAULT 'HIGH',
    "convenedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebatePosition" (
    "id" UUID NOT NULL,
    "debateId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "stance" "DebatePositionStance" NOT NULL,
    "argument" STRING NOT NULL,
    "isDissent" BOOL NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebatePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hazard" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "ownerAgentId" UUID,
    "title" STRING NOT NULL,
    "description" STRING NOT NULL,
    "impact" STRING NOT NULL,
    "likelihood" FLOAT8,
    "indicators" STRING,
    "mitigationPlan" STRING,
    "escalationPath" STRING,
    "reviewCadence" STRING,
    "status" "HazardStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "importance" "Importance" NOT NULL DEFAULT 'HIGH',
    "classification" "Classification" NOT NULL DEFAULT 'INTERNAL',
    "identifiedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextReviewAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Hazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "authorAgentId" UUID NOT NULL,
    "supersedesId" UUID,
    "title" STRING NOT NULL,
    "statement" STRING NOT NULL,
    "applicability" STRING NOT NULL,
    "limitations" STRING,
    "status" "LessonStatus" NOT NULL DEFAULT 'CANDIDATE',
    "importance" "Importance" NOT NULL DEFAULT 'NORMAL',
    "confidence" FLOAT8 NOT NULL,
    "validatedAt" TIMESTAMPTZ(3),
    "reviewAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeVault" (
    "id" UUID NOT NULL,
    "name" STRING NOT NULL,
    "description" STRING NOT NULL,
    "status" "VaultStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeVault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeVaultEntry" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "stewardAgentId" UUID NOT NULL,
    "status" "VaultEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "admittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeVaultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionContext" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "version" INT4 NOT NULL,
    "revision" INT4 NOT NULL DEFAULT 1,
    "summary" STRING NOT NULL,
    "isCurrent" BOOL NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MissionContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionContextCapsule" (
    "missionContextId" UUID NOT NULL,
    "capsuleId" UUID NOT NULL,
    "relevanceRank" INT4 NOT NULL DEFAULT 0,
    "inclusionReason" STRING,
    "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionContextCapsule_pkey" PRIMARY KEY ("missionContextId","capsuleId")
);

-- CreateTable
CREATE TABLE "MissionSnapshot" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "missionContextId" UUID NOT NULL,
    "version" INT4 NOT NULL,
    "trigger" STRING NOT NULL,
    "summary" STRING NOT NULL,
    "unresolvedItems" STRING,
    "completenessNote" STRING,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'REQUESTED',
    "generatedAt" TIMESTAMPTZ(3),
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MissionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryCapsule" (
    "id" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "referencedEntityType" "CapsuleEntityType" NOT NULL,
    "referencedEntityId" UUID NOT NULL,
    "authorAgentId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "importance" "Importance" NOT NULL DEFAULT 'NORMAL',
    "confidence" FLOAT8 NOT NULL,
    "embeddingReference" STRING,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryCapsule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionSnapshotCapsule" (
    "missionSnapshotId" UUID NOT NULL,
    "capsuleId" UUID NOT NULL,
    "inclusionOrder" INT4 NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionSnapshotCapsule_pkey" PRIMARY KEY ("missionSnapshotId","capsuleId")
);

-- CreateTable
CREATE TABLE "ReasoningObservation" (
    "reasoningId" UUID NOT NULL,
    "observationId" UUID NOT NULL,
    "stance" "EvidenceStance" NOT NULL DEFAULT 'SUPPORTS',

    CONSTRAINT "ReasoningObservation_pkey" PRIMARY KEY ("reasoningId","observationId")
);

-- CreateTable
CREATE TABLE "DecisionReasoning" (
    "decisionId" UUID NOT NULL,
    "reasoningId" UUID NOT NULL,

    CONSTRAINT "DecisionReasoning_pkey" PRIMARY KEY ("decisionId","reasoningId")
);

-- CreateTable
CREATE TABLE "DecisionObservation" (
    "decisionId" UUID NOT NULL,
    "observationId" UUID NOT NULL,

    CONSTRAINT "DecisionObservation_pkey" PRIMARY KEY ("decisionId","observationId")
);

-- CreateTable
CREATE TABLE "DecisionHazard" (
    "decisionId" UUID NOT NULL,
    "hazardId" UUID NOT NULL,

    CONSTRAINT "DecisionHazard_pkey" PRIMARY KEY ("decisionId","hazardId")
);

-- CreateTable
CREATE TABLE "DecisionObjective" (
    "decisionId" UUID NOT NULL,
    "objectiveId" UUID NOT NULL,

    CONSTRAINT "DecisionObjective_pkey" PRIMARY KEY ("decisionId","objectiveId")
);

-- CreateTable
CREATE TABLE "HazardObjective" (
    "hazardId" UUID NOT NULL,
    "objectiveId" UUID NOT NULL,

    CONSTRAINT "HazardObjective_pkey" PRIMARY KEY ("hazardId","objectiveId")
);

-- CreateTable
CREATE TABLE "DebateObservation" (
    "debateId" UUID NOT NULL,
    "observationId" UUID NOT NULL,

    CONSTRAINT "DebateObservation_pkey" PRIMARY KEY ("debateId","observationId")
);

-- CreateTable
CREATE TABLE "DebateReasoning" (
    "debateId" UUID NOT NULL,
    "reasoningId" UUID NOT NULL,

    CONSTRAINT "DebateReasoning_pkey" PRIMARY KEY ("debateId","reasoningId")
);

-- CreateTable
CREATE TABLE "LessonObservation" (
    "lessonId" UUID NOT NULL,
    "observationId" UUID NOT NULL,

    CONSTRAINT "LessonObservation_pkey" PRIMARY KEY ("lessonId","observationId")
);

-- CreateTable
CREATE TABLE "LessonReasoning" (
    "lessonId" UUID NOT NULL,
    "reasoningId" UUID NOT NULL,

    CONSTRAINT "LessonReasoning_pkey" PRIMARY KEY ("lessonId","reasoningId")
);

-- CreateTable
CREATE TABLE "LessonDecision" (
    "lessonId" UUID NOT NULL,
    "decisionId" UUID NOT NULL,

    CONSTRAINT "LessonDecision_pkey" PRIMARY KEY ("lessonId","decisionId")
);

-- CreateTable
CREATE TABLE "LessonDebate" (
    "lessonId" UUID NOT NULL,
    "debateId" UUID NOT NULL,

    CONSTRAINT "LessonDebate_pkey" PRIMARY KEY ("lessonId","debateId")
);

-- CreateTable
CREATE TABLE "LessonHazard" (
    "lessonId" UUID NOT NULL,
    "hazardId" UUID NOT NULL,

    CONSTRAINT "LessonHazard_pkey" PRIMARY KEY ("lessonId","hazardId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mission_code_key" ON "Mission"("code");

-- CreateIndex
CREATE INDEX "Mission_status_updatedAt_idx" ON "Mission"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_handle_key" ON "Agent"("handle");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "MissionAssignment_missionId_status_idx" ON "MissionAssignment"("missionId", "status");

-- CreateIndex
CREATE INDEX "MissionAssignment_agentId_missionId_status_idx" ON "MissionAssignment"("agentId", "missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MissionAssignment_missionId_agentId_role_assignedAt_key" ON "MissionAssignment"("missionId", "agentId", "role", "assignedAt");

-- CreateIndex
CREATE INDEX "Objective_missionId_status_priority_idx" ON "Objective"("missionId", "status", "priority");

-- CreateIndex
CREATE INDEX "Objective_parentObjectiveId_idx" ON "Objective"("parentObjectiveId");

-- CreateIndex
CREATE INDEX "Observation_missionId_capturedAt_idx" ON "Observation"("missionId", "capturedAt");

-- CreateIndex
CREATE INDEX "Observation_missionId_importance_status_idx" ON "Observation"("missionId", "importance", "status");

-- CreateIndex
CREATE INDEX "Observation_supersedesId_idx" ON "Observation"("supersedesId");

-- CreateIndex
CREATE INDEX "Reasoning_missionId_createdAt_idx" ON "Reasoning"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "Reasoning_missionId_status_importance_idx" ON "Reasoning"("missionId", "status", "importance");

-- CreateIndex
CREATE INDEX "Reasoning_supersedesId_idx" ON "Reasoning"("supersedesId");

-- CreateIndex
CREATE INDEX "Decision_missionId_status_importance_idx" ON "Decision"("missionId", "status", "importance");

-- CreateIndex
CREATE INDEX "Decision_missionId_decidedAt_idx" ON "Decision"("missionId", "decidedAt");

-- CreateIndex
CREATE INDEX "Decision_supersedesId_idx" ON "Decision"("supersedesId");

-- CreateIndex
CREATE INDEX "Debate_missionId_status_convenedAt_idx" ON "Debate"("missionId", "status", "convenedAt");

-- CreateIndex
CREATE INDEX "Debate_reopenedFromId_idx" ON "Debate"("reopenedFromId");

-- CreateIndex
CREATE INDEX "DebatePosition_debateId_createdAt_idx" ON "DebatePosition"("debateId", "createdAt");

-- CreateIndex
CREATE INDEX "Hazard_missionId_status_importance_idx" ON "Hazard"("missionId", "status", "importance");

-- CreateIndex
CREATE INDEX "Hazard_ownerAgentId_status_idx" ON "Hazard"("ownerAgentId", "status");

-- CreateIndex
CREATE INDEX "Hazard_missionId_nextReviewAt_idx" ON "Hazard"("missionId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "Lesson_missionId_status_importance_idx" ON "Lesson"("missionId", "status", "importance");

-- CreateIndex
CREATE INDEX "Lesson_supersedesId_idx" ON "Lesson"("supersedesId");

-- CreateIndex
CREATE INDEX "Lesson_missionId_createdAt_idx" ON "Lesson"("missionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeVault_name_key" ON "KnowledgeVault"("name");

-- CreateIndex
CREATE INDEX "KnowledgeVaultEntry_vaultId_status_reviewAt_idx" ON "KnowledgeVaultEntry"("vaultId", "status", "reviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeVaultEntry_vaultId_lessonId_key" ON "KnowledgeVaultEntry"("vaultId", "lessonId");

-- CreateIndex
CREATE INDEX "MissionContext_missionId_isCurrent_idx" ON "MissionContext"("missionId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "MissionContext_missionId_version_key" ON "MissionContext"("missionId", "version");

-- CreateIndex
CREATE INDEX "MissionContextCapsule_capsuleId_idx" ON "MissionContextCapsule"("capsuleId");

-- CreateIndex
CREATE INDEX "MissionSnapshot_missionId_status_createdAt_idx" ON "MissionSnapshot"("missionId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MissionSnapshot_missionId_version_key" ON "MissionSnapshot"("missionId", "version");

-- CreateIndex
CREATE INDEX "MemoryCapsule_missionId_occurredAt_idx" ON "MemoryCapsule"("missionId", "occurredAt");

-- CreateIndex
CREATE INDEX "MemoryCapsule_missionId_importance_occurredAt_idx" ON "MemoryCapsule"("missionId", "importance", "occurredAt");

-- CreateIndex
CREATE INDEX "MemoryCapsule_referencedEntityType_referencedEntityId_idx" ON "MemoryCapsule"("referencedEntityType", "referencedEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryCapsule_missionId_referencedEntityType_referencedEnti_key" ON "MemoryCapsule"("missionId", "referencedEntityType", "referencedEntityId");

-- CreateIndex
CREATE INDEX "MissionSnapshotCapsule_capsuleId_idx" ON "MissionSnapshotCapsule"("capsuleId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionSnapshotCapsule_missionSnapshotId_inclusionOrder_key" ON "MissionSnapshotCapsule"("missionSnapshotId", "inclusionOrder");

-- CreateIndex
CREATE INDEX "ReasoningObservation_observationId_idx" ON "ReasoningObservation"("observationId");

-- CreateIndex
CREATE INDEX "DecisionReasoning_reasoningId_idx" ON "DecisionReasoning"("reasoningId");

-- CreateIndex
CREATE INDEX "DecisionObservation_observationId_idx" ON "DecisionObservation"("observationId");

-- CreateIndex
CREATE INDEX "DecisionHazard_hazardId_idx" ON "DecisionHazard"("hazardId");

-- CreateIndex
CREATE INDEX "DecisionObjective_objectiveId_idx" ON "DecisionObjective"("objectiveId");

-- CreateIndex
CREATE INDEX "HazardObjective_objectiveId_idx" ON "HazardObjective"("objectiveId");

-- CreateIndex
CREATE INDEX "DebateObservation_observationId_idx" ON "DebateObservation"("observationId");

-- CreateIndex
CREATE INDEX "DebateReasoning_reasoningId_idx" ON "DebateReasoning"("reasoningId");

-- CreateIndex
CREATE INDEX "LessonObservation_observationId_idx" ON "LessonObservation"("observationId");

-- CreateIndex
CREATE INDEX "LessonReasoning_reasoningId_idx" ON "LessonReasoning"("reasoningId");

-- CreateIndex
CREATE INDEX "LessonDecision_decisionId_idx" ON "LessonDecision"("decisionId");

-- CreateIndex
CREATE INDEX "LessonDebate_debateId_idx" ON "LessonDebate"("debateId");

-- CreateIndex
CREATE INDEX "LessonHazard_hazardId_idx" ON "LessonHazard"("hazardId");

-- AddForeignKey
ALTER TABLE "MissionAssignment" ADD CONSTRAINT "MissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAssignment" ADD CONSTRAINT "MissionAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_parentObjectiveId_fkey" FOREIGN KEY ("parentObjectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reasoning" ADD CONSTRAINT "Reasoning_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reasoning" ADD CONSTRAINT "Reasoning_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reasoning" ADD CONSTRAINT "Reasoning_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Reasoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_proposedByAgentId_fkey" FOREIGN KEY ("proposedByAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_decidedByAgentId_fkey" FOREIGN KEY ("decidedByAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Decision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_reopenedFromId_fkey" FOREIGN KEY ("reopenedFromId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebatePosition" ADD CONSTRAINT "DebatePosition_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebatePosition" ADD CONSTRAINT "DebatePosition_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hazard" ADD CONSTRAINT "Hazard_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeVaultEntry" ADD CONSTRAINT "KnowledgeVaultEntry_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "KnowledgeVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeVaultEntry" ADD CONSTRAINT "KnowledgeVaultEntry_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeVaultEntry" ADD CONSTRAINT "KnowledgeVaultEntry_stewardAgentId_fkey" FOREIGN KEY ("stewardAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionContext" ADD CONSTRAINT "MissionContext_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionContextCapsule" ADD CONSTRAINT "MissionContextCapsule_missionContextId_fkey" FOREIGN KEY ("missionContextId") REFERENCES "MissionContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionContextCapsule" ADD CONSTRAINT "MissionContextCapsule_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "MemoryCapsule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionSnapshot" ADD CONSTRAINT "MissionSnapshot_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionSnapshot" ADD CONSTRAINT "MissionSnapshot_missionContextId_fkey" FOREIGN KEY ("missionContextId") REFERENCES "MissionContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryCapsule" ADD CONSTRAINT "MemoryCapsule_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryCapsule" ADD CONSTRAINT "MemoryCapsule_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionSnapshotCapsule" ADD CONSTRAINT "MissionSnapshotCapsule_missionSnapshotId_fkey" FOREIGN KEY ("missionSnapshotId") REFERENCES "MissionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionSnapshotCapsule" ADD CONSTRAINT "MissionSnapshotCapsule_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "MemoryCapsule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReasoningObservation" ADD CONSTRAINT "ReasoningObservation_reasoningId_fkey" FOREIGN KEY ("reasoningId") REFERENCES "Reasoning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReasoningObservation" ADD CONSTRAINT "ReasoningObservation_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionReasoning" ADD CONSTRAINT "DecisionReasoning_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionReasoning" ADD CONSTRAINT "DecisionReasoning_reasoningId_fkey" FOREIGN KEY ("reasoningId") REFERENCES "Reasoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionObservation" ADD CONSTRAINT "DecisionObservation_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionObservation" ADD CONSTRAINT "DecisionObservation_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionHazard" ADD CONSTRAINT "DecisionHazard_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionHazard" ADD CONSTRAINT "DecisionHazard_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionObjective" ADD CONSTRAINT "DecisionObjective_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionObjective" ADD CONSTRAINT "DecisionObjective_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardObjective" ADD CONSTRAINT "HazardObjective_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardObjective" ADD CONSTRAINT "HazardObjective_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateObservation" ADD CONSTRAINT "DebateObservation_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateObservation" ADD CONSTRAINT "DebateObservation_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateReasoning" ADD CONSTRAINT "DebateReasoning_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateReasoning" ADD CONSTRAINT "DebateReasoning_reasoningId_fkey" FOREIGN KEY ("reasoningId") REFERENCES "Reasoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonObservation" ADD CONSTRAINT "LessonObservation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonObservation" ADD CONSTRAINT "LessonObservation_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReasoning" ADD CONSTRAINT "LessonReasoning_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReasoning" ADD CONSTRAINT "LessonReasoning_reasoningId_fkey" FOREIGN KEY ("reasoningId") REFERENCES "Reasoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonDecision" ADD CONSTRAINT "LessonDecision_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonDecision" ADD CONSTRAINT "LessonDecision_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonDebate" ADD CONSTRAINT "LessonDebate_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonDebate" ADD CONSTRAINT "LessonDebate_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHazard" ADD CONSTRAINT "LessonHazard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHazard" ADD CONSTRAINT "LessonHazard_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
