import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar, SectionId } from './Sidebar';
import { DemoBanner } from './DemoBanner';
import { ScenarioEventBanner } from './ScenarioEventBanner';
import { DemoControls } from '../sim/DemoControls';
import { Footer } from './Footer';
import { OverviewPage } from '../../pages/OverviewPage';
import { LiveMonitoringPage } from '../../pages/LiveMonitoringPage';
import { DigitalTwinPage } from '../../pages/DigitalTwinPage';
import { JointHealthPage } from '../../pages/JointHealthPage';
import { AIPredictionPage } from '../../pages/AIPredictionPage';
import { AlertCenterPage } from '../../pages/AlertCenterPage';
import { InspectionCenterPage } from '../../pages/InspectionCenterPage';
import { MaintenanceCenterPage } from '../../pages/MaintenanceCenterPage';
import { AnalyticsPage } from '../../pages/AnalyticsPage';
import { AssetManagementPage } from '../../pages/AssetManagementPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { useLiveData } from '../../hooks/useLiveData';

export const AppShell: React.FC = () => {
  const {
    state,
    setSelectedConveyor,
    loadJointHistory,
    refetchSimStatus,
    dismissScenarioEvent,
    setDevMode,
    runDemo,
  } = useLiveData();

  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderActivePage = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewPage
            state={state}
            onSelectConveyor={setSelectedConveyor}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
            onLoadHistory={loadJointHistory}
          />
        );
      case 'live_monitoring':
        return (
          <LiveMonitoringPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'digital_twin':
        return (
          <DigitalTwinPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'joint_health':
        return (
          <JointHealthPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
            onLoadHistory={loadJointHistory}
          />
        );
      case 'ai_prediction':
        return (
          <AIPredictionPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'alerts':
        return (
          <AlertCenterPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'inspection':
        return (
          <InspectionCenterPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'maintenance':
        return (
          <MaintenanceCenterPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'assets':
        return (
          <AssetManagementPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'reports':
        return (
          <ReportsPage
            state={state}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
          />
        );
      case 'settings':
        return <SettingsPage state={state} />;
      default:
        return (
          <OverviewPage
            state={state}
            onSelectConveyor={setSelectedConveyor}
            onNavigateToSection={(section) => setActiveSection(section as SectionId)}
            onLoadHistory={loadJointHistory}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-control-bg text-control-text">
      {/* 1. Persistent DEMO DATA Banner (Non-negotiable PRD rule) */}
      <DemoBanner
        provenance={state.hasSimulatedData ? 'SIMULATED' : 'REAL_SITE'}
        runId={state.simStatus?.run_id}
        onRunDemo={runDemo}
      />

      {/* 2. Scenario Milestone Event Toast (Critical hold complete, etc.) */}
      <ScenarioEventBanner
        event={state.latestScenarioEvent}
        dismissedTs={state.dismissedScenarioEventTs}
        onDismiss={dismissScenarioEvent}
      />

      {/* 3. Global Top Bar */}
      <TopBar
        conveyors={state.conveyors}
        selectedConveyorId={state.selectedConveyorId}
        onSelectConveyor={setSelectedConveyor}
        connectionState={state.connectionState}
        secondsSinceLastMessage={state.secondsSinceLastMessage}
        isStale={state.isStale}
        activeAlertsCount={state.alerts.length}
        devMode={state.devMode}
        onToggleDevMode={setDevMode}
        onAlertClick={() => setActiveSection('alerts')}
      />

      {/* 4. Core Layout: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeAlertCount={state.alerts.length}
        />

        <main className="flex-1 flex flex-col overflow-y-auto bg-control-bg">
          {renderActivePage()}
        </main>
      </div>

      {/* 5. Demo Controls Panel (Floating bottom-right, only active when simulated) */}
      {state.hasSimulatedData && (
        <DemoControls
          simStatus={state.simStatus}
          onRefreshSimStatus={refetchSimStatus}
          onRunDemo={runDemo}
        />
      )}

      {/* 6. Sticky Technical Footer */}
      <Footer
        simStatus={state.simStatus}
        provenance={state.hasSimulatedData ? 'SIMULATED' : 'REAL_SITE'}
      />
    </div>
  );
};
