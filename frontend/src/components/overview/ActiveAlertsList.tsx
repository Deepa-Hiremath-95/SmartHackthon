import React from 'react';
import { Alert } from '../../types/telemetry';
import { classifySeverity, SeverityShape } from '../../utils/severity';
import { AlertOctagon, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface ActiveAlertsListProps {
  alerts: Alert[];
  onSelectJoint: (jointCode: string) => void;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  WARNING: 3,
  WATCH: 2,
  INFO: 1,
};

export const ActiveAlertsList: React.FC<ActiveAlertsListProps> = ({ alerts, onSelectJoint }) => {
  // Sort by severity (descending) then by created_at (descending)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] || 0;
    const sevB = SEVERITY_ORDER[b.severity] || 0;
    if (sevB !== sevA) return sevB - sevA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-4 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Active Alerts Queue (OV-05)
          </h2>
        </div>
        <span className="text-[11px] font-mono text-control-dim">
          Sorted by Severity &bull; Recency
        </span>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-control-border rounded-md text-control-dim space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
          <span className="text-xs font-medium text-slate-300">
            No Active Incident Alerts
          </span>
          <p className="text-[11px] text-control-dim max-w-xs">
            All 24 joints on conveyor mainline are operating within safe baseline tolerances.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {sortedAlerts.map((alert) => {
            const config = classifySeverity(alert.severity);
            const jointCode = alert.joint_id.replace(/^CV01_/, '');
            const isCorroborated = alert.evidence?.is_corroborated;

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded border transition-all ${config.bgClass} ${config.borderClass} flex items-start justify-between gap-3`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${config.badgeClass}`}>
                      <SeverityShape shape={config.shape} colorHex={config.colorHex} size={11} />
                      <span>{alert.severity}</span>
                    </span>

                    {/* Joint Code button */}
                    <button
                      onClick={() => onSelectJoint(jointCode)}
                      className="font-mono text-xs font-bold text-white hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors cursor-pointer"
                    >
                      Joint {jointCode}
                    </button>

                    {/* Corroboration Badge */}
                    {isCorroborated ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Corroborated (≥2 Modalities)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-300/80 bg-amber-950/30 px-1.5 py-0.2 rounded border border-amber-600/30">
                        Single Modality
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 font-medium line-clamp-1">
                    {alert.title}
                  </p>
                  {alert.description && (
                    <p className="text-[11px] text-control-muted line-clamp-2">
                      {alert.description}
                    </p>
                  )}

                  <div className="text-[10px] font-mono text-control-dim flex items-center gap-2 pt-0.5">
                    <span>Detected: {new Date(alert.created_at).toLocaleTimeString()}</span>
                    <span>&bull;</span>
                    <span>ID: {alert.id}</span>
                  </div>
                </div>

                {/* Inspect button */}
                <button
                  onClick={() => onSelectJoint(jointCode)}
                  className="p-1.5 rounded bg-control-subpanel text-control-muted hover:text-white hover:bg-slate-800 border border-control-border transition-colors cursor-pointer shrink-0 mt-0.5"
                  title={`Inspect Joint ${jointCode}`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
