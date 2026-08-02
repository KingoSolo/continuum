import { Circle } from 'lucide-react';
export function LiveStatusBar({
  apiConnected,
  memoryConnected,
  simulatorRunning,
}: {
  apiConnected: boolean;
  memoryConnected: boolean;
  simulatorRunning: boolean;
}) {
  const status = (label: string, value: string, active: boolean) => (
    <span className="flex items-center gap-1.5">
      <Circle
        size={8}
        className={active ? 'fill-emerald-400 text-emerald-400' : 'fill-slate-600 text-slate-600'}
      />
      {label}:{' '}
      <b className={active ? 'font-normal text-emerald-300' : 'font-normal text-slate-500'}>
        {value}
      </b>
    </span>
  );
  return (
    <div className="border-y border-cyan/10 bg-slate-950/65 px-4 py-2 text-[10px] tracking-wide text-slate-400">
      <div className="mx-auto flex max-w-[1800px] flex-wrap gap-x-5 gap-y-1">
        {status('COCKROACHDB', memoryConnected ? 'CONNECTED' : 'AWAITING API', memoryConnected)}
        {status('API', apiConnected ? 'CONNECTED' : 'CHECKING', apiConnected)}
        {status('SIMULATOR', simulatorRunning ? 'RUNNING' : 'STANDBY', simulatorRunning)}
        {status('AWS', 'UNAVAILABLE', false)}
      </div>
    </div>
  );
}
