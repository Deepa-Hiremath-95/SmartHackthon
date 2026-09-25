import React from 'react';
import {
  Gauge,
  HeartPulse,
  AlertTriangle,
  RotateCw,
  Zap,
  Info,
} from 'lucide-react';
import { ConveyorSummaryMessage, SimStatus, Joint } from '../../types/telemetry';
import { classifyHealth, SeverityShape } from '../../utils/severity';

interface ConveyorSummaryBarProps {
  conveyorSummary: ConveyorSummaryMessage | null;
  simStatus: SimStatus | null;
  joints: Record<string, Joint>;
  activeAlertsCount: number;
  selectedConveyorId: string;
}

export const ConveyorSummaryBar: React.FC<ConveyorSummaryBarProps> = ({
  conveyorSummary,
  simStatus,
  joints,
  activeAlertsCount,
  selectedConveyorId,
}) => {
  const jointsList = Object.values(joints).filter(
    (j) => j.belt_id === (selectedConveyorId === 'CV-02' ? 'BELT-02' : 'BELT-01') || !j.belt_id
  );

  // Compute live fallback values if conveyorSummary has not yet emitted for this conveyor
  const healths = jointsList.length > 0 ? jointsList.map((j) => j.health) : [100];
  const avgHealth = conveyorSummary?.average_health ?? (healths.reduce((a, b) => a + b, 0) / healths.length);
  const worstHealth = conveyorSummary?.worst_joint_health ?? Math.min(...healths);
  const worstJointId = conveyorSummary?.worst_joint_id ?? (jointsList.find((j) => j.health === worstHealth)?.joint_code || 'None');
  const riskIndex = conveyorSummary?.conveyor_risk_index ?? (0.6 * avgHealth + 0.4 * worstHealth);

  const riskConfig = classifyHealth(riskIndex);
  const worstConfig = classifyHealth(worstHealth);
  const currentLap = conveyorSummary?.lap_no ?? simStatus?.current_lap ?? 0;
  const speed = conveyorSummary?.speed_mps ?? (selectedConveyorId === 'CV-02' ? 2.0 : 2.45);

  const isRunning = simStatus ? simStatus.running && !simStatus.paused : true;

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-3.5 select-none shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Section: Conveyor Title, Lap & Once-per-lap Notice */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded border border-control-border">
              {selectedConveyorId}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-control-dim font-mono">
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lap <strong className="text-slate-200">{currentLap}</strong></span>
              <span className="text-slate-600">•</span>
              <span>{speed} m/s</span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] font-mono text-control-dim bg-control-subpanel px-2 py-0.5 rounded border border-control-border"
            title="Conveyor-level telemetry aggregates update once per lap as belt completes loop"
          >
            <Info className="w-3 h-3 text-control-muted" />
            <span>Summary: Updates once per lap</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[10px] ${
                isRunning
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
              }`}
            >
              <Zap className="w-3 h-3" />
              {isRunning ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Right Section: 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
          {/* 1. Conveyor Risk Index */}
          <div className="bg-control-subpanel border border-control-border rounded p-2 flex flex-col justify-center min-w-[130px]">
            <div className="flex items-center justify-between text-[11px] text-control-dim font-medium">
              <span>Risk Index</span>
              <Gauge className="w-3 h-3 text-control-muted" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <SeverityShape shape={riskConfig.shape} colorHex={riskConfig.colorHex} size={13} />
              <span className={`text-base font-bold font-mono leading-none ${riskConfig.textClass}`}>
                {riskIndex.toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-control-dim uppercase">
                {riskConfig.label.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* 2. Average Joint Health */}
          <div className="bg-control-subpanel border border-control-border rounded p-2 flex flex-col justify-center min-w-[130px]">
            <div className="flex items-center justify-between text-[11px] text-control-dim font-medium">
              <span>Average Health</span>
              <HeartPulse className="w-3 h-3 text-control-muted" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-base font-bold font-mono text-slate-100 leading-none">
                {avgHealth.toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-control-dim">
                ({jointsList.length} jts)
              </span>
            </div>
          </div>

          {/* 3. Worst Joint */}
          <div
            className={`border rounded p-2 flex flex-col justify-center min-w-[130px] transition-colors ${
              worstHealth < 70
                ? 'bg-red-950/20 border-red-500/30'
                : 'bg-control-subpanel border-control-border'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-control-dim font-medium">
              <span>Worst Joint</span>
              <SeverityShape shape={worstConfig.shape} colorHex={worstConfig.colorHex} size={12} />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-base font-bold font-mono leading-none ${worstConfig.textClass}`}>
                {worstJointId}
              </span>
              <span className="text-xs font-mono text-slate-300">
                ({worstHealth.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* 4. Active Alerts Count */}
          <div className="bg-control-subpanel border border-control-border rounded p-2 flex flex-col justify-center min-w-[130px]">
            <div className="flex items-center justify-between text-[11px] text-control-dim font-medium">
              <span>Active Alerts</span>
              <AlertTriangle className="w-3 h-3 text-control-muted" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-base font-bold font-mono leading-none ${
                  activeAlertsCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-200'
                }`}
              >
                {activeAlertsCount}
              </span>
              <span className="text-[10px] font-mono text-control-dim">
                {activeAlertsCount > 0 ? 'unresolved' : 'nominal'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
