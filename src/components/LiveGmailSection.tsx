import React from 'react';
import { Mail, RefreshCw, Loader2, Sparkles, Inbox, Lock, Clock, Calendar, AlertCircle, Info, Zap } from 'lucide-react';
import { GmailInboxMessage, GmailClassificationCategory } from '../types';

interface LiveGmailSectionProps {
  messages: GmailInboxMessage[];
  isLoading: boolean;
  onRefresh: () => void;
  error?: string | null;
  userEmail?: string | null;
}

// Badge styling helper according to executive classification tier
function renderClassificationBadge(category?: GmailClassificationCategory) {
  switch (category) {
    case 'ACTION NEEDED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wide bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
          <Zap className="w-3 h-3 text-amber-600 shrink-0" />
          ACTION NEEDED
        </span>
      );
    case 'SCHEDULE IMPACT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wide bg-indigo-50 text-indigo-900 border border-indigo-300 shadow-2xs">
          <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
          SCHEDULE IMPACT
        </span>
      );
    case 'IMPORTANT FYI':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wide bg-sky-50 text-sky-900 border border-sky-300 shadow-2xs">
          <Info className="w-3 h-3 text-sky-600 shrink-0" />
          IMPORTANT FYI
        </span>
      );
    case 'LOW PRIORITY':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
          LOW PRIORITY
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
          <Info className="w-3 h-3 text-slate-500 shrink-0" />
          INBOX ITEM
        </span>
      );
  }
}

export const LiveGmailSection: React.FC<LiveGmailSectionProps> = ({
  messages,
  isLoading,
  onRefresh,
  error,
  userEmail,
}) => {
  return (
    <div id="live-gmail-section" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs relative">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              Live Gmail
            </h3>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              {messages.length} Messages
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-semibold">
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              Read-Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {userEmail ? (
              <>
                Connected inbox for <span className="font-semibold text-slate-700">{userEmail}</span>. Real-time Gemini classification &amp; contextual impact assessment.
              </>
            ) : (
              '10 most recent inbox items classified with Gemini intelligence.'
            )}
          </p>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-gmail"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh and re-classify latest 10 Gmail inbox messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-600' : 'text-slate-500'}`} />
            <span>{isLoading ? 'Classifying with Gemini...' : 'Refresh Inbox'}</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading && messages.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-medium">Fetching and classifying 10 most recent inbox messages with Gemini...</p>
        </div>
      ) : error ? (
        <div className="py-8 px-4 text-center rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <p className="text-xs font-semibold">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-xs font-bold text-amber-900 underline hover:no-underline"
          >
            Try reloading messages
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="py-10 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
            <Inbox className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-700">No Recent Inbox Messages</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Your primary inbox is currently clear.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="py-3.5 px-2 sm:px-3 hover:bg-slate-50/80 rounded-xl transition-colors group"
            >
              {/* Header Row: Sender, Date, and Category Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {msg.unread && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                  )}
                  <span className={`text-xs font-bold ${msg.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                    {msg.sender}
                  </span>
                  {msg.senderEmail && (
                    <span className="text-[11px] font-mono text-slate-400 hidden md:inline truncate max-w-[200px]">
                      &lt;{msg.senderEmail}&gt;
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Category Badge */}
                  {renderClassificationBadge(msg.classification)}

                  <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{msg.receivedTime}</span>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <span className="truncate">{msg.subject}</span>
              </div>

              {/* One-Sentence Summary */}
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {msg.summary}
              </p>

              {/* Why This Matters */}
              {msg.whyThisMatters && (
                <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-[11.5px] leading-snug">
                    <span className="font-semibold text-slate-900">Why this matters: </span>
                    <span className="text-slate-700">{msg.whyThisMatters}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Safety Notice Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" />
          Strict Read-Only Mode: Day Orchestrator cannot send, draft, modify, label, or delete emails.
        </span>
        <span className="font-mono text-[10px] text-slate-400">Gemini 3.7 Flash Intelligence</span>
      </div>
    </div>
  );
};
