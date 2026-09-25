import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Wrench,
  ScanEye,
  Activity,
  Layers,
  Clock,
  AlertOctagon,
  TrendingDown,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { Joint, Alert, PassEvent } from '../../types/telemetry';
import { classifyHealth, SeverityBadge, RULBadge } from '../../utils/severity';
import { JointHistoryPoint } from '../../hooks/liveDataReducer';
import { api } from '../../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface JointDetailDrawerProps {
  jointCode: string | null;
  joint: Joint | null;
  historyPoints: JointHistoryPoint[];
  alerts: Alert[];
  latestPass: PassEvent | null;
  onClose: () => void;
  onNavigateToSection?: (section: string) => void;
  onLoadHistory?: (code: string) => Promise<unknown>;
}

export const JointDetailDrawer: React.FC<JointDetailDrawerProps> = ({
  jointCode,
  joint,
  historyPoints,
  alerts,
  latestPass,
  onClose,
  onNavigateToSection,
  onLoadHistory,
}) => {
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [localHistory, setLocalHistory] = useState<JointHistoryPoint[]>([]);

  // Fetch SQLite history on drawer open
  useEffect(() => {
    if (!jointCode) return;

    let mounted = true;
    setLoadingHistory(true);

    const fetchHistory = async () => {
      try {
        if (onLoadHistory) {
          await onLoadHistory(jointCode);
        } else {
          const res = await api.getJointHistory(jointCode);
          if (mounted && res && res.length > 0) {
            setLocalHistory(
              res.map((p) => ({
                lap: p.lap,
                health: Math.round(p.health * 10) / 10,
                timestamp: p.timestamp,
              }))
            );
          }
        }
      } catch (err) {
        console.warn(`Failed to backfill history for joint ${jointCode}:`, err);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    };

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [jointCode, onLoadHistory]);

  if (!jointCode || !joint) return null;

  const health = joint.health;
  const config = classifyHealth(health);
  const jointAlerts = alerts.filter(
    (a) =>
      a.joint_id === joint.id ||
      a.joint_id === jointCode ||
      a.joint_id.endsWith(jointCode)
  );

  // Combine passed history points or fallback to local history
  const activeHistory = historyPoints.length > 0 ? historyPoints : localHistory;

  const chartData = activeHistory.map((p) => ({
    lap: `Lap ${p.lap}`,
    lapNum: p.lap,
    health: p.health,
    time: new Date(p.timestamp).toLocaleTimeString(),
  }));

  // Determine degradation rate from first to last point if >= 2 points
  let healthDelta = 0;
  if (chartData.length >= 2) {
    const firstH = chartData[0].health;
    const lastH = chartData[chartData.length - 1].health;
    healthDelta = Math.round((lastH - firstH) * 10) / 10;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="joint-drawer-title"
      aria-modal="true"
      className="fixed inset-y-0 right-0 w-full max-w-md bg-control-panel border-l border-control-border shadow-2xl z-40 flex flex-col transition-transform animate-slide-in select-none"
    >
      {/* Header */}
      <div className="p-4 border-b border-control-border flex items-center justify-between bg-control-bg/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="joint-drawer-title" className="text-lg font-bold font-mono text-white">
              Joint {joint.joint_code}
            </h2>
            <SeverityBadge health={health} size="sm" />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              {joint.id}
            </span>
          </div>
          <p className="text-xs text-control-dim font-mono mt-0.5">
            Belt Odometry: {joint.position_m} m • {joint.splice_type}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded text-control-dim hover:text-white hover:bg-control-subpanel transition-colors cursor-pointer"
          title="Close drawer (Esc)"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Health & Risk Metrics Card */}
        <div className="bg-control-subpanel border border-control-border rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200 block text-xs">Joint Health Score (EWMA)</span>
              <span className="text-[10px] text-control-dim font-mono">Fused multimodal health index</span>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold font-mono ${config.textClass}`}>
                {health.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-control-border pt-2 text-control-muted">
            <div>
              <span className="block text-control-dim">Fused Risk Score:</span>
              <span className="font-bold text-slate-200">
                {(joint.risk_score ?? (1 - health / 100)).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-control-dim">Last Inspected:</span>
              <span className="text-slate-200">
                {joint.last_pass_time
                  ? new Date(joint.last_pass_time).toLocaleTimeString()
                  : 'Live Station ST-01'}
              </span>
            </div>
          </div>
        </div>

        {/* Prognostics: RUL Card (Non-negotiable PRD Rule) */}
        <div className="bg-control-subpanel border border-control-border rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Remaining Useful Life (RUL)
            </span>
            <span className="text-[10px] font-mono text-control-dim">PRD 6.6 Prognostics</span>
          </div>

          <div className="p-2.5 bg-control-bg/60 rounded border border-control-border space-y-1.5">
            <RULBadge
              status={joint.rul?.status || (health < 80 ? 'DEMO' : 'UNAVAILABLE')}
              lowDays={joint.rul?.low_days}
              highDays={joint.rul?.high_days}
              reason={joint.rul?.reason || (health >= 80 ? 'no_degradation_trend' : null)}
              showDetails={true}
            />
          </div>

          <div className="text-[10px] text-control-dim leading-relaxed space-y-1 font-mono">
            {joint.rul?.status === 'DEMO' ? (
              <p className="text-purple-300/90 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-purple-400 shrink-0" />
                <span>Degradation trend active. Estimated time to critical threshold (Health ≤ 50%).</span>
              </p>
            ) : (
              <p className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Status UNAVAILABLE: No active degradation trend detected; joint health is stable within baseline.</span>
              </p>
            )}
            <p className="text-slate-500 italic text-[9px]">
              * RUL numbers are always displayed with their model credibility status (UNAVAILABLE / DEMO / ESTIMATED / VALIDATED).
            </p>
          </div>
        </div>

        {/* Health-over-Time Chart (Backed by REST history + live WebSocket updates) */}
        <div className="bg-control-subpanel border border-control-border rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-200">
                Health History ({chartData.length} passes)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Live WS
              </span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center text-control-dim text-center p-3 border border-dashed border-control-border rounded">
              <Activity className="w-5 h-5 mb-1 text-slate-600 animate-pulse" />
              <span>{loadingHistory ? 'Loading history from database...' : 'Awaiting pass updates...'}</span>
              <span className="text-[10px] text-slate-600">
                Data records automatically as joint crosses Station ST-01
              </span>
            </div>
          ) : (
            <div>
              <div className="h-40 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#273447" vertical={false} />
                    <XAxis dataKey="lap" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131b26',
                        borderColor: '#273447',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        borderRadius: '6px',
                        padding: '6px 10px',
                      }}
                      formatter={(val: unknown) => {
                        const num = typeof val === 'number' ? val : Number(val);
                        return [`${num.toFixed(1)}%`, 'Health Score'];
                      }}
                    />
                    {/* Severity Threshold Reference Lines */}
                    <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="2 2" strokeOpacity={0.6} />
                    <ReferenceLine y={70} stroke="#f97316" strokeDasharray="2 2" strokeOpacity={0.6} />
                    <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.7} />
                    <Line
                      type="monotone"
                      dataKey="health"
                      stroke={health < 50 ? '#ef4444' : health < 70 ? '#f97316' : health < 85 ? '#f59e0b' : '#10b981'}
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: health < 50 ? '#ef4444' : '#10b981' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-control-dim pt-2 border-t border-control-border">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Watch: 85%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Crit: 50%
                  </span>
                </div>
                {chartData.length >= 2 && (
                  <span className={healthDelta < 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    Trend: {healthDelta > 0 ? `+${healthDelta}` : healthDelta}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contributing Modalities (Fusion Breakdown) */}
        {joint.contributors && Object.keys(joint.contributors).length > 0 && (
          <div className="bg-control-subpanel border border-control-border rounded-lg p-3.5 space-y-2.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Multimodal Sensor Contributors
            </span>
            <div className="space-y-2">
              {Object.entries(joint.contributors).map(([mod, item]) => (
                <div key={mod} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="capitalize text-slate-300 font-medium">{mod}</span>
                    <span className={item.score >= 0.3 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      Risk: {item.score.toFixed(2)} (Qual: {Math.round(item.quality * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.score >= 0.5 ? 'bg-red-500' : item.score >= 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(item.score * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Pass Event */}
        {latestPass && (
          <div className="bg-control-subpanel border border-control-border rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
            <span className="font-sans font-semibold text-slate-200 block text-xs">
              Latest Station Pass Telemetry
            </span>
            <div className="flex justify-between text-control-muted">
              <span>Station:</span>
              <span className="text-slate-200">{latestPass.station_id}</span>
            </div>
            <div className="flex justify-between text-control-muted">
              <span>Pass Speed:</span>
              <span className="text-slate-200">{latestPass.speed_mps} m/s</span>
            </div>
            <div className="flex justify-between text-control-muted">
              <span>Belt Load:</span>
              <span className="text-slate-200">{latestPass.load_pct}%</span>
            </div>
          </div>
        )}

        {/* Open Alerts for this Joint */}
        {jointAlerts.length > 0 && (
          <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 space-y-2">
            <span className="font-semibold text-red-300 flex items-center gap-1.5 text-xs">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              Active Incident ({jointAlerts.length})
            </span>
            {jointAlerts.map((alt) => (
              <div key={alt.id} className="text-[11px] p-2 bg-red-950/40 rounded border border-red-500/20 space-y-1">
                <div className="font-bold text-red-200">{alt.title}</div>
                <p className="text-slate-300 text-[10px]">{alt.description}</p>
                <div className="text-[9px] font-mono text-slate-400">
                  Detected: {new Date(alt.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-control-border bg-control-bg/80 flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigateToSection?.('inspection')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-control-subpanel hover:bg-slate-800 text-slate-300 rounded border border-control-border text-xs transition-colors cursor-pointer"
        >
          <ScanEye className="w-3.5 h-3.5" />
          <span>Inspection</span>
        </button>

        <button
          onClick={() => onNavigateToSection?.('maintenance')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-control-subpanel hover:bg-slate-800 text-slate-300 rounded border border-control-border text-xs transition-colors cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Work Order</span>
        </button>

        <button
          onClick={() => onNavigateToSection?.('joint_health')}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-600 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>
      </div>
    </div>
  );
};
