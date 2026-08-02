import { Database, ScrollText } from 'lucide-react';
import type { TimelineItem } from '../../types/mission';
export function KnowledgeAndStats({
  knowledge,
  timeline,
  snapshots,
}: {
  knowledge: unknown[];
  timeline: TimelineItem[];
  snapshots: number;
}) {
  const count = (name: string) => timeline.filter((item) => item.type.includes(name)).length;
  return (
    <>
      <section className="panel p-4">
        <p className="text-xs tracking-[.2em] text-cyan">OPERATIONAL KNOWLEDGE</p>
        <div className="mt-3 flex gap-2 text-sm text-slate-300">
          <Database size={16} className="text-emerald-400" />
          <span>
            {knowledge.length} validated vault {knowledge.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Validated lessons are available to future Mission Context.
        </p>
      </section>
      <section className="panel p-4">
        <p className="text-xs tracking-[.2em] text-cyan">MEMORY STATISTICS</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ['Capsules', timeline.length],
            ['Snapshots', snapshots],
            ['Lessons', count('LESSON')],
            ['Decisions', count('DECISION')],
            ['Hazards', count('HAZARD')],
            ['Debates', count('DEBATE')],
          ].map(([label, value]) => (
            <div key={String(label)} className="border-l border-slate-700 pl-2">
              <p className="text-lg text-white">{value}</p>
              <p className="text-[10px] uppercase text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
          <ScrollText size={13} /> Timeline is reconstructed from Memory Capsules.
        </div>
      </section>
    </>
  );
}
