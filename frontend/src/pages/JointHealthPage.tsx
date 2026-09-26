import React, { useState } from 'react';
import {
  HeartPulse,
  Search,
  Filter,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';
import { classifyHealth, SeverityBadge, SeverityShape } from '../utils/severity';
import { JointDetailDrawer } from '../components/overview/JointDetailDrawer';

interface JointHealthPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
  onLoadHistory?: (jointId: string) => void;
}

export const JointHealthPage: React.FC<JointHealthPageProps> = ({
  state,
  onNavigateToSection,
  onLoadHistory,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'HEALTHY' | 'WATCH' | 'MAINTENANCE_REQUIRED' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJointCode, setSelectedJointCode] = useState<string | null>(null);

  const selectedConveyorId = state.selectedConveyorId || 'CV-01';
  const jointCodes = state.jointOrder.length > 0 ? state.jointOrder : ['J01', 'J02', 'J03'];

  // Map and filter joint list
  const jointsList = jointCodes
    .map((code) => {
      const joint = state.joints[code] || state.joints[`${selectedConveyorId.replace('-', '')}_${code}`];
      return {
        code,
        joint,
        health: joint?.health ?? 95.0,
        state: joint?.state ?? 'HEALTHY',
        position_m: joint?.position_m ?? 0,
        splice_type: joint?.splice_type ?? 'Finger Splice Hot Vulcanized',
        risk_score: joint?.risk_score ?? 0.05,
      };
    })
    .filter((item) => {
      if (selectedFilter !== 'ALL' && item.state !== selectedFilter) return false;
      if (searchQuery.trim() !== '' && !item.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const selectedJoint = selectedJointCode
    ? state.joints[selectedJointCode] || state.joints[`${selectedConveyorId.replace('-', '')}_${selectedJointCode}`]
    : null;
  const jointHistory = selectedJointCode ? state.jointHistory[selectedJointCode] || [] : [];
  const latestPass = state.latestPassEvents.length > 0 ? state.latestPassEvents[0] : null;

  const handleOpenJoint = (code: string) => {
    setSelectedJointCode(code);
    if (onLoadHistory) {
      onLoadHistory(code);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Joint Health & Splice Matrix ({selectedConveyorId})
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-control-subpanel text-control-dim border border-control-border">
              {jointCodes.length} Splice Joints
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Per-joint fused health index, baseline deviation tracking, and prognostic maintenance matrix.
          </p>
        </div>

        {/* Filter Badges Strip */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {(['ALL', 'HEALTHY', 'WATCH', 'MAINTENANCE_REQUIRED', 'CRITICAL'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setSelectedFilter(filterKey)}
              className={`px-2.5 py-1 rounded border transition-colors cursor-pointer text-[11px] ${
                selectedFilter === filterKey
                  ? 'bg-slate-800 text-white border-emerald-400/60 font-semibold'
                  : 'bg-control-subpanel border-control-border text-control-dim hover:text-slate-200'
              }`}
            >
              {filterKey.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar & Stats Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-control-panel border border-control-border p-3 rounded-lg">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-control-dim absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search joint code (e.g. J01, J02)..."
            className="w-full bg-control-subpanel border border-control-border rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-control-dim focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-control-dim">
          <span>Displaying: <strong className="text-slate-200">{jointsList.length}</strong> of {jointCodes.length} joints</span>
          <span>Target Joint: <strong className="text-amber-400 font-bold">J02</strong></span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-control-panel border border-control-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-control-subpanel/80 text-[11px] text-control-dim uppercase border-b border-control-border">
              <tr>
                <th className="py-3 px-4">Joint Code</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Splice Type</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">State & Severity</th>
                <th className="py-3 px-4">Risk Index</th>
                <th className="py-3 px-4">Trend</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-control-border/60">
              {jointsList.map((item) => {
                const config = classifyHealth(item.health);
                const isDegrading = item.code === 'J02' && item.health < 85;

                return (
                  <tr
                    key={item.code}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => handleOpenJoint(item.code)}
                  >
                    {/* Joint Code */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{item.code}</span>
                        {item.code === 'J02' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950/60 text-amber-300 border border-amber-500/40">
                            TARGET
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3 px-4 text-control-dim">
                      {item.position_m.toFixed(0)} m
                    </td>

                    {/* Splice Type */}
                    <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">
                      {item.splice_type}
                    </td>

                    {/* Health Score & Progress Bar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(item.health, 5)}%`,
                              backgroundColor: config.colorHex,
                            }}
                          />
                        </div>
                        <span className={`font-bold ${config.textClass}`}>
                          {item.health.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* State Badge */}
                    <td className="py-3 px-4">
                      <SeverityBadge health={item.health} size="sm" showLabel={true} />
                    </td>

                    {/* Risk Index */}
                    <td className="py-3 px-4 text-control-dim">
                      {(item.risk_score * 100).toFixed(1)}%
                    </td>

                    {/* Trend */}
                    <td className="py-3 px-4">
                      {isDegrading ? (
                        <span className="flex items-center gap-1 text-red-400 font-bold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>-2.4 pt/lap</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Minus className="w-3.5 h-3.5" />
                          <span>Stable</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenJoint(item.code);
                        }}
                        className="p-1.5 rounded bg-control-subpanel hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Open Joint Detail Passport"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Joint Drawer */}
      {selectedJointCode && selectedJoint && (
        <div className="fixed top-4 right-4 bottom-4 w-96 max-w-full z-40">
          <JointDetailDrawer
            jointCode={selectedJointCode}
            joint={selectedJoint}
            historyPoints={jointHistory}
            alerts={state.alerts}
            latestPass={latestPass}
            onClose={() => setSelectedJointCode(null)}
            onNavigateToSection={onNavigateToSection}
          />
        </div>
      )}
    </div>
  );
};
