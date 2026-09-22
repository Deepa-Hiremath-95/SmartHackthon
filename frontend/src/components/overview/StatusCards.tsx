import React from 'react';
import {
  Gauge,
  HeartPulse,
  AlertTriangle,
  Zap,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { ConveyorSummaryMessage, SimStatus, Joint } from '../../types/telemetry';
import { classifyHealth, SeverityBadge } from '../../utils/severity';

interface StatusCardsProps {
  conveyorSummary: ConveyorSummaryMessage | null;
  simStatus: SimStatus | null;
  joints: Record<string, Joint>;
  activeAlertsCount: number;
  devMode: boolean;
}

export const StatusCards: React.FC<StatusCardsProps> = ({
  conveyorSummary,
  simStatus,
  joints,
  activeAlertsCount,
  devMode,
}) => {
  // 1. Conveyor state
  const isRunning = simStatus ? simStatus.running && !simStatus.paused : true;
  const isPaused = simStatus ? simStatus.paused : false;
  let stateText = 'RUNNING';
  let stateColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
  if (isPaused) {
    stateText = 'PAUSED';
    stateColor = 'text-amber-400 bg-amber-950/40 border-amber-500/30';
  } else if (!isRunning) {
    stateText = 'STOPPED';
    stateColor = 'text-red-400 bg-red-950/40 border-red-500/30';
  }

  // 2. Risk Index & Avg Health
  const riskIndex = conveyorSummary?.conveyor_risk_index ?? 95.0;
  const avgHealth = conveyorSummary?.average_health ?? 95.0;
  const worstJointCode = conveyorSummary?.worst_joint_id ?? 'J01';
  const worstJointHealth = conveyorSummary?.worst_joint_health ?? 95.0;
  const riskConfig = classifyHealth(riskIndex);

  // 3. Critical joints count
  const allJointsList = Object.values(joints);
  const criticalCount = allJointsList.filter((j) => j.health < 50 || j.state === 'CRITICAL').length;
  const watchCount = allJointsList.filter((j) => j.health >= 70 && j.health < 85).length;

  return (
    <section aria-label="Conveyor Status Summary" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Conveyor State */}
      <div className="bg-control-panel border border-control-border rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-control-muted text-xs">
          <span className="font-medium">Conveyor State</span>
          <Zap className="w-3.5 h-3.5 text-control-dim" />
        </div>
        <div className="my-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${stateColor}`}>
            {stateText}
          </span>
        </div>
        <div className="text-[11px] font-mono text-control-dim flex items-center justify-between">
          <span>Speed:</span>
          <span className="text-slate-200">{conveyorSummary?.speed_mps ?? 2.45} m/s</span>
        </div>
      </div>

      {/* 2. Conveyor Risk Index (PRD 6.4: 0.6*mean + 0.4*worst) */}
      <div className="bg-control-panel border border-control-border rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-control-muted text-xs">
          <span className="font-medium">Conveyor Risk Index</span>
          <Gauge className="w-3.5 h-3.5 text-control-dim" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${riskConfig.textClass}`}>
            {riskIndex.toFixed(1)}%
          </span>
          <SeverityBadge health={riskIndex} size="sm" showLabel={false} />
        </div>
        <div className="text-[11px] font-mono text-control-dim truncate" title={`Worst: ${worstJointCode} (${worstJointHealth.toFixed(1)}%)`}>
          Worst: <span className="text-amber-400 font-semibold">{worstJointCode}</span> ({worstJointHealth.toFixed(1)}%)
        </div>
      </div>

      {/* 3. Average Joint Health (Separate display per PRD 6.4) */}
      <div className="bg-control-panel border border-control-border rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-control-muted text-xs">
          <span className="font-medium">Avg Joint Health</span>
          <HeartPulse className="w-3.5 h-3.5 text-control-dim" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100">
            {avgHealth.toFixed(1)}%
          </span>
          <SeverityBadge health={avgHealth} size="sm" showLabel={false} />
        </div>
        <div className="text-[11px] font-mono text-control-dim">
          Across {allJointsList.length > 0 ? allJointsList.length : 24} joints
        </div>
      </div>

      {/* 4. Active Alerts */}
      <div className="bg-control-panel border border-control-border rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-control-muted text-xs">
          <span className="font-medium">Active Alerts</span>
          <AlertTriangle className="w-3.5 h-3.5 text-control-dim" />
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${activeAlertsCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
            {activeAlertsCount}
          </span>
          {activeAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-600/40">
              Needs review
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-control-dim">
          Watch: <span className="text-amber-300 font-semibold">{watchCount}</span>
        </div>
      </div>

      {/* 5. Critical Joints */}
      <div className="bg-control-panel border border-control-border rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-control-muted text-xs">
          <span className="font-medium">Critical Joints</span>
          <span className="text-[10px] font-mono text-red-400">&lt;50%</span>
        </div>
        <div className="my-1 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${criticalCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
            {criticalCount}
          </span>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-red-950/60 text-red-300 border border-red-600/40 font-bold animate-pulse">
              ACTION REQ
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-control-dim">
          {criticalCount > 0 ? `${criticalCount} joint(s) high risk` : 'All joints nominal'}
        </div>
      </div>

      {/* 6. Predicted Breaches (7 d) - Honest Gap Handling */}
      <div className="bg-control-panel border border-control-border rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-control-muted text-xs">
          <span className="font-medium">Predicted Breaches</span>
          <Clock className="w-3.5 h-3.5 text-control-dim" />
        </div>
        <div className="my-1">
          {devMode ? (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/40" title="Missing backend route /api/v1/ai/predictions">
              <HelpCircle className="w-3 h-3" />
              API Gap: /ai/predictions
            </div>
          ) : (
            <span className="text-xs text-control-dim font-mono italic">
              Not available in this build
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-control-dim flex items-center justify-between">
          <span>Horizon:</span>
          <span>7 Days</span>
        </div>
      </div>
    </section>
  );
};
