'use client';
import { motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import type { TimelineItem } from '../../types/mission';
export function MissionCompleteModal({
  timeline,
  snapshots,
  knowledge,
  onClose,
}: {
  timeline: TimelineItem[];
  snapshots: number;
  knowledge: number;
  onClose: () => void;
}) {
  const count = (value: string) => timeline.filter((item) => item.type.includes(value)).length;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-space/80 p-4 backdrop-blur-sm">
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg border border-emerald-400/50 bg-slate-950 p-6"
      >
        <div className="flex justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs tracking-[.2em] text-emerald-400">
              <CheckCircle2 size={15} /> MISSION COMPLETE
            </p>
            <h2 className="mt-2 text-2xl font-bold">ARES-7 continuity validated</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close mission summary"
            className="text-slate-500 hover:text-white"
          >
            <X />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['Mission duration', '01:00'],
            ['Observations', count('OBSERVATION')],
            ['Hazards', count('HAZARD')],
            ['Decisions', count('DECISION')],
            ['Lessons', count('LESSON')],
            ['Memory capsules', timeline.length],
            ['Knowledge promoted', knowledge],
            ['Snapshots', snapshots],
          ].map(([label, value]) => (
            <div key={String(label)} className="border-l border-slate-700 pl-3">
              <p className="text-lg text-white">{value}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
