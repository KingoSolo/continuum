import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
export function HandoffAlert({ stage }: { stage: string | null }) {
  return (
    <AnimatePresence>
      {stage && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed left-1/2 top-24 z-30 w-[min(92vw,480px)] -translate-x-1/2 border border-alert/60 bg-slate-950/95 p-4 shadow-[0_0_34px_rgba(255,157,59,.22)]"
        >
          <div className="flex items-center gap-3">
            <span className={stage === 'Mission Resumed' ? 'text-emerald-400' : 'text-alert'}>
              {stage === 'Mission Resumed' ? <CheckCircle2 /> : <AlertTriangle />}
            </span>
            <div>
              <p className="text-xs tracking-[.18em] text-slate-500">
                NAVIGATION CONTINUITY PROTOCOL
              </p>
              <p className="mt-1 text-sm text-white">{stage}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
