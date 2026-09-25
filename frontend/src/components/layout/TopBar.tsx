import React, { useState, useEffect } from 'react';
import {
  Activity,
  Bell,
  Maximize2,
  Minimize2,
  Code2,
  AlertTriangle,
} from 'lucide-react';
import { Conveyor, ConnectionState } from '../../types/telemetry';

interface TopBarProps {
  conveyors: Conveyor[];
  selectedConveyorId: string;
  onSelectConveyor: (id: string) => void;
  connectionState: ConnectionState;
  secondsSinceLastMessage: number;
  isStale: boolean;
  activeAlertsCount: number;
  devMode: boolean;
  onToggleDevMode: (enabled: boolean) => void;
  onAlertClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  conveyors,
  selectedConveyorId,
  onSelectConveyor,
  connectionState,
  secondsSinceLastMessage,
  isStale,
  activeAlertsCount,
  devMode,
  onToggleDevMode,
  onAlertClick,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Connection indicator status styling
  let connDotClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
  let connText = 'Connected';
  let connBadgeClass = 'text-emerald-400 bg-emerald-950/30 border-emerald-700/30';

  if (connectionState === 'Degraded' || isStale) {
    connDotClass = 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    connText = 'Degraded';
    connBadgeClass = 'text-amber-400 bg-amber-950/30 border-amber-700/30';
  } else if (connectionState === 'Offline') {
    connDotClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
    connText = 'Offline';
    connBadgeClass = 'text-red-400 bg-red-950/30 border-red-700/30';
  }

  return (
    <header className="h-14 bg-control-panel border-b border-control-border px-4 flex items-center justify-between gap-3 select-none">
      {/* Left: Brand & Conveyor / Mine Selector */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-slate-800 border border-control-border flex items-center justify-center font-bold text-sm tracking-wider text-slate-100">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-white leading-tight">NEXVION</div>
            <div className="text-[10px] text-control-dim font-mono tracking-wider uppercase">Conveyor Health AI</div>
          </div>
        </div>

        {/* Persistent SIMULATED / DEMO DATA Badge (Requirement 4) */}
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/50 text-[11px] font-mono text-purple-200 shadow-sm"
          title="Telemetry is SIMULATED. RUL is DEMO status. Never present as live sensor data."
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-wider text-purple-300">SIMULATED / DEMO DATA</span>
        </div>

        <div className="h-6 w-px bg-control-border mx-1 hidden sm:block" />

        {/* Conveyor Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="conveyor-select" className="text-xs text-control-muted hidden sm:inline">
            Asset:
          </label>
          <select
            id="conveyor-select"
            value={selectedConveyorId}
            onChange={(e) => onSelectConveyor(e.target.value)}
            className="bg-control-subpanel text-white text-xs rounded border border-control-border px-2.5 py-1.5 focus:outline-none focus:border-slate-500 cursor-pointer font-medium"
          >
            {conveyors.length === 0 ? (
              <option value="CV-01">CV-01 Overland Mainline (24 Joints)</option>
            ) : (
              conveyors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.joint_count ? `(${c.joint_count} Joints)` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Right: Telemetry Health, Alert Bell, Dev Mode, Fullscreen */}
      <div className="flex items-center gap-3">
        {/* System Connection State */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${connBadgeClass}`}
          title={`Network connection: ${connText}`}
        >
          <span className={`w-2 h-2 rounded-full ${connDotClass}`} />
          <span className="hidden md:inline font-mono text-[11px]">{connText}</span>
        </div>

        {/* Data Freshness Indicator */}
        <div
          className={`text-[11px] font-mono px-2 py-1 rounded border ${
            isStale
              ? 'text-amber-400 bg-amber-950/30 border-amber-700/40'
              : 'text-slate-400 bg-slate-900/40 border-slate-800'
          }`}
          title={isStale ? 'No live packet received for >10s' : 'Live stream active'}
        >
          {connectionState === 'Offline' ? (
            'Offline'
          ) : (
            <>
              Updated <span className="font-semibold text-slate-200">{secondsSinceLastMessage}s</span> ago
            </>
          )}
        </div>

        {/* Active Alerts Bell */}
        <button
          onClick={onAlertClick}
          className="relative p-1.5 rounded text-control-muted hover:text-white hover:bg-control-subpanel border border-transparent hover:border-control-border transition-colors cursor-pointer"
          title={`${activeAlertsCount} active alert(s)`}
          aria-label={`${activeAlertsCount} active alerts`}
        >
          <Bell className="w-4 h-4" />
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Dev Mode Toggle Pill */}
        <button
          onClick={() => onToggleDevMode(!devMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
            devMode
              ? 'bg-purple-950/60 text-purple-300 border-purple-500/50 shadow-sm'
              : 'bg-control-subpanel text-control-dim border-control-border hover:text-control-muted'
          }`}
          title="Toggle developer mode to inspect backend API gaps"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dev Mode:</span>
          <span className="font-bold">{devMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded text-control-muted hover:text-white hover:bg-control-subpanel border border-control-border transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Command Center Fullscreen (GL-02)'}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
