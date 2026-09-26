import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { Joint } from '../../types/telemetry';
import { classifyHealth, SeverityShape } from '../../utils/severity';

interface JointGridProps {
  joints: Record<string, Joint>;
  jointOrder: string[];
  selectedJointCode: string | null;
  onSelectJoint: (code: string) => void;
  selectedConveyorId: string;
}

export const JointGrid: React.FC<JointGridProps> = ({
  joints,
  jointOrder,
  selectedJointCode,
  onSelectJoint,
  selectedConveyorId,
}) => {
  // Determine list of joint codes to display
  let displayCodes = jointOrder;
  if (displayCodes.length === 0) {
    if (selectedConveyorId === 'CV-02') {
      displayCodes = ['J25', 'J26', 'J27', 'J28', 'J29', 'J30'];
    } else {
      displayCodes = ['J01', 'J02', 'J03'];
    }
  }

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-4 select-none shadow-sm space-y-3">
      {/* Grid Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-control-border/60">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Conveyor Joints Health Grid ({selectedConveyorId})
          </h3>
          <span className="text-[11px] font-mono text-control-dim bg-control-subpanel px-2 py-0.5 rounded border border-control-border">
            {displayCodes.length} Inspected Splices
          </span>
        </div>

        {/* ISA-101 Colour-Blind Safe Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-slate-300">
            <SeverityShape shape="circle" colorHex="#10b981" size={11} />
            <span className="text-control-dim">&ge;85%</span>
            <span className="font-medium text-emerald-400">HEALTHY</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <SeverityShape shape="triangle" colorHex="#f59e0b" size={11} />
            <span className="text-control-dim">70-84%</span>
            <span className="font-medium text-amber-400">WATCH</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <SeverityShape shape="diamond" colorHex="#f97316" size={11} />
            <span className="text-control-dim">50-69%</span>
            <span className="font-medium text-orange-400">MAINT REQ</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <SeverityShape shape="octagon" colorHex="#ef4444" size={11} />
            <span className="text-control-dim">&lt;50%</span>
            <span className="font-medium text-red-400">CRITICAL</span>
          </span>
        </div>
      </div>

      {/* Joint Tiles Responsive Grid */}
      <div
        className={`grid gap-2.5 ${
          displayCodes.length <= 6
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12'
        }`}
      >
        {displayCodes.map((code, idx) => {
          const joint = joints[code] || joints[`${selectedConveyorId.replace('-', '')}_${code}`];
          const health = joint?.health ?? 95.0;
          const config = classifyHealth(health);
          const isSelected = selectedJointCode === code;
          const posM = joint?.position_m ?? idx * 200;

          // State-specific border & background styles
          let tileBorder = 'border-control-border hover:border-slate-500';
          let tileBg = 'bg-control-subpanel';
          let glowEffect = '';

          if (config.state === 'CRITICAL') {
            tileBorder = 'border-red-500/80 ring-1 ring-red-500/50';
            tileBg = 'bg-red-950/40';
            glowEffect = 'animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]';
          } else if (config.state === 'MAINTENANCE_REQUIRED') {
            tileBorder = 'border-orange-500/70 ring-1 ring-orange-500/30';
            tileBg = 'bg-orange-950/30';
          } else if (config.state === 'WATCH') {
            tileBorder = 'border-amber-500/60';
            tileBg = 'bg-amber-950/20';
          } else if (config.state === 'HEALTHY') {
            tileBorder = 'border-emerald-900/40 hover:border-emerald-700/60';
            tileBg = 'bg-slate-900/60';
          }

          if (isSelected) {
            tileBorder = 'border-cyan-400 ring-2 ring-cyan-400/60';
            tileBg = 'bg-slate-800';
          }

          return (
            <button
              key={code}
              type="button"
              onClick={() => onSelectJoint(code)}
              className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer focus:outline-none ${tileBg} ${tileBorder} ${glowEffect}`}
              title={`Joint ${code}: ${health.toFixed(1)}% (${config.label}) at ${posM}m. Click to inspect.`}
            >
              {/* Tile Top: Code & Severity Shape */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono text-xs font-bold text-white tracking-tight">
                  {code}
                </span>
                <div
                  className="flex items-center justify-center w-5 h-5 rounded"
                  title={`${config.label} (${config.state})`}
                >
                  <SeverityShape shape={config.shape} colorHex={config.colorHex} size={13} />
                </div>
              </div>

              {/* Tile Middle: Health % */}
              <div className="my-1">
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-lg font-mono font-bold leading-none ${config.textClass}`}>
                    {health.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-mono text-control-dim">%</span>
                </div>

                {/* State Label Badge */}
                <div className="mt-1">
                  <span
                    className={`inline-block px-1 py-0.2 rounded text-[9px] font-mono font-semibold uppercase tracking-wider ${
                      config.state === 'CRITICAL'
                        ? 'bg-red-950 text-red-300 border border-red-500/40'
                        : config.state === 'MAINTENANCE_REQUIRED'
                        ? 'bg-orange-950 text-orange-300 border border-orange-500/40'
                        : config.state === 'WATCH'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {config.state === 'MAINTENANCE_REQUIRED' ? 'MAINT' : config.state}
                  </span>
                </div>
              </div>

              {/* Tile Bottom: Odometry Position & RUL Status if degraded */}
              <div className="pt-1.5 border-t border-control-border/40 mt-1 flex items-center justify-between text-[10px] font-mono text-control-dim">
                <span>{posM} m</span>
                {joint?.rul?.status && joint.rul.status !== 'UNAVAILABLE' ? (
                  <span
                    className="text-[9px] text-purple-300 bg-purple-950/60 px-1 rounded border border-purple-500/30"
                    title={`RUL: ${joint.rul.low_days ?? '?'}-${joint.rul.high_days ?? '?'} d (${joint.rul.status})`}
                  >
                    {joint.rul.status}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500">ST-01</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
