import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Joint } from '../../types/telemetry';
import { classifyHealth, SeverityShape } from '../../utils/severity';
import { PieChart as ChartIcon } from 'lucide-react';

interface HealthDistributionDonutProps {
  joints: Record<string, Joint>;
  onSelectStateFilter?: (state: string) => void;
}

export const HealthDistributionDonut: React.FC<HealthDistributionDonutProps> = ({ joints }) => {
  const jointsList = Object.values(joints);
  const total = jointsList.length || 24;

  let healthy = 0;
  let watch = 0;
  let maintenance = 0;
  let critical = 0;
  let offline = 0;

  if (jointsList.length === 0) {
    // Default baseline if loading
    healthy = 24;
  } else {
    jointsList.forEach((j) => {
      const config = classifyHealth(j.health);
      if (config.state === 'HEALTHY') healthy++;
      else if (config.state === 'WATCH') watch++;
      else if (config.state === 'MAINTENANCE_REQUIRED') maintenance++;
      else if (config.state === 'CRITICAL') critical++;
      else offline++;
    });
  }

  const data = [
    { name: 'Healthy (≥85)', count: healthy, color: '#10b981', shape: 'circle' as const },
    { name: 'Watch (70–84)', count: watch, color: '#f59e0b', shape: 'triangle' as const },
    { name: 'Maintenance (50–69)', count: maintenance, color: '#f97316', shape: 'diamond' as const },
    { name: 'Critical (<50)', count: critical, color: '#ef4444', shape: 'octagon' as const },
    ...(offline > 0
      ? [{ name: 'Offline / No Data', count: offline, color: '#64748b', shape: 'hollow-circle' as const }]
      : []),
  ];

  return (
    <div className="bg-control-panel border border-control-border rounded-lg p-4 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Health Distribution (OV-03)
          </h2>
        </div>
        <span className="text-[11px] font-mono text-control-dim">{total} Total Joints</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3 py-2">
        {/* Donut Chart */}
        <div className="h-44 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={66}
                paddingAngle={3}
                dataKey="count"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#131b26" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#131b26',
                  borderColor: '#273447',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centered label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold font-mono text-white">{total}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-control-dim">Joints</span>
          </div>
        </div>

        {/* Breakdown Legend */}
        <div className="space-y-2 text-xs font-mono">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <SeverityShape shape={item.shape} colorHex={item.color} size={12} />
                <span className="truncate text-control-muted text-[11px]">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100">{item.count}</span>
                <span className="text-control-dim text-[10px] w-8 text-right">
                  {Math.round((item.count / total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
