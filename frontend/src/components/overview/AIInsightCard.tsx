import React from 'react';
import { Alert } from '../../types/telemetry';
import { Sparkles, ShieldCheck, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { classifySeverity } from '../../utils/severity';

interface AIInsightCardProps {
  topAlert: Alert | null;
  devMode: boolean;
  onInspectJoint?: (jointCode: string) => void;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  topAlert,
  devMode,
  onInspectJoint,
}) => {
  // 1. Normal State if no incident is active
  if (!topAlert) {
    return (
      <div className="bg-control-panel border border-control-border rounded-lg p-4 select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Diagnostic & Explainability Insight (OV-06)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
            NOMINAL
          </span>
        </div>

        <div className="p-3 bg-control-subpanel rounded border border-control-border text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Normal Operating Envelope</span>
          </div>
          <p className="text-control-muted text-[11px] leading-relaxed">
            Multimodal sensor fusion engine reports nominal joint health across all 24 monitored splices.
            No anomalous vibrations, thermal deviations, or visual surface delaminations meet persistence thresholds.
          </p>
        </div>
      </div>
    );
  }

  // 2. Incident Active: Build deterministic explanation from evidence
  const evidence = topAlert.evidence;
  const jointCode = topAlert.joint_id.replace(/^CV01_/, '');
  const config = classifySeverity(topAlert.severity);

  // Check if evidence exists
  const hasEvidence =
    evidence &&
    (evidence.contributors || (evidence.abnormal_modalities && evidence.abnormal_modalities.length > 0));

  if (!hasEvidence) {
    return (
      <div className="bg-control-panel border border-control-border rounded-lg p-4 select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Diagnostic Insight (OV-06)
            </h2>
          </div>
        </div>
        <div className="p-3 bg-control-subpanel rounded border border-control-border text-xs text-control-muted flex items-center justify-between">
          <span>Evidence not available in current API response.</span>
          {devMode && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-500/40">
              <HelpCircle className="w-3 h-3" />
              API Gap: missing evidence_json
            </span>
          )}
        </div>
      </div>
    );
  }

  // Parse structured evidence deterministically
  const abnormalList = evidence.abnormal_modalities || [];
  const isCorroborated = evidence.is_corroborated ?? abnormalList.length >= 2;

  // Find top contributing modality
  let topModalityName = 'Sensor Fusion';
  let topModalityScore = 0;
  if (evidence.contributors) {
    Object.entries(evidence.contributors).forEach(([mod, val]) => {
      const score = typeof val === 'object' && val !== null ? (val as { score?: number }).score || 0 : 0;
      if (score > topModalityScore) {
        topModalityScore = score;
        topModalityName = mod;
      }
    });
  }

  // Fixed deterministic recommendation
  let recommendation = 'Maintain standard automated monitoring schedule.';
  if (topAlert.severity === 'CRITICAL') {
    recommendation =
      'Immediate physical inspection per site safety procedure. Advisory trip request signal dispatched via PLC safety path.';
  } else if (topAlert.severity === 'WARNING') {
    recommendation =
      'Schedule joint repair/re-splice window during upcoming shift change. Stage ST-3150 vulcanizing splice kit.';
  } else if (topAlert.severity === 'WATCH') {
    recommendation =
      'Increase inspection frequency. Re-evaluate multimodal feature divergence on next 3 belt revolutions.';
  }

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-4 select-none">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            AI Diagnostic & Explainability Insight (OV-06)
          </h2>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${config.badgeClass}`}>
          TOP INCIDENT: {jointCode}
        </span>
      </div>

      <div className="p-3.5 bg-control-subpanel rounded-md border border-control-border text-xs space-y-2.5">
        {/* Incident Summary */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-semibold text-white block">
              {topAlert.title}
            </span>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
              Anomaly detected across{' '}
              <strong className="text-amber-300 font-mono">{abnormalList.length || 1} modality streams</strong>{' '}
              ({abnormalList.join(', ') || 'multimodal sensors'}). Primary driver:{' '}
              <span className="font-mono text-cyan-300 font-semibold capitalize">{topModalityName}</span> (anomaly score:{' '}
              <span className="font-mono font-bold text-amber-400">{topModalityScore.toFixed(2)}</span>).
            </p>
          </div>

          {onInspectJoint && (
            <button
              onClick={() => onInspectJoint(jointCode)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-control-border text-[11px] font-medium transition-colors cursor-pointer shrink-0"
            >
              Inspect {jointCode}
            </button>
          )}
        </div>

        {/* Corroboration and Safety Rule Check (PRD Rule) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-control-border text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            {isCorroborated ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">
                  Corroboration: <strong>VALIDATED (&ge;2 sensors)</strong>
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-300">
                  Corroboration: <strong>SINGLE MODALITY</strong>
                </span>
              </>
            )}
          </div>

          <div className="text-control-dim flex items-center justify-start sm:justify-end gap-1">
            <span>Deterministic Template</span>
            <span className="text-slate-500">• Zero Hallucination</span>
          </div>
        </div>

        {/* Action Recommendation */}
        <div className="p-2 bg-slate-900/60 rounded border border-slate-700/40 text-[11px]">
          <span className="font-bold text-slate-200 block mb-0.5">Recommended Maintenance Action:</span>
          <span className="text-slate-300">{recommendation}</span>
        </div>
      </div>
    </div>
  );
};
