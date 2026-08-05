import { ShieldAlert, Sparkles } from 'lucide-react';
import type { MissionContext } from '../../types/mission';
export function ContextCard({ context }: { context?: MissionContext }) {
  return (
    <section className="panel p-5">
      <p className="text-xs tracking-[.2em] text-cyan">CURRENT MISSION CONTEXT</p>
      <div className="mt-4 space-y-3 text-sm">
        <Row
          icon={<ShieldAlert size={16} className="text-alert" />}
          label="Active priority"
          value="Avoid unstable western traverse"
        />
        <Row
          icon={<Sparkles size={16} className="text-cyan" />}
          label="Latest reasoning"
          value="Eastern shelf preserves mobility"
        />
        <Row
          icon={<Sparkles size={16} className="text-emerald-400" />}
          label="Context selection"
          value={`${context?.selectedCapsuleIds.length ?? 0} curated capsules`}
        />
        <p className="border-t border-slate-800 pt-3 text-xs text-slate-500">
          Mission Context status:{' '}
          {context
            ? `Context v${context.context?.version ?? '—'} ready for handoff`
            : 'Awaiting API connection'}
        </p>
      </div>
    </section>
  );
}
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span>{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-1 text-slate-300">{value}</p>
      </div>
    </div>
  );
}
