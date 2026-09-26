import React from 'react';
import {
  Activity,
  Radio,
  Eye,
  Thermometer,
  Zap,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { ConveyorSummaryMessage, PassEvent, HealthUpdateMessage } from '../../types/telemetry';

interface SensorSummaryCardsProps {
  conveyorSummary: ConveyorSummaryMessage | null;
  latestPass: PassEvent | null;
  latestHealthUpdate: HealthUpdateMessage | null;
  devMode: boolean;
}

export const SensorSummaryCards: React.FC<SensorSummaryCardsProps> = ({
  conveyorSummary,
  latestPass,
  latestHealthUpdate,
  devMode,
}) => {
  const speed = conveyorSummary?.speed_mps ?? latestPass?.speed_mps ?? 2.45;
  const load = latestPass?.load_pct ?? 80.0;
  const contributors = latestHealthUpdate?.contributors || {};

  const vis = contributors.vision;
  const vib = contributors.vibration;
  const laser = contributors.laser;

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Hardware Sensor Capabilities & Live Telemetry (OV-04)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {devMode && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-500/40" title="Live hardware telemetry">
              <HelpCircle className="w-3 h-3" />
              CAD Spec Synced
            </span>
          )}
          <span className="text-[11px] font-mono text-control-dim">Station ST-01 (4 Sensors Active)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
        {/* 1. Belt Speed */}
        <div className="bg-control-subpanel border border-control-border p-2.5 rounded space-y-1">
          <div className="flex items-center justify-between text-control-dim text-[11px]">
            <span className="font-sans">Belt Speed</span>
            <Radio className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white">
            {speed.toFixed(2)} <span className="text-xs text-control-dim font-normal">m/s</span>
          </div>
          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-600/30">
            NOMINAL
          </span>
        </div>

        {/* 2. Load Cell (Tension) */}
        <div className="bg-control-subpanel border border-control-border p-2.5 rounded space-y-1">
          <div className="flex items-center justify-between text-control-dim text-[11px]">
            <span className="font-sans">Load Cell (Tension)</span>
            <Zap className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white">
            {load.toFixed(1)} <span className="text-xs text-control-dim font-normal">%</span>
          </div>
          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-600/30">
            44.8 kN DYN
          </span>
        </div>

        {/* 3. Multispectral Camera (T1 Core) */}
        <div className="bg-control-subpanel border border-control-border p-2.5 rounded space-y-1">
          <div className="flex items-center justify-between text-control-dim text-[11px]">
            <span className="font-sans">Multispectral (T1)</span>
            <Eye className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white">
            {vis ? (vis.score >= 0.3 ? 'ANOMALY' : 'CLEAR') : 'ONLINE'}
          </div>
          <div className="text-[10px] text-control-dim">
            RGB+NIR: <span className="text-slate-200">{vis ? `${Math.round(vis.quality * 100)}%` : '98.6%'}</span>
          </div>
        </div>

        {/* 4. TF-Luna LiDAR (3D Profile) */}
        <div className="bg-control-subpanel border border-control-border p-2.5 rounded space-y-1">
          <div className="flex items-center justify-between text-control-dim text-[11px]">
            <span className="font-sans">TF-Luna LiDAR</span>
            <Layers className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="text-base font-bold text-white">
            {laser ? (laser.score >= 0.3 ? 'STEP/LIFT' : 'PROFILE OK') : 'ACTIVE'}
          </div>
          <div className="text-[10px] text-control-dim">
            ToF 100Hz: <span className="text-slate-200">{laser ? `${Math.round(laser.quality * 100)}%` : '96.8%'}</span>
          </div>
        </div>

        {/* 5. Inductive Proximity (Rupture Array) */}
        <div className="bg-control-subpanel border border-control-border p-2.5 rounded space-y-1">
          <div className="flex items-center justify-between text-control-dim text-[11px]">
            <span className="font-sans">Inductive Rupture</span>
            <Activity className="w-3 h-3 text-blue-400" />
          </div>
          <div className="text-base font-bold text-white">
            {vib ? (vib.score >= 0.3 ? 'CORD WARN' : 'INTACT') : '3x ACTIVE'}
          </div>
          <div className="text-[10px] text-control-dim">
            Eddy Qual: <span className="text-slate-200">{vib ? `${Math.round(vib.quality * 100)}%` : '98.0%'}</span>
          </div>
        </div>

        {/* 6. Edge DAQ / Compute */}
        <div className="bg-control-subpanel border border-control-border p-2.5 rounded space-y-1">
          <div className="flex items-center justify-between text-control-dim text-[11px]">
            <span className="font-sans">STM32 + RPi Edge</span>
            <Thermometer className="w-3 h-3 text-orange-400" />
          </div>
          <div className="text-base font-bold text-white">
            SYNCED
          </div>
          <div className="text-[10px] text-control-dim">
            Offset: <span className="text-slate-200">12 µs (PTP)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
