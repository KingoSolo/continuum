export function MissionOverview({ elapsed, phase }: { elapsed: string; phase: string }) {
  const isComplete = phase.includes('complete');
  const isRunning = !phase.includes('Survey preparation') && !isComplete;
  const statusValue = isComplete ? 'COMPLETE' : isRunning ? 'ACTIVE' : 'STANDBY';
  const statusTone = isComplete
    ? 'text-emerald-400'
    : isRunning
      ? 'text-emerald-400'
      : 'text-slate-400';

  return (
    <section className="panel grid gap-4 p-5 md:grid-cols-4">
      <div className="md:col-span-2">
        <p className="text-xs tracking-[.2em] text-cyan">INCIDENT RESPONSE</p>
        <h2 className="mt-2 text-2xl font-bold">INC-4291 / PRIMARY DATABASE DEGRADATION</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Mitigate cascading connection-pool exhaustion via failover; preserve incident context
          across on-call responder handoff.
        </p>
      </div>
      <Metric label="STATUS" value={statusValue} tone={statusTone} />
      <Metric label="ELAPSED" value={elapsed} tone="text-white" />
      <div className="border-t border-slate-800 pt-3 md:col-span-4">
        <span className="text-xs text-slate-500">CURRENT PHASE </span>
        <span className="ml-2 text-sm text-alert">{phase}</span>
      </div>
    </section>
  );
}
function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border-l border-slate-800 pl-4">
      <p className="text-[10px] tracking-[.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
