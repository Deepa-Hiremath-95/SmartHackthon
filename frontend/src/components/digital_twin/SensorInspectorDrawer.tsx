import React from 'react';
import {
  X,
  Camera,
  Activity,
  Gauge,
  Cpu,
  Server,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { SensorMetadata } from './sensorData';

interface SensorInspectorDrawerProps {
  sensor: SensorMetadata | null;
  onClose: () => void;
  onFocusView?: () => void;
}

export const SensorInspectorDrawer: React.FC<SensorInspectorDrawerProps> = ({
  sensor,
  onClose,
  onFocusView,
}) => {
  if (!sensor) return null;

  const getIcon = () => {
    switch (sensor.category) {
      case 'vision':
        return <Camera className="w-5 h-5 text-sky-400" />;
      case 'laser':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'tension':
        return <Gauge className="w-5 h-5 text-amber-400" />;
      case 'proximity':
        return <Radio className="w-5 h-5 text-blue-400" />;
      case 'daq':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      case 'edge':
        return <Server className="w-5 h-5 text-cyan-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTierBadgeColor = () => {
    switch (sensor.tier) {
      case 'T1 Core':
        return 'bg-sky-950/70 border-sky-500/40 text-sky-300';
      case 'T2 Fusion':
        return 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300';
      case 'Edge DAQ':
        return 'bg-purple-950/70 border-purple-500/40 text-purple-300';
      case 'Edge Compute':
        return 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300';
    }
  };

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 max-w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl flex flex-col z-30 overflow-hidden select-none animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-slate-800 border border-slate-700">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">{sensor.name}</h3>
            <span className="text-xs text-slate-400 font-mono">{sensor.model}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Badges Strip */}
      <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className={`px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${getTierBadgeColor()}`}>
          {sensor.tier}
        </span>
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{sensor.status}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Description & Role */}
        <div className="space-y-1.5 bg-slate-800/40 p-3 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Functional Role
          </div>
          <p className="text-slate-200 leading-relaxed">{sensor.role}</p>
          <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/60">
            {sensor.description}
          </p>
        </div>

        {/* Live Metrics Grid */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Live Telemetry Channels</span>
            <span className="text-emerald-400 text-[10px] font-mono">100% QUALITY</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sensor.keyMetrics.map((metric, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col justify-between"
              >
                <span className="text-[10px] text-slate-400 truncate">{metric.label}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm font-mono font-bold text-white">{metric.value}</span>
                  {metric.unit && (
                    <span className="text-[10px] font-mono text-slate-400">{metric.unit}</span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1">
                  Nominal: {metric.normalRange}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="space-y-2 bg-slate-950/40 p-3 rounded border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Hardware Architecture & DAQ
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-400">Sampling Rate:</span>
              <span className="text-slate-200 text-right">{sensor.samplingRate}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-400">Resolution:</span>
              <span className="text-slate-200 text-right">{sensor.resolution}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-400">Electrical Protocol:</span>
              <span className="text-slate-200 text-right">{sensor.protocol}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">Host Controller:</span>
              <span className="text-slate-200 text-right">{sensor.controllerNode}</span>
            </div>
          </div>
        </div>

        {/* Provenance notice */}
        <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/30 flex items-center gap-2 text-[10px] text-amber-300 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>{sensor.provenance}</span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
        {onFocusView && (
          <button
            onClick={onFocusView}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Focus Camera</span>
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
