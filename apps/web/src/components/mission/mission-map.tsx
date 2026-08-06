import { motion } from 'framer-motion';
import type { FleetAgent, TimelineItem } from '../../types/mission';

// The backend exposes no agent coordinates (no position fields on Agent in
// prisma/schema.prisma), so each marker's position is derived deterministically
// from the agent's own id via a string hash — never Math.random — so it is
// identical on every render and never moves during a mission. Placement is
// resolved in id-sorted order (independent of the `agents` array's render
// order) with a small nudge pass to keep markers apart: an agent's spot is
// only ever adjusted by agents with a lexicographically smaller id, so when a
// new agent (e.g. a replacement) joins mid-mission, every already-placed
// marker stays exactly where it was.
const MAP_BOUNDS = { left: [8, 88], top: [45, 70] } as const;
const NUDGE_BOUNDS = { left: [5, 92], top: [42, 73] } as const;
const MIN_MARKER_DISTANCE = 22;
const MAX_NUDGE_ATTEMPTS = 12;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unitInterval(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function basePosition(agentId: string): [number, number] {
  const [leftMin, leftMax] = MAP_BOUNDS.left;
  const [topMin, topMax] = MAP_BOUNDS.top;
  const left = leftMin + unitInterval(`${agentId}:x`) * (leftMax - leftMin);
  const top = topMin + unitInterval(`${agentId}:y`) * (topMax - topMin);
  return [left, top];
}

function agentPositions(agentIds: readonly string[]): Map<string, [number, number]> {
  const placed: Array<[number, number]> = [];
  const result = new Map<string, [number, number]>();
  for (const id of [...agentIds].sort()) {
    const [baseLeft, baseTop] = basePosition(id);
    let left = baseLeft;
    let top = baseTop;
    let attempt = 0;
    while (
      attempt < MAX_NUDGE_ATTEMPTS &&
      placed.some((point) => Math.hypot(point[0] - left, point[1] - top) < MIN_MARKER_DISTANCE)
    ) {
      const angle = unitInterval(`${id}:nudge:${attempt}`) * Math.PI * 2;
      const radius = 12 + attempt * 5;
      left = clamp(baseLeft + Math.cos(angle) * radius, NUDGE_BOUNDS.left[0], NUDGE_BOUNDS.left[1]);
      top = clamp(baseTop + Math.sin(angle) * radius, NUDGE_BOUNDS.top[0], NUDGE_BOUNDS.top[1]);
      attempt++;
    }
    placed.push([left, top]);
    result.set(id, [left, top]);
  }
  return result;
}

export function MissionMap({
  agents,
  highlightFailure,
  replayItem,
}: {
  agents: FleetAgent[];
  highlightFailure: boolean;
  replayItem?: TimelineItem;
}) {
  const positions = agentPositions(agents.map((agent) => agent.id));
  return (
    <section className="panel relative min-h-[390px] overflow-hidden p-5">
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(ellipse_at_50%_48%,#5d3023_0%,#291a1d_34%,#0c1121_72%)]" />
      <div className="absolute inset-0 scanlines" />
      <div className="relative">
        <p className="text-xs tracking-[.2em] text-cyan">MISSION MAP / CANDOR LAVA TUBE</p>
        <p className="mt-1 text-xs text-slate-400">
          Eastern shelf safe corridor · Western traverse restricted
        </p>
        {agents.map((agent) => {
          const [left, top] = positions.get(agent.id) ?? basePosition(agent.id);
          const offline = agent.status === 'OFFLINE';
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, scale: offline && highlightFailure ? [1, 1.18, 1] : 1 }}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="whitespace-nowrap text-[10px] text-slate-200">
                {agent.name}
              </span>
              <span
                className={`block h-3 w-3 rounded-full ring-4 ${offline ? 'bg-red-500 ring-red-500/20' : agent.status === 'REPLACEMENT' ? 'bg-emerald-400 ring-emerald-400/20' : 'bg-cyan ring-cyan/20'}`}
              />
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
