import React, { useState } from 'react';
import {
  ScanEye,
  Sliders,
  Layers,
  ImageOff,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { SeverityBadge } from '../utils/severity';

// NOTE: No camera images or YOLOv8 detections are available in this build.
// All values shown trace directly to state.joints or state.conveyorSummary.
// The before/after slider uses labelled colour blocks — not real images.
// The LiDAR profile shape is derived solely from joint.state (CRITICAL / not).
// Hardcoded confidence scores have been removed entirely.

interface InspectionCenterPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const InspectionCenterPage: React.FC<InspectionCenterPageProps> = ({ state }) => {
  const [selectedJointCode, setSelectedJointCode] = useState('J02');
  const [sliderPosition, setSliderPosition] = useState(50);

  const jointCodes = ['J01', 'J02', 'J03'];
  const joint = state.joints[selectedJointCode] || state.joints[`CV01_${selectedJointCode}`];
  const health = joint?.health ?? null;
  const healthState = joint?.state ?? null;
  const isCritical = healthState === 'CRITICAL';
  const isWatch    = healthState === 'WATCH' || healthState === 'MAINTENANCE_REQUIRED';
  const hasDamage  = isCritical || isWatch;

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <ScanEye className="w-5 h-5 text-cyan-400" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Inspection Center & Defect Analysis
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/60 text-amber-400 border border-amber-500/40">
              NO REAL IMAGES IN THIS BUILD
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Joint state data from live WebSocket. Image comparison and YOLOv8 bounding boxes
            will appear here once the model training pipeline delivers real detections.
          </p>
        </div>

        {/* Joint Selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-control-dim mr-1">Select Joint:</span>
          {jointCodes.map((code) => (
            <button
              key={code}
              onClick={() => setSelectedJointCode(code)}
              className={`px-3 py-1 rounded border transition-colors cursor-pointer text-xs font-bold ${
                selectedJointCode === code
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                  : 'bg-control-subpanel border-control-border text-control-dim hover:text-white'
              }`}
            >
              {code} {code === 'J02' && '(Focus)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Before / After Slider — labelled schematic, not real imagery */}
        <div className="lg:col-span-8 bg-control-panel border border-control-border rounded-lg overflow-hidden shadow-sm space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">
                Baseline vs. Current State — {selectedJointCode}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              {health !== null ? (
                <SeverityBadge health={health} size="sm" showLabel={true} />
              ) : (
                <span className="text-slate-500 font-mono text-[11px]">Awaiting data…</span>
              )}
            </div>
          </div>

          {/* Schematic split viewport — clearly labelled colour blocks, not fake images */}
          <div className="relative aspect-video w-full bg-slate-950 rounded border border-control-border overflow-hidden select-none">

            {/* Right half: current degradation state */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <div className={`w-4/5 h-28 rounded border-2 flex items-center justify-center ${
                isCritical ? 'border-red-500/80 bg-red-950/30' :
                isWatch    ? 'border-amber-500/70 bg-amber-950/20' :
                             'border-emerald-500/60 bg-emerald-950/20'
              }`}>
                <div className="text-center space-y-1">
                  <span className="block text-xs font-mono font-bold text-white bg-black/60 px-3 py-1 rounded">
                    CURRENT PASS: {selectedJointCode}
                  </span>
                  {health !== null && (
                    <span className={`block text-xs font-mono font-bold ${
                      isCritical ? 'text-red-400' : isWatch ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      Health: {health.toFixed(1)}% — {healthState}
                    </span>
                  )}
                  {hasDamage && (
                    <span className="block text-[10px] font-mono text-slate-400 bg-black/50 px-2 py-0.5 rounded">
                      Defect region — awaiting YOLOv8 detection from real image
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Left half (clipped by slider): healthy baseline schematic */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-slate-900 overflow-hidden border-r-2 border-cyan-400"
              style={{ width: `${sliderPosition}%` }}
            >
              <div className="w-full h-full flex flex-col justify-center items-center min-w-[480px]">
                <div className="w-4/5 h-28 rounded border-2 border-emerald-500/80 bg-emerald-950/30 flex flex-col items-center justify-center gap-1">
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-black/60 px-3 py-1 rounded border border-emerald-500/40">
                    BASELINE: {selectedJointCode} — Day 0 Commissioning
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500">
                    Schematic only — no real image stored yet
                  </span>
                </div>
              </div>
            </div>

            {/* Corner labels */}
            <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/40 pointer-events-none">
              ◀ Baseline schematic
            </div>
            <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-black/70 px-2 py-0.5 rounded border border-slate-500/40 pointer-events-none">
              Current state ▶
            </div>

            {/* Slider drag overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
            />
          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-3 font-mono text-[11px] text-control-dim">
              <span>Split: <strong className="text-white">{sliderPosition}%</strong></span>
              <button
                onClick={() => setSliderPosition(50)}
                className="hover:text-white underline cursor-pointer"
              >
                Reset 50/50
              </button>
            </div>
            <span className="text-[10px] text-slate-600 font-mono">
              Bounding boxes will appear here once YOLOv8 returns real detections
            </span>
          </div>
        </div>

        {/* Right: LiDAR elevation profile — shape from real state only */}
        <div className="lg:col-span-4 bg-control-panel border border-control-border rounded-lg p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">TF-Luna Profile Shape</h3>
            </div>
            <span className="text-[10px] font-mono text-indigo-300">ToF 850nm</span>
          </div>

          {/* SVG profile — shape is CRITICAL / HEALTHY from real state; no hardcoded mm values */}
          <div className="h-44 bg-slate-950/80 rounded border border-control-border p-3 flex flex-col justify-between relative">
            <span className="text-[10px] font-mono text-control-dim">
              Transverse Elevation Shape (schematic — real mm values pending)
            </span>
            <svg className="w-full h-28" viewBox="0 0 300 100">
              <line x1="10" y1="70" x2="290" y2="70" stroke="#475569" strokeDasharray="3,3" strokeWidth="1.5" />
              {health === null ? (
                <text x="150" y="50" textAnchor="middle" fill="#475569" fontSize="12" fontFamily="monospace">
                  No data yet
                </text>
              ) : isCritical ? (
                <path
                  d="M 10 70 L 110 70 Q 140 70 145 28 L 175 28 Q 180 70 210 70 L 290 70"
                  fill="none" stroke="#ef4444" strokeWidth="2.5"
                />
              ) : isWatch ? (
                <path
                  d="M 10 70 L 120 70 Q 145 70 148 50 L 162 50 Q 165 70 190 70 L 290 70"
                  fill="none" stroke="#f59e0b" strokeWidth="2.5"
                />
              ) : (
                <line x1="10" y1="70" x2="290" y2="70" stroke="#10b981" strokeWidth="2.5" />
              )}
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-control-dim">
              <span>Left</span>
              <span className={`font-bold ${isCritical ? 'text-red-400' : isWatch ? 'text-amber-400' : 'text-emerald-400'}`}>
                {health === null ? 'Awaiting data' : isCritical ? 'Significant step lift' : isWatch ? 'Mild step detected' : 'Nominal flat profile'}
              </span>
              <span>Right</span>
            </div>
          </div>

          {/* State from backend — no hardcoded mm measurements or confidence scores */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-control-subpanel border border-control-border">
              <span className="text-control-dim">Joint State:</span>
              <strong className={isCritical ? 'text-red-400' : isWatch ? 'text-amber-400' : 'text-emerald-400'}>
                {healthState ?? '—'}
              </strong>
            </div>
            <div className="flex justify-between p-2 rounded bg-control-subpanel border border-control-border">
              <span className="text-control-dim">Health Score:</span>
              <strong className="text-slate-200">{health !== null ? `${health.toFixed(1)}%` : '—'}</strong>
            </div>
            <div className="flex justify-between p-2 rounded bg-control-subpanel border border-control-border">
              <span className="text-control-dim">Step Height (mm):</span>
              <strong className="text-slate-500">Not in schema</strong>
            </div>
            <div className="flex justify-between p-2 rounded bg-control-subpanel border border-control-border">
              <span className="text-control-dim">AI Confidence:</span>
              <strong className="text-slate-500">Awaiting real detections</strong>
            </div>
          </div>

          {/* Honest integration note */}
          <div className="p-2.5 rounded bg-amber-950/20 border border-amber-700/30 text-[11px] text-amber-400/80 font-mono leading-relaxed">
            <ImageOff className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
            Real per-pass LiDAR mm values and YOLOv8 confidence will populate the rows above
            once the model training conversation delivers detection results.
          </div>
        </div>
      </div>
    </div>
  );
};
