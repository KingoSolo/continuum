'use client';
import { useState } from 'react';
import { AgentFleet } from '../components/agents/agent-fleet';
import { BootSequence } from '../components/common/boot-sequence';
import { LiveStatusBar } from '../components/layout/live-status-bar';
import { MissionHeader } from '../components/layout/mission-header';
import { Timeline } from '../components/timeline/timeline';
import { CapsuleFeed } from '../components/mission/capsule-feed';
import { ContextCard } from '../components/mission/context-card';
import { HandoffAlert } from '../components/mission/handoff-alert';
import { KnowledgeAndStats } from '../components/mission/knowledge-and-stats';
import { MissionCompleteModal } from '../components/mission/mission-complete-modal';
import { MissionMap } from '../components/mission/mission-map';
import { MissionOverview } from '../components/mission/mission-overview';
import { ObjectivesCard } from '../components/mission/objectives-card';
import { ReplayPanel } from '../components/replay/replay-panel';
import { useMissionControl } from '../hooks/use-mission-control';

export default function MissionControlPage() {
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const control = useMissionControl();
  const replayItem = replayIndex === null ? undefined : control.timeline[replayIndex];
  const displayAgents = control.replayAgents(replayIndex);
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,#11315a_0%,#050816_42%)] text-slate-100">
      <BootSequence />
      <MissionHeader
        onStart={() => {
          // A closed summary from a prior run must not suppress the next
          // run's completion modal — without this, pressing Start Demo a
          // second time in the same session finishes silently.
          setSummaryOpen(true);
          control.startDemo();
        }}
        isRunning={control.isRunning}
        unavailable={control.isUnavailable}
      />
      <LiveStatusBar
        apiConnected={control.apiConnected}
        memoryConnected={control.memoryConnected}
        simulatorRunning={control.isRunning}
      />
      <HandoffAlert stage={control.handoffStage} />
      {control.error && (
        <div
          role="alert"
          className="fixed left-1/2 top-24 z-30 w-[min(92vw,480px)] -translate-x-1/2 border border-alert/60 bg-slate-950/95 p-4 text-sm text-white shadow-[0_0_34px_rgba(255,157,59,.22)]"
        >
          {control.error}
        </div>
      )}
      <div className="mx-auto grid max-w-[1800px] gap-4 px-4 pb-28 pt-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="order-2 space-y-4 lg:order-1">
          <Timeline
            items={control.timeline}
            replayIndex={replayIndex}
            freshIds={control.newCapsuleIds}
            recoveredCount={control.recoveredCapsuleCount}
          />
          <CapsuleFeed items={control.timeline} freshIds={control.newCapsuleIds} />
        </aside>
        <section className="order-1 space-y-4 lg:order-2">
          <MissionOverview elapsed={control.elapsed} phase={control.phase} />
          <MissionMap
            agents={displayAgents}
            highlightFailure={control.highlightFailure}
            replayItem={replayItem}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <ObjectivesCard objectives={control.objectives} isLoading={control.objectivesLoading} />
            <ContextCard context={control.context} />
          </div>
        </section>
        <aside className="order-3 space-y-4">
          <AgentFleet agents={displayAgents} handoffStage={control.handoffStage} />
          <KnowledgeAndStats
            knowledge={control.knowledge}
            timeline={control.timeline}
            snapshots={control.snapshots}
          />
        </aside>
      </div>
      <ReplayPanel items={control.timeline} selected={replayIndex} onSelect={setReplayIndex} />
      {control.complete && summaryOpen && (
        <MissionCompleteModal
          timeline={control.timeline}
          snapshots={control.snapshots}
          knowledge={control.knowledge.length}
          elapsed={control.elapsed}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </main>
  );
}
