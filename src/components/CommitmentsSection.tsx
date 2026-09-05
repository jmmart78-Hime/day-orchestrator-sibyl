import React from 'react';
import { Target, CheckCircle2, User, UserX, Calendar, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { CapturedCommitment } from '../types';

interface CommitmentsSectionProps {
  commitments: CapturedCommitment[];
}

export const CommitmentsSection: React.FC<CommitmentsSectionProps> = ({ commitments }) => {
  if (commitments.length === 0) return null;

  const jenniferItems = commitments.filter((c) => c.isUser);
  const otherItems = commitments.filter((c) => !c.isUser);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs mt-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Commitments Captured from 1:00 PM Meeting
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                {commitments.length} Identified
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Autonomous reasoning parses ownership: user tasks auto-scheduled, colleague tasks monitored.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Commitments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Jennifer's Action Items (User tasks - Auto scheduled) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Jennifer’s Commitments (Auto-Scheduled)
            </span>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Private Calendar Synced
            </span>
          </div>

          {jenniferItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="text-xs font-bold text-slate-900 leading-snug">
                  {item.task}
                </h5>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                  {item.due}
                </span>
              </div>

              <div className="text-[11px] text-emerald-900 flex items-center gap-1.5 pt-1 border-t border-emerald-100">
                <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="font-semibold">{item.actionTaken}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Colleague Tasks (Rob Miller - Monitored, NOT scheduled) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-slate-400" />
              Colleague Commitments (Monitored Only)
            </span>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Not on Your Calendar
            </span>
          </div>

          {otherItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                    Owner: {item.owner}
                  </span>
                  <h5 className="text-xs font-semibold text-slate-800 leading-snug">
                    {item.task}
                  </h5>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                  {item.due}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-200/80">
                <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{item.actionTaken}</span>
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-500 bg-slate-50">
            <span className="font-semibold text-slate-700">Governance Guard: </span>
            The autonomous engine differentiates personal vs. external commitments to prevent calendar bloat.
          </div>
        </div>

      </div>

    </div>
  );
};
