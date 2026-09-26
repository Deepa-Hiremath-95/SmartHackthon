import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { SectionId, SECTIONS } from '../components/layout/Sidebar';

interface ComingSoonPageProps {
  sectionId: SectionId;
  onReturnToOverview: () => void;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  sectionId,
  onReturnToOverview,
}) => {
  const section = SECTIONS.find((s) => s.id === sectionId);
  const title = section ? section.label : sectionId;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none space-y-4 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-slate-800 border border-control-border flex items-center justify-center text-amber-400">
        <Construction className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
          Scheduled for P1 Pilot Phase
        </span>
      </div>

      <p className="text-xs text-control-muted leading-relaxed">
        This module is scaffolded as part of the 12-section BeltScanX AI platform architecture. In this P0 release, the{' '}
        <strong className="text-slate-200">Overview</strong> command center is fully active with live WebSocket telemetry.
      </p>

      <button
        onClick={onReturnToOverview}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-control-subpanel hover:bg-slate-800 text-slate-200 rounded border border-control-border text-xs font-medium transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Overview</span>
      </button>
    </div>
  );
};
