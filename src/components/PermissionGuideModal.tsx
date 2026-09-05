import React from 'react';
import { X, ShieldCheck, ShieldAlert, ShieldX, Check, AlertTriangle, Lock } from 'lucide-react';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                Day Orchestrator Governance & Safety Policies
              </h3>
              <p className="text-xs text-slate-500">
                Deterministic permission boundaries governing all autonomous AI decisions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Permission Tiers */}
        <div className="space-y-4 my-5">
          
          {/* GREEN TIER */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                <h4 className="text-sm font-bold text-emerald-950 font-mono uppercase tracking-wider">
                  GREEN TIER — Safe Autonomous Execution
                </h4>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                No Approval Required
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              AI may perform safe private actions automatically, such as creating prep blocks, reorganizing flexible personal work, creating private reminders, gathering context, and synthesizing meeting briefings.
            </p>
            <div className="text-[11px] text-emerald-800/80 font-mono pt-1">
              Active in prototype: Automatic shift of Research Block & synthesis of escalation data.
            </div>
          </div>

          {/* YELLOW TIER */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100"></span>
                <h4 className="text-sm font-bold text-amber-950 font-mono uppercase tracking-wider">
                  YELLOW TIER — Staged Action Approval
                </h4>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Approval Needed
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              AI prepares the action in full detail but asks for explicit human approval before sending email, contacting another person, delegating tasks, or moving a meeting involving external attendees.
            </p>
            <div className="text-[11px] text-amber-800/80 font-mono pt-1">
              Active in prototype: Draft follow-up email to April requires SEND confirmation.
            </div>
          </div>

          {/* RED TIER */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100"></span>
                <h4 className="text-sm font-bold text-rose-950 font-mono uppercase tracking-wider">
                  RED TIER — Strict Explicit Lock
                </h4>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                Strict Guardrail
              </span>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">
              AI must always obtain multi-step explicit confirmation before spending money, sharing health/financial information, signing contracts, or cancelling critical commitments.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>

      </div>
    </div>
  );
};
