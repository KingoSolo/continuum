import { motion } from 'framer-motion';
import type { FleetAgent, TimelineItem } from '../../types/mission';
const positions: ReadonlyArray<readonly [number, number]> = [
  [22, 65],
  [65, 34],
  [42, 24],
  [76, 68],
  [35, 48],
];
export function MissionMap({
  agents,
  highlightFailure,
  replayItem,
}: {
  agents: FleetAgent[];
  highlightFailure: boolean;
  replayItem?: TimelineItem;
}) {
  return (
    <section className="panel relative min-h-[390px] overflow-hidden p-5">
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(ellipse_at_50%_48%,#5d3023_0%,#291a1d_34%,#0c1121_72%)]" />
      <div className="absolute inset-0 scanlines" />
      <div className="relative">
        <p className="text-xs tracking-[.2em] text-cyan">MISSION MAP / CANDOR LAVA TUBE</p>
        <p className="mt-1 text-xs text-slate-400">
          Eastern shelf safe corridor · Western traverse restricted
        </p>
        {agents.map((agent, index) => {
          const left = positions[index]?.[0] ?? 35;
          const top = positions[index]?.[1] ?? 48;
          const offline = agent.status === 'OFFLINE';
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, scale: offline && highlightFailure ? [1, 1.18, 1] : 1 }}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <span
                className={`block h-3 w-3 rounded-full ring-4 ${offline ? 'bg-red-500 ring-red-500/20' : agent.status === 'REPLACEMENT' ? 'bg-emerald-400 ring-emerald-400/20' : 'bg-cyan ring-cyan/20'}`}
              />
              <span className="mt-2 block whitespace-nowrap text-[10px] text-slate-200">
                {agent.name}
              </span>
            </motion.div>
          );
        })}
        <div className="absolute bottom-0 right-0 max-w-xs border border-cyan/20 bg-space/80 p-3 text-xs text-slate-300">
          {replayItem
            ? `REPLAY: ${replayItem.type.replaceAll('_', ' ')}`
            : 'LIVE: Awaiting next mission event'}
        </div>
      </div>
    </section>
  );
}
