import React from 'react';
import { BellRing, X } from 'lucide-react';
import { ScenarioEventMessage } from '../../types/telemetry';

interface ScenarioEventBannerProps {
  event: ScenarioEventMessage | null;
  dismissedTs: string | null;
  onDismiss: () => void;
}

export const ScenarioEventBanner: React.FC<ScenarioEventBannerProps> = ({
  event,
  dismissedTs,
  onDismiss,
}) => {
  if (!event || event.ts === dismissedTs) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-950/90 border-b border-amber-500/50 text-amber-200 px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-md animate-fade-in"
    >
      <div className="flex items-center gap-2.5">
        <BellRing className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <div>
          <span className="font-bold text-amber-300 uppercase tracking-wide mr-2">
            Simulation Milestone: {event.event}
          </span>
          <span className="text-slate-300">
            Scenario <code className="font-mono text-amber-200">{event.scenario}</code> completed critical hold on Target Joint{' '}
            <strong className="text-white font-mono">{event.target_joint}</strong> ({event.critical_laps_held} laps held). Action: <span className="font-semibold text-amber-400">{event.action}</span>.
          </span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 text-amber-400 hover:text-white hover:bg-amber-900/60 rounded transition-colors"
        title="Dismiss announcement"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
