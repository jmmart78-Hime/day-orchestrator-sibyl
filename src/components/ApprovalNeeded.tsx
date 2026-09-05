import React from 'react';
import { AlertTriangle, Send, Edit3, XCircle, CheckCircle2, ShieldAlert, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { ApprovalAction } from '../types';

interface ApprovalNeededProps {
  approvals: ApprovalAction[];
  onSend: (id: string) => void;
  onEdit: (action: ApprovalAction) => void;
  onDismiss: (id: string) => void;
  onOpenGovernance: () => void;
}

export const ApprovalNeeded: React.FC<ApprovalNeededProps> = ({
  approvals,
  onSend,
  onEdit,
  onDismiss,
  onOpenGovernance,
}) => {
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            pendingApprovals.length > 0
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Approval Needed
              </h3>
              {pendingApprovals.length > 0 ? (
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  {pendingApprovals.length} Action Pending
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-100 text-slate-500">
                  0 Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Actions the AI has prepared but is restricted from executing autonomously.
            </p>
          </div>
        </div>

        {/* Safety Level Badge */}
        <button
          onClick={onOpenGovernance}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>YELLOW TIER</span>
          <span className="text-amber-700/70">• Outbound Actions Guarded</span>
        </button>
      </div>

      {/* Empty State */}
      {approvals.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500 bg-slate-50/50">
          <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-400 stroke-1" />
          <p className="text-xs font-semibold text-slate-700">
            No Outbound Actions Pending Approval
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
            The autonomous system is currently performing only Green-tier internal context gathering and private calendar adjustments. When a meeting transcript requires sending emails or contacting others, drafts will appear here.
          </p>
        </div>
      )}

      {/* Approval Cards List */}
      <div className="space-y-4">
        {approvals.map((action) => {
          const isPending = action.status === 'pending';
          const isSent = action.status === 'approved_sent';
          const isDismissed = action.status === 'dismissed';

          return (
            <div
              key={action.id}
              className={`rounded-xl border transition-all ${
                isPending
                  ? 'border-amber-300 bg-amber-50/30 shadow-xs ring-1 ring-amber-200/60'
                  : isSent
                  ? 'border-emerald-200 bg-emerald-50/40 text-slate-600'
                  : 'border-slate-200 bg-slate-50/60 opacity-60'
              } p-4 sm:p-5`}
            >
              {/* Card Status & Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Mail className={`w-4 h-4 ${isPending ? 'text-amber-600' : isSent ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800 font-sans">
                    Email Draft: Follow-up to {action.recipient}
                  </span>
                  {action.recipientRole && (
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      ({action.recipientRole})
                    </span>
                  )}
                </div>

                <div>
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      Awaiting Your Approval
                    </span>
                  )}
                  {isSent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Approved and Sent ({action.resolvedAt || 'Just now'})
                    </span>
                  )}
                  {isDismissed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-600">
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      Dismissed
                    </span>
                  )}
                </div>
              </div>

              {/* Rationale explanation */}
              <div className="mb-3 p-2.5 rounded-lg bg-amber-100/50 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Governance Reason: </span>
                  {action.rationale}
                </div>
              </div>

              {/* Email Preview Box */}
              <div className="bg-white rounded-lg p-3.5 border border-slate-200 space-y-2 text-xs font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 text-[11px] text-slate-500 pb-2 border-b border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-700">To: </span>
                    {action.recipient} &lt;{action.recipientEmail}&gt;
                  </div>
                  <div className="sm:col-span-3">
                    <span className="font-semibold text-slate-700">Subject: </span>
                    <span className="text-slate-900 font-medium">{action.subject}</span>
                  </div>
                </div>

                <div className="whitespace-pre-line text-slate-700 font-sans leading-relaxed pt-1 max-h-48 overflow-y-auto pr-1">
                  {action.body}
                </div>
              </div>

              {/* Action Buttons */}
              {isPending && (
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    id={`btn-dismiss-${action.id}`}
                    onClick={() => onDismiss(action.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>DISMISS</span>
                  </button>

                  <button
                    id={`btn-edit-${action.id}`}
                    onClick={() => onEdit(action)}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>EDIT</span>
                  </button>

                  <button
                    id={`btn-send-${action.id}`}
                    onClick={() => onSend(action.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>SEND (APPROVE ACTION)</span>
                  </button>
                </div>
              )}

              {/* Sent Confirmation details */}
              {isSent && (
                <div className="mt-3 text-xs text-emerald-800 flex items-center gap-2 bg-emerald-100/50 p-2.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Sent to April Lindqvist &lt;april.lindqvist@acme-corp.internal&gt;. Logged to autonomous execution audit stream.
                  </span>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
