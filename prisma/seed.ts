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
  await prisma.mission.deleteMany({ where: { code: 'ARES-7' } });
  await prisma.agent.deleteMany({
    where: { handle: { in: ['atlas', 'kepler', 'sagan', 'nova'] } },
  });

  const atlas = await prisma.agent.create({
    data: {
      handle: 'atlas',
      displayName: 'Atlas',
      description: 'Mission lead responsible for synthesis and authorized decisions.',
      status: AgentStatus.ACTIVE,
      capabilities: ['mission-planning', 'risk-governance', 'decision-synthesis'],
    },
  });
  const kepler = await prisma.agent.create({
    data: {
      handle: 'kepler',
      displayName: 'Kepler',
      description: 'Orbital-analysis agent responsible for evidence assessment.',
      status: AgentStatus.ACTIVE,
      capabilities: ['orbital-analysis', 'telemetry-interpretation', 'uncertainty-analysis'],
    },
  });
  const sagan = await prisma.agent.create({
    data: {
      handle: 'sagan',
      displayName: 'Sagan',
      description: 'Surface-science agent responsible for site and sample analysis.',
      status: AgentStatus.ACTIVE,
      capabilities: ['surface-science', 'sample-prioritization', 'evidence-review'],
    },
  });
  const nova = await prisma.agent.create({
    data: {
      handle: 'nova',
      displayName: 'Nova',
      description: 'Operations agent responsible for communications and contingency planning.',
      status: AgentStatus.ACTIVE,
      capabilities: ['operations', 'communications', 'hazard-monitoring'],
    },
  });

  const mission = await prisma.mission.create({
    data: {
      code: 'ARES-7',
      name: 'Ares-7 Valles Marineris Sample Return Reconnaissance',
      description:
        'A six-sol autonomous reconnaissance mission to select and preserve a high-value hydrated-mineral sample while maintaining a safe relay communications window.',
      sponsorName: 'Continuum Mars Exploration Directorate',
      authorityPolicy:
        'Atlas may decide route and sampling sequence; any irreversible exposure to a dust event requires explicit hazard acceptance.',
      status: MissionStatus.ACTIVE,
      startedAt: at('2038-09-14T06:00:00.000Z'),
    },
  });

  await prisma.missionAssignment.createMany({
    data: [
      {
        missionId: mission.id,
        agentId: atlas.id,
        role: 'Mission Lead',
        authority: AuthorityLevel.DECIDE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2038-09-13T16:00:00.000Z'),
        activatedAt: at('2038-09-14T06:00:00.000Z'),
        handoffAcknowledgedAt: at('2038-09-14T06:02:00.000Z'),
      },
      {
        missionId: mission.id,
        agentId: kepler.id,
        role: 'Orbital Analyst',
        authority: AuthorityLevel.CONTRIBUTE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2038-09-13T16:00:00.000Z'),
        activatedAt: at('2038-09-14T06:00:00.000Z'),
      },
      {
        missionId: mission.id,
        agentId: sagan.id,
        role: 'Surface Science Lead',
        authority: AuthorityLevel.PROPOSE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2038-09-13T16:00:00.000Z'),
        activatedAt: at('2038-09-14T06:00:00.000Z'),
      },
      {
        missionId: mission.id,
        agentId: nova.id,
        role: 'Operations and Safety Lead',
        authority: AuthorityLevel.PROPOSE,
        status: AssignmentStatus.ACTIVE,
        assignedAt: at('2038-09-13T16:00:00.000Z'),
        activatedAt: at('2038-09-14T06:00:00.000Z'),
      },
    ],
  });

  const relayObjective = await prisma.objective.create({
    data: {
      missionId: mission.id,
      title: 'Maintain relay visibility through Sol 4',
      description:
        'Protect sufficient bandwidth for imagery, telemetry, and an emergency command uplink.',
      successCriteria: 'At least 92% of planned relay passes remain viable through Sol 4.',
      priority: Importance.CRITICAL,
      // Seeded objectives are approved but not yet worked: the mission has not
      // started when the seed runs, so no objective may claim progress or
      // completion. Execution moves them to ACTIVE and then ACHIEVED.
      status: ObjectiveStatus.APPROVED,
    },
  });
  const sampleObjective = await prisma.objective.create({
    data: {
      missionId: mission.id,
      title: 'Acquire a hydrated-mineral core from Candor Ridge',
      description: 'Identify and preserve one scientifically defensible clay-bearing sample.',
      successCriteria: 'Seal one core with a hydration signature above the mission threshold.',
      priority: Importance.HIGH,
      status: ObjectiveStatus.APPROVED,
    },
  });
  await prisma.objective.create({
    data: {
      missionId: mission.id,
      parentObjectiveId: sampleObjective.id,
      title: 'Validate Site Kappa before drilling',
      description: 'Confirm mineral signature and slope safety at the Kappa outcrop.',
      successCriteria: 'Independent orbital and surface evidence agree before drill commitment.',
      priority: Importance.HIGH,
      status: ObjectiveStatus.APPROVED,
    },
  });

  const dustObservation = await prisma.observation.create({
    data: {
      missionId: mission.id,
      authorAgentId: nova.id,
      statement: 'An elevated dust plume is moving eastward across the secondary relay corridor.',
      scope: 'Communications and power operations',
      sourceName: 'Ares-7 environmental sensor suite',
      provenanceUri: 'mission://ares-7/telemetry/environment/sol-2-0412',
      isDirectEvidence: true,
      status: ObservationStatus.VALIDATED,
      importance: Importance.CRITICAL,
      confidence: 0.91,
      classification: Classification.INTERNAL,
      capturedAt: at('2038-09-16T04:12:00.000Z'),
    },
  });
  const orbitalObservation = await prisma.observation.create({
    data: {
      missionId: mission.id,
      authorAgentId: kepler.id,
      statement:
        'Orbital spectroscopy shows a strong smectite signature at Site Kappa, 180 metres south of the planned waypoint.',
      scope: 'Site selection',
      sourceName: 'Mars Reconnaissance Orbiter spectral pass 2038-258',
      provenanceUri: 'mission://ares-7/orbital/spectral-pass-2038-258',
      isDirectEvidence: true,
      status: ObservationStatus.VALIDATED,
      importance: Importance.HIGH,
      confidence: 0.88,
      classification: Classification.INTERNAL,
      capturedAt: at('2038-09-16T05:04:00.000Z'),
    },
  });
  const surfaceObservation = await prisma.observation.create({
    data: {
      missionId: mission.id,
      authorAgentId: sagan.id,
      statement:
        'Close-range imagery at Site Kappa shows fine-grained layered material with no visible crust fracture along the proposed drill face.',
      scope: 'Sample integrity and drilling safety',
      sourceName: 'Ares-7 mast camera and microscopic imager',
      provenanceUri: 'mission://ares-7/imaging/site-kappa/sol-2',
      isDirectEvidence: true,
      status: ObservationStatus.VALIDATED,
      importance: Importance.HIGH,
      confidence: 0.84,
      classification: Classification.INTERNAL,
      capturedAt: at('2038-09-16T06:26:00.000Z'),
    },
  });

  const dustHazard = await prisma.hazard.create({
    data: {
      missionId: mission.id,
      ownerAgentId: nova.id,
      title: 'Dust plume may degrade the secondary relay pass',
      description:
        'The plume could lower received signal quality and reduce the available emergency command window.',
      impact: 'Loss of high-bandwidth uplink during a sample-return-critical period.',
      likelihood: 0.62,
      indicators: 'Signal-to-noise ratio below 12 dB or plume opacity above 0.45.',
      mitigationPlan:
        'Use the northern ridge relay corridor and transmit compressed imagery before traverse.',
      escalationPath: 'Escalate to Atlas for acceptance before entering a no-relay interval.',
      reviewCadence: 'Every relay pass',
      status: HazardStatus.MITIGATED,
      importance: Importance.CRITICAL,
      classification: Classification.INTERNAL,
      identifiedAt: at('2038-09-16T04:20:00.000Z'),
      nextReviewAt: at('2038-09-16T12:00:00.000Z'),
    },
  });
  await prisma.hazardObjective.createMany({
    data: [
      { hazardId: dustHazard.id, objectiveId: relayObjective.id },
      { hazardId: dustHazard.id, objectiveId: sampleObjective.id },
    ],
  });

  const routeReasoning = await prisma.reasoning.create({
    data: {
      missionId: mission.id,
      authorAgentId: kepler.id,
      claim:
        'A northern ridge traverse preserves the primary relay geometry while retaining access to Site Kappa.',
      conclusion: 'Divert north for one relay cycle, then approach Kappa from the west.',
      assumptions:
        'The plume continues eastward at its measured velocity and the ridge slope remains below the rover threshold.',
      alternatives: 'Remain on the direct southern route or defer sampling until Sol 4.',
      uncertainty:
        'The plume speed could change by ±18%, affecting the duration of degraded visibility.',
      status: ReasoningStatus.ACCEPTED,
      importance: Importance.HIGH,
      confidence: 0.79,
      createdAt: at('2038-09-16T06:40:00.000Z'),
    },
  });
  await prisma.reasoningObservation.createMany({
    data: [
      {
        reasoningId: routeReasoning.id,
        observationId: dustObservation.id,
        stance: EvidenceStance.SUPPORTS,
      },
      {
        reasoningId: routeReasoning.id,
        observationId: orbitalObservation.id,
        stance: EvidenceStance.CONTEXT,
      },
    ],
  });

  const siteDebate = await prisma.debate.create({
    data: {
      missionId: mission.id,
      question:
        'Should ARES-7 divert to Site Kappa before the dust plume reaches the primary relay corridor?',
      admissibilityRules:
        'Positions must cite validated telemetry or imagery and state operational trade-offs.',
      resolutionSummary:
        'Proceed with a constrained northern traverse and drill only after surface confirmation.',
      resolutionAuthority: 'Atlas, Mission Lead',
      status: DebateStatus.RESOLVED,
      importance: Importance.HIGH,
      convenedAt: at('2038-09-16T06:55:00.000Z'),
      resolvedAt: at('2038-09-16T07:20:00.000Z'),
    },
  });
  await prisma.debatePosition.createMany({
    data: [
      {
        debateId: siteDebate.id,
        agentId: sagan.id,
        stance: DebatePositionStance.SUPPORT,
        argument:
          'Kappa offers the strongest hydration signature and surface imagery supports a safe drill face.',
      },
      {
        debateId: siteDebate.id,
        agentId: nova.id,
        stance: DebatePositionStance.CONDITIONAL,
        argument:
          'Support only if the northern ridge is used and compressed telemetry is transmitted before descent.',
      },
      {
        debateId: siteDebate.id,
        agentId: kepler.id,
        stance: DebatePositionStance.ALTERNATIVE,
        argument:
          'Defer drilling until Sol 4 if the next relay pass falls below the signal threshold.',
        isDissent: true,
      },
    ],
  });
  await prisma.debateObservation.createMany({
    data: [
      { debateId: siteDebate.id, observationId: dustObservation.id },
      { debateId: siteDebate.id, observationId: orbitalObservation.id },
      { debateId: siteDebate.id, observationId: surfaceObservation.id },
    ],
  });
  await prisma.debateReasoning.create({
    data: { debateId: siteDebate.id, reasoningId: routeReasoning.id },
  });

  const routeDecision = await prisma.decision.create({
    data: {
      missionId: mission.id,
      proposedByAgentId: atlas.id,
      decidedByAgentId: atlas.id,
      title: 'Adopt northern ridge traverse to Site Kappa',
      chosenOption:
        'Transmit compressed imagery, take the northern ridge relay corridor, then validate Kappa before drilling.',
      rationale:
        'This preserves a viable relay window while maintaining access to the highest-confidence hydrated-mineral target.',
      effectiveScope: 'Sol 2 traverse and Site Kappa sampling sequence.',
      reviewTrigger: 'Signal-to-noise ratio below 12 dB or slope estimate above 14 degrees.',
      reversalConditions:
        'Abort to the safe waypoint and defer drilling until the next viable relay pass.',
      status: DecisionStatus.DECIDED,
      importance: Importance.CRITICAL,
      proposedAt: at('2038-09-16T07:22:00.000Z'),
      decidedAt: at('2038-09-16T07:25:00.000Z'),
    },
  });
  await prisma.decisionReasoning.create({
    data: { decisionId: routeDecision.id, reasoningId: routeReasoning.id },
  });
  await prisma.decisionObservation.createMany({
    data: [
      { decisionId: routeDecision.id, observationId: dustObservation.id },
      { decisionId: routeDecision.id, observationId: surfaceObservation.id },
    ],
  });
  await prisma.decisionHazard.create({
    data: { decisionId: routeDecision.id, hazardId: dustHazard.id },
  });
  await prisma.decisionObjective.createMany({
    data: [
      { decisionId: routeDecision.id, objectiveId: relayObjective.id },
      { decisionId: routeDecision.id, objectiveId: sampleObjective.id },
    ],
  });

  const lesson = await prisma.lesson.create({
    data: {
      missionId: mission.id,
      authorAgentId: atlas.id,
      title: 'Pair relay protection with sample selection under weather uncertainty',
      statement:
        'When dust threatens a relay corridor, a short geometry-preserving diversion can protect communications without abandoning a high-confidence science target.',
      applicability:
        'Autonomous surface missions with alternate relay geometry and time-sensitive sampling objectives.',
      limitations:
        'Not applicable where the diversion exceeds energy reserve or no independent surface confirmation is available.',
      status: LessonStatus.ADMITTED,
      importance: Importance.HIGH,
      confidence: 0.81,
      validatedAt: at('2038-09-16T08:10:00.000Z'),
      reviewAt: at('2039-03-16T00:00:00.000Z'),
    },
  });
  await prisma.lessonObservation.createMany({
    data: [
      { lessonId: lesson.id, observationId: dustObservation.id },
      { lessonId: lesson.id, observationId: surfaceObservation.id },
    ],
  });
  await prisma.lessonReasoning.create({
    data: { lessonId: lesson.id, reasoningId: routeReasoning.id },
  });
  await prisma.lessonDecision.create({
    data: { lessonId: lesson.id, decisionId: routeDecision.id },
  });
  await prisma.lessonDebate.create({ data: { lessonId: lesson.id, debateId: siteDebate.id } });
  await prisma.lessonHazard.create({ data: { lessonId: lesson.id, hazardId: dustHazard.id } });

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
      stewardAgentId: atlas.id,
      status: VaultEntryStatus.ACTIVE,
      admittedAt: at('2038-09-16T08:15:00.000Z'),
      reviewAt: at('2039-03-16T00:00:00.000Z'),
    },
  });

  const capsuleInputs = [
    [
      CapsuleEntityType.OBJECTIVE,
      relayObjective.id,
      atlas.id,
      '2038-09-14T06:00:00.000Z',
      Importance.CRITICAL,
      1,
    ],
    [
      CapsuleEntityType.OBJECTIVE,
      sampleObjective.id,
      atlas.id,
      '2038-09-14T06:00:00.000Z',
      Importance.HIGH,
      1,
    ],
    [
      CapsuleEntityType.OBSERVATION,
      dustObservation.id,
      nova.id,
      '2038-09-16T04:12:00.000Z',
      Importance.CRITICAL,
      0.91,
    ],
    [
      CapsuleEntityType.OBSERVATION,
      orbitalObservation.id,
      kepler.id,
      '2038-09-16T05:04:00.000Z',
      Importance.HIGH,
      0.88,
    ],
    [
      CapsuleEntityType.OBSERVATION,
      surfaceObservation.id,
      sagan.id,
      '2038-09-16T06:26:00.000Z',
      Importance.HIGH,
      0.84,
    ],
    [
      CapsuleEntityType.HAZARD,
      dustHazard.id,
      nova.id,
      '2038-09-16T04:20:00.000Z',
      Importance.CRITICAL,
      0.9,
    ],
    [
      CapsuleEntityType.REASONING,
      routeReasoning.id,
      kepler.id,
      '2038-09-16T06:40:00.000Z',
      Importance.HIGH,
      0.79,
    ],
    [
      CapsuleEntityType.DEBATE,
      siteDebate.id,
      atlas.id,
      '2038-09-16T07:20:00.000Z',
      Importance.HIGH,
      0.82,
    ],
    [
      CapsuleEntityType.DECISION,
      routeDecision.id,
      atlas.id,
      '2038-09-16T07:25:00.000Z',
      Importance.CRITICAL,
      0.95,
    ],
    [
      CapsuleEntityType.LESSON,
      lesson.id,
      atlas.id,
      '2038-09-16T08:10:00.000Z',
      Importance.HIGH,
      0.81,
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
            embeddingReference: `embedding://ares-7/${referencedEntityType.toLowerCase()}/${referencedEntityId}`,
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
        'ARES-7 is active. The northern ridge route protects the next relay pass while preserving access to Site Kappa. Validate signal quality and slope before drilling.',
      capsules: {
        create: capsules.map((capsule, index) => ({
          capsuleId: capsule.id,
          relevanceRank: index < 2 ? 100 - index : 90 - index,
          inclusionReason: index < 2 ? 'Mission priority' : 'Current ARES-7 operational evidence',
        })),
      },
    },
  });

  const snapshot = await prisma.missionSnapshot.create({
    data: {
      missionId: mission.id,
      missionContextId: context.id,
      version: 1,
      trigger: 'Material hazard change and authorized route decision',
      summary:
        'Continuity handoff after Sol 2 route decision: protect the relay pass via the northern ridge, then validate Site Kappa before drilling.',
      unresolvedItems:
        'Confirm next-pass signal-to-noise ratio and local ridge slope before descent.',
      completenessNote: 'Includes all CRITICAL and HIGH capsules available at decision time.',
      status: SnapshotStatus.PUBLISHED,
      generatedAt: at('2038-09-16T08:20:00.000Z'),
      publishedAt: at('2038-09-16T08:22:00.000Z'),
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
      authorAgentId: atlas.id,
      occurredAt: at('2038-09-16T08:22:00.000Z'),
      importance: Importance.HIGH,
      confidence: 1,
      embeddingReference: `embedding://ares-7/mission-snapshot/${snapshot.id}`,
    },
  });

  console.log(`Seeded ${mission.code}: ${mission.name}`);
  console.log(`Mission ID: ${mission.id}`);
  console.log('');
  console.log('Set this in your environment to run the demo:');
  console.log(`  apps/web/.env.local  ->  NEXT_PUBLIC_MISSION_ID=${mission.id}`);
  console.log(`  simulator            ->  MISSION_ID=${mission.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
