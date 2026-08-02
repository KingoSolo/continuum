import { motion } from 'framer-motion';
import { HeartPulse } from 'lucide-react';
import type { FleetAgent } from '../../types/mission';
export function AgentFleet({
  agents,
  handoffStage,
}: {
  agents: FleetAgent[];
  handoffStage: string | null;
}) {
  return (
    <section className="panel p-4">
      <p className="text-xs tracking-[.2em] text-cyan">AGENT FLEET</p>
      <div className="mt-4 space-y-3">
        {agents.map((agent) => (
          <motion.article
            layout
            key={agent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: agent.status === 'OFFLINE' ? 0.38 : 1, y: 0 }}
            className={`border p-3 ${agent.status === 'OFFLINE' ? 'border-red-500/70 bg-red-500/10' : agent.status === 'REPLACEMENT' ? 'border-emerald-400/60 bg-emerald-400/5' : 'border-slate-800 bg-slate-900/60'}`}
          >
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-bold">{agent.name}</h3>
                <p className="text-[10px] text-slate-500">{agent.role}</p>
              </div>
              <span
                className={`text-[10px] ${agent.status === 'OFFLINE' ? 'text-red-400' : agent.status === 'REPLACEMENT' ? 'text-emerald-400' : 'text-cyan'}`}
              >
                {agent.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <HeartPulse size={12} /> HEALTH {agent.health}%
              </span>
              <span>CONF {agent.confidence}%</span>
            </div>
            <p className="mt-2 text-xs text-slate-300">{agent.task}</p>
            <p className="mt-1 text-[10px] text-slate-500">MEMORY {agent.lastMemory}</p>
            {agent.status === 'OFFLINE' && handoffStage && (
              <p className="mt-2 text-xs text-alert">{handoffStage}</p>
            )}
          </motion.article>
        ))}
      </div>
    </section>
  );
}
