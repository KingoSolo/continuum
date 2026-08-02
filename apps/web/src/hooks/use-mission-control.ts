'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, missionId } from '../services/api';
import type { FleetAgent, TimelineItem } from '../types/mission';

const baseline: FleetAgent[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    role: 'Route planning',
    status: 'ACTIVE',
    health: 100,
    confidence: 94,
    task: 'Establish ingress route',
    lastMemory: 'Awaiting telemetry',
  },
  {
    id: 'science',
    name: 'Science',
    role: 'Geology',
    status: 'ACTIVE',
    health: 100,
    confidence: 92,
    task: 'Survey mineral deposit',
    lastMemory: 'Awaiting telemetry',
  },
  {
    id: 'power',
    name: 'Power',
    role: 'Systems',
    status: 'ACTIVE',
    health: 100,
    confidence: 98,
    task: 'Monitor reserve capacity',
    lastMemory: 'Awaiting telemetry',
  },
  {
    id: 'communications',
    name: 'Communications',
    role: 'Relay',
    status: 'ACTIVE',
    health: 100,
    confidence: 97,
    task: 'Hold orbital relay',
    lastMemory: 'Awaiting telemetry',
  },
];
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useMissionControl() {
  const client = useQueryClient();
  const [agents, setAgents] = useState(baseline);
  const [isRunning, setRunning] = useState(false);
  const [highlightFailure, setHighlightFailure] = useState(false);
  const [handoffStage, setHandoffStage] = useState<string | null>(null);
  const [phase, setPhase] = useState('Survey preparation');
  const [elapsed, setElapsed] = useState('00:00:00');
  const knownCapsuleIds = useRef<string[]>([]);
  const [newCapsuleIds, setNewCapsuleIds] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);

  const timelineQuery = useQuery({
    queryKey: ['timeline', missionId],
    queryFn: api.timeline,
    enabled: Boolean(missionId),
    refetchInterval: isRunning ? 2000 : 10000,
  });
  const contextQuery = useQuery({
    queryKey: ['context', missionId],
    queryFn: api.context,
    enabled: Boolean(missionId),
    refetchInterval: isRunning ? 2000 : 10000,
  });
  const knowledgeQuery = useQuery({
    queryKey: ['knowledge', missionId],
    queryFn: api.knowledge,
    enabled: Boolean(missionId),
    refetchInterval: 10000,
  });
  const timeline = useMemo<TimelineItem[]>(
    () =>
      (timelineQuery.data ?? [])
        .map((item) => ({
          id: item.id,
          occurredAt: item.occurredAt,
          importance: item.importance,
          type: item.referencedEntityType,
          agent: item.authorAgentId.slice(0, 8),
          description: `${item.referencedEntityType.replaceAll('_', ' ')} committed to mission memory`,
        }))
        .reverse(),
    [timelineQuery.data],
  );

  useEffect(() => {
    const ids = timeline.map((t) => t.id);

    const previous = knownCapsuleIds.current;

    const arrived = ids.filter((id) => !previous.includes(id));

    if (arrived.length) {
      setNewCapsuleIds(arrived);

      const timer = window.setTimeout(() => setNewCapsuleIds([]), 1800);

      knownCapsuleIds.current = ids;

      return () => clearTimeout(timer);
    }

    if (previous.length !== ids.length) {
      knownCapsuleIds.current = ids;
    }
  }, [timeline]);

  function replayAgents(index: number | null) {
    if (index === null) return agents;
    const event = timeline[index];
    if (!event) return baseline;
    const beforeReplacement = !timeline.slice(index).some((item) => item.type === 'LESSON');
    return baseline.map((agent) =>
      agent.id === 'navigation' && beforeReplacement
        ? {
            ...agent,
            status: 'OFFLINE' as const,
            health: 0,
            task: 'Navigation unavailable in replay state',
          }
        : agent,
    );
  }

  async function startDemo() {
    if (!missionId || isRunning) return;
    setRunning(true);
    setComplete(false);
    setHandoffStage(null);
    setHighlightFailure(false);
    // Each Start Demo press begins a fresh, isolated mission run. The run id
    // namespaces every agent handle so repeated runs never collide on the
    // globally-unique Agent.handle. An explicit NEXT_PUBLIC_SIMULATOR_RUN_ID is
    // treated as a base label; a unique suffix is always appended so a fixed
    // env value can never reintroduce duplicate handles.
    const runBase = process.env.NEXT_PUBLIC_SIMULATOR_RUN_ID ?? 'mission-control-demo';
    const run = `${runBase}-${crypto.randomUUID().slice(0, 8)}`;
    try {
      const register = (name: string, role: string, authority: string, capabilities: string[]) =>
        api.post<{ agent: { id: string } }>('/agents', {
          handle: `${run}-${name.toLowerCase()}`,
          displayName: `${name} Agent`,
          role,
          authority,
          capabilities,
        });
      const [navigation, science, power, communications] = await Promise.all([
        register('Navigation', 'Navigation', 'DECIDE', ['route-planning']),
        register('Science', 'Science', 'PROPOSE', ['geology']),
        register('Power', 'Power', 'CONTRIBUTE', ['power']),
        register('Communications', 'Communications', 'CONTRIBUTE', ['relay']),
      ]);
      const observation = (agent: string, statement: string, importance = 'NORMAL') =>
        api.post('/observations', {
          authorAgentId: agent,
          statement,
          scope: 'ARES-7 lava tube survey',
          sourceName: 'ARES-7 sensor suite',
          isDirectEvidence: true,
          importance,
          confidence: 0.94,
          capturedAt: '2042-07-14T09:00:00.000Z',
        });
      setPhase('Phase 1 — Survey underway');
      await Promise.all([
        observation(navigation.agent.id, 'Western ingress route established.'),
        observation(science.agent.id, 'Unusual hydrated mineral deposit identified.', 'HIGH'),
        observation(power.agent.id, 'Power systems healthy.'),
        observation(communications.agent.id, 'Orbital relay confirmed.'),
      ]);
      await client.invalidateQueries({ queryKey: ['timeline', missionId] });
      setElapsed('00:00:12');
      await pause(500);
      setPhase('Phase 2 — Terrain assessment');
      await observation(
        science.agent.id,
        'Fractured basalt detected beneath western traverse.',
        'CRITICAL',
      );
      const hazard = await api.post<{ id: string }>('/hazards', {
        reporterAgentId: science.agent.id,
        ownerAgentId: navigation.agent.id,
        title: 'Unstable western traverse',
        description: 'Fractured basalt collapse risk.',
        impact: 'Mobility loss',
        likelihood: 0.74,
        mitigationPlan: 'Use eastern shelf.',
        importance: 'CRITICAL',
      });
      await api.post('/reasoning', {
        authorAgentId: science.agent.id,
        claim: 'Western traverse is unsafe.',
        conclusion: 'Use eastern shelf.',
        assumptions: 'Fracture density predicts load risk.',
        importance: 'CRITICAL',
        confidence: 0.89,
      });
      const debate = await api.post<{ id: string }>('/debates', {
        convenedByAgentId: science.agent.id,
        question: 'Continue on western ingress?',
        importance: 'CRITICAL',
        positions: [
          { agentId: navigation.agent.id, stance: 'SUPPORT', argument: 'Shortest route.' },
          { agentId: science.agent.id, stance: 'OPPOSE', argument: 'Collapse risk.' },
        ],
      });
      await api.post(`/debates/${debate.id}/resolve`, {
        resolutionSummary: 'Safety prevails.',
        resolutionAuthority: 'Mission safety policy',
      });
      const decision = await api.post<{ id: string }>('/decisions', {
        proposedByAgentId: navigation.agent.id,
        decidedByAgentId: navigation.agent.id,
        title: 'Use eastern shelf',
        chosenOption: 'Reroute east',
        rationale: 'Avoid unstable terrain.',
        effectiveScope: 'Current traverse',
        importance: 'CRITICAL',
      });
      await api.post(`/decisions/${decision.id}/execute`);
      await client.invalidateQueries({ queryKey: ['timeline', missionId] });
      setElapsed('00:00:46');
      setPhase('Phase 3 — Navigation contingency');
      setHighlightFailure(true);
      setAgents((current) =>
        current.map((agent) =>
          agent.id === 'navigation'
            ? { ...agent, status: 'OFFLINE', health: 0, task: '⚠ Navigation Agent Offline' }
            : agent,
        ),
      );
      await api.post(`/agents/${navigation.agent.id}/fail`);
      setHandoffStage('Recovering Mission Context…');
      await pause(550);
      setHandoffStage('Loading Operational Memory…');
      const replacement = await api.post<{ agent: { id: string } }>(
        `/agents/${navigation.agent.id}/replace`,
        {
          handle: `${run}-navigation-replacement`,
          displayName: 'Navigation Replacement Agent',
          role: 'Navigation',
          authority: 'DECIDE',
          capabilities: ['route-planning', 'continuity-handoff'],
        },
      );
      await api.context();
      await api.get(`/agents/${replacement.agent.id}/context`);
      setHandoffStage('Replacement Agent Online');
      setAgents((current) => [
        ...current,
        {
          id: 'replacement',
          name: 'Navigation Replacement',
          role: 'Continuity handoff',
          status: 'REPLACEMENT',
          health: 100,
          confidence: 96,
          task: 'Mission Context Retrieved',
          lastMemory: 'Eastern shelf decision inherited',
        },
      ]);
      await pause(550);
      setHandoffStage('Mission Resumed');
      setElapsed('00:01:00');
      setPhase('Phase 4 — Mission resumed');
      await api.patch(`/hazards/${hazard.id}/resolve`);
      const lesson = await api.post<{ id: string }>('/lessons', {
        authorAgentId: replacement.agent.id,
        title: 'Terrain hazards must survive agent handoff',
        statement: 'Curated Mission Context enabled immediate safe route continuity.',
        applicability: 'Autonomous surface missions',
        importance: 'HIGH',
        confidence: 0.96,
      });
      await api.post(`/lessons/${lesson.id}/promote`);
      await api.context();
      await api.snapshot();
      setPhase('Mission complete — Continuity validated');
      await client.invalidateQueries();
      setComplete(true);
    } finally {
      setRunning(false);
    }
  }

  return {
    timeline,
    context: contextQuery.data,
    knowledge: knowledgeQuery.data ?? [],
    agents,
    replayAgents,
    isRunning,
    highlightFailure,
    handoffStage,
    phase,
    elapsed,
    startDemo,
    isUnavailable: !missionId,
    snapshots: timeline.filter((item) => item.type === 'MISSION_SNAPSHOT').length,
    newCapsuleIds,
    complete,
    apiConnected: contextQuery.isSuccess || timelineQuery.isSuccess,
    memoryConnected: contextQuery.isSuccess,
  };
}
