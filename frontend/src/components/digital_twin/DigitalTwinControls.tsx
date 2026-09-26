import React from 'react';
import {
  Camera,
  Activity,
  Gauge,
  RotateCcw,
  Play,
  Pause,
  Maximize2,
  Layers,
  Radio,
} from 'lucide-react';
import { ViewPreset, SceneToggles } from './threeScene';

interface DigitalTwinControlsProps {
  currentPreset: ViewPreset;
  onSelectPreset: (preset: ViewPreset) => void;
  toggles: SceneToggles;
  onToggleLayer: (layer: keyof SceneToggles) => void;
  beltSpeedMps: number;
  currentLap: number;
  beltPositionM: number;
  targetJointCode?: string;
  targetJointHealth?: number;
  targetJointState?: string;
  isPaused: boolean;
  onTogglePause?: () => void;
  onResetSim?: () => void;
  hoveredObjectName: string | null;
}

export const DigitalTwinControls: React.FC<DigitalTwinControlsProps> = ({
  currentPreset,
  onSelectPreset,
  toggles,
  onToggleLayer,
  beltSpeedMps,
  currentLap,
  beltPositionM,
  targetJointCode = 'J02',
  targetJointHealth = 95.0,
  targetJointState = 'HEALTHY',
  isPaused,
  onTogglePause,
  onResetSim,
  hoveredObjectName,
}) => {
  const PRESET_OPTIONS: { id: ViewPreset; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'CAD Overview', icon: Maximize2 },
    { id: 'lidar', label: 'TF-Luna LiDAR', icon: Activity },
    { id: 'rupture', label: 'Rupture Array (3x)', icon: Radio },
    { id: 'camera', label: 'Multispectral Mast', icon: Camera },
    { id: 'drive', label: 'Drive & Motor', icon: Gauge },
  ];

  const getJointBadge = () => {
    if (targetJointState === 'CRITICAL' || targetJointHealth < 60) {
      return 'bg-red-950/80 border-red-500/50 text-red-300';
    }
    if (targetJointState === 'WATCH' || targetJointHealth < 80) {
      return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
    }
    return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
  };

  return (
    <>
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        {/* Left: View Presets Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-xl pointer-events-auto">
          {PRESET_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = currentPreset === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectPreset(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`Switch camera view to ${opt.label}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Live Telemetry HUD Strip */}
        <div className="flex items-center gap-3 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-xl pointer-events-auto text-xs font-mono">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <span className="text-slate-400">Lap:</span>
            <span className="text-white font-bold">{currentLap.toString().padStart(2, '0')}</span>
          </div>

          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <span className="text-slate-400">Speed:</span>
            <span className="text-sky-400 font-bold">{beltSpeedMps.toFixed(1)} m/s</span>
          </div>

          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <span className="text-slate-400">Pos:</span>
            <span className="text-slate-200">{beltPositionM.toFixed(0)} m</span>
          </div>

          {/* Target Joint Status Badge */}
          <div className={`px-2 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1.5 ${getJointBadge()}`}>
            <span>{targetJointCode}:</span>
            <span>{targetJointHealth.toFixed(1)}%</span>
            <span className="text-[10px]">({targetJointState})</span>
          </div>

          {/* Quick Simulation controls */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            {onTogglePause && (
              <button
                onClick={onTogglePause}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}
            {onResetSim && (
              <button
                onClick={onResetSim}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset Simulation to Lap 0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Left: Layer Visibility Toggles & Hover Tooltip */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-20 pointer-events-none">
        {/* Active Hover Object HUD */}
        {hoveredObjectName && (
          <div className="px-3 py-1.5 bg-sky-950/90 backdrop-blur-md border border-sky-500/50 rounded text-xs text-sky-200 font-mono shadow-lg flex items-center gap-2 animate-in fade-in duration-150">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Target: <strong>{hoveredObjectName}</strong> (Click to inspect)</span>
          </div>
        )}

        {/* Layer Toggles Toolbar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-xl pointer-events-auto text-xs">
          <span className="px-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Layers:</span>
          </span>

          <button
            onClick={() => onToggleLayer('showSensors')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              toggles.showSensors
                ? 'bg-slate-800 text-sky-300 border border-sky-500/30 font-semibold'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Sensors (4x)
          </button>

          <button
            onClick={() => onToggleLayer('showBeams')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              toggles.showBeams
                ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            LiDAR & Frustums
          </button>

          <button
            onClick={() => onToggleLayer('showJoints')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              toggles.showJoints
                ? 'bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Splice Joints (3)
          </button>

          <button
            onClick={() => onToggleLayer('showProducts')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              toggles.showProducts
                ? 'bg-slate-800 text-slate-200 border border-slate-600/50 font-semibold'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Bulk Cargo
          </button>
        </div>
      </div>
    </>
  );
};
