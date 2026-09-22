import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { SimStatus } from '../../types/telemetry';
import { api } from '../../services/api';

interface DemoControlsProps {
  simStatus: SimStatus | null;
  onRefreshSimStatus: () => void;
  onRunDemo: () => void;
}

const SPEED_PRESETS = ['1x', '10x', '60x', '600x'];

export const DemoControls: React.FC<DemoControlsProps> = ({
  simStatus,
  onRefreshSimStatus,
  onRunDemo,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!simStatus) return null;

  const handleSpeed = async (preset: string) => {
    setLoadingAction(`speed_${preset}`);
    try {
      await api.setSimulationSpeed(preset);
      onRefreshSimStatus();
    } catch (e) {
      console.error('Failed to change speed preset:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTogglePause = async () => {
    setLoadingAction('pause_resume');
    try {
      if (simStatus.paused) {
        await api.resumeSimulation();
      } else {
        await api.pauseSimulation();
      }
      onRefreshSimStatus();
    } catch (e) {
      console.error('Failed to toggle pause/resume:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    setLoadingAction('reset');
    try {
      await api.resetSimulation();
      onRefreshSimStatus();
    } catch (e) {
      console.error('Failed to reset simulation:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunDemoClick = async () => {
    setLoadingAction('run_demo');
    try {
      await onRunDemo();
    } catch (e) {
      console.error('Failed to run demo story:', e);
    } finally {
      setLoadingAction(null);
    }
  };

  // Phase badge styling
  let phaseColor = 'bg-slate-800 text-slate-300 border-slate-700';
  if (simStatus.scenario_phase === 'DEGRADING') {
    phaseColor = 'bg-amber-950/60 text-amber-300 border-amber-600/40';
  } else if (simStatus.scenario_phase === 'CRITICAL_HOLD') {
    phaseColor = 'bg-red-950/60 text-red-300 border-red-600/50 animate-pulse';
  } else if (simStatus.scenario_phase === 'COMPLETED') {
    phaseColor = 'bg-purple-950/60 text-purple-300 border-purple-600/40';
  }

  return (
    <div className="fixed bottom-9 right-4 z-30 shadow-2xl rounded-lg bg-control-panel/95 backdrop-blur border border-control-border max-w-xl transition-all select-none">
      {/* Header bar */}
      <div className="px-3 py-2 border-b border-control-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
            Demo Simulator Controls
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${phaseColor}`}>
            Phase: {simStatus.scenario_phase}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Run Demo Button */}
          <button
            onClick={handleRunDemoClick}
            disabled={loadingAction !== null}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Reset simulation and accelerate at 600x for instant demo walkthrough"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loadingAction === 'run_demo' ? 'Starting...' : 'Run Demo'}</span>
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-control-dim hover:text-white hover:bg-control-subpanel transition-colors"
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-3 space-y-3 text-xs">
          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Speed Presets */}
            <div className="flex items-center gap-1">
              <span className="text-control-dim mr-1 text-[11px] font-mono">Speed:</span>
              {SPEED_PRESETS.map((p) => {
                const isActive = simStatus.speed_preset === p;
                return (
                  <button
                    key={p}
                    onClick={() => handleSpeed(p)}
                    disabled={loadingAction !== null}
                    className={`px-2.5 py-1 rounded font-mono text-xs border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-sm'
                        : 'bg-control-subpanel text-control-muted border-control-border hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Play/Pause and Reset Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePause}
                disabled={loadingAction !== null}
                className={`flex items-center gap-1 px-3 py-1 rounded border font-medium transition-colors cursor-pointer ${
                  simStatus.paused
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 hover:bg-emerald-900/60'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600 hover:bg-amber-900/60'
                }`}
                title={simStatus.paused ? 'Resume real-time simulation' : 'Pause simulation'}
              >
                {simStatus.paused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={loadingAction !== null}
                className="flex items-center gap-1 px-3 py-1 rounded bg-control-subpanel text-slate-300 border border-control-border hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
                title="Reset simulation to Lap 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Telemetry metadata row */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-control-border text-[11px] font-mono text-control-dim">
            <div>
              <span className="block text-slate-400 font-sans">Current Lap</span>
              <span className="font-bold text-slate-200">{simStatus.current_lap}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-sans">Belt Position</span>
              <span className="font-bold text-slate-200">{simStatus.belt_position_m} m</span>
            </div>
            <div>
              <span className="block text-slate-400 font-sans">Target Joint</span>
              <span className="font-bold text-amber-400">{simStatus.target_joint}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-sans">Critical Laps</span>
              <span className="font-bold text-red-400">{simStatus.critical_laps_held} held</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
