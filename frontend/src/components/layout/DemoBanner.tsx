import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface DemoBannerProps {
  provenance: string;
  runId?: string;
  onRunDemo?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ provenance, runId, onRunDemo }) => {
  if (provenance !== 'SIMULATED') return null;

  return (
    <div
      role="banner"
      aria-label="Simulation environment warning banner"
      className="bg-gradient-to-r from-purple-900/90 via-purple-800/90 to-indigo-900/90 border-b border-purple-500/50 px-4 py-1.5 text-xs text-purple-100 flex flex-wrap items-center justify-between gap-2 shadow-sm select-none"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-purple-500/30 border border-purple-300/40 text-purple-200 tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          DEMO DATA
        </span>
        <span className="font-medium text-slate-200">
          Synthetic scenario telemetry ({provenance}). Never present as real mine or field measurements.
        </span>
        {runId && (
          <span className="hidden md:inline font-mono text-[11px] text-purple-300/80 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-700/40">
            {runId}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden lg:inline text-[11px] text-purple-200/70 italic flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-purple-400" />
          Advisory only. NEXVION never starts or stops physical machinery.
        </span>
        {onRunDemo && (
          <button
            onClick={onRunDemo}
            className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-xs shadow-sm transition-colors cursor-pointer"
            title="Reset simulation and set speed to 600x"
          >
            Restart Demo
          </button>
        )}
      </div>
    </div>
  );
};
