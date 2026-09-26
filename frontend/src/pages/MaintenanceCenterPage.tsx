import React, { useState } from 'react';
import {
  Wrench,
  Calendar,
  User,
  Plus,
  Download,
} from 'lucide-react';
import { LiveDataState } from '../hooks/liveDataReducer';

interface MaintenanceCenterPageProps {
  state: LiveDataState;
  onNavigateToSection?: (section: string) => void;
}

interface WorkOrder {
  id: string;
  jointCode: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  partsRequired: string[];
}

export const MaintenanceCenterPage: React.FC<MaintenanceCenterPageProps> = ({ state: _state }) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    {
      id: 'WO-2026-0881',
      jointCode: 'J02',
      priority: 'CRITICAL',
      title: 'Emergency Hot Vulcanized Re-splice & Cord Re-bonding',
      description: 'YOLOv8 detected splice lift and cord separation corroborated by TF-Luna LiDAR step elevation (4.82mm).',
      assignedTo: 'Rajesh Kumar (Senior Splice Specialist)',
      dueDate: 'Today (Next 4h Shift Window)',
      status: 'IN_PROGRESS',
      partsRequired: ['Finger Splice Kit ST-3150', 'Cold Vulcanizing Cement (TipTop SC 4000)', 'Reinforcement Cord Patch'],
    },
    {
      id: 'WO-2026-0879',
      jointCode: 'J01',
      priority: 'LOW',
      title: 'Routine 250h Splice Surface Audit & Laser Calibration',
      description: 'Periodic preventive inspection of vulcanized splice margins and encoder odometry check.',
      assignedTo: 'Vikram Singh (Field Technician)',
      dueDate: 'In 3 Days',
      status: 'PENDING',
      partsRequired: ['Surface Cleaning Solvent', 'Inspection Gauge 0-10mm'],
    },
    {
      id: 'WO-2026-0874',
      jointCode: 'J03',
      priority: 'MEDIUM',
      title: 'Edge Skirt Rubber Adjustment & Tension Inspection',
      description: 'Load cell reported slight 1.2% tension asymmetry at tail take-up sliding carriage.',
      assignedTo: 'Ananya Sharma (Mechanical Lead)',
      dueDate: 'Tomorrow',
      status: 'COMPLETED',
      partsRequired: ['Polyurethane Skirtboard Strip 1.8m'],
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newJoint, setNewJoint] = useState('J02');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  const handleCreateWO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newWO: WorkOrder = {
      id: `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      jointCode: newJoint,
      priority: newPriority,
      title: newTitle,
      description: 'Auto-generated work order from active sensor telemetry and joint anomaly diagnostics.',
      assignedTo: 'Unassigned (Dispatch Queue)',
      dueDate: 'Scheduled Window',
      status: 'PENDING',
      partsRequired: ['Standard Splice Kit'],
    };

    setWorkOrders([newWO, ...workOrders]);
    setShowCreateModal(false);
    setNewTitle('');
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['WorkOrderID,JointCode,Priority,Title,AssignedTo,DueDate,Status']
        .concat(
          workOrders.map(
            (w) =>
              `"${w.id}","${w.jointCode}","${w.priority}","${w.title}","${w.assignedTo}","${w.dueDate}","${w.status}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BeltScanX_WorkOrders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-control-bg text-control-text min-h-[calc(100vh-8.5rem)] select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-control-border">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Maintenance Center & Work Orders (CMMS)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/70 text-amber-300 border border-amber-500/40">
              {workOrders.length} Total Orders
            </span>
          </div>
          <p className="text-xs text-control-dim mt-0.5">
            Auto-drafted repair orders from multi-sensor alerts, planned shutdown scheduling, and SAP PM / Maximo export.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-control-subpanel hover:bg-slate-800 text-slate-200 border border-control-border transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV / CMMS</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Draft Work Order</span>
          </button>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3">
        {workOrders.map((wo) => {
          const priorityColor =
            wo.priority === 'CRITICAL'
              ? 'text-red-400 bg-red-950/60 border-red-500/50'
              : wo.priority === 'HIGH'
              ? 'text-amber-400 bg-amber-950/60 border-amber-500/50'
              : 'text-sky-400 bg-sky-950/60 border-sky-500/50';

          return (
            <div
              key={wo.id}
              className="bg-control-panel border border-control-border rounded-lg p-4 space-y-3 shadow-sm hover:border-slate-500 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-control-border/60 pb-2.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {wo.id}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    Joint {wo.jointCode}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${priorityColor}`}>
                    {wo.priority}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      wo.status === 'COMPLETED'
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                        : wo.status === 'IN_PROGRESS'
                        ? 'bg-amber-950/70 text-amber-400 border border-amber-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {wo.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">{wo.title}</h3>
                <p className="text-xs text-control-dim mt-1 leading-relaxed font-sans">{wo.description}</p>
              </div>

              {/* Parts & Assignment Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-control-border/40 text-xs font-mono text-control-dim">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assignee: <strong className="text-slate-200">{wo.assignedTo}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due: <strong className="text-slate-200">{wo.dueDate}</strong></span>
                </div>
              </div>

              {/* Parts Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-control-dim font-mono">Required Spares:</span>
                {wo.partsRequired.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Draft Work Order */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWO}
            className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                Draft Maintenance Work Order
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Splice Joint</label>
                <select
                  value={newJoint}
                  onChange={(e) => setNewJoint(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                >
                  <option value="J01">Joint J01 (Tail)</option>
                  <option value="J02">Joint J02 (Focus - Degrading)</option>
                  <option value="J03">Joint J03 (Head)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                >
                  <option value="CRITICAL">CRITICAL (Immediate)</option>
                  <option value="HIGH">HIGH (Next Window)</option>
                  <option value="MEDIUM">MEDIUM (Scheduled)</option>
                  <option value="LOW">LOW (Routine)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Work Order Title / Scope</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Splice Re-bonding & Hot Vulcanization"
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded text-xs bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Submit Work Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
