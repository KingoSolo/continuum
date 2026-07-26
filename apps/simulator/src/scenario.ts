import type { DemoLogger } from './presentation-logger.js';
import type { MissionApi, ScenarioConfig, ScenarioSummary } from './types.js';

const occurredAt = '2042-07-14T09:00:00.000Z';

export class Ares7LavaTubeScenario {
  constructor(
    private readonly api: MissionApi,
    private readonly config: ScenarioConfig,
    private readonly logger: DemoLogger,
  ) {}

  async run(): Promise<ScenarioSummary> {
    const { missionId, runId } = this.config;
    const navigation = await this.register(
      missionId,
      runId,
      'navigation',
      'Navigation Agent',
      'Navigation',
      'DECIDE',
      ['route-planning', 'terrain-analysis'],
    );
    const science = await this.register(
      missionId,
      runId,
      'science',
      'Science Agent',
      'Science',
      'PROPOSE',
      ['mineralogy', 'geology'],
    );
    const power = await this.register(
      missionId,
      runId,
      'power',
      'Power Agent',
      'Power',
      'CONTRIBUTE',
      ['battery-management'],
    );
    const communications = await this.register(
      missionId,
      runId,
      'communications',
      'Communications Agent',
      'Communications',
      'CONTRIBUTE',
      ['relay-management'],
    );

    this.logger.tick(1);
    this.logger.event('Mission Control', 'ARES-7 lava-tube survey initiated');
    await this.observe(
      missionId,
      navigation.id,
      'A stable western ingress route is available for the lava-tube survey.',
      'Navigation Agent',
      'Route Established',
    );
    await this.observe(
      missionId,
      science.id,
      'A hydrated sulphate deposit is visible along the western ingress wall.',
      'Science Agent',
      'Mineral Deposit Identified',
    );
    await this.observe(
      missionId,
      power.id,
      'Battery charge, thermal margin, and reserve power remain within nominal limits.',
      'Power Agent',
      'Systems Healthy',
    );
    await this.observe(
      missionId,
      communications.id,
      'Orbital relay lock is stable for the planned survey window.',
      'Communications Agent',
      'Relay Confirmed',
    );

    this.logger.tick(12);
    await this.observe(
      missionId,
      science.id,
      'Subsurface imaging shows fractured basalt beneath the proposed western traverse.',
      'Science Agent',
      'Unstable Terrain Observed',
      'CRITICAL',
    );

    this.logger.tick(18);
    const hazard = await this.api.reportHazard(missionId, {
      reporterAgentId: science.id,
      ownerAgentId: navigation.id,
      title: 'Unstable western traverse',
      description: 'Fractured basalt may collapse under rover load near the mineral deposit.',
      impact: 'Loss of rover mobility and mission-critical science payload.',
      likelihood: 0.74,
      mitigationPlan: 'Use the eastern shelf and preserve a 12-metre exclusion zone.',
      importance: 'CRITICAL',
    });
    this.logger.event('Science Agent', 'Hazard Detected');

    this.logger.tick(21);
    await this.api.createReasoning(missionId, {
      authorAgentId: science.id,
      claim: 'The western traverse is not safe for autonomous traversal.',
      conclusion: 'Adopt the eastern shelf route before approaching the mineral deposit.',
      assumptions: 'Fracture density correlates with surface load-bearing risk.',
      alternatives: 'Proceed west at reduced speed with continuous ground-penetrating radar.',
      uncertainty: 'Subsurface fracture depth has a two-metre confidence interval.',
      importance: 'CRITICAL',
      confidence: 0.89,
    });
    this.logger.event('Science Agent', 'Reasoning Generated');

    this.logger.tick(24);
    const debate = await this.api.startDebate(missionId, {
      convenedByAgentId: science.id,
      question: 'Should ARES-7 continue along the western ingress to reach the mineral deposit?',
      admissibilityRules: 'Use validated terrain and relay evidence; preserve rover safety.',
      importance: 'CRITICAL',
      positions: [
        {
          agentId: navigation.id,
          stance: 'SUPPORT',
          argument: 'The western route is shortest and maintains relay geometry.',
        },
        {
          agentId: science.id,
          stance: 'OPPOSE',
          argument: 'Fractured basalt creates an unacceptable collapse risk.',
        },
      ],
    });
    this.logger.event('Navigation + Science', 'Debate Started');

    this.logger.tick(28);
    await this.api.resolveDebate(missionId, debate.id, {
      resolutionSummary: 'Safety evidence outweighs the western-route distance advantage.',
      resolutionAuthority: 'ARES-7 autonomous mission safety policy',
    });
    this.logger.event('Mission Control', 'Debate Resolved');

    this.logger.tick(31);
    const decision = await this.api.createDecision(missionId, {
      proposedByAgentId: navigation.id,
      decidedByAgentId: navigation.id,
      title: 'Use eastern shelf route',
      chosenOption: 'Reroute around the western traverse via the eastern shelf.',
      rationale: 'Preserves rover safety while retaining access to the mineral deposit.',
      effectiveScope: 'All autonomous traversal until terrain is reassessed.',
      reviewTrigger: 'New validated terrain scan of the western traverse.',
      reversalConditions: 'Independent evidence confirms stable load-bearing basalt.',
      importance: 'CRITICAL',
    });
    await this.api.executeDecision(missionId, decision.id);
    this.logger.event('Navigation Agent', 'Decision Approved');

    this.logger.tick(46);
    await this.api.failAgent(missionId, navigation.id);
    this.logger.event('Navigation Agent', 'Offline — permanent navigation processor failure');

    this.logger.tick(47);
    const replacement = await this.api.replaceAgent(missionId, navigation.id, {
      handle: `${runId}-navigation-replacement`,
      displayName: 'Navigation Agent Replacement',
      role: 'Navigation',
      authority: 'DECIDE',
      capabilities: ['route-planning', 'terrain-analysis', 'continuity-handoff'],
    });
    this.logger.event('Replacement Navigation Agent', 'Online');
    await this.api.buildContext(missionId);
    const inheritedContext = await this.api.getAgentContext(missionId, replacement.agent.id);
    this.logger.event(
      'Replacement Navigation Agent',
      `Mission Context Retrieved (${inheritedContext.selectedCapsuleIds.length} selected capsules)`,
    );
    this.logger.event('Mission Control', 'Mission Resumed — no full replay required');

    this.logger.tick(52);
    await this.observe(
      missionId,
      replacement.agent.id,
      'Inherited route decision applied: the eastern shelf avoids the unstable western traverse.',
      'Replacement Navigation Agent',
      'Inherited Context Applied',
      'HIGH',
    );
    this.logger.event('Replacement Navigation Agent', 'Eastern shelf route engaged');
    await this.api.resolveHazard(missionId, hazard.id);

    this.logger.tick(58);
    const lesson = await this.api.recordLesson(missionId, {
      authorAgentId: replacement.agent.id,
      title: 'Continuity handoffs must elevate terrain hazards and route decisions',
      statement:
        'A replacement navigator safely resumed planning from curated Mission Context after a permanent agent failure.',
      applicability: 'Autonomous surface missions operating with terrain-dependent route plans.',
      limitations: 'Requires timely Memory Capsule creation and an active Mission Context.',
      importance: 'HIGH',
      confidence: 0.96,
    });
    await this.api.promoteLesson(missionId, lesson.id);
    this.logger.event('Replacement Navigation Agent', 'Lesson Promoted to Operational Knowledge');

    this.logger.tick(60);
    await this.api.buildContext(missionId);
    const snapshot = await this.api.generateSnapshot(missionId);
    const timeline = await this.api.getTimeline(missionId);
    const knowledge = await this.api.getKnowledge(missionId);
    this.logger.event('Mission Control', 'Mission Snapshot Created');

    const summary: ScenarioSummary = {
      missionDuration: '60 ticks',
      observations: 6,
      hazards: hazard ? 1 : 0,
      debates: debate ? 1 : 0,
      decisions: decision ? 1 : 0,
      lessons: lesson ? 1 : 0,
      memoryCapsules: timeline.length,
      missionSnapshotCreated: Boolean(snapshot.snapshot.id),
      operationalKnowledgeAdded: knowledge.length > 0,
      replacementAgentSuccess: inheritedContext.selectedCapsuleIds.length > 0,
    };
    this.logger.summary({
      'Mission Duration': summary.missionDuration,
      Observations: summary.observations,
      Hazards: summary.hazards,
      Debates: summary.debates,
      Decisions: summary.decisions,
      Lessons: summary.lessons,
      'Memory Capsules': summary.memoryCapsules,
      'Mission Snapshot Created': summary.missionSnapshotCreated,
      'Operational Knowledge Added': summary.operationalKnowledgeAdded,
      'Replacement Agent Success': summary.replacementAgentSuccess,
    });
    return summary;
  }

  private async register(
    missionId: string,
    runId: string,
    handle: string,
    displayName: string,
    role: string,
    authority: string,
    capabilities: string[],
  ) {
    const result = await this.api.registerAgent(missionId, {
      handle: `${runId}-${handle}`,
      displayName,
      role,
      authority,
      capabilities,
    });
    return result.agent;
  }

  private async observe(
    missionId: string,
    authorAgentId: string,
    statement: string,
    actor: string,
    event: string,
    importance: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL',
  ) {
    await this.api.recordObservation(missionId, {
      authorAgentId,
      statement,
      scope: 'ARES-7 Martian lava-tube survey',
      sourceName: 'ARES-7 autonomous sensor suite',
      isDirectEvidence: true,
      importance,
      confidence: 0.94,
      capturedAt: occurredAt,
    });
    this.logger.event(actor, event);
  }
}
