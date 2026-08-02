import { AnimatePresence, motion } from 'framer-motion';
import type { TimelineItem } from '../../types/mission';
export function CapsuleFeed({ items, freshIds }: { items: TimelineItem[]; freshIds: string[] }) {
  return (
    <section className="panel overflow-hidden p-4">
      <p className="text-xs tracking-[.2em] text-cyan">MEMORY CAPSULE FEED</p>
      <div className="mt-3 max-h-32 space-y-2 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.slice(0, 4).map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between border-l-2 px-2 py-1 text-xs ${freshIds.includes(item.id) ? 'border-cyan bg-cyan/15 text-white shadow-[0_0_16px_rgba(55,217,255,.24)]' : 'border-slate-700 text-slate-400'}`}
            >
              <span>{item.type.replaceAll('_', ' ')}</span>
              <span className="text-[10px]">{new Date(item.occurredAt).toLocaleTimeString()}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <p className="py-5 text-xs text-slate-500">No capsules received from Mission Replay.</p>
        )}
      </div>
    </section>
  );
}
