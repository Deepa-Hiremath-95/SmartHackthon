import React from 'react';
import { HealthState, Severity, RULStatus } from '../types/telemetry';

export type ShapeType = 'circle' | 'triangle' | 'diamond' | 'octagon' | 'hollow-circle';

export interface SeverityConfig {
  state: HealthState | 'OFFLINE';
  label: string;
  shape: ShapeType;
  shapeSymbol: string;
  colorHex: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
}

export const SEVERITY_CONFIGS: Record<HealthState | 'OFFLINE', SeverityConfig> = {
  HEALTHY: {
    state: 'HEALTHY',
    label: 'Healthy',
    shape: 'circle',
    shapeSymbol: '●',
    colorHex: '#10b981',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-950/40',
    borderClass: 'border-emerald-500/40',
    badgeClass: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30',
  },
  WATCH: {
    state: 'WATCH',
    label: 'Watch',
    shape: 'triangle',
    shapeSymbol: '▲',
    colorHex: '#f59e0b',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-950/40',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-950/40 text-amber-400 border border-amber-500/30',
  },
  MAINTENANCE_REQUIRED: {
    state: 'MAINTENANCE_REQUIRED',
    label: 'Maintenance Required',
    shape: 'diamond',
    shapeSymbol: '◆',
    colorHex: '#f97316',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-950/40',
    borderClass: 'border-orange-500/40',
    badgeClass: 'bg-orange-950/40 text-orange-400 border border-orange-500/30',
  },
  CRITICAL: {
    state: 'CRITICAL',
    label: 'Critical',
    shape: 'octagon',
    shapeSymbol: '⯄',
    colorHex: '#ef4444',
    textClass: 'text-red-400',
    bgClass: 'bg-red-950/40',
    borderClass: 'border-red-500/40',
    badgeClass: 'bg-red-950/40 text-red-400 border border-red-500/40 font-semibold',
  },
  OFFLINE: {
    state: 'OFFLINE',
    label: 'Offline / No Data',
    shape: 'hollow-circle',
    shapeSymbol: '○',
    colorHex: '#64748b',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-900/40',
    borderClass: 'border-slate-600/40',
    badgeClass: 'bg-slate-900/40 text-slate-400 border border-slate-700/40',
  },
};

/**
 * Maps a numeric health score [0..100] to its ISA-101 classification.
 * Thresholds:
 * - >= 85: Healthy (Green circle)
 * - 70 - 84: Watch (Yellow triangle)
 * - 50 - 69: Maintenance Required (Orange diamond)
 * - < 50: Critical (Red octagon)
 * - null/undefined/NaN: Offline / No Data (Grey hollow circle)
 */
export function classifyHealth(health: number | null | undefined): SeverityConfig {
  if (health === null || health === undefined || isNaN(health)) {
    return SEVERITY_CONFIGS.OFFLINE;
  }
  if (health >= 85) {
    return SEVERITY_CONFIGS.HEALTHY;
  }
  if (health >= 70) {
    return SEVERITY_CONFIGS.WATCH;
  }
  if (health >= 50) {
    return SEVERITY_CONFIGS.MAINTENANCE_REQUIRED;
  }
  return SEVERITY_CONFIGS.CRITICAL;
}

/**
 * Maps a HealthState enum value to its severity configuration.
 */
export function classifyState(state: HealthState | string | null | undefined): SeverityConfig {
  if (!state) return SEVERITY_CONFIGS.OFFLINE;
  const upper = state.toUpperCase();
  if (upper in SEVERITY_CONFIGS) {
    return SEVERITY_CONFIGS[upper as HealthState | 'OFFLINE'];
  }
  return SEVERITY_CONFIGS.OFFLINE;
}

/**
 * Maps an Alert Severity to a matching HealthState configuration.
 */
