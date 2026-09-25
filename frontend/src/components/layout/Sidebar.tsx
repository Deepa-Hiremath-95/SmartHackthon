import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Layers,
  HeartPulse,
  Sparkles,
  AlertOctagon,
  ScanEye,
  Wrench,
  BarChart3,
  Boxes,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type SectionId =
  | 'overview'
  | 'live_monitoring'
  | 'digital_twin'
  | 'joint_health'
  | 'ai_prediction'
  | 'alerts'
  | 'inspection'
  | 'maintenance'
  | 'analytics'
  | 'assets'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAlertCount?: number;
}

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isP0: boolean;
}

export const SECTIONS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, isP0: true },
  { id: 'live_monitoring', label: 'Live Monitoring', icon: Radio, isP0: false },
  { id: 'digital_twin', label: 'Digital Twin', icon: Layers, isP0: true },
  { id: 'joint_health', label: 'Joint Health', icon: HeartPulse, isP0: false },
  { id: 'ai_prediction', label: 'AI Prediction', icon: Sparkles, isP0: false },
  { id: 'alerts', label: 'Alert Center', icon: AlertOctagon, isP0: false },
  { id: 'inspection', label: 'Inspection Center', icon: ScanEye, isP0: false },
  { id: 'maintenance', label: 'Maintenance Center', icon: Wrench, isP0: false },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, isP0: false },
  { id: 'assets', label: 'Conveyor Assets', icon: Boxes, isP0: false },
  { id: 'reports', label: 'Reports', icon: FileText, isP0: false },
  { id: 'settings', label: 'Settings', icon: Settings, isP0: false },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  activeAlertCount = 0,
}) => {
  return (
    <aside
      className={`bg-control-panel border-r border-control-border flex flex-col transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation list */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              title={collapsed ? `${item.label} ${!item.isP0 ? '(Coming soon)' : ''}` : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-slate-800 text-white border-l-2 border-emerald-400 font-semibold'
                  : 'text-control-muted hover:text-slate-200 hover:bg-control-subpanel border-l-2 border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-emerald-400' : 'text-control-dim group-hover:text-slate-300'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.id === 'alerts' && activeAlertCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-600/80 text-white font-bold">
                      {activeAlertCount}
                    </span>
                  )}
                  {!item.isP0 && item.id !== 'alerts' && (
                    <span className="text-[10px] text-control-dim font-mono">P1</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-control-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-1.5 rounded text-control-dim hover:text-white hover:bg-control-subpanel transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
