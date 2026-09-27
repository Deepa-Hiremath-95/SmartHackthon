import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Crosshair,
  Camera,
  Activity,
} from 'lucide-react';
import { Joint, SimStatus } from '../../types/telemetry';
import { classifyHealth, SeverityShape } from '../../utils/severity';

interface InteractiveConveyorMapProps {
  joints: Record<string, Joint>;
  jointOrder: string[];
  simStatus: SimStatus | null;
  selectedJointCode: string | null;
  onSelectJoint: (code: string) => void;
}

export const InteractiveConveyorMap: React.FC<InteractiveConveyorMapProps> = ({
  joints,
  jointOrder,
  simStatus,
  selectedJointCode,
  onSelectJoint,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If jointOrder is empty, fallback to J01..J04
  const displayCodes =
    jointOrder.length > 0
      ? jointOrder
      : ['J01', 'J02', 'J03', 'J04'];

  const beltPosition = simStatus?.belt_position_m ?? 0;
  const loopLength = 4800; // meters

  return (
    <div
      className={`bg-control-panel border border-control-border rounded-lg p-4 transition-all duration-300 select-none ${
        isExpanded ? 'col-span-full' : ''
      }`}
    >
      {/* Header with Title & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Conveyor Loop Schematic & Sensor Topology (OV-02)
          </h2>
          <span className="text-[11px] font-mono text-control-dim bg-control-subpanel px-2 py-0.5 rounded border border-control-border">
            4,800 m Loop • {displayCodes.length} Spliced Joints • 4 Sensor Systems
          </span>
        </div>

        {/* Legend & Controls */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="hidden sm:flex items-center gap-3 text-control-muted">
            <span className="flex items-center gap-1">
              <SeverityShape shape="circle" colorHex="#10b981" size={12} />
              <span>&ge;85 Healthy</span>
            </span>
            <span className="flex items-center gap-1">
              <SeverityShape shape="triangle" colorHex="#f59e0b" size={12} />
              <span>70-84 Watch</span>
            </span>
            <span className="flex items-center gap-1">
              <SeverityShape shape="diamond" colorHex="#f97316" size={12} />
              <span>50-69 Maint</span>
            </span>
            <span className="flex items-center gap-1">
              <SeverityShape shape="octagon" colorHex="#ef4444" size={12} />
              <span>&lt;50 Critical</span>
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-control-dim hover:text-white rounded hover:bg-control-subpanel transition-colors"
            title={isExpanded ? 'Restore size' : 'Expand map width'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Track Container */}
      <div className="relative py-7 px-4 bg-control-bg/80 border border-control-border/60 rounded-md overflow-x-auto">
        {/* Sensor Stations Overlay Bar */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-3 px-2">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
            <Activity className="w-3 h-3" />
            <span>TF-Luna LiDAR & Load Cell (Chute)</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/30">
            <Activity className="w-3 h-3" />
            <span>3x Inductive Rupture Stations</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
            <Camera className="w-3 h-3" />
            <span>Multispectral Mast (Head Discharge)</span>
          </div>
        </div>

        {/* Linear Conveyor Belt Graphic */}
        <div className="relative min-w-[640px] h-24 flex items-center mt-2 px-8">
          {/* Main Belt Line */}
          <div className="absolute left-0 right-0 h-3 bg-slate-800 rounded-full border border-slate-700 shadow-inner">
            {/* Belt Odometry Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 w-1.5 bg-cyan-400 rounded shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-200 pointer-events-none"
              style={{
                left: `${Math.min(Math.max((beltPosition / loopLength) * 100, 0), 100)}%`,
              }}
              title={`Live Belt Odometry Position: ${beltPosition.toFixed(1)}m`}
            />
          </div>

          {/* Joint Markers placed along the belt loop */}
          <div className="relative w-full flex items-center justify-between z-10">
            {displayCodes.map((code, idx) => {
              const joint = joints[code] || joints[`CV01_${code}`];
              const health = joint?.health ?? 95.0;
              const config = classifyHealth(health);
              const isSelected = selectedJointCode === code;
              const positionM = joint?.position_m ?? idx * 200;

              return (
                <button
                  key={code}
                  onClick={() => onSelectJoint(code)}
                  className={`group relative flex flex-col items-center focus:outline-none transition-transform cursor-pointer ${
                    isSelected ? 'scale-125 z-20' : 'hover:scale-115 z-10'
                  }`}
                  title={`${code}: ${health.toFixed(1)}% (${config.label}) at ${positionM}m`}
                >
                  {/* Joint Health & Severity Shape */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)] ring-2 ring-emerald-400/50'
                        : `${config.bgClass} ${config.borderClass} hover:border-slate-300`
                    }`}
                  >
                    <SeverityShape shape={config.shape} colorHex={config.colorHex} size={15} />
                  </div>

                  {/* Joint Code label */}
                  <span
                    className={`mt-1.5 text-[10px] font-mono tracking-tight transition-colors ${
                      isSelected
                        ? 'font-bold text-white'
                        : health < 70
                        ? `${config.textClass} font-semibold`
                        : 'text-control-dim group-hover:text-slate-200'
                    }`}
                  >
                    {code}
                  </span>

                  {/* Small health badge below */}
                  <span
                    className={`text-[9px] font-mono ${
                      health < 50 ? 'text-red-400 font-bold' : health < 85 ? 'text-amber-400 font-medium' : 'text-control-dim'
                    }`}
                  >
                    {Math.round(health)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Axis Labels: 0m to 4800m */}
        <div className="min-w-[760px] flex justify-between text-[10px] font-mono text-control-dim border-t border-slate-800 pt-1 mt-1">
          <span>0 m (Head)</span>
          <span>1,200 m</span>
          <span>2,400 m (Tail Pulley)</span>
          <span>3,600 m</span>
          <span>4,800 m (Return)</span>
        </div>
      </div>
    </div>
  );
};
