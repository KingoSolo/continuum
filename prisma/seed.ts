import {
  AgentStatus,
  AssignmentStatus,
  AuthorityLevel,
  CapsuleEntityType,
  Classification,
  DebatePositionStance,
  DebateStatus,
  DecisionStatus,
  EvidenceStance,
  HazardStatus,
  Importance,
  LessonStatus,
  MissionStatus,
  ObjectiveStatus,
  ObservationStatus,
  PrismaClient,
  ReasoningStatus,
  SnapshotStatus,
  VaultEntryStatus,
  VaultStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const at = (value: string) => new Date(value);

async function main() {
  // The seed is repeatable and removes only its own demo mission and agents.
  await prisma.knowledgeVaultEntry.deleteMany({
    where: { vault: { name: 'Continuum Operational Knowledge Vault' } },
  });
  await prisma.knowledgeVault.deleteMany({
    where: { name: 'Continuum Operational Knowledge Vault' },
  });
  await prisma.mission.deleteMany({ where: { code: 'INC-4291' } });
  await prisma.agent.deleteMany({
    where: { handle: { in: ['oncall', 'databasesre', 'infrastructure', 'statuspage'] } },
  });

  const oncall = await prisma.agent.create({
    data: {
      handle: 'oncall',
      displayName: 'On-Call Engineer',
      description:
        'On-call responder responsible for incident triage and authorized response decisions.',
      status: AgentStatus.ACTIVE,
      capabilities: ['incident-triage', 'risk-assessment', 'decision-authority'],
    },
  });
  const databasesre = await prisma.agent.create({
    data: {
      handle: 'databasesre',
      displayName: 'Database/SRE',
      description: 'Database specialist responsible for system health assessment and diagnostics.',
      status: AgentStatus.ACTIVE,
      capabilities: ['database-diagnosis', 'performance-analysis', 'root-cause-analysis'],
    },
  });
  const infrastructure = await prisma.agent.create({
    data: {
      handle: 'infrastructure',
      displayName: 'Infrastructure',
      description: 'Infrastructure engineer responsible for failover and contingency execution.',
      status: AgentStatus.ACTIVE,
      capabilities: ['failover-execution', 'infrastructure-management', 'contingency-response'],
    },
  });
  const statuspage = await prisma.agent.create({
    data: {
      handle: 'statuspage',
      displayName: 'Status Page / Comms',
      description:
        'Communications agent responsible for status updates and stakeholder notifications.',
      status: AgentStatus.ACTIVE,
      capabilities: ['communications', 'status-updates', 'incident-messaging'],
    },
  });

  const mission = await prisma.mission.create({
    data: {
      code: 'INC-4291',
      name: 'Primary Database Degradation',
      description:
        'A production incident response to primary database shard degradation with cascading connection-pool exhaustion, requiring immediate failover to replica-east and on-call responder handoff.',
      sponsorName: 'Production Infrastructure',
      authorityPolicy:
        'On-Call Engineer may authorize failover and mitigation steps; any full-primary outage requires explicit hazard escalation to engineering leadership.',
      status: MissionStatus.ACTIVE,
      startedAt: at('2025-08-06T14:30:00.000Z'),
    },
  });

  await prisma.missionAssignment.createMany({
    data: [
      {
        missionId: mission.id,
        agentId: oncall.id,
        role: 'On-Call Engineer',
        authority: AuthorityLevel.DECIDE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2025-08-06T14:25:00.000Z'),
        activatedAt: at('2025-08-06T14:30:00.000Z'),
        handoffAcknowledgedAt: at('2025-08-06T14:32:00.000Z'),
      },
      {
        missionId: mission.id,
        agentId: databasesre.id,
        role: 'Database/SRE',
        authority: AuthorityLevel.CONTRIBUTE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2025-08-06T14:25:00.000Z'),
        activatedAt: at('2025-08-06T14:30:00.000Z'),
      },
      {
        missionId: mission.id,
        agentId: infrastructure.id,
        role: 'Infrastructure Lead',
        authority: AuthorityLevel.PROPOSE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2025-08-06T14:25:00.000Z'),
        activatedAt: at('2025-08-06T14:30:00.000Z'),
      },
      {
        missionId: mission.id,
        agentId: statuspage.id,
        role: 'Communications Lead',
        authority: AuthorityLevel.CONTRIBUTE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2025-08-06T14:25:00.000Z'),
        activatedAt: at('2025-08-06T14:30:00.000Z'),
      },
    ],
  });

  const failoverObjective = await prisma.objective.create({
    data: {
      missionId: mission.id,
      title: 'Execute failover to replica-east within SLA',
      description:
        'Shift primary write traffic to the replica-east database cluster to restore service availability.',
      successCriteria: 'Write traffic migrated with zero data loss and <5 minute recovery time.',
      priority: Importance.CRITICAL,
      // Seeded objectives are approved but not yet worked: the mission has not
      // started when the seed runs, so no objective may claim progress or
      // completion. Execution moves them to ACTIVE and then ACHIEVED.
      status: ObjectiveStatus.APPROVED,
    },
  });
  const contextObjective = await prisma.objective.create({
    data: {
      missionId: mission.id,
      title: 'Preserve incident context across on-call handoff',
      description:
        'Enable the replacement responder to inherit hazards, decisions, and diagnostic insights without re-analysis.',
      successCriteria:
        'Replacement responder receives curated context within 30 seconds of handoff.',
      priority: Importance.HIGH,
      status: ObjectiveStatus.APPROVED,
    },
  });
  await prisma.objective.create({
    data: {
      missionId: mission.id,
      parentObjectiveId: contextObjective.id,
      title: 'Validate connection pool recovery on replica-east',
      description:
        'Confirm that replica-east is stable and accepting new connections at full rate.',
      successCriteria: 'Connection pool exhaustion metric below 5% and response latency <100ms.',
      priority: Importance.HIGH,
      status: ObjectiveStatus.APPROVED,
    },
  });

  const poolExhaustionObservation = await prisma.observation.create({
    data: {
      missionId: mission.id,
      authorAgentId: statuspage.id,
      statement:
        'Primary database connection pool exhaustion detected; 98% of available connections in use.',
      scope: 'Production database infrastructure',
      sourceName: 'Database monitoring and alerting system',
      provenanceUri: 'incident://inc-4291/monitoring/connection-pool-14-30',
      isDirectEvidence: true,
      status: ObservationStatus.VALIDATED,
      importance: Importance.CRITICAL,
      confidence: 0.97,
      classification: Classification.INTERNAL,
      capturedAt: at('2025-08-06T14:30:00.000Z'),
    },
  });
  const latencyObservation = await prisma.observation.create({
    data: {
      missionId: mission.id,
      authorAgentId: databasesre.id,
      statement:
        'Primary database read latency elevated to 850ms p99; replica-east showing nominal latency of 120ms p99.',
      scope: 'Query performance and system health',
      sourceName: 'APM tracing and database performance counters',
      provenanceUri: 'incident://inc-4291/metrics/latency-analysis-14-35',
      isDirectEvidence: true,
      status: ObservationStatus.VALIDATED,
      importance: Importance.HIGH,
      confidence: 0.94,
      classification: Classification.INTERNAL,
      capturedAt: at('2025-08-06T14:35:00.000Z'),
    },
  });
  const replicaHealthObservation = await prisma.observation.create({
    data: {
      missionId: mission.id,
      authorAgentId: infrastructure.id,
      statement:
        'Replica-east cluster is healthy; replication lag <100ms and connection pool utilization at 8%.',
      scope: 'Failover readiness and replica health',
      sourceName: 'Infrastructure monitoring and failover readiness checks',
      provenanceUri: 'incident://inc-4291/infrastructure/replica-east-health-14-37',
      isDirectEvidence: true,
      status: ObservationStatus.VALIDATED,
      importance: Importance.HIGH,
      confidence: 0.96,
      classification: Classification.INTERNAL,
      capturedAt: at('2025-08-06T14:37:00.000Z'),
    },
  });

  const connectionPoolHazard = await prisma.hazard.create({
    data: {
      missionId: mission.id,
      ownerAgentId: infrastructure.id,
      title: 'Primary database connection pool exhaustion risks cascading outage',
      description:
        'Sustained connection pool exhaustion at 98% utilization creates a critical risk of full primary database unavailability within minutes.',
      impact:
        'Complete loss of write availability for all downstream services; estimated user impact 100% of affected region.',
      likelihood: 0.74,
      indicators:
        'Connection pool utilization >95%, failed connection attempt spike, or write latency >1s.',
      mitigationPlan:
        'Immediately failover to replica-east; scale up primary connection pool; investigate root cause of connection leak.',
      escalationPath:
        'Escalate to engineering leadership if failover does not restore availability within 5 minutes.',
      reviewCadence: 'Continuous monitoring; manual review after incident resolution.',
      status: HazardStatus.MITIGATED,
      importance: Importance.CRITICAL,
      classification: Classification.INTERNAL,
      identifiedAt: at('2025-08-06T14:30:00.000Z'),
      nextReviewAt: at('2025-08-06T15:00:00.000Z'),
    },
  });
  await prisma.hazardObjective.createMany({
    data: [
      { hazardId: connectionPoolHazard.id, objectiveId: failoverObjective.id },
      { hazardId: connectionPoolHazard.id, objectiveId: contextObjective.id },
    ],
  });

  const failoverReasoning = await prisma.reasoning.create({
    data: {
      missionId: mission.id,
      authorAgentId: databasesre.id,
      claim:
        'Primary database is unsafe for writes due to connection pool exhaustion; replica-east is ready and healthy.',
      conclusion: 'Failover to replica-east immediately to restore write availability.',
      assumptions:
        'Replica-east replication lag remains <100ms and no cascading failures affect the replica cluster.',
      alternatives:
        'Scale primary connection pool or roll back recent deployments to free connections.',
      uncertainty:
        'Root cause of connection leak is unknown; failover eliminates the hazard but does not address the underlying issue.',
      status: ReasoningStatus.ACCEPTED,
      importance: Importance.HIGH,
      confidence: 0.88,
      createdAt: at('2025-08-06T14:40:00.000Z'),
    },
  });
  await prisma.reasoningObservation.createMany({
    data: [
      {
        reasoningId: failoverReasoning.id,
        observationId: poolExhaustionObservation.id,
        stance: EvidenceStance.SUPPORTS,
      },
      {
        reasoningId: failoverReasoning.id,
        observationId: replicaHealthObservation.id,
        stance: EvidenceStance.CONTEXT,
      },
    ],
  });

  const failoverDebate = await prisma.debate.create({
    data: {
      missionId: mission.id,
      question:
        'Should we immediately failover to replica-east to mitigate the primary database connection pool exhaustion?',
      admissibilityRules:
        'Positions must cite validated monitoring data or infrastructure assessments and state recovery trade-offs.',
      resolutionSummary:
        'Proceed with immediate failover to replica-east; conduct post-mortem to identify root cause.',
      resolutionAuthority: 'On-Call Engineer',
      status: DebateStatus.RESOLVED,
      importance: Importance.HIGH,
      convenedAt: at('2025-08-06T14:38:00.000Z'),
      resolvedAt: at('2025-08-06T14:42:00.000Z'),
    },
  });
  await prisma.debatePosition.createMany({
    data: [
      {
        debateId: failoverDebate.id,
        agentId: infrastructure.id,
        stance: DebatePositionStance.SUPPORT,
        argument:
          'Replica-east is healthy and can accept the write load; failover eliminates the cascading outage risk immediately.',
      },
      {
        debateId: failoverDebate.id,
        agentId: databasesre.id,
        stance: DebatePositionStance.CONDITIONAL,
        argument:
          'Support failover, but start a parallel investigation into the root cause to prevent recurrence.',
      },
      {
        debateId: failoverDebate.id,
        agentId: statuspage.id,
        stance: DebatePositionStance.SUPPORT,
        argument:
          'Failover is the fastest path to user-facing recovery; delays increase the incident severity.',
        isDissent: false,
      },
    ],
  });
  await prisma.debateObservation.createMany({
    data: [
      { debateId: failoverDebate.id, observationId: poolExhaustionObservation.id },
      { debateId: failoverDebate.id, observationId: latencyObservation.id },
      { debateId: failoverDebate.id, observationId: replicaHealthObservation.id },
    ],
  });
  await prisma.debateReasoning.create({
    data: { debateId: failoverDebate.id, reasoningId: failoverReasoning.id },
  });

  const failoverDecision = await prisma.decision.create({
    data: {
      missionId: mission.id,
      proposedByAgentId: oncall.id,
      decidedByAgentId: oncall.id,
      title: 'Failover to replica-east',
      chosenOption:
        'Immediately shift write traffic to replica-east; initiate parallel root-cause investigation; post incident-state update to status page.',
      rationale:
        'Replica-east is healthy and ready; failover eliminates the cascading outage risk within minutes while allowing investigation to continue.',
      effectiveScope: 'All production database write traffic',
      reviewTrigger: 'Connection pool utilization >95% on replica-east or replication lag >1s.',
      reversalConditions:
        'Revert to primary only after root cause is identified and fixed; re-enable monitoring for early detection.',
      status: DecisionStatus.DECIDED,
      importance: Importance.CRITICAL,
      proposedAt: at('2025-08-06T14:42:00.000Z'),
      decidedAt: at('2025-08-06T14:43:00.000Z'),
    },
  });
  await prisma.decisionReasoning.create({
    data: { decisionId: failoverDecision.id, reasoningId: failoverReasoning.id },
  });
  await prisma.decisionObservation.createMany({
    data: [
      { decisionId: failoverDecision.id, observationId: poolExhaustionObservation.id },
      { decisionId: failoverDecision.id, observationId: replicaHealthObservation.id },
    ],
  });
  await prisma.decisionHazard.create({
    data: { decisionId: failoverDecision.id, hazardId: connectionPoolHazard.id },
  });
  await prisma.decisionObjective.createMany({
    data: [
      { decisionId: failoverDecision.id, objectiveId: failoverObjective.id },
      { decisionId: failoverDecision.id, objectiveId: contextObjective.id },
    ],
  });

  const lesson = await prisma.lesson.create({
    data: {
      missionId: mission.id,
      authorAgentId: oncall.id,
      title: 'Incident context must survive on-call responder handoff',
      statement:
        'When an on-call responder is paged away during an active incident, the replacement must inherit curated hazards, decisions, and diagnostics instantly—without re-analysis. Memory systems that preserve continuity enable safe handoffs at speed.',
      applicability:
        'Production incident response, on-call rotation handoffs, multi-agent autonomous systems where agents may fail or be replaced mid-mission.',
      limitations:
        'Requires real-time memory curation; not applicable if incident state is too large to query quickly or if the replacement lacks authority to act on inherited context.',
      status: LessonStatus.ADMITTED,
      importance: Importance.HIGH,
      confidence: 0.92,
      validatedAt: at('2025-08-06T14:45:00.000Z'),
      reviewAt: at('2025-09-06T00:00:00.000Z'),
    },
  });
  await prisma.lessonObservation.createMany({
    data: [
      { lessonId: lesson.id, observationId: poolExhaustionObservation.id },
      { lessonId: lesson.id, observationId: replicaHealthObservation.id },
    ],
  });
  await prisma.lessonReasoning.create({
    data: { lessonId: lesson.id, reasoningId: failoverReasoning.id },
  });
  await prisma.lessonDecision.create({
    data: { lessonId: lesson.id, decisionId: failoverDecision.id },
  });
  await prisma.lessonDebate.create({ data: { lessonId: lesson.id, debateId: failoverDebate.id } });
  await prisma.lessonHazard.create({
    data: { lessonId: lesson.id, hazardId: connectionPoolHazard.id },
  });

  const vault = await prisma.knowledgeVault.create({
    data: {
      name: 'Continuum Operational Knowledge Vault',
      description:
        'Validated, applicability-bounded operational knowledge approved for future mission context.',
      status: VaultStatus.ACTIVE,
    },
  });
  await prisma.knowledgeVaultEntry.create({
    data: {
      vaultId: vault.id,
      lessonId: lesson.id,
      stewardAgentId: oncall.id,
      status: VaultEntryStatus.ACTIVE,
      admittedAt: at('2025-08-06T14:45:00.000Z'),
      reviewAt: at('2025-09-06T00:00:00.000Z'),
    },
  });

  const capsuleInputs = [
    [
      CapsuleEntityType.OBJECTIVE,
      failoverObjective.id,
      oncall.id,
      '2025-08-06T14:30:00.000Z',
      Importance.CRITICAL,
      1,
    ],
    [
      CapsuleEntityType.OBJECTIVE,
      contextObjective.id,
      oncall.id,
      '2025-08-06T14:30:00.000Z',
      Importance.HIGH,
      1,
    ],
    [
      CapsuleEntityType.OBSERVATION,
      poolExhaustionObservation.id,
      statuspage.id,
      '2025-08-06T14:30:00.000Z',
      Importance.CRITICAL,
      0.97,
    ],
    [
      CapsuleEntityType.OBSERVATION,
      latencyObservation.id,
      databasesre.id,
      '2025-08-06T14:35:00.000Z',
      Importance.HIGH,
      0.94,
    ],
    [
      CapsuleEntityType.OBSERVATION,
      replicaHealthObservation.id,
      infrastructure.id,
      '2025-08-06T14:37:00.000Z',
      Importance.HIGH,
      0.96,
    ],
    [
      CapsuleEntityType.HAZARD,
      connectionPoolHazard.id,
      infrastructure.id,
      '2025-08-06T14:30:00.000Z',
      Importance.CRITICAL,
      0.94,
    ],
    [
      CapsuleEntityType.REASONING,
      failoverReasoning.id,
      databasesre.id,
      '2025-08-06T14:40:00.000Z',
      Importance.HIGH,
      0.88,
    ],
    [
      CapsuleEntityType.DEBATE,
      failoverDebate.id,
      oncall.id,
      '2025-08-06T14:42:00.000Z',
      Importance.HIGH,
      0.9,
    ],
    [
      CapsuleEntityType.DECISION,
      failoverDecision.id,
      oncall.id,
      '2025-08-06T14:43:00.000Z',
      Importance.CRITICAL,
      0.95,
    ],
    [
      CapsuleEntityType.LESSON,
      lesson.id,
      oncall.id,
      '2025-08-06T14:45:00.000Z',
      Importance.HIGH,
      0.92,
    ],
  ] as const;

  const capsules = await Promise.all(
    capsuleInputs.map(
      ([
        referencedEntityType,
        referencedEntityId,
        authorAgentId,
        occurredAt,
        importance,
        confidence,
      ]) =>
        prisma.memoryCapsule.create({
          data: {
            missionId: mission.id,
            referencedEntityType,
            referencedEntityId,
            authorAgentId,
            occurredAt: at(occurredAt),
            importance,
            confidence,
            embeddingReference: `embedding://inc-4291/${referencedEntityType.toLowerCase()}/${referencedEntityId}`,
          },
        }),
    ),
  );

  const context = await prisma.missionContext.create({
    data: {
      missionId: mission.id,
      version: 1,
      isCurrent: true,
      summary:
        'INC-4291 is active: primary database connection pool exhaustion risks cascading outage. Failover to replica-east approved and safe. Replacement responder must inherit this hazard, failover decision, and investigation plan.',
      capsules: {
        create: capsules.map((capsule, index) => ({
          capsuleId: capsule.id,
          relevanceRank: index < 2 ? 100 - index : 90 - index,
          inclusionReason:
            index < 2 ? 'Incident objective' : 'Current INC-4291 operational evidence',
        })),
      },
    },
  });

  const snapshot = await prisma.missionSnapshot.create({
    data: {
      missionId: mission.id,
      missionContextId: context.id,
      version: 1,
      trigger: 'Critical database hazard and authorized failover decision',
      summary:
        'Continuity handoff during on-call rotation: primary database connection pool exhaustion detected and failover to replica-east approved. Replacement responder inherits hazard context and decision rationale.',
      unresolvedItems:
        'Identify and fix root cause of connection pool leak; validate replica-east stability under full production load.',
      completenessNote:
        'Includes all CRITICAL and HIGH capsules available at failover-decision time.',
      status: SnapshotStatus.PUBLISHED,
      generatedAt: at('2025-08-06T14:44:00.000Z'),
      publishedAt: at('2025-08-06T14:46:00.000Z'),
      capsules: {
        create: capsules.map((capsule, inclusionOrder) => ({
          capsuleId: capsule.id,
          inclusionOrder,
        })),
      },
    },
  });

  await prisma.memoryCapsule.create({
    data: {
      missionId: mission.id,
      referencedEntityType: CapsuleEntityType.MISSION_SNAPSHOT,
      referencedEntityId: snapshot.id,
      authorAgentId: oncall.id,
      occurredAt: at('2025-08-06T14:46:00.000Z'),
      importance: Importance.HIGH,
      confidence: 1,
      embeddingReference: `embedding://inc-4291/mission-snapshot/${snapshot.id}`,
    },
  });

  console.log(`✓ Seeded ${mission.code}: ${mission.name}`);
  console.log(`  Mission ID: ${mission.id}`);
  console.log('');
  console.log('Set this in your environment to run the demo:');
  console.log(`  apps/web/.env.local    → NEXT_PUBLIC_MISSION_ID=${mission.id}`);
  console.log(`  simulator              → MISSION_ID=${mission.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
