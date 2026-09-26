import React, { useState } from 'react';
import {
  Boxes,
  QrCode,
  Layers,
  Cpu,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { SENSOR_REGISTRY } from '../components/digital_twin/sensorData';

interface AssetManagementPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const AssetManagementPage: React.FC<AssetManagementPageProps> = ({
  state,
  onNavigateToSection,
}) => {
  const [selectedJointPassport, setSelectedJointPassport] = useState('J02');

  const joint = state.joints[selectedJointPassport] || state.joints[`CV01_${selectedJointPassport}`];
  const health = joint?.health ?? 95.0;

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Conveyor Asset Hierarchy & Joint Digital Passports
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/70 text-indigo-300 border border-indigo-500/40">
              PRD AS-03 COMPLIANT
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Mine → Conveyor → Belt → Splice Joint hierarchy and individualized QR-coded Digital Passports.
          </p>
        </div>
      </div>

      {/* Main Grid: Asset Hierarchy + Joint Digital Passport Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Conveyor & Sensor Asset Tree (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-control-panel border border-control-border rounded-lg p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-200 border-b border-control-border/60 pb-2 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              Asset Topology Tree
            </h3>

            <div className="space-y-2 text-xs font-mono">
              {/* Mine Node */}
              <div className="p-2.5 rounded bg-control-subpanel border border-control-border">
                <span className="text-[10px] text-control-dim block">MINE LOCATION</span>
                <strong className="text-white text-sm">MINE-01: Apex Iron Ore Mine (Odisha, IN)</strong>
              </div>

              {/* Conveyor CV-01 Node */}
              <div className="pl-3 border-l-2 border-indigo-500/50 space-y-2">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-700">
                  <span className="text-[10px] text-emerald-400 font-bold block">PRIMARY CONVEYOR</span>
                  <div className="text-white font-bold">CV-01: Mainline Overland Belt</div>
                  <div className="text-[11px] text-control-dim">Length: 2,400m • Loop: 4,800m • Speed: 2.45 m/s</div>
                </div>

                {/* Spliced Joints */}
                <div className="pl-3 border-l-2 border-slate-700 space-y-1.5">
                  <span className="text-[10px] text-control-dim block">SPLICED JOINTS (3 TOTAL)</span>
                  {['J01', 'J02', 'J03'].map((code) => (
                    <button
                      key={code}
                      onClick={() => setSelectedJointPassport(code)}
                      className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
                        selectedJointPassport === code
                          ? 'bg-slate-800 text-white border border-indigo-400/60 font-bold'
                          : 'bg-control-subpanel text-slate-300 border border-control-border hover:text-white'
                      }`}
                    >
                      <span>Joint {code}</span>
                      <span className="text-[10px] text-control-dim">
                        {code === 'J01' ? '0 m (Tail)' : code === 'J02' ? '1,600 m (Mid)' : '3,200 m (Head)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Hardware Registry */}
          <div className="bg-control-panel border border-control-border rounded-lg p-4 space-y-2.5 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-200 border-b border-control-border/60 pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Connected Sensor Registry (4 Types)
            </h3>
            <div className="space-y-1.5 text-xs font-mono">
              {Object.values(SENSOR_REGISTRY).map((s) => (
                <div key={s.id} className="p-2 rounded bg-control-subpanel border border-control-border flex items-center justify-between">
                  <div>
                    <strong className="text-slate-200 block text-xs">{s.name}</strong>
                    <span className="text-[10px] text-control-dim">{s.model}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Joint Digital Passport (7 Cols) */}
        <div className="lg:col-span-7 bg-control-panel border border-control-border rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b border-control-border/60 pb-3 gap-2">
            <div>
              <span className="text-[10px] font-mono text-control-dim block">OFFICIAL DIGITAL PASSPORT</span>
              <h2 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                Joint Digital Passport: CV01_{selectedJointPassport}
              </h2>
            </div>

            {/* Passport QR Code Simulator */}
            <div className="w-14 h-14 bg-white p-1 rounded shadow flex items-center justify-center">
              <QrCode className="w-12 h-12 text-slate-900" />
            </div>
          </div>

          {/* Technical Specifications Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-control-subpanel p-2.5 rounded border border-control-border space-y-0.5">
              <span className="text-[10px] text-control-dim block">Splice Construction Type</span>
              <strong className="text-white">Finger Splice Hot Vulcanized (ST-3150)</strong>
            </div>

            <div className="bg-control-subpanel p-2.5 rounded border border-control-border space-y-0.5">
              <span className="text-[10px] text-control-dim block">Installation Date</span>
              <strong className="text-white">15-Jan-2026 (Splice Certified)</strong>
            </div>

            <div className="bg-control-subpanel p-2.5 rounded border border-control-border space-y-0.5">
              <span className="text-[10px] text-control-dim block">Loop Position</span>
              <strong className="text-white">
                {selectedJointPassport === 'J01' ? '0.0 m' : selectedJointPassport === 'J02' ? '1,600.0 m' : '3,200.0 m'}
              </strong>
            </div>

            <div className="bg-control-subpanel p-2.5 rounded border border-control-border space-y-0.5">
              <span className="text-[10px] text-control-dim block">Baseline Commissioning Health</span>
              <strong className="text-emerald-400">100.0% (Verified)</strong>
            </div>
          </div>

          {/* Current Health & Telemetry Snapshot */}
          <div className="bg-slate-950 p-3.5 rounded border border-control-border space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-control-dim">Live Telemetry Health Score:</span>
              <strong className={health < 60 ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>
                {health.toFixed(1)}% ({joint?.state ?? 'HEALTHY'})
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] text-control-dim">
              <span>Remaining Useful Life Status:</span>
              <span className="text-purple-300 font-bold">{joint?.rul?.status ?? 'DEMO'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-control-dim">
              <span>Data Provenance:</span>
              <span className="text-slate-200 font-bold">{joint?.provenance ?? 'SIMULATED'}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-control-border/60">
            <button
              onClick={() => onNavigateToSection && onNavigateToSection('inspection')}
              className="flex-1 px-3 py-2 rounded bg-control-subpanel hover:bg-slate-800 text-slate-200 border border-control-border font-bold text-xs cursor-pointer text-center"
            >
              View Inspection History
            </button>
            <button
              onClick={() => onNavigateToSection && onNavigateToSection('ai_prediction')}
              className="flex-1 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer text-center"
            >
              View RUL Forecast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