export function classifySeverity(severity: Severity | string | null | undefined): SeverityConfig {
  if (!severity) return SEVERITY_CONFIGS.OFFLINE;
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return SEVERITY_CONFIGS.CRITICAL;
    case 'WARNING':
      return SEVERITY_CONFIGS.MAINTENANCE_REQUIRED;
    case 'WATCH':
      return SEVERITY_CONFIGS.WATCH;
    case 'INFO':
      return {
        ...SEVERITY_CONFIGS.HEALTHY,
        label: 'Info',
        textClass: 'text-sky-400',
        bgClass: 'bg-sky-950/40',
        borderClass: 'border-sky-500/40',
        badgeClass: 'bg-sky-950/40 text-sky-400 border border-sky-500/30',
      };
    default:
      return SEVERITY_CONFIGS.OFFLINE;
  }
}

/**
 * SVG Shape Renderer: Circle, Triangle, Diamond, Octagon, Hollow Circle
 */
export const SeverityShape: React.FC<{
  shape: ShapeType;
  colorHex: string;
  size?: number;
  className?: string;
}> = ({ shape, colorHex, size = 16, className = '' }) => {
  switch (shape) {
    case 'circle':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          aria-label="Healthy circle"
          className={className}
        >
          <circle cx="8" cy="8" r="6" fill={colorHex} />
        </svg>
      );
    case 'triangle':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          aria-label="Watch triangle"
          className={className}
        >
          <polygon points="8,2 14,14 2,14" fill={colorHex} />
        </svg>
      );
    case 'diamond':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          aria-label="Maintenance diamond"
          className={className}
        >
          <polygon points="8,2 14,8 8,14 2,8" fill={colorHex} />
        </svg>
      );
    case 'octagon':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          aria-label="Critical octagon"
          className={className}
        >
          <polygon points="5,2 11,2 14,5 14,11 11,14 5,14 2,11 2,5" fill={colorHex} />
        </svg>
      );
    case 'hollow-circle':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          aria-label="Offline hollow circle"
          className={className}
        >
          <circle cx="8" cy="8" r="5.5" stroke={colorHex} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      );
  }
};

/**
 * Universal Colour + Shape + Label badge component.
 */
export const SeverityBadge: React.FC<{
  health?: number | null;
  state?: HealthState | string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  overrideLabel?: string;
  className?: string;
}> = ({ health, state, size = 'md', showLabel = true, overrideLabel, className = '' }) => {
  const config = health !== undefined ? classifyHealth(health) : classifyState(state);
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${config.badgeClass} ${textSize} ${className}`}
      title={`${config.label} (${config.shape})`}
    >
      <SeverityShape shape={config.shape} colorHex={config.colorHex} size={iconSize} />
      {showLabel && <span>{overrideLabel || config.label}</span>}
    </span>
  );
};

/**
 * RUL Status Badge Component. Never displays a bare number.
 */
export const RULBadge: React.FC<{
  status: RULStatus | string | null | undefined;
  lowDays?: number | null;
  highDays?: number | null;
  reason?: string | null;
  className?: string;
}> = ({ status, lowDays, highDays, reason, className = '' }) => {
  const st = (status || 'UNAVAILABLE').toUpperCase();

  let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
  let label = 'UNAVAILABLE';

  switch (st) {
    case 'DEMO':
      badgeColor = 'bg-purple-950/50 text-purple-300 border-purple-500/40';
      label = 'DEMO';
      break;
    case 'ESTIMATED':
      badgeColor = 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40';
      label = 'ESTIMATED';
      break;
    case 'VALIDATED':
      badgeColor = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40';
      label = 'VALIDATED';
      break;
    case 'UNAVAILABLE':
    default:
      badgeColor = 'bg-slate-900/60 text-slate-400 border-slate-700/40';
      label = 'UNAVAILABLE';
      break;
  }

  const hasDays = lowDays !== undefined && lowDays !== null && highDays !== undefined && highDays !== null;
  const daysText = hasDays ? `${Math.round(lowDays)}–${Math.round(highDays)} days` : reason || 'Insufficient history';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono tracking-wider border ${badgeColor}`}>
        {label}
      </span>
      <span className="text-xs text-control-muted font-mono">{daysText}</span>
    </div>
  );
};
