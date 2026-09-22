import React, { useState } from 'react';
import { StatusCards } from '../components/overview/StatusCards';
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
  onNavigateToSection?: (section: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ state, onNavigateToSection }) => {
  const [selectedJointCode, setSelectedJointCode] = useState<string | null>(null);

  if (state.loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-control-muted space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-mono">Initializing NEXVION Telemetry Pipeline...</p>
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
    ? state.joints[selectedJointCode] || state.joints[`CV01_${selectedJointCode}`]
    : null;

  const jointHistory = selectedJointCode ? state.jointHistory[selectedJointCode] || [] : [];
  const latestPass = state.latestPassEvents.length > 0 ? state.latestPassEvents[0] : null;
  const topAlert = state.alerts.length > 0 ? state.alerts[0] : null;

  return (
    <div className="flex-1 p-4 space-y-4 max-w-7xl mx-auto w-full">
      {/* 1. Status Cards (OV-01) */}
      <StatusCards
        conveyorSummary={state.conveyorSummary}
        simStatus={state.simStatus}
        joints={state.joints}
        activeAlertsCount={state.alerts.length}
        devMode={state.devMode}
      />

      {/* 2. Linear Conveyor Map (OV-02) */}
      <InteractiveConveyorMap
        joints={state.joints}
        jointOrder={state.jointOrder}
        simStatus={state.simStatus}
        selectedJointCode={selectedJointCode}
        onSelectJoint={(code) => setSelectedJointCode(code)}
      />

      {/* 3. Operational Grid */}
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

        {/* Right Column: AI Insight & Active Alerts List */}
        <div className="space-y-4">
          <AIInsightCard
            topAlert={topAlert}
            devMode={state.devMode}
            onInspectJoint={(code) => setSelectedJointCode(code)}
          />
          <ActiveAlertsList
            alerts={state.alerts}
            onSelectJoint={(code) => setSelectedJointCode(code)}
          />
        </div>
      </div>

      {/* 4. Slide-over Joint Drawer */}
      {selectedJointCode && (
        <JointDetailDrawer
          jointCode={selectedJointCode}
          joint={selectedJoint}
          historyPoints={jointHistory}
          alerts={state.alerts}
          latestPass={latestPass}
          onClose={() => setSelectedJointCode(null)}
          onNavigateToSection={onNavigateToSection}
        />
      )}
    </div>
  );
};
