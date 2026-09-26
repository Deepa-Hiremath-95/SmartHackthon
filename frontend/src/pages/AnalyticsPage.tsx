import React, { useState } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';

interface AnalyticsPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  state,
  onNavigateToSection,
}) => {
  // ROI Calculator editable parameters
  const [downtimeCostPerHour, setDowntimeCostPerHour] = useState(450000); // ₹4.5 Lakhs / hr
  const [avoidedFailuresYear, setAvoidedFailuresYear] = useState(4);
  const [avgDowntimeHoursPerBreak, setAvgDowntimeHoursPerBreak] = useState(14); // 14 hours per catastrophic rip
  const [spliceRepairCost, setSpliceRepairCost] = useState(180000); // ₹1.8 Lakhs

  // Calculations
  const grossSavings = avoidedFailuresYear * avgDowntimeHoursPerBreak * downtimeCostPerHour;
  const netSavings = grossSavings - avoidedFailuresYear * spliceRepairCost;

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Fleet Analytics & ROI Financial Calculator
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
              PRD AN-04 COMPLIANT
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Downtime mitigation metrics, alarm management KPIs, and quantifiable ROI models for conveyor maintenance.
          </p>
        </div>
      </div>

      {/* Fleet KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <span className="text-xs text-control-dim block">Mean Fleet Joint Health</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">92.4%</div>
          <span className="text-[10px] text-control-dim">Target: &gt; 85.0% (ISA-101 Standard)</span>
        </div>

        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <span className="text-xs text-control-dim block">Mean Time Between Failures (MTBF)</span>
          <div className="text-2xl font-bold font-mono text-white">4,280 <span className="text-xs text-control-dim font-normal">Hrs</span></div>
          <span className="text-[10px] text-emerald-400">+24% vs Historical Baseline</span>
        </div>

        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <span className="text-xs text-control-dim block">Corroborated Alarm Accuracy</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">97.8%</div>
          <span className="text-[10px] text-control-dim">&lt; 1 false alarm per 500 hours</span>
        </div>

        <div className="bg-control-panel border border-control-border p-3.5 rounded-lg space-y-1">
          <span className="text-xs text-control-dim block">Unplanned Stoppage Avoided</span>
          <div className="text-2xl font-bold font-mono text-amber-400">56 <span className="text-xs text-control-dim font-normal">Hours YTD</span></div>
          <span className="text-[10px] text-control-dim">4 Catastrophic rips averted</span>
        </div>
      </div>

      {/* ROI Calculator & Risk Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive ROI Calculator (7 Cols) */}
        <div className="lg:col-span-7 bg-control-panel border border-control-border rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                Interactive Conveyor ROI & Loss-Avoidance Calculator
              </h2>
            </div>
            <span className="text-[10px] font-mono text-control-dim bg-control-subpanel px-2 py-0.5 rounded border border-control-border">
              Assumptions Editable
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-control-dim block text-[11px]">Cost per Hour of Unplanned Stoppage</label>
              <div className="flex items-center bg-control-subpanel border border-control-border rounded px-3 py-2">
                <span className="text-slate-400 mr-2">₹</span>
                <input
                  type="number"
                  value={downtimeCostPerHour}
                  onChange={(e) => setDowntimeCostPerHour(Number(e.target.value))}
                  className="bg-transparent text-white font-bold w-full focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-control-dim block text-[11px]">Avoided Splice Failures / Year</label>
              <div className="flex items-center bg-control-subpanel border border-control-border rounded px-3 py-2">
                <input
                  type="number"
                  value={avoidedFailuresYear}
                  onChange={(e) => setAvoidedFailuresYear(Number(e.target.value))}
                  className="bg-transparent text-white font-bold w-full focus:outline-none"
                />
                <span className="text-slate-400 ml-2">events</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-control-dim block text-[11px]">Avg Downtime per Breakdown (Hours)</label>
              <div className="flex items-center bg-control-subpanel border border-control-border rounded px-3 py-2">
                <input
                  type="number"
                  value={avgDowntimeHoursPerBreak}
                  onChange={(e) => setAvgDowntimeHoursPerBreak(Number(e.target.value))}
                  className="bg-transparent text-white font-bold w-full focus:outline-none"
                />
                <span className="text-slate-400 ml-2">hours</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-control-dim block text-[11px]">Scheduled Splice Repair Cost / Event</label>
              <div className="flex items-center bg-control-subpanel border border-control-border rounded px-3 py-2">
                <span className="text-slate-400 mr-2">₹</span>
                <input
                  type="number"
                  value={spliceRepairCost}
                  onChange={(e) => setSpliceRepairCost(Number(e.target.value))}
                  className="bg-transparent text-white font-bold w-full focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Result Net Savings Box */}
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs text-emerald-300 font-semibold block">
                Estimated Net Financial Savings / Year
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                ₹{(netSavings / 100000).toFixed(2)} Lakhs <span className="text-xs text-emerald-400 font-normal">/ Year</span>
              </span>
            </div>

            <div className="text-right text-xs font-mono text-control-dim">
              <div>Gross Avoided Loss: <strong>₹{(grossSavings / 100000).toFixed(1)}L</strong></div>
              <div>Repair Costs: <strong>₹{((avoidedFailuresYear * spliceRepairCost) / 100000).toFixed(1)}L</strong></div>
            </div>
          </div>
        </div>

        {/* Right: Joint Criticality Risk Matrix (5 Cols) */}
        <div className="lg:col-span-5 bg-control-panel border border-control-border rounded-lg p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-control-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase text-slate-200">
                Asset Risk & Criticality Matrix
              </h3>
            </div>
            <span className="text-[10px] font-mono text-control-dim">CV-01 Line</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-red-950/40 border border-red-500/50 p-3 rounded space-y-1">
              <span className="text-[10px] text-red-300 font-bold block">HIGH RISK / HIGH URGENCY</span>
              <strong className="text-base text-white">Joint J02</strong>
              <p className="text-[10px] text-control-dim font-sans">Splice lift &gt; 4.8mm requiring planned intervention.</p>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded space-y-1">
              <span className="text-[10px] text-emerald-300 font-bold block">LOW RISK / NOMINAL</span>
              <strong className="text-base text-white">Joint J01 & J03</strong>
              <p className="text-[10px] text-control-dim font-sans">Health &gt; 95% with stable multi-sensor telemetry.</p>
            </div>
          </div>

          <div className="p-3 bg-control-subpanel rounded border border-control-border text-xs text-control-dim leading-relaxed font-sans">
            By shifting from reactive breakdown repairs to condition-based planned splice refurbishments, NEXVION minimizes unplanned mainline downtime by up to <strong>85%</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};
