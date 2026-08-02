import { CheckCircle2, Circle } from 'lucide-react';
const objectives = [
  { title: 'Maintain safe relay corridor', complete: true },
  { title: 'Characterise mineral deposit', complete: false },
  { title: 'Validate lava-tube habitability', complete: false },
];
export function ObjectivesCard() {
  return (
    <section className="panel p-5">
      <p className="text-xs tracking-[.2em] text-cyan">OBJECTIVES</p>
      <div className="mt-4 space-y-3">
        {objectives.map((objective) => (
          <div key={objective.title} className="flex items-center gap-3 text-sm">
            <span className={objective.complete ? 'text-emerald-400' : 'text-slate-600'}>
              {objective.complete ? <CheckCircle2 size={17} /> : <Circle size={17} />}
            </span>
            <span className={objective.complete ? 'text-slate-500 line-through' : 'text-slate-200'}>
              {objective.title}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
