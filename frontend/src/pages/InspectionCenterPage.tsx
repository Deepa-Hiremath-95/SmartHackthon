import React, { useState } from 'react';
import {
  ScanEye,
  Sliders,
  Layers,
  Camera,
  Eye,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { classifyHealth, SeverityBadge } from '../utils/severity';

interface InspectionCenterPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const InspectionCenterPage: React.FC<InspectionCenterPageProps> = ({
  state,
  onNavigateToSection,
}) => {
  const [selectedJointCode, setSelectedJointCode] = useState('J02');
  const [sliderPosition, setSliderPosition] = useState(50); // 0% to 100%
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedModality, setSelectedModality] = useState<'rgb' | 'nir' | 'profile'>('rgb');

  const jointCodes = ['J01', 'J02', 'J03'];
  const joint = state.joints[selectedJointCode] || state.joints[`CV01_${selectedJointCode}`];
  const health = joint?.health ?? 95.0;
  const stateLabel = joint?.state ?? 'HEALTHY';
  const hasDamage = health < 85;

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
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-500/40">
              YOLOv8 + 3D ToF LiDAR
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Interactive Before/After comparative slider, YOLOv8 visual defect bounding boxes, and laser elevation profiles.
          </p>
        </div>

        {/* Joint Selector Pills */}
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

      {/* Main Grid: Comparison Viewport & Technical Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Before / After Comparative Slider (8 Cols) */}
        <div className="lg:col-span-8 bg-control-panel border border-control-border rounded-lg overflow-hidden shadow-sm space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">
                Baseline Fingerprint vs. Current Pass (Joint {selectedJointCode})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <SeverityBadge health={health} size="sm" showLabel={true} />
            </div>
          </div>

          {/* Interactive Split Viewport Container */}
          <div className="relative aspect-video w-full bg-slate-950 rounded border border-control-border overflow-hidden select-none">
            {/* Background: Current Degrading Image */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
              {/* Damaged Joint Surface Representation */}
              <div className="w-full h-full p-8 flex flex-col justify-center items-center relative">
                <div
                  className={`w-4/5 h-28 rounded border-2 relative flex items-center justify-center ${
                    hasDamage
                      ? 'border-red-500/80 bg-red-950/30'
                      : 'border-emerald-500/60 bg-emerald-950/20'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-white bg-black/60 px-3 py-1 rounded">
                    CURRENT PASS: {selectedJointCode} (Health {health.toFixed(1)}%)
                  </span>

                  {/* Damage Bounding Box Overlay */}
                  {showBoxes && hasDamage && (
                    <div className="absolute inset-4 border-2 border-dashed border-red-400 rounded flex items-start p-1 bg-red-500/10">
                      <span className="bg-red-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                        YOLOv8: Splice Lift (Conf: 0.82)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Foreground: Healthy Baseline Image (Clipped by slider position) */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 flex items-center justify-center overflow-hidden border-r-2 border-cyan-400 shadow-2xl"
              style={{ width: `${sliderPosition}%` }}
            >
              <div className="w-full h-full p-8 flex flex-col justify-center items-center min-w-[500px]">
                <div className="w-4/5 h-28 rounded border-2 border-emerald-500/80 bg-emerald-950/30 relative flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-black/60 px-3 py-1 rounded border border-emerald-500/40">
                    BASELINE COMMISSIONING: {selectedJointCode} (100% HEALTHY)
                  </span>
                </div>
              </div>
            </div>

            {/* Labels overlay */}
            <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/40 pointer-events-none">
              ◀ Healthy Baseline (Day 0)
            </div>
            <div className="absolute top-3 right-3 text-[10px] font-mono text-red-400 bg-black/70 px-2 py-0.5 rounded border border-red-500/40 pointer-events-none">
              Live Current Pass ▶
            </div>

            {/* Slider Drag Overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
            />
          </div>

          {/* Slider Controls Bar */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-3 font-mono text-[11px] text-control-dim">
              <span>Split Position: <strong className="text-white">{sliderPosition}%</strong></span>
              <button
                onClick={() => setSliderPosition(50)}
                className="hover:text-white underline cursor-pointer"
              >
                Reset 50/50
              </button>
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showBoxes}
                onChange={(e) => setShowBoxes(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>Show Defect Bounding Boxes</span>
            </label>
          </div>
        </div>

        {/* Right: LiDAR 3D Profile Cross-Section (4 Cols) */}
        <div className="lg:col-span-4 bg-control-panel border border-control-border rounded-lg p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">
                TF-Luna 3D Profile Scan
              </h3>
            </div>
            <span className="text-[10px] font-mono text-indigo-300">ToF 850nm</span>
          </div>

          {/* SVG 3D Elevation Step Profile */}
          <div className="h-44 bg-slate-950/80 rounded border border-control-border p-3 flex flex-col justify-between relative">
            <span className="text-[10px] font-mono text-control-dim">Transverse Elevation Profile (mm)</span>

            <svg className="w-full h-28" viewBox="0 0 300 100">
              {/* Baseline reference line */}
              <line x1="10" y1="70" x2="290" y2="70" stroke="#475569" strokeDasharray="3,3" strokeWidth="1.5" />

              {/* Step Profile curve */}
              {hasDamage ? (
                <path
                  d="M 10 70 L 110 70 Q 140 70 145 35 L 175 35 Q 180 70 210 70 L 290 70"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                />
              ) : (
                <line x1="10" y1="70" x2="290" y2="70" stroke="#10b981" strokeWidth="2.5" />
              )}
            </svg>

            <div className="flex justify-between text-[10px] font-mono text-control-dim">
              <span>Left Margin</span>
              <span className="text-white font-bold">{hasDamage ? 'Step Lift +4.8mm' : 'Nominal Flat'}</span>
              <span>Right Margin</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-control-subpanel border border-control-border">
              <span className="text-control-dim">Step Height:</span>
              <strong className={hasDamage ? 'text-red-400' : 'text-emerald-400'}>
                {hasDamage ? '4.82 mm (CRITICAL)' : '0.42 mm (OK)'}
              </strong>
            </div>
            <div className="flex justify-between p-2 rounded bg-control-subpanel border border-control-border">
              <span className="text-control-dim">Confidence Score:</span>
              <strong className="text-slate-200">0.96 (High)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
