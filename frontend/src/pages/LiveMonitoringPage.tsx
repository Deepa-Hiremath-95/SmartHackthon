import React, { useState } from 'react';
import {
  Camera,
  Layers,
  Gauge,
  Radio,
  Activity,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';

// NOTE: Camera feed and per-frame sensor values are not available in this build.
// Values shown below come exclusively from state.joints, state.conveyorSummary,
// and state.simStatus. No numbers are invented here.

interface LiveMonitoringPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({ state }) => {
  const [cameraMode, setCameraMode] = useState<'rgb' | 'nir' | 'thermal'>('rgb');

  const targetJoint = state.joints['J02'] || state.joints['CV01_J02'];
  const targetHealth = targetJoint?.health ?? null;
  const targetState  = targetJoint?.state  ?? null;
  const currentLap   = state.simStatus?.current_lap   ?? null;
  const beltPosition = state.simStatus?.belt_position_m ?? null;
  const conveyorSpeed = state.conveyorSummary?.speed_mps ?? null;

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
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/60 text-amber-400 border border-amber-500/40">
              NO LIVE CAMERA SOURCE
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Joint health telemetry from WebSocket. Camera feed is not connected in this build — see provenance note below.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left Column: Honest Camera Placeholder */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-control-panel border border-control-border rounded-lg overflow-hidden shadow-lg">
            {/* Camera mode tabs kept so the UI isn't misleading — just inactive */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-control-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-400">Multispectral Area Camera — Feed Unavailable</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {(['rgb', 'nir', 'thermal'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCameraMode(mode)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      cameraMode === mode ? 'bg-slate-700 text-slate-200 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {mode === 'rgb' ? 'RGB' : mode === 'nir' ? 'NIR (850nm)' : 'Thermal IR'}
                  </button>
                ))}
              </div>
            </div>

            {/* Honest placeholder — no fake animated textures */}
            <div className="relative aspect-video w-full bg-slate-950 flex flex-col items-center justify-center gap-3">
              <Camera className="w-12 h-12 text-slate-700" />
              <div className="text-center space-y-1 px-6">
                <p className="text-sm font-semibold text-slate-400">
                  Camera feed — no live source connected in this build
                </p>
                <p className="text-xs text-slate-600 max-w-md">
                  {cameraMode.toUpperCase()} channel selected. A real RTSP / MJPEG stream from the
                  physical camera mast (ST-01) will appear here once wired. Until then, no
                  synthetic video or fabricated sensor data is displayed.
                </p>
              </div>
              {/* Provenance banner */}
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
                PROVENANCE: AWAITING_REAL_SOURCE
              </div>
              {/* Belt position from real sim state */}
              {(currentLap !== null || beltPosition !== null) && (
                <div className="absolute top-3 left-3 flex flex-col gap-0.5 text-[10px] font-mono text-emerald-400 bg-black/70 p-2 rounded border border-emerald-500/30 pointer-events-none">
                  {currentLap !== null && <span>LAP: {currentLap}</span>}
                  {beltPosition !== null && <span>BELT POS: {beltPosition.toFixed(1)} m</span>}
                </div>
              )}
            </div>

            {/* Note about YOLO integration */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-t border-control-border text-xs text-slate-500 font-mono">
              YOLOv8 bounding boxes will overlay here once the model training pipeline produces real detections on real images.
              No simulated confidence scores are shown until then.
            </div>
          </div>
        </div>

        {/* Right Column: Real-state Sensor Cards */}
        <div className="lg:col-span-5 space-y-4">

          {/* J02 Joint Health from real state */}
          <div className="bg-control-panel border border-control-border rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase text-slate-200">Target Joint: J02</h3>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/30">
                WebSocket Live
              </span>
            </div>

            {targetHealth !== null ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-control-subpanel p-2 rounded border border-control-border">
                  <span className="text-[10px] text-control-dim block">Health Score</span>
                  <span className={`text-base font-bold ${
                    targetHealth < 50 ? 'text-red-400' : targetHealth < 75 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {targetHealth.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-control-subpanel p-2 rounded border border-control-border">
                  <span className="text-[10px] text-control-dim block">State</span>
                  <span className={`text-sm font-bold ${
                    targetState === 'CRITICAL' ? 'text-red-400' :
                    targetState === 'WATCH' ? 'text-amber-400' :
                    targetState === 'MAINTENANCE_REQUIRED' ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    {targetState}
                  </span>
                </div>
                {targetJoint?.rul && (
                  <>
                    <div className="bg-control-subpanel p-2 rounded border border-control-border">
                      <span className="text-[10px] text-control-dim block">RUL Status</span>
                      <span className="text-sm font-bold text-slate-200">{targetJoint.rul.status}</span>
                    </div>
                    {targetJoint.rul.low_days !== null && targetJoint.rul.high_days !== null && (
                      <div className="bg-control-subpanel p-2 rounded border border-control-border">
                        <span className="text-[10px] text-control-dim block">RUL Range</span>
                        <span className="text-sm font-bold text-slate-200">
                          {targetJoint.rul.low_days}–{targetJoint.rul.high_days} days
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono py-2">
                Awaiting first health_update from backend…
              </div>
            )}
          </div>

          {/* Belt speed from real conveyor summary */}
          <div className="bg-control-panel border border-control-border rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase text-slate-200">Belt Speed</h3>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                conveyor_summary
              </span>
            </div>
            {conveyorSpeed !== null ? (
              <div className="text-base font-bold text-white font-mono">
                {conveyorSpeed.toFixed(2)} m/s
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono py-1">
                Awaiting conveyor_summary message…
              </div>
            )}
            <p className="text-[10px] text-slate-600 font-mono">
              Load cell tension values are not yet exposed in the WebSocket schema.
              No value will be shown until the backend emits it.
            </p>
          </div>

          {/* Inductive Proximity Rupture Sensors — status only, no fake voltages */}
          <div className="bg-control-panel border border-control-border rounded-lg p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase text-slate-200">3× Inductive Rupture Stations</h3>
              </div>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-500/30">
                Not in schema
              </span>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-700/50 text-xs text-slate-500 font-mono leading-relaxed">
              Per-station voltage / trip signals are not yet included in the backend WebSocket
              or REST schema. Stations ST-01, ST-02, ST-03 will show live signals here once
              the backend emits <code className="text-slate-400">inductive_proximity</code> events.
            </div>
          </div>

          {/* All alerts relevant to J02 */}
          {state.alerts.filter(a => a.joint_id && state.joints[a.joint_id]?.joint_code === 'J02').length > 0 && (
            <div className="bg-control-panel border border-amber-700/40 rounded-lg p-3.5 space-y-2 shadow-sm">
              <h3 className="text-xs font-bold uppercase text-amber-300">Active Alerts on J02</h3>
              {state.alerts
                .filter(a => a.joint_id && state.joints[a.joint_id]?.joint_code === 'J02')
                .map(a => (
                  <div key={a.id} className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded p-2">
                    <span className={`font-bold mr-2 ${a.severity === 'CRITICAL' ? 'text-red-400' : a.severity === 'WARNING' ? 'text-orange-400' : 'text-amber-400'}`}>
                      [{a.severity}]
                    </span>
                    {a.title}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
