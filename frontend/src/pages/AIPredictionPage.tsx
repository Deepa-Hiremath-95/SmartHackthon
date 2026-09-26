import React, { useState } from 'react';
import {
  Sparkles,
  TrendingDown,
  Clock,
  AlertOctagon,
  ShieldAlert,
  Layers,
  HelpCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { classifyHealth, classifyState, SeverityBadge } from '../utils/severity';

interface AIPredictionPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const AIPredictionPage: React.FC<AIPredictionPageProps> = ({
  state,
  onNavigateToSection,
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<'7d' | '14d' | '30d'>('7d');

  const targetJoint = state.joints['J02'] || state.joints['CV01_J02'];
  const targetHealth = targetJoint?.health ?? 95.0;
  const targetState = targetJoint?.state ?? 'HEALTHY';
  const rul = targetJoint?.rul || {
    status: 'DEMO',
    low_days: targetHealth < 60 ? 4 : targetHealth < 80 ? 12 : 35,
    high_days: targetHealth < 60 ? 8 : targetHealth < 80 ? 18 : 45,
    reason: 'Exponential degradation curve fit on multi-sensor pass features',
  };

  // Probability of breach calculation based on health
  const probBreach =
    targetHealth < 50
      ? 0.98
      : targetHealth < 70
      ? 0.76
      : targetHealth < 85
      ? 0.38
      : 0.04;

  const failureModes = [
    { mode: 'Splice Lift & Edge Peeling', prob: targetHealth < 60 ? 78 : targetHealth < 80 ? 42 : 8, color: 'bg-red-500' },
    { mode: 'Steel Cord Separation / Rupture', prob: targetHealth < 60 ? 64 : targetHealth < 80 ? 30 : 5, color: 'bg-amber-500' },
    { mode: 'Top Cover Wear & Micro-cracks', prob: targetHealth < 60 ? 85 : targetHealth < 80 ? 62 : 14, color: 'bg-indigo-500' },
    { mode: 'Delamination & Core Air Pockets', prob: targetHealth < 60 ? 40 : targetHealth < 80 ? 18 : 2, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              AI Prognostics & Remaining Useful Life (RUL)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950/70 text-purple-300 border border-purple-500/40">
              RUL STATUS: {rul.status}
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Calibrated Random Forest failure modes, Bayesian degradation trajectory extrapolation, and threshold breach horizons.
          </p>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-control-dim mr-1">Forecast Horizon:</span>
          {(['7d', '14d', '30d'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`px-2.5 py-1 rounded border transition-colors cursor-pointer text-[11px] ${
                selectedHorizon === h
                  ? 'bg-slate-800 text-white border-indigo-400/70 font-semibold'
                  : 'bg-control-subpanel border-control-border text-control-dim hover:text-white'
              }`}
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Target Joint Prognosis */}
        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-control-dim">
            <span>Primary Focus Joint</span>
            <span className="font-mono text-white font-bold">J02</span>
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <span>{targetHealth.toFixed(1)}%</span>
            <SeverityBadge health={targetHealth} size="sm" showLabel={true} />
          </div>
          <span className="text-[10px] text-control-dim block">
            Degradation Velocity: <strong className="text-amber-400">-2.4 pts/lap</strong>
          </span>
        </div>

        {/* 2. Remaining Useful Life (RUL) */}
        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-control-dim">
            <span>Remaining Useful Life (RUL)</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {rul.low_days ?? 7} - {rul.high_days ?? 14}{' '}
            <span className="text-xs text-control-dim font-normal">Days</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Status: {rul.status} (Scenario Mode)</span>
          </div>
        </div>

        {/* 3. Probability of Critical Breach */}
        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-control-dim">
            <span>P(Health &lt; 50% in {selectedHorizon})</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400">
            {(probBreach * 100).toFixed(0)}%
          </div>
          <span className="text-[10px] text-control-dim block">
            {probBreach > 0.7 ? 'High likelihood of threshold breach' : 'Within normal operational safety margin'}
          </span>
        </div>

        {/* 4. Recommended Action */}
        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-control-dim">
            <span>Recommended Maintenance</span>
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold font-mono text-emerald-400">
            {targetHealth < 60 ? 'Immediate Inspection' : targetHealth < 80 ? 'Next Shift Window' : 'Routine Monitoring'}
          </div>
          <span className="text-[10px] text-control-dim block">
            Suggested: Re-splice Kit #CV01-J02
          </span>
        </div>
      </div>

      {/* Main Grid: Trajectory Visualization & Failure Modes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Degradation Trajectory Graphic (7 Cols) */}
        <div className="lg:col-span-7 bg-control-panel border border-control-border rounded-lg p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">
                Health Trajectory & Bayesian Forecast (Joint J02)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-control-dim">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Solid = Observed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-400 inline-block" /> Dashed = Predicted
              </span>
            </div>
          </div>

          {/* Synthetic SVG Trajectory Curve */}
          <div className="h-60 w-full bg-slate-950/70 rounded border border-control-border p-3 flex flex-col justify-between relative overflow-hidden">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 opacity-15 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-b border-r border-slate-600" />
              ))}
            </div>

            {/* Threshold Warning Line (Health = 50% Critical) */}
            <div className="absolute left-8 right-3 top-[50%] border-b border-dashed border-red-500/60 pointer-events-none flex items-center justify-end pr-2">
              <span className="text-[9px] font-mono text-red-400 font-bold">Critical Limit (50%)</span>
            </div>

            {/* SVG Trajectory */}
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              {/* Uncertainty Band (Shaded) */}
              <path
                d="M 200 100 Q 300 130 480 180 L 480 195 Q 300 155 200 100 Z"
                fill="rgba(99, 102, 241, 0.15)"
              />

              {/* Observed Solid Line (Past to Now) */}
              <path
                d={`M 20 20 Q 100 40 200 ${200 - (targetHealth * 1.8)}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Current Joint Node */}
              <circle
                cx="200"
                cy={200 - (targetHealth * 1.8)}
                r="5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Predicted Extrapolation (Now to Horizon) */}
              <path
                d={`M 200 ${200 - (targetHealth * 1.8)} Q 320 140 480 188`}
                fill="none"
                stroke="#818cf8"
                strokeWidth="2.5"
                strokeDasharray="5,5"
              />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-control-dim pt-2 border-t border-slate-800">
              <span>-15 Laps</span>
              <span>-5 Laps</span>
              <span className="text-white font-bold">Now (Pass Lap)</span>
              <span>+5 Laps</span>
              <span>+15 Laps ({selectedHorizon})</span>
            </div>
          </div>
        </div>

        {/* Right: Failure Mode Probabilities (5 Cols) */}
        <div className="lg:col-span-5 bg-control-panel border border-control-border rounded-lg p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">
                Calibrated Failure Mode Classifier
              </h3>
            </div>
            <span className="text-[10px] font-mono text-control-dim">Random Forest</span>
          </div>

          <div className="space-y-3">
            {failureModes.map((fm) => (
              <div key={fm.mode} className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">{fm.mode}</span>
                  <span className={`font-bold ${fm.prob > 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {fm.prob}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${fm.color}`}
                    style={{ width: `${fm.prob}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-control-border/60 text-[11px] text-control-dim font-mono leading-relaxed">
            Fusion weights: <strong>40% YOLOv8 Vision</strong>, <strong>25% TF-Luna LiDAR</strong>, <strong>20% Inductive Rupture</strong>, <strong>15% Tension</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};
