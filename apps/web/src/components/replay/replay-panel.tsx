'use client';
import type { TimelineItem } from '../../types/mission';
export function ReplayPanel({
  items,
  selected,
  onSelect,
}: {
  items: TimelineItem[];
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const chronological = [...items].reverse();
  const value = selected === null ? chronological.length : chronological.length - selected;
  return (
    <section className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan/20 bg-space/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center gap-4">
        <div>
          <p className="text-xs tracking-[.2em] text-cyan">MISSION REPLAY</p>
          <p className="text-[10px] text-slate-500">Select a point to reconstruct stored history</p>
        </div>
        <input
          aria-label="Mission replay position"
          className="h-1 flex-1 accent-cyan"
          type="range"
          min="0"
          max={chronological.length}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            onSelect(next === chronological.length ? null : chronological.length - next);
          }}
        />
        <span className="w-36 text-right text-xs text-slate-400">
          {selected === null ? 'LIVE' : items[selected]?.type.replaceAll('_', ' ')}
        </span>
      </div>
    </section>
  );
}
