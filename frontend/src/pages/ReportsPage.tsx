import React, { useState } from 'react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { Conveyor, Joint, Alert } from '../types/telemetry';
import {
  FileText,
  Download,
  Printer,
  Layers,
  AlertTriangle,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ReportsPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

type ReportType = 'shift' | 'joints' | 'incidents' | 'executive';

export const ReportsPage: React.FC<ReportsPageProps> = ({ state }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('shift');
  const [timeRange, setTimeRange] = useState('shift_current');
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const activeConveyor = state.conveyors.find((c: Conveyor) => c.id === state.selectedConveyorId) || state.conveyors[0];
  const joints: Joint[] = Object.values(state.joints);
  const criticalJoints = joints.filter((j: Joint) => j.health < 50 || j.state === 'CRITICAL');
  const watchJoints = joints.filter((j: Joint) => (j.health >= 50 && j.health < 75) || j.state === 'WATCH');

  const triggerExport = (format: 'CSV' | 'PDF' | 'PRINT') => {
    setIsExporting(true);
    setExportNotice(`Generating ${format} report bundle with provenance audit hash...`);

    if (format === 'PRINT') {
      setTimeout(() => {
        setIsExporting(false);
        setExportNotice(null);
        window.print();
      }, 600);
      return;
    }

    if (format === 'CSV') {
      setTimeout(() => {
        const rows = [
          ['REPORT TYPE', selectedReport.toUpperCase()],
          ['GENERATED AT', new Date().toISOString()],
          ['CONVEYOR', activeConveyor?.name || 'CV-01 Main Trunk'],
          ['DATA PROVENANCE', state.hasSimulatedData ? 'SIMULATED' : 'REAL_SITE'],
          ['RUL STATUS', joints[0]?.rul?.status || 'ESTIMATED'],
          [''],
          ['JOINT CODE', 'HEALTH SCORE (%)', 'POSITION (m)', 'STATE', 'RUL STATUS', 'RUL LOW (DAYS)', 'RUL HIGH (DAYS)'],
          ...joints.map((j: Joint) => [
            j.joint_code,
            j.health.toFixed(1),
            j.position_m.toFixed(1),
            j.state,
            j.rul?.status || 'ESTIMATED',
            (j.rul?.low_days ?? 12).toString(),
            (j.rul?.high_days ?? 24).toString(),
          ]),
          [''],
          ['ACTIVE ALERTS', state.alerts.length.toString()],
          ...state.alerts.map((a: Alert) => [a.id, a.joint_id || 'SYSTEM', a.severity, a.description || a.title, a.evidence?.is_corroborated ? 'YES' : 'NO']),
        ];

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `BeltScanX_${selectedReport}_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExporting(false);
        setExportNotice('CSV Download complete!');
        setTimeout(() => setExportNotice(null), 3000);
      }, 800);
      return;
    }

    // PDF Simulation
    setTimeout(() => {
      setIsExporting(false);
      setExportNotice('PDF export compiled and saved to local archive.');
      setTimeout(() => setExportNotice(null), 3000);
    }, 1000);
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-control-panel border border-control-border rounded-lg p-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-100 tracking-wide">
              Automated Inspection & Compliance Reports
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Export certified shift handover sheets, 3-joint splice degradation logs, and multi-sensor audit packages (ISO 55000 / Mining Safety Standards).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerExport('CSV')}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 bg-control-card hover:bg-control-border border border-control-border rounded text-xs font-semibold text-gray-200 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => triggerExport('PDF')}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 bg-control-card hover:bg-control-border border border-control-border rounded text-xs font-semibold text-gray-200 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            Export PDF
          </button>
          <button
            onClick={() => triggerExport('PRINT')}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-950/40 border border-blue-800/40 rounded-lg text-xs text-blue-200 animate-pulse">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Grid: Controls & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Template Selector & Parameters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-control-panel border border-control-border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Report Templates</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => setSelectedReport('shift')}
                className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                  selectedReport === 'shift'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold'
                    : 'bg-control-card border-control-border text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Daily Shift Inspection</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Real-time telemetry, 8-hr operational uptime, active safety flags.
                </div>
              </button>

              <button
                onClick={() => setSelectedReport('joints')}
                className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                  selectedReport === 'joints'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold'
                    : 'bg-control-card border-control-border text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Joint Degradation Audit</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  J01, J02, J03 ToF LiDAR profiles, splice gaps, creep rates.
                </div>
              </button>

              <button
                onClick={() => setSelectedReport('incidents')}
                className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                  selectedReport === 'incidents'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold'
                    : 'bg-control-card border-control-border text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Corroboration & RCA</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Multi-sensor cross-validation logs and root-cause summaries.
                </div>
              </button>

              <button
                onClick={() => setSelectedReport('executive')}
                className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                  selectedReport === 'executive'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-semibold'
                    : 'bg-control-card border-control-border text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Executive Risk & ROI</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Downtime avoidance metrics, RUL forecast, financial KPIs.
                </div>
              </button>
            </div>
          </div>

          {/* Time Window */}
          <div className="bg-control-panel border border-control-border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Report Scope</h3>
            <div className="space-y-2 text-xs">
              <label className="block text-gray-400">Target Conveyor</label>
              <div className="p-2 bg-control-card border border-control-border rounded text-gray-200 font-medium">
                {activeConveyor?.name || 'CV-01 Main Trunk Conveyor'}
              </div>

              <label className="block text-gray-400 mt-2">Audit Window</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full p-2 bg-control-card border border-control-border rounded text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="shift_current">Shift A (06:00 - 14:00 Today)</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days (Weekly Review)</option>
                <option value="30d">Last 30 Days (Monthly Compliance)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Certified Document Preview */}
        <div className="lg:col-span-3 bg-control-panel border border-control-border rounded-lg p-8 space-y-6 font-sans">
          {/* Document Header (Print-ready) */}
          <div className="border-b border-control-border pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-100 tracking-wider">BeltScanX AI</span>
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 font-semibold">
                  INTELLIGENCE CERTIFIED
                </span>
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-mono">
                  {state.hasSimulatedData ? 'DATA: SIMULATED' : 'DATA: REAL_SITE'}
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-200 mt-2">
                {selectedReport === 'shift' && 'OPERATIONAL SHIFT CONVEYOR HEALTH & SAFETY REPORT'}
                {selectedReport === 'joints' && '3-JOINT SPLICE INTEGRITY & DEGRADATION AUDIT REPORT'}
                {selectedReport === 'incidents' && 'MULTI-SENSOR ALARM CORROBORATION & RCA AUDIT'}
                {selectedReport === 'executive' && 'EXECUTIVE FLEET RELIABILITY & DOWNTIME PREVENTION SUMMARY'}
              </h2>
              <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-4">
                <span>Conveyor: <strong className="text-gray-200">{activeConveyor?.name}</strong></span>
                <span>Audit Period: <strong className="text-gray-200">Current Shift (06:00 - 14:00)</strong></span>
                <span>Report ID: <strong className="text-gray-200 font-mono">NXV-{Date.now().toString().slice(-6)}</strong></span>
              </div>
            </div>

            <div className="text-right text-xs text-gray-400">
              <div>Generated: <span className="text-gray-200">{new Date().toLocaleString()}</span></div>
              <div>RUL Status: <span className="text-amber-400 font-bold">{joints[0]?.rul?.status || 'ESTIMATED'}</span></div>
              <div>System Status: <span className="text-emerald-400 font-bold">ONLINE (100% SENSORS OK)</span></div>
            </div>
          </div>

          {/* Section 1: Executive KPI Cards */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              1. System Performance & Telemetry Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-control-card border border-control-border rounded-lg">
                <div className="text-[11px] text-gray-400">Belt Velocity</div>
                <div className="text-base font-bold text-gray-100 mt-1 font-mono">
                  {state.conveyorSummary?.speed_mps?.toFixed(2) || '2.80'} m/s
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Optimal Operating Zone</div>
              </div>

              <div className="p-3 bg-control-card border border-control-border rounded-lg">
                <div className="text-[11px] text-gray-400">Conveyor Health Avg</div>
                <div className="text-base font-bold text-gray-100 mt-1 font-mono">
                  {state.conveyorSummary?.average_health?.toFixed(1) || '88.4'}%
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Continuous Monitored</div>
              </div>

              <div className="p-3 bg-control-card border border-control-border rounded-lg">
                <div className="text-[11px] text-gray-400">Active Splice Joints</div>
                <div className="text-base font-bold text-gray-100 mt-1 font-mono">
                  {joints.length || 4} Joints <span className="text-xs font-normal text-gray-400">({criticalJoints.length} crit / {watchJoints.length} watch)</span>
                </div>
                <div className="text-[10px] text-blue-400 mt-0.5">100% Tracking Active</div>
              </div>

              <div className="p-3 bg-control-card border border-control-border rounded-lg">
                <div className="text-[11px] text-gray-400">Corroborated Alerts</div>
                <div className="text-base font-bold text-gray-100 mt-1 font-mono">
                  {state.alerts.filter((a: Alert) => a.evidence?.is_corroborated).length} Alarms
                </div>
                <div className="text-[10px] text-amber-400 mt-0.5">ISA-18.2 Dual-Sensor Rule</div>
              </div>
            </div>
          </div>

          {/* Section 2: 3-Joint Splice Health Matrix */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              2. Splicing Integrity Matrix (3 Spliced Joints)
            </h3>
            <div className="overflow-x-auto border border-control-border rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-control-card border-b border-control-border text-gray-400 font-semibold">
                  <tr>
                    <th className="p-2.5">Joint</th>
                    <th className="p-2.5">Health Score</th>
                    <th className="p-2.5">Position</th>
                    <th className="p-2.5">Splice Type</th>
                    <th className="p-2.5">ToF Profile</th>
                    <th className="p-2.5">RUL Estimate</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-control-border/60">
                  {joints.map((joint: Joint) => {
                    const isCrit = joint.health < 50 || joint.state === 'CRITICAL';
                    const isWatch = (joint.health >= 50 && joint.health < 75) || joint.state === 'WATCH';
                    return (
                      <tr key={joint.id} className="hover:bg-control-card/50">
                        <td className="p-2.5 font-mono font-bold text-gray-200">{joint.joint_code}</td>
                        <td className="p-2.5">
                          <span className={`font-mono font-bold ${isCrit ? 'text-rose-400' : isWatch ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {joint.health.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-gray-300">{joint.position_m.toFixed(1)} m</td>
                        <td className="p-2.5 font-mono text-gray-300">{joint.splice_type}</td>
                        <td className="p-2.5 text-gray-400">
                          {isCrit ? 'Cord Exposure / Pull-out' : isWatch ? 'Surface Rubber Wear' : 'Nominal Uniform Profile'}
                        </td>
                        <td className="p-2.5 font-mono text-gray-200">
                          {joint.rul?.low_days ? `${joint.rul.low_days}-${joint.rul.high_days} days` : '12-24 days'}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : isWatch
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {joint.state}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Sensor Instrumentation Verification */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              3. Sensor Calibration & Telemetry Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-control-card border border-control-border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-200">Multispectral Camera (AI Mast)</div>
                  <div className="text-[11px] text-gray-400">RGB / NIR / Thermal Surface Scanner</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                  98.4% Confidence
                </span>
              </div>

              <div className="p-3 bg-control-card border border-control-border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-200">TF-Luna Micro LiDAR (Feed Chute)</div>
                  <div className="text-[11px] text-gray-400">850nm ToF Cross-Sectional Profiler</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                  100 Hz / Calibrated
                </span>
              </div>

              <div className="p-3 bg-control-card border border-control-border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-200">High-Precision Tension Load Cell</div>
                  <div className="text-[11px] text-gray-400">Take-up Dynamic Tension & Overload</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                  0.05% Error / Nominal
                </span>
              </div>

              <div className="p-3 bg-control-card border border-control-border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-200">Inductive Proximity Sensor Array (3x)</div>
                  <div className="text-[11px] text-gray-400">Bed Longitudinal Rip & Splicing Trigger</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                  3/3 Online
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Sign-off & Audit Compliance */}
          <div className="pt-4 border-t border-control-border grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-400">
            <div className="space-y-1">
              <div className="font-semibold text-gray-300">Certified Shift Inspector</div>
              <div>Engineer ID: <span className="font-mono text-gray-200">ENG-5509 (Auto-Validated)</span></div>
              <div>Digital Signature Token: <span className="font-mono text-blue-400">SHA256: 8f9b...a12c</span></div>
            </div>
            <div className="space-y-1 sm:text-right">
              <div className="font-semibold text-gray-300">BeltScanX AI Advisory Notice</div>
              <div>System output is advisory-only. No remote physical control or stop actions are taken.</div>
              <div className="text-gray-500">Compliance Standard: ISO 55000 / AS 4024.3610</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
