'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, missionId } from '../services/api';
import type { FleetAgent, Objective, TimelineItem } from '../types/mission';

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

// Production-safe run token: prefer crypto.randomUUID (secure contexts), fall
// back to crypto.getRandomValues, then to a time+random mix. Always returns 8
// hex characters so the existing run-id format is preserved.
function runToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().slice(0, 8);
  if (c && typeof c.getRandomValues === 'function') {
    const buffer = new Uint8Array(4);
    c.getRandomValues(buffer);
    return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  const value = ((Date.now() & 0xffff) * 0x10000 + Math.floor(Math.random() * 0x10000)) >>> 0;
  return value.toString(16).padStart(8, '0');
}

export function useMissionControl() {
  const client = useQueryClient();
  const [agents, setAgents] = useState(baseline);
  const [isRunning, setRunning] = useState(false);
  const [highlightFailure, setHighlightFailure] = useState(false);
  const [handoffStage, setHandoffStage] = useState<string | null>(null);
  const [phase, setPhase] = useState('Survey preparation');
  const [elapsed, setElapsed] = useState('00:00:00');
  const knownCapsuleIds = useRef<string[]>([]);
  const hasHydratedTimeline = useRef(false);
  const [newCapsuleIds, setNewCapsuleIds] = useState<string[]>([]);
  const [recoveredCapsuleCount, setRecoveredCapsuleCount] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // MissionSnapshot.version is assigned sequentially per mission
  // (latestSnapshot.version + 1), so it already is the mission's total
  // snapshot count — a correct, always-incrementing source. The alternative,
  // counting timeline items of type MISSION_SNAPSHOT, is not: nothing in the
  // snapshot-generation path records a Memory Capsule for the snapshot
  // itself, so that count never moves when a real snapshot is created.
  const [snapshotVersion, setSnapshotVersion] = useState<number | null>(null);

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
  const objectivesQuery = useQuery({
    queryKey: ['objectives', missionId],
    queryFn: api.objectives,
    enabled: Boolean(missionId),
    refetchInterval: isRunning ? 2000 : 10000,
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

    // The first successful timeline fetch is Continuum recovering persisted
    // Memory Capsules from CockroachDB, not new activity — those capsules may
    // be seconds or weeks old. Seed the known-id set from that fetch without
    // flagging any of it as "fresh" (which drives the live-arrival glow), and
    // record how many capsules were recovered so the UI can say so. Every
    // fetch after this one behaves as before: only ids not previously seen
    // are treated as newly arrived.
    if (!hasHydratedTimeline.current) {
      if (!timelineQuery.isSuccess) return;
      hasHydratedTimeline.current = true;
      knownCapsuleIds.current = ids;
      setRecoveredCapsuleCount(ids.length);
      return;
    }

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
  }, [timeline, timelineQuery.isSuccess]);

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
    setError(null);
    // A prior run may have left the fleet mutated (navigation OFFLINE, a
    // 'replacement' entry appended) and the phase/elapsed readouts at their
    // final values. Without this reset, running the demo a second time in the
    // same session appends a second 'replacement' entry with a duplicate id
    // instead of replacing the first, and phase/elapsed briefly show the
    // previous run's completed state before the new run overwrites them.
    setAgents(baseline);
    setPhase('Survey preparation');
    setElapsed('00:00:00');
    // Each Start Demo press begins a fresh, isolated mission run. The run id
    // namespaces every agent handle so repeated runs never collide on the
    // globally-unique Agent.handle. An explicit NEXT_PUBLIC_SIMULATOR_RUN_ID is
    // treated as a base label; a unique suffix is always appended so a fixed
    // env value can never reintroduce duplicate handles.
    const runBase = process.env.NEXT_PUBLIC_SIMULATOR_RUN_ID ?? 'mission-control-demo';
    const run = `${runBase}-${runToken()}`;
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
      // Objectives are pending until execution actually begins. Now that agents
      // are assigned and the survey is underway, move the mission's real
      // objectives to ACTIVE through the existing PATCH contract. The ids come
      // from the API, so the UI never invents objective state.
      const objectives = await api.objectives();
      await Promise.all(
        objectives
          .filter((objective) => objective.status === 'PROPOSED' || objective.status === 'APPROVED')
          .map((objective) => api.patch(`/objectives/${objective.id}`, { status: 'ACTIVE' })),
      );
      await Promise.all([
        observation(navigation.agent.id, 'Western ingress route established.'),
        observation(science.agent.id, 'Unusual hydrated mineral deposit identified.', 'HIGH'),
        observation(power.agent.id, 'Power systems healthy.'),
        observation(communications.agent.id, 'Orbital relay confirmed.'),
      ]);
      await client.invalidateQueries({ queryKey: ['timeline', missionId] });
      await client.invalidateQueries({ queryKey: ['objectives', missionId] });
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
      const snapshot = await api.snapshot();
      setSnapshotVersion(snapshot.snapshot.version);
      setPhase('Mission complete — Continuity validated');
      await client.invalidateQueries();
      setComplete(true);
    } catch (cause) {
      // Stop the demo cleanly on any failed API call: existing mission data is
      // preserved (nothing is deleted), the error is not swallowed (logged for
      // diagnostics), and a user-friendly message is surfaced for the operator.
      console.error('Mission Control demo halted:', cause);
      setHandoffStage(null);
      setError(
        'Mission Control demo interrupted by a connection issue. Press Start Demo to retry.',
      );
    } finally {
      setRunning(false);
    }
  }

  return {
    timeline,
    context: contextQuery.data,
    knowledge: knowledgeQuery.data ?? [],
    objectives: (objectivesQuery.data ?? []) as Objective[],
    objectivesLoading: objectivesQuery.isPending,
    agents,
    replayAgents,
    isRunning,
    highlightFailure,
    handoffStage,
    phase,
    elapsed,
    startDemo,
    isUnavailable: !missionId,
    // Before this session generates a snapshot there is no live way to learn
    // the mission's true snapshot count without a new read endpoint, so the
    // pre-demo display falls back to the (best-effort) capsule count; once
    // Start Demo publishes a snapshot, its own response is authoritative.
    snapshots:
      snapshotVersion ?? timeline.filter((item) => item.type === 'MISSION_SNAPSHOT').length,
    newCapsuleIds,
    recoveredCapsuleCount,
    complete,
    error,
    apiConnected: contextQuery.isSuccess || timelineQuery.isSuccess,
    memoryConnected: contextQuery.isSuccess,
  };
}
