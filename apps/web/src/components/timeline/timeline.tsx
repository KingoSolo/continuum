import { AlertTriangle, BrainCircuit, CircleDot, Gavel, Lightbulb } from 'lucide-react';
import type { TimelineItem } from '../../types/mission';
const icon = (type: string) =>
  type.includes('HAZARD')
    ? AlertTriangle
    : type.includes('DECISION')
      ? Gavel
      : type.includes('REASONING') || type.includes('DEBATE')
        ? BrainCircuit
        : type.includes('LESSON')
          ? Lightbulb
          : CircleDot;
export function Timeline({
  items,
  replayIndex,
  freshIds,
  recoveredCount,
}: {
  items: TimelineItem[];
  replayIndex: number | null;
  freshIds: string[];
  recoveredCount: number | null;
}) {
  return (
    <section className="panel scanlines h-[calc(100vh-145px)] overflow-hidden p-4">
      <p className="text-xs tracking-[.2em] text-slate-400">MISSION TIMELINE</p>
      <div className="mt-4 space-y-3 overflow-y-auto pr-1">
        <p className="text-[11px] text-slate-500">
          Newest events first · {items.length} memory capsules
        </p>
        {recoveredCount !== null && recoveredCount > 0 && (
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            Recovered Mission Memory · {recoveredCount} capsule
            {recoveredCount === 1 ? '' : 's'} persisted from prior activity
          </p>
        )}
        {items.length === 0 ? (
          <p className="pt-8 text-sm text-slate-500">Awaiting mission telemetry.</p>
        ) : (
          items.map((item, index) => {
            const Icon = icon(item.type);
            const critical = item.importance === 'CRITICAL';
            return (
              <article
                key={item.id}
                className={`border-l-2 p-3 transition-all ${freshIds.includes(item.id) ? 'border-cyan bg-cyan/15 shadow-[0_0_18px_rgba(55,217,255,.24)]' : replayIndex === index ? 'border-cyan bg-cyan/10' : critical ? 'border-red-500 bg-red-500/5' : 'border-slate-700 bg-slate-900/60'}`}
              >
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Icon size={14} className={critical ? 'text-red-400' : 'text-cyan'} />
                  <span>{item.type.replaceAll('_', ' ')}</span>
                  <span className="ml-auto text-[10px] text-slate-500">
                    {new Date(item.occurredAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{item.description}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Agent {item.agent} · {item.importance}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
