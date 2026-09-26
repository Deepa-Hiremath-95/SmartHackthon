import React, { useState } from 'react';
import { Alert, ActivityLogEntry } from '../../types/telemetry';
import { classifySeverity, SeverityShape, classifyState } from '../../utils/severity';
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Activity,
  History,
  Radio,
} from 'lucide-react';

interface ActiveAlertsListProps {
  alerts: Alert[];
  activityLog?: ActivityLogEntry[];
  onSelectJoint: (jointCode: string) => void;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  WARNING: 3,
  WATCH: 2,
  INFO: 1,
};

export const ActiveAlertsList: React.FC<ActiveAlertsListProps> = ({
  alerts,
  activityLog = [],
  onSelectJoint,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'events' | 'alerts'>('all');

  // Sort alerts by severity (descending) then by created_at (descending)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] || 0;
    const sevB = SEVERITY_ORDER[b.severity] || 0;
    if (sevB !== sevA) return sevB - sevA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Filter activity log by selected tab
  const filteredEvents = activityLog.filter((item) => {
    if (filterTab === 'events') return item.type === 'STATE_CHANGE' || item.type === 'SCENARIO_EVENT';
    if (filterTab === 'alerts') return item.type === 'ALERT_TRIGGERED';
    return true;
  });

  const stateChangeCount = activityLog.filter((i) => i.type === 'STATE_CHANGE' || i.type === 'SCENARIO_EVENT').length;

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-4 flex flex-col justify-between select-none">
      {/* Header with Title and Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-control-border">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Alerts & Live Event Stream
          </h2>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            Live
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-md bg-control-subpanel p-0.5 border border-control-border text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-control-dim hover:text-white'
            }`}
          >
            All Stream ({activityLog.length || sortedAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('events')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === 'events'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-control-dim hover:text-white'
            }`}
          >
            <span>State Changes</span>
            {stateChangeCount > 0 && (
              <span className="px-1 py-0.1 text-[9px] rounded-full bg-amber-500/30 text-amber-300 font-bold">
                {stateChangeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('alerts')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === 'alerts'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-control-dim hover:text-white'
            }`}
          >
            <span>Active Incidents</span>
            {sortedAlerts.length > 0 && (
              <span className="px-1 py-0.1 text-[9px] rounded-full bg-red-500/30 text-red-300 font-bold">
                {sortedAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main List Body */}
      {filterTab === 'alerts' ? (
        // Tab: Incident Alerts
        sortedAlerts.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-control-border rounded-md text-control-dim space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
            <span className="text-xs font-medium text-slate-300">
              No Active Safety Incident Alerts
            </span>
            <p className="text-[11px] text-control-dim max-w-xs">
              All joints on conveyor mainline are currently within safe baseline tolerances.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sortedAlerts.map((alert) => {
              const config = classifySeverity(alert.severity);
              const jointCode = alert.joint_id.replace(/^CV01_/, '').replace(/^CV02_/, '');
              const isCorroborated = alert.evidence?.is_corroborated;

              return (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded border transition-all ${config.bgClass} ${config.borderClass} flex items-start justify-between gap-3`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${config.badgeClass}`}>
                        <SeverityShape shape={config.shape} colorHex={config.colorHex} size={11} />
                        <span>{alert.severity}</span>
                      </span>

                      <button
                        onClick={() => onSelectJoint(jointCode)}
                        className="font-mono text-xs font-bold text-white hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors cursor-pointer"
                      >
                        Joint {jointCode}
                      </button>

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
        )
      ) : (
        // Tab: All Stream or State Changes / Scenario Events
        filteredEvents.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-control-border rounded-md text-control-dim space-y-1">
            <History className="w-6 h-6 text-slate-500 mb-1" />
            <span className="text-xs font-medium text-slate-300">
              Awaiting State Transitions & Events
            </span>
            <p className="text-[11px] text-control-dim max-w-xs">
              State transitions (e.g. HEALTHY → WATCH → CRITICAL) and scenario events will stream here live, newest first.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredEvents.map((item) => {
              const jointCode = item.jointCode || 'J02';
              const isStateChange = item.type === 'STATE_CHANGE';
              const isScenario = item.type === 'SCENARIO_EVENT';

              const sevConfig = item.state
                ? classifyState(item.state)
                : classifySeverity(item.severity);

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded border transition-all ${
                    isScenario
                      ? 'bg-purple-950/30 border-purple-500/40'
                      : isStateChange
                      ? `${sevConfig.bgClass} ${sevConfig.borderClass}`
                      : 'bg-control-subpanel border-control-border'
                  } flex items-start justify-between gap-3`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Event Type Badge */}
                      {isScenario ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-purple-950/60 text-purple-300 border-purple-500/50">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Scenario Milestone</span>
                        </span>
                      ) : isStateChange ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${sevConfig.badgeClass}`}>
                          <SeverityShape shape={sevConfig.shape} colorHex={sevConfig.colorHex} size={11} />
                          <span>State Transition</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${sevConfig.badgeClass}`}>
                          <SeverityShape shape={sevConfig.shape} colorHex={sevConfig.colorHex} size={11} />
                          <span>Alert</span>
                        </span>
                      )}

                      {/* Joint Code button */}
                      {jointCode && (
                        <button
                          onClick={() => onSelectJoint(jointCode)}
                          className="font-mono text-xs font-bold text-white hover:text-emerald-400 underline decoration-slate-600 underline-offset-2 transition-colors cursor-pointer"
                        >
                          Joint {jointCode}
                        </button>
                      )}

                      {/* Lap Badge if available */}
                      {item.lap !== undefined && item.lap > 0 && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                          Lap {item.lap}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 font-medium line-clamp-1">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-control-muted line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="text-[10px] font-mono text-control-dim flex items-center gap-2 pt-0.5">
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span>&bull;</span>
                      <span className="text-[9px] text-slate-500">{item.provenance}</span>
                    </div>
                  </div>

                  {jointCode && (
                    <button
                      onClick={() => onSelectJoint(jointCode)}
                      className="p-1.5 rounded bg-control-subpanel text-control-muted hover:text-white hover:bg-slate-800 border border-control-border transition-colors cursor-pointer shrink-0 mt-0.5"
                      title={`Inspect Joint ${jointCode}`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
