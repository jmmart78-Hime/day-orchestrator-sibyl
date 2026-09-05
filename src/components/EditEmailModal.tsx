import React, { useState } from 'react';
import { X, Send, Save, Mail, AlertTriangle } from 'lucide-react';
import { ApprovalAction } from '../types';

interface EditEmailModalProps {
  action: ApprovalAction | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAndSend: (id: string, updatedFields: Partial<ApprovalAction>) => void;
  onSaveDraft: (id: string, updatedFields: Partial<ApprovalAction>) => void;
}

export const EditEmailModal: React.FC<EditEmailModalProps> = ({
  action,
  isOpen,
  onClose,
  onSaveAndSend,
  onSaveDraft,
}) => {
  if (!isOpen || !action) return null;

  const [subject, setSubject] = useState(action.subject);
  const [body, setBody] = useState(action.body);
  const [recipient, setRecipient] = useState(action.recipient);
  const [recipientEmail, setRecipientEmail] = useState(action.recipientEmail);

  const handleSend = () => {
    onSaveAndSend(action.id, { subject, body, recipient, recipientEmail });
    onClose();
  };

  const handleSaveOnly = () => {
    onSaveDraft(action.id, { subject, body, recipient, recipientEmail });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Edit Follow-up Email Draft
              </h3>
              <p className="text-xs text-slate-500">
                Modify content before granting Yellow-tier execution approval.
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

        {/* Edit Form */}
        <div className="space-y-4 my-5 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Body</label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 leading-relaxed font-sans"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Yellow Tier: Granting approval will dispatch this email immediately in this prototype session.</span>
          </div>

        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveOnly}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft Only
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Approve & Send Email
          </button>
        </div>

      </div>
    </div>
  );
};
