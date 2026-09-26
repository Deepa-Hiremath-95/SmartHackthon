import React, { useState } from 'react';
import { LiveDataState } from '../hooks/liveDataReducer';
import {
  Sliders,
  Cpu,
  Shield,
  UserCheck,
  Server,
  CheckCircle2,
  Settings as SettingsIcon,
} from 'lucide-react';

interface SettingsPageProps {
  state: LiveDataState;
}

type UserRole = 'OPERATOR' | 'MAINTENANCE_ENG' | 'PLANT_SUPERVISOR' | 'SYSTEM_ADMIN';

export const SettingsPage: React.FC<SettingsPageProps> = ({ state }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('PLANT_SUPERVISOR');
  const [visionWeight, setVisionWeight] = useState(35);
  const [lidarWeight, setLidarWeight] = useState(30);
  const [tensionWeight, setTensionWeight] = useState(20);
  const [proxiWeight, setProxiWeight] = useState(15);
  const [corroborationRequired, setCorroborationRequired] = useState(true);
  const [autoAcknowledgeLow, setAutoAcknowledgeLow] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const totalWeight = visionWeight + lidarWeight + tensionWeight + proxiWeight;

  const handleSaveSettings = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-control-panel border border-control-border rounded-lg p-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-100 tracking-wide">
              System Settings & AI Calibration
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Configure multi-sensor fusion weights, AI model registry parameters, ISA-18.2 alert thresholds, and role permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurations Saved!</span>
            </div>
          )}
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
          >
            Apply Configurations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Sensor Fusion & Model Registry */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Multi-Sensor Fusion Weights */}
          <div className="bg-control-panel border border-control-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                  Multi-Sensor Bayesian Fusion Weights
                </h2>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  totalWeight === 100
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                Sum: {totalWeight}%
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Define the relative influence of each sensor channel when computing the Joint Health Score (JHS) and overall conveyor risk index.
            </p>

            <div className="space-y-4 pt-2">
              {/* Vision */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Multispectral AI Camera (RGB / NIR / Thermal)</span>
                  <span className="text-blue-400 font-mono font-bold">{visionWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={visionWeight}
                  onChange={(e) => setVisionWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-control-card rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* TF-Luna */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">TF-Luna Micro LiDAR (3D Surface Profiler)</span>
                  <span className="text-cyan-400 font-mono font-bold">{lidarWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={lidarWeight}
                  onChange={(e) => setLidarWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-control-card rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Load Cell */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">High-Precision Tension Load Cell</span>
                  <span className="text-emerald-400 font-mono font-bold">{tensionWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tensionWeight}
                  onChange={(e) => setTensionWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-control-card rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Inductive Proximity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Inductive Proximity & Rupture Sensor Array</span>
                  <span className="text-amber-400 font-mono font-bold">{proxiWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={proxiWeight}
                  onChange={(e) => setProxiWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-control-card rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 2. AI Model Registry */}
          <div className="bg-control-panel border border-control-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                Production AI Model Registry
              </h2>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-control-card border border-control-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-200">YOLOv8-BeltDamage-v2.1</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                      ACTIVE DEPLOYED
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Real-time surface anomaly detection (delamination, gouge, rip, cord pull-out).
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-gray-300 font-mono">Inference: 8.4 ms (119 FPS)</div>
                  <div className="text-[11px] text-gray-500">mAP@50: 94.2%</div>
                </div>
              </div>

              <div className="p-3.5 bg-control-card border border-control-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-200">RandomForest-Creep-v1.4</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                      ACTIVE DEPLOYED
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Splice creep rate estimation and failure mode categorization across J01, J02, J03.
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-gray-300 font-mono">Accuracy: 96.8%</div>
                  <div className="text-[11px] text-gray-500">F1-Score: 0.95</div>
                </div>
              </div>

              <div className="p-3.5 bg-control-card border border-control-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-200">Bayesian-Weibull-RUL-v3</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">
                      ACTIVE DEPLOYED
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Remaining Useful Life forecast with dynamic 90% credible intervals.
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-gray-300 font-mono">Status: ESTIMATED</div>
                  <div className="text-[11px] text-gray-500">Validation: PRD P0 Rule</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. ISA-18.2 Corroboration & Safety Policy */}
          <div className="bg-control-panel border border-control-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                ISA-18.2 Alarm & Corroboration Policies
              </h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-control-card border border-control-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                <input
                  type="checkbox"
                  checked={corroborationRequired}
                  onChange={(e) => setCorroborationRequired(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded bg-control-panel border-control-border text-blue-600 focus:ring-0"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-gray-200">
                    Require Dual-Sensor Corroboration for High Severity Alarms
                  </span>
                  <p className="text-gray-400">
                    Critical alerts require confirmation from $\ge 2$ independent sensor types (e.g., Vision + LiDAR ToF) to eliminate nuisance false trips.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-control-card border border-control-border rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                <input
                  type="checkbox"
                  checked={autoAcknowledgeLow}
                  onChange={(e) => setAutoAcknowledgeLow(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded bg-control-panel border-control-border text-blue-600 focus:ring-0"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-gray-200">
                    Auto-Resolve Low Priority Telemetry Warnings After 10 Mins
                  </span>
                  <p className="text-gray-400">
                    Self-clearing notifications for minor transient voltage fluctuations on inductive loops.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: RBAC & Infrastructure */}
        <div className="space-y-6">
          {/* RBAC Role Switcher */}
          <div className="bg-control-panel border border-control-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                Role-Based Access Control
              </h2>
            </div>
            <p className="text-xs text-gray-400">
              Active session profile determining engineering and advisory privileges.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'OPERATOR', label: 'Plant Operator', desc: 'Read-only telemetry & acknowledge' },
                { id: 'MAINTENANCE_ENG', label: 'Maintenance Engineer', desc: 'Work orders & sensor calibration' },
                { id: 'PLANT_SUPERVISOR', label: 'Plant Supervisor', desc: 'Thresholds, model tuning & sign-off' },
                { id: 'SYSTEM_ADMIN', label: 'System Admin', desc: 'Full pipeline & schema control' },
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => setCurrentRole(role.id as UserRole)}
                  className={`text-left p-2.5 rounded border text-xs transition-all ${
                    currentRole === role.id
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold'
                      : 'bg-control-card border-control-border text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-200">{role.label}</div>
                  <div className="text-[10px] text-gray-500">{role.desc}</div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-control-border space-y-1.5 text-xs">
              <div className="text-gray-400 font-semibold">Active Permissions:</div>
              <ul className="space-y-1 text-gray-400 text-[11px]">
                <li className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Real-time Telemetry & Digital Twin Stream</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Acknowledge ISA-18.2 Alarms</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Generate CMMS Work Orders</span>
                </li>
                <li className="flex items-center gap-1.5 text-blue-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update Sensor Fusion Weights</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Infrastructure & Connection Status */}
          <div className="bg-control-panel border border-control-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                Pipeline Infrastructure
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-control-card border border-control-border rounded flex justify-between items-center">
                <span className="text-gray-400">Data Stream</span>
                <span className="font-mono text-emerald-400 font-semibold">WebSocket (Port 8000)</span>
              </div>

              <div className="p-2.5 bg-control-card border border-control-border rounded flex justify-between items-center">
                <span className="text-gray-400">Data Provenance</span>
                <span className="font-mono text-amber-300 font-semibold">
                  {state.hasSimulatedData ? 'SIMULATED (P0 Rule)' : 'REAL_SITE'}
                </span>
              </div>

              <div className="p-2.5 bg-control-card border border-control-border rounded flex justify-between items-center">
                <span className="text-gray-400">FastAPI Backend</span>
                <span className="font-mono text-emerald-400 font-semibold">Healthy (v1.0.0)</span>
              </div>

              <div className="p-2.5 bg-control-card border border-control-border rounded flex justify-between items-center">
                <span className="text-gray-400">Active Splice Joints</span>
                <span className="font-mono text-gray-200 font-semibold">3 Joints (J01, J02, J03)</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-300/90 leading-relaxed">
              <strong>Advisory Architecture:</strong> In compliance with NEXVION project rules, the web dashboard acts purely as an analytical advisory layer. It does not exert remote PLC / SCADA motor start/stop control.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
