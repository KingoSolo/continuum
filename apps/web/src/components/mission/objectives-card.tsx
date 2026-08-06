import { CheckCircle2, Circle, CircleDashed, CircleSlash } from 'lucide-react';
import type { Objective, ObjectiveStatus } from '../../types/mission';

// Objective state is derived from the persisted ObjectiveStatus only. Nothing
// here may assume progress: an objective reads as complete when the mission
// recorded it as ACHIEVED, and as pending until execution moves it on.
type Presentation = 'pending' | 'active' | 'complete' | 'closed';

const presentationByStatus: Record<ObjectiveStatus, Presentation> = {
  PROPOSED: 'pending',
  APPROVED: 'pending',
  ACTIVE: 'active',
  REVISED: 'active',
  ACHIEVED: 'complete',
  DEPRIORITIZED: 'closed',
  ABANDONED: 'closed',
};

const styles: Record<Presentation, { icon: typeof Circle; mark: string; label: string }> = {
  pending: { icon: Circle, mark: 'text-slate-600', label: 'text-slate-200' },
  active: { icon: CircleDashed, mark: 'text-cyan', label: 'text-slate-100' },
  complete: { icon: CheckCircle2, mark: 'text-emerald-400', label: 'text-slate-500 line-through' },
  closed: { icon: CircleSlash, mark: 'text-slate-700', label: 'text-slate-500' },
};

export function ObjectivesCard({
  objectives,
  isLoading,
  allCompleted,
}: {
  objectives: Objective[];
  isLoading: boolean;
  allCompleted?: boolean;
}) {
  return (
    <section className="panel p-5">
      <p className="text-xs tracking-[.2em] text-cyan">OBJECTIVES</p>
      <div className="mt-4 space-y-3">
        {objectives.length === 0 ? (
          <p className="text-sm text-slate-500">
            {isLoading ? 'Loading objectives…' : 'No objectives recorded for this mission.'}
          </p>
        ) : (
          objectives.map((objective) => {
            const presentation = allCompleted
              ? 'complete'
              : (presentationByStatus[objective.status] ?? 'pending');
            const style = styles[presentation];
            const Icon = style.icon;
            return (
              <div key={objective.id} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 ${style.mark}`} title={objective.status}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className={style.label}>{objective.title}</span>
                  {objective.progressSummary && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {objective.progressSummary}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
