import React, { useState } from 'react';
import { ConveyorSummaryBar } from '../components/overview/ConveyorSummaryBar';
import { JointGrid } from '../components/overview/JointGrid';
import { InteractiveConveyorMap } from '../components/overview/InteractiveConveyorMap';
import { JointDetailDrawer } from '../components/overview/JointDetailDrawer';
import { HealthDistributionDonut } from '../components/overview/HealthDistributionDonut';
import { ActiveAlertsList } from '../components/overview/ActiveAlertsList';
import { AIInsightCard } from '../components/overview/AIInsightCard';
import { SensorSummaryCards } from '../components/overview/SensorSummaryCards';
import { LiveDataState } from '../hooks/liveDataReducer';
import { Loader2, AlertCircle } from 'lucide-react';

interface OverviewPageProps {
  state: LiveDataState;
  onSelectConveyor?: (conveyorId: string) => void;
  onNavigateToSection?: (section: string) => void;
  onLoadHistory?: (jointCode: string) => Promise<unknown>;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  state,
  onSelectConveyor,
  onNavigateToSection,
  onLoadHistory,
}) => {
  const [selectedJointCode, setSelectedJointCode] = useState<string | null>(null);

  if (state.loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-control-muted space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-mono">Initializing BeltScanX AI Telemetry Pipeline...</p>
        <span className="text-xs text-control-dim">Backfilling assets and connecting to /ws/live</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-red-400 space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-semibold">Failed to Connect to Platform Backend</p>
        <span className="text-xs text-control-dim font-mono bg-red-950/40 p-2 rounded border border-red-500/20 max-w-md text-center">
          {state.error}
        </span>
      </div>
    );
  }

  const selectedJoint = selectedJointCode
    ? state.joints[selectedJointCode] || state.joints[`${state.selectedConveyorId.replace('-', '')}_${selectedJointCode}`]
    : null;

  const jointHistory = selectedJointCode ? state.jointHistory[selectedJointCode] || [] : [];
  const latestPass = state.latestPassEvents.length > 0 ? state.latestPassEvents[0] : null;
  const topAlert = state.alerts.length > 0 ? state.alerts[0] : null;

  const conveyors = state.conveyors.length > 0
    ? state.conveyors
    : [
        { id: 'CV-01', name: 'CV-01 Overland Mainline', joint_count: 24, length_m: 2400, loop_length_m: 4800, speed_rating_mps: 2.45, mine_id: 'MINE-01', provenance: 'SIMULATED' as const },
        { id: 'CV-02', name: 'CV-02 Transfer Line', joint_count: 6, length_m: 600, loop_length_m: 1200, speed_rating_mps: 2.0, mine_id: 'MINE-01', provenance: 'SIMULATED' as const },
      ];

  return (
    <div className="flex-1 p-4 space-y-4 max-w-7xl mx-auto w-full">
      {/* 1. Conveyor Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-control-panel border border-control-border rounded-lg p-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Conveyor:
          </span>
          <div className="inline-flex rounded-md shadow-sm bg-control-subpanel p-0.5 border border-control-border">
            {conveyors.map((c) => {
              const isSelected = state.selectedConveyorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectConveyor && onSelectConveyor(c.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                      : 'text-control-dim hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{c.id}</span>
                  <span className="text-[10px] text-control-dim font-normal hidden md:inline">
                    {c.id === 'CV-01' ? '(3 Joints)' : '(6 Joints)'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-control-dim">
          <span>
            Active: <strong className="text-white">{state.selectedConveyorId}</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            {state.selectedConveyorId === 'CV-01' ? '4,800 m Loop' : '1,200 m Loop'}
          </span>
        </div>
      </div>

      {/* 2. Conveyor Summary Bar */}
      <ConveyorSummaryBar
        conveyorSummary={state.conveyorSummary}
        simStatus={state.simStatus}
        joints={state.joints}
        activeAlertsCount={state.alerts.length}
        selectedConveyorId={state.selectedConveyorId}
      />

      {/* 3. Responsive Joints Health Grid */}
      <JointGrid
        joints={state.joints}
        jointOrder={state.jointOrder}
        selectedJointCode={selectedJointCode}
        onSelectJoint={(code) => setSelectedJointCode(code)}
        selectedConveyorId={state.selectedConveyorId}
      />

      {/* 4. Linear Conveyor Map */}
      <InteractiveConveyorMap
        joints={state.joints}
        jointOrder={state.jointOrder}
        simStatus={state.simStatus}
        selectedJointCode={selectedJointCode}
        onSelectJoint={(code) => setSelectedJointCode(code)}
      />

      {/* 5. Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Health Distribution Donut & Sensor Summaries */}
        <div className="space-y-4">
          <HealthDistributionDonut joints={state.joints} />
          <SensorSummaryCards
            conveyorSummary={state.conveyorSummary}
            latestPass={latestPass}
            latestHealthUpdate={state.latestHealthUpdate}
            devMode={state.devMode}
          />
        </div>

        {/* Right Column: AI Insight & Dashboard-wide Alerts/Events Log */}
        <div className="space-y-4">
          <AIInsightCard
            topAlert={topAlert}
            devMode={state.devMode}
            onInspectJoint={(code) => setSelectedJointCode(code)}
          />
          <ActiveAlertsList
            alerts={state.alerts}
            activityLog={state.activityLog}
            onSelectJoint={(code) => setSelectedJointCode(code)}
          />
        </div>
      </div>

      {/* 6. Slide-over Joint Drawer */}
      {selectedJointCode && (
        <JointDetailDrawer
          jointCode={selectedJointCode}
          joint={selectedJoint}
          historyPoints={jointHistory}
          alerts={state.alerts}
          latestPass={latestPass}
          onClose={() => setSelectedJointCode(null)}
          onNavigateToSection={onNavigateToSection}
          onLoadHistory={onLoadHistory}
        />
      )}
    </div>
  );
};
