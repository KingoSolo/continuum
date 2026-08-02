'use client';
import { Activity, Play } from 'lucide-react';
export function MissionHeader({
  onStart,
  isRunning,
  unavailable,
}: {
  onStart: () => void;
  isRunning: boolean;
  unavailable: boolean;
}) {
  return (
    <header className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-5">
      <div>
        <div className="flex items-center gap-2 text-xs tracking-[.28em] text-cyan">
          <Activity size={15} /> CONTINUUM / MISSION CONTROL
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-white">
          ARES-7 <span className="text-slate-500">LAVA TUBE SURVEY</span>
        </h1>
      </div>
      <button
        disabled={isRunning || unavailable}
        onClick={onStart}
        className="flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-4 py-2 text-sm font-bold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play size={15} />
        {unavailable ? 'MISSION ID REQUIRED' : isRunning ? 'DEMO IN PROGRESS' : 'START DEMO'}
      </button>
    </header>
  );
}
