import React, { useState, useEffect } from 'react';
import {
  Camera,
  Layers,
  Gauge,
  Radio,
  Activity,
  Play,
  Pause,
  Maximize2,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { classifyHealth, classifyState, SeverityBadge } from '../utils/severity';

interface LiveMonitoringPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  state,
  onNavigateToSection,
}) => {
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [cameraMode, setCameraMode] = useState<'rgb' | 'nir' | 'thermal'>('rgb');
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [frameTick, setFrameTick] = useState(0);

  // Animate mock live stream ticks
  useEffect(() => {
    if (isLivePaused) return;
    const timer = setInterval(() => {
      setFrameTick((prev) => (prev + 1) % 1000);
    }, 150);
    return () => clearInterval(timer);
  }, [isLivePaused]);

  const targetJoint = state.joints['J02'] || state.joints['CV01_J02'];
  const targetHealth = targetJoint?.health ?? 95.0;
  const targetState = targetJoint?.state ?? 'HEALTHY';
  const beltSpeed = state.conveyorSummary?.speed_mps ?? 2.45;
  const currentLap = state.simStatus?.current_lap ?? 0;
  const beltPosition = state.simStatus?.belt_position_m ?? 0;

  // Determine defect classification on J02
  const hasDefect = targetHealth < 80;
  const defectLabel =
    targetHealth < 50
      ? 'Critical Splice Lift & Exposed Cords'
      : targetHealth < 75
      ? 'Cover Wear & Splice Edge Step'
      : 'Healthy Rubber Matrix';

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Live Station Monitoring (ST-01)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
              30 FPS LIVE
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Real-time multi-band camera streams, TF-Luna LiDAR profilometry, tension load cells, and inductive rupture signals.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setIsLivePaused(!isLivePaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors cursor-pointer ${
              isLivePaused
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-control-subpanel border-control-border text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isLivePaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isLivePaused ? 'Resume Feeds' : 'Freeze Feeds'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Video Feeds, Right Sensor Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Visual Feeds (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Multispectral Inspection Camera Viewport */}
          <div className="bg-control-panel border border-control-border rounded-lg overflow-hidden shadow-lg">
            {/* Camera Header */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-control-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-white">Multispectral Area Camera</span>
                <span className="text-[10px] font-mono text-control-dim">Sony IMX547 • 30 FPS • ST-01 Mast</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <button
                  onClick={() => setCameraMode('rgb')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    cameraMode === 'rgb' ? 'bg-sky-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  RGB Visible
                </button>
                <button
                  onClick={() => setCameraMode('nir')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    cameraMode === 'nir' ? 'bg-indigo-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  NIR (850nm)
                </button>
                <button
                  onClick={() => setCameraMode('thermal')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    cameraMode === 'thermal' ? 'bg-orange-900 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Thermal IR
                </button>
              </div>
            </div>

            {/* Video Canvas / Synthetic Inspection Display */}
            <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {/* Conveyor Belt Surface Simulation */}
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                  cameraMode === 'rgb'
                    ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950'
                    : cameraMode === 'nir'
                    ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950'
                    : 'bg-gradient-to-b from-orange-950/80 via-slate-900 to-purple-950/80'
                }`}
              >
                {/* Moving Belt Texture Lines */}
                <div
                  className="w-full h-full opacity-30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.06) 20px, rgba(255,255,255,0.06) 22px)`,
                    transform: `translateY(${(frameTick * 6) % 22}px)`,
                  }}
                />

                {/* Splice Joint Visual Marker passing the frame */}
                <div
                  className="absolute left-0 right-0 h-16 border-y-2 transition-all flex items-center justify-between px-6"
                  style={{
                    top: `${((frameTick * 2.5) % 120) - 20}%`,
                    borderColor: hasDefect ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.6)',
                    background: hasDefect ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                  }}
                >
                  <span className="font-mono text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                    SPLICE REGION: J02
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      hasDefect ? 'bg-red-950 text-red-300 border border-red-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    }`}
                  >
                    HEALTH: {targetHealth.toFixed(1)}% ({targetState})
                  </span>
                </div>

                {/* Bounding Box Overlays if enabled */}
                {showBoundingBoxes && hasDefect && (
                  <div
                    className="absolute border-2 border-red-500 rounded p-1 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                    style={{
                      left: '32%',
                      top: `${((frameTick * 2.5) % 120) - 10}%`,
                      width: '36%',
                      height: '55px',
                    }}
                  >
                    <div className="absolute -top-5 left-0 bg-red-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                      YOLOv8: {defectLabel} (Conf: {(0.84 - (targetHealth / 300)).toFixed(2)})
                    </div>
                  </div>
                )}
              </div>

              {/* HUD Telemetry Overlay on Video Feed */}
              <div className="absolute top-3 left-3 flex flex-col gap-1 text-[10px] font-mono text-emerald-400 bg-black/70 backdrop-blur-sm p-2 rounded border border-emerald-500/30 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>REC • CAM_01 • 1080p @ 30fps</span>
                </div>
                <div className="text-slate-300">EXPOSURE: 350 µs • GAIN: 0.0 dB</div>
                <div className="text-slate-300">ODOMETRY: {beltPosition.toFixed(1)} m • LAP {currentLap}</div>
              </div>

              {/* Provenance Banner on Video */}
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                PROVENANCE: SIMULATED (ToF + Vision AI)
              </div>
            </div>

            {/* Camera Bottom Action Toolbar */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-t border-control-border flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBoundingBoxes}
                  onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>Show AI YOLOv8 Bounding Boxes</span>
              </label>

              <div className="flex items-center gap-3 text-control-dim font-mono text-[11px]">
                <span>Inference Latency: <strong className="text-slate-200">28.4 ms</strong></span>
                <span>Frame Quality: <strong className="text-emerald-400">98.6%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sensor Waveforms & Signal Sparklines (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* TF-Luna LiDAR 3D Profile Card */}
          <div className="bg-control-panel border border-control-border rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase text-slate-200">
                  TF-Luna Micro LiDAR 3D Profiler
                </h3>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/30">
                100 Hz ToF
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-control-subpanel p-2 rounded border border-control-border">
                <span className="text-[10px] text-control-dim block">Splice Lift Height</span>
                <span className="text-base font-bold text-white">
                  {targetHealth < 60 ? '4.82' : targetHealth < 80 ? '1.85' : '0.42'}{' '}
                  <span className="text-xs text-control-dim font-normal">mm</span>
                </span>
                <span className="text-[9px] text-control-dim block">Limit: &lt; 1.50 mm</span>
              </div>
              <div className="bg-control-subpanel p-2 rounded border border-control-border">
                <span className="text-[10px] text-control-dim block">Surface Elevation</span>
                <span className="text-base font-bold text-white">
                  342.1 <span className="text-xs text-control-dim font-normal">mm</span>
                </span>
                <span className="text-[9px] text-emerald-400 block">Baseline ± 1.2 mm</span>
              </div>
            </div>
          </div>

          {/* Tension & Load Cell Card */}
          <div className="bg-control-panel border border-control-border rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase text-slate-200">
                  Tension Load Cell Sensors
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                Dual 100kN 4-20mA
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-control-subpanel p-2 rounded border border-control-border">
                <span className="text-[10px] text-control-dim block">Dynamic Tension</span>
                <span className="text-base font-bold text-white">
                  44.8 <span className="text-xs text-control-dim font-normal">kN</span>
                </span>
                <span className="text-[9px] text-emerald-400 block">Nominal (38 - 55 kN)</span>
              </div>
              <div className="bg-control-subpanel p-2 rounded border border-control-border">
                <span className="text-[10px] text-control-dim block">L/R Asymmetry</span>
                <span className="text-base font-bold text-white">
                  1.2 <span className="text-xs text-control-dim font-normal">%</span>
                </span>
                <span className="text-[9px] text-emerald-400 block">Balanced (&lt; 5%)</span>
              </div>
            </div>
          </div>

          {/* Inductive Proximity Rupture Sensors Card */}
          <div className="bg-control-panel border border-control-border rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase text-slate-200">
                  3x Inductive Rupture Stations
                </h3>
              </div>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-500/30">
                Eddy Current
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-control-subpanel p-2 rounded border border-control-border text-center">
                <span className="text-[10px] text-control-dim block">Station 1</span>
                <span className="text-sm font-bold text-slate-200">4.85 V</span>
                <span className="text-[9px] text-emerald-400 block">CLEAR</span>
              </div>
              <div className="bg-control-subpanel p-2 rounded border border-control-border text-center">
                <span className="text-[10px] text-control-dim block">Station 2</span>
                <span className="text-sm font-bold text-slate-200">4.90 V</span>
                <span className="text-[9px] text-emerald-400 block">CLEAR</span>
              </div>
              <div className="bg-control-subpanel p-2 rounded border border-control-border text-center">
                <span className="text-[10px] text-control-dim block">Station 3</span>
                <span className="text-sm font-bold text-slate-200">4.88 V</span>
                <span className="text-[9px] text-emerald-400 block">CLEAR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
