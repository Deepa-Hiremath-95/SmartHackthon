import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SimStatus } from '../../types/telemetry';

interface FooterProps {
  simStatus: SimStatus | null;
  provenance: string;
}

export const Footer: React.FC<FooterProps> = ({ simStatus, provenance }) => {
  return (
    <footer className="h-7 bg-control-panel border-t border-control-border px-4 flex items-center justify-between text-[11px] text-control-dim font-mono select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-slate-400">
          <ShieldAlert className="w-3 h-3 text-slate-500" />
          Advisory Only — Manual SCADA / Operator Verification Required
        </span>
        <span className="hidden md:inline text-control-border">|</span>
        <span className="hidden md:inline">
          Data Provenance: <strong className="text-slate-300">{provenance}</strong>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {simStatus && (
          <>
            <span>
              Sim Run: <strong className="text-slate-300">{simStatus.run_id}</strong>
            </span>
            <span className="text-control-border">|</span>
            <span>
              Lap: <strong className="text-slate-200">{simStatus.current_lap}</strong>
            </span>
            <span className="hidden sm:inline text-control-border">|</span>
            <span className="hidden sm:inline">
              Speed: <strong className="text-slate-200">{simStatus.speed_preset}</strong> ({simStatus.time_acceleration}x)
            </span>
          </>
        )}
      </div>
    </footer>
  );
};
