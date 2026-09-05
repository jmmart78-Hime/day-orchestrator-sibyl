import React from 'react';
import { Calendar, Users, MapPin, CheckCircle, Sparkles, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import { TimelineEvent, PrepItem } from '../types';

interface NextEventCardProps {
  nextEvent: TimelineEvent | null;
  prepItems: PrepItem[];
  onScrollToPrep: () => void;
  emailSimulated: boolean;
  isRealCalendar?: boolean;
}

export const NextEventCard: React.FC<NextEventCardProps> = ({
  nextEvent,
  prepItems,
  onScrollToPrep,
  emailSimulated,
  isRealCalendar,
}) => {
  if (!nextEvent) {
    if (isRealCalendar) {
      return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-700/60 relative overflow-hidden mb-6">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Google Calendar Live (Read-Only)
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-sans mt-1">
                Your Google Calendar is connected. No events are scheduled today.
              </h2>
              <p className="text-xs text-slate-300">
                Your primary schedule is open. You can test autonomous replanning on the sample Leadership Meeting in the Demo Sandbox below.
              </p>
            </div>
            <div className="bg-slate-800/90 rounded-xl px-4 py-3 border border-slate-700/80 shrink-0 text-xs text-slate-300">
              <span className="text-emerald-400 font-bold block mb-0.5">Autonomous Agent Active</span>
              <span className="text-[11px] text-slate-400">Monitoring Google Calendar for schedule changes</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const readyCount = prepItems.filter((p) => p.eventId === nextEvent.id).length;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-700/60 relative overflow-hidden mb-6">
      {/* Subtle background glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
        
        {/* Left: Next Event Identity */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Next Upcoming Event
            </span>
            <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Starts in 25 mins • {nextEvent.startTime} – {nextEvent.endTime}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            {nextEvent.title}
          </h2>

          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{nextEvent.location}</span>
            </div>
            {nextEvent.attendees && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{nextEvent.attendees.length} Attendees ({nextEvent.attendees.slice(0, 2).join(', ')}...)</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Preparation Readiness Status */}
        <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700/80 shrink-0 md:min-w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">AI Readiness Status</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              {emailSimulated ? '6/6 Prep Items (Expanded)' : '100% Prepared'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Completed Briefings:</span>
              <span className="font-mono font-bold text-slate-200">{readyCount} documents & briefs ready</span>
            </div>
            {emailSimulated && (
              <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1 bg-emerald-950/50 p-1.5 rounded border border-emerald-800/50">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Auto-added: Escalation trend & drivers analysis</span>
              </div>
            )}
          </div>

          <button
            onClick={onScrollToPrep}
            className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <span>Review Meeting Preparation</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
