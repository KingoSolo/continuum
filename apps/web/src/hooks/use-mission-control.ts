'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, missionId } from '../services/api';
import type { FleetAgent, Objective, TimelineItem } from '../types/mission';

const baseline: FleetAgent[] = [
  {
    id: 'navigation',
    name: 'On-Call Engineer',
    role: 'Incident authority',
    status: 'ACTIVE',
    health: 100,
    confidence: 94,
    task: 'Direct incident response',
    lastMemory: 'Awaiting alert',
  },
  {
    id: 'science',
    name: 'Database/SRE',
    role: 'Diagnostics',
    status: 'ACTIVE',
    health: 100,
    confidence: 92,
    task: 'Analyze database health',
    lastMemory: 'Awaiting metrics',
  },
  {
    id: 'power',
    name: 'Infrastructure',
    role: 'Failover execution',
    status: 'ACTIVE',
    health: 100,
    confidence: 98,
    task: 'Execute failover',
    lastMemory: 'Awaiting signal',
  },
  {
    id: 'communications',
    name: 'Status Page / Comms',
    role: 'Notifications',
    status: 'ACTIVE',
    health: 100,
    confidence: 97,
    task: 'Update stakeholders',
    lastMemory: 'Awaiting incident updates',
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
  // Objectives visually show as complete during the demo-completion modal, but
  // are never persisted to the database as ACHIEVED. This way, refreshing the
  // page returns to a fresh mission state for repeated demo runs, while still
  // giving the satisfying visual closure of seeing objectives complete during
  // the narrative.
  const [objectivesCompleted, setObjectivesCompleted] = useState(false);
  // MissionSnapshot.version is assigned sequentially per mission
  // (latestSnapshot.version + 1), so it already is the mission's total
  // snapshot count — a correct, always-incrementing source. The alternative,
  // counting timeline items of type MISSION_SNAPSHOT, is not: nothing in the
  // snapshot-generation path records a Memory Capsule for the snapshot
  // itself, so that count never moves when a real snapshot is created.
  const [snapshotVersion, setSnapshotVersion] = useState<number | null>(null);
  const [snapshotArchiveStatus, setSnapshotArchiveStatus] = useState<string | null>(null);

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
    setObjectivesCompleted(false);
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
          scope: 'Production database incident response',
          sourceName: 'Production monitoring and alerting',
          isDirectEvidence: true,
          importance,
          confidence: 0.94,
          capturedAt: new Date().toISOString(),
        });
      setPhase('Phase 1 — Incident triage');
      // Objectives are pending until execution actually begins. Now that agents
      // are assigned and the incident response is underway, move the mission's real
      // objectives to ACTIVE through the existing PATCH contract. The ids come
      // from the API, so the UI never invents objective state.
      const objectives = await api.objectives();
      await Promise.all(
        objectives
          .filter((objective) => objective.status === 'PROPOSED' || objective.status === 'APPROVED')
          .map((objective) => api.patch(`/objectives/${objective.id}`, { status: 'ACTIVE' })),
      );
      await Promise.all([
        observation(
          navigation.agent.id,
          'Primary database connection pool exhaustion detected at 98% utilization.',
        ),
        observation(
          science.agent.id,
          'Primary read latency elevated to 850ms p99; replica-east is nominal at 120ms.',
          'HIGH',
        ),
        observation(power.agent.id, 'Replica-east is healthy; replication lag under 100ms.'),
        observation(communications.agent.id, 'Status page updated to investigating state.'),
      ]);
      await client.invalidateQueries({ queryKey: ['timeline', missionId] });
      await client.invalidateQueries({ queryKey: ['objectives', missionId] });
      setElapsed('00:00:12');
      await pause(500);
      setPhase('Phase 2 — Root cause assessment');
      await observation(
        science.agent.id,
        'Connection leak suspected in session management layer; pool exhaustion cascading.',
        'CRITICAL',
      );
      const hazard = await api.post<{ id: string }>('/hazards', {
        reporterAgentId: science.agent.id,
        ownerAgentId: navigation.agent.id,
        title: 'Primary database connection pool exhaustion risks cascading outage',
        description:
          'Sustained exhaustion at 98% utilization creates imminent risk of full availability loss.',
        impact: 'Complete write unavailability; estimated user impact 100% of affected region.',
        likelihood: 0.74,
        mitigationPlan: 'Failover to replica-east immediately.',
        importance: 'CRITICAL',
      });
      await api.post('/reasoning', {
        authorAgentId: science.agent.id,
        claim: 'Primary database is unsafe for writes due to connection pool exhaustion.',
        conclusion: 'Failover to replica-east immediately.',
        assumptions: 'Replica-east replication lag remains stable.',
        importance: 'CRITICAL',
        confidence: 0.88,
      });
      const debate = await api.post<{ id: string }>('/debates', {
        convenedByAgentId: science.agent.id,
        question: 'Should we immediately failover to replica-east?',
        importance: 'CRITICAL',
        positions: [
          {
            agentId: navigation.agent.id,
            stance: 'SUPPORT',
            argument: 'Fastest path to recovery.',
          },
          {
            agentId: power.agent.id,
            stance: 'SUPPORT',
            argument: 'Replica-east is ready and healthy.',
          },
        ],
      });
      await api.post(`/debates/${debate.id}/resolve`, {
        resolutionSummary: 'Failover approved.',
        resolutionAuthority: 'On-Call authority policy',
      });
      const decision = await api.post<{ id: string }>('/decisions', {
        proposedByAgentId: navigation.agent.id,
        decidedByAgentId: navigation.agent.id,
        title: 'Failover to replica-east',
        chosenOption: 'Shift write traffic to replica-east',
        rationale: 'Eliminates cascading outage risk while investigation continues.',
        effectiveScope: 'All production database write traffic',
        importance: 'CRITICAL',
      });
      await api.post(`/decisions/${decision.id}/execute`);
      await client.invalidateQueries({ queryKey: ['timeline', missionId] });
      setElapsed('00:00:46');
      setPhase('Phase 3 — On-call handoff');
      setHighlightFailure(true);
      setAgents((current) =>
        current.map((agent) =>
          agent.id === 'navigation'
            ? { ...agent, status: 'OFFLINE', health: 0, task: '⚠ On-Call Engineer Offline' }
            : agent,
        ),
      );
      await api.post(`/agents/${navigation.agent.id}/fail`);
      setHandoffStage('Recovering Incident Context…');
      await pause(550);
      setHandoffStage('Loading Operational Memory…');
      const replacement = await api.post<{ agent: { id: string } }>(
        `/agents/${navigation.agent.id}/replace`,
        {
          handle: `${run}-oncall-replacement`,
          displayName: 'On-Call Replacement',
          role: 'Incident authority',
          authority: 'DECIDE',
          capabilities: ['incident-response', 'continuity-handoff'],
        },
      );
      await api.context();
      await api.get(`/agents/${replacement.agent.id}/context`);
      setHandoffStage('Replacement Responder Online');
      setAgents((current) => [
        ...current,
        {
          id: 'replacement',
          name: 'On-Call Replacement',
          role: 'Continuity response',
          status: 'REPLACEMENT',
          health: 100,
          confidence: 96,
          task: 'Incident Context Retrieved',
          lastMemory: 'Failover decision inherited',
        },
      ]);
      await pause(550);
      setHandoffStage('Incident Response Continues');
      setElapsed('00:01:00');
      setPhase('Phase 4 — Incident resolution');
      await api.patch(`/hazards/${hazard.id}/resolve`);
      const lesson = await api.post<{ id: string }>('/lessons', {
        authorAgentId: replacement.agent.id,
        title: 'Incident context must survive on-call responder handoff',
        statement:
          'Curated incident context enabled the replacement responder to inherit the hazard, failover decision, and investigation plan instantly—without re-analysis.',
        applicability: 'Production incident response and on-call rotation handoffs',
        importance: 'HIGH',
        confidence: 0.92,
      });
      await api.post(`/lessons/${lesson.id}/promote`);
      await api.context();
      const snapshot = await api.snapshot();
      setSnapshotVersion(snapshot.snapshot.version);
      setSnapshotArchiveStatus(snapshot.snapshot.archiveStatus);
      setPhase('Incident resolved — Continuity validated');
      await client.invalidateQueries();
      setObjectivesCompleted(true);
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
    snapshotArchiveStatus,
    newCapsuleIds,
    recoveredCapsuleCount,
    complete,
    objectivesCompleted,
    error,
    apiConnected: contextQuery.isSuccess || timelineQuery.isSuccess,
    memoryConnected: contextQuery.isSuccess,
  };
}
