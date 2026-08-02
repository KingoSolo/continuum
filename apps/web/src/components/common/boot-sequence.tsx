'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
const messages = [
  'INITIALISING CONTINUUM…',
  'Connecting CockroachDB Memory…',
  'Loading Mission Context…',
  'Synchronising Agent Fleet…',
  'Mission Ready.',
];
export function BootSequence() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setStep((value) => {
          if (value === messages.length - 1) {
            window.clearInterval(timer);
            window.setTimeout(() => setOpen(false), 360);
          }
          return Math.min(value + 1, messages.length - 1);
        }),
      380,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-space"
        >
          <div className="w-full max-w-md border border-cyan/30 bg-slate-950/90 p-7">
            <p className="text-xs tracking-[.3em] text-cyan">CONTINUUM // BOOT SEQUENCE</p>
            <div className="mt-6 space-y-3 text-sm">
              {messages.slice(0, step + 1).map((message, index) => (
                <motion.p
                  key={message}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={index === step ? 'text-white' : 'text-slate-500'}
                >
                  {index === step ? '› ' : '✓ '}
                  {message}
                </motion.p>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-7 text-xs text-slate-500 hover:text-cyan"
            >
              SKIP INITIALISATION
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
