import React from 'react';
import { Clock, Calendar, Users, MapPin, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Lock, Unlock, CalendarCheck, RefreshCw } from 'lucide-react';
import { TimelineEvent } from '../types';

interface TimelineViewProps {
  events: TimelineEvent[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  emailSimulated: boolean;
  onOpenGovernance: () => void;
  isRealCalendar?: boolean;
  onRefreshCalendar?: () => void;
  userTimezone?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  emailSimulated,
  onOpenGovernance,
  isRealCalendar,
  onRefreshCalendar,
  userTimezone,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs relative">
      
      {/* Header bar of Timeline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 font-sans">
              {isRealCalendar ? 'Google Calendar Schedule (Today)' : 'Today’s Timeline'}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-mono font-medium rounded-full border ${
              isRealCalendar
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {events.length} {events.length === 1 ? 'Block' : 'Blocks'}
            </span>
            {userTimezone && (
              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={`All times converted to ${userTimezone}`}>
                {userTimezone.split('/')[1]?.replace(/_/g, ' ') || userTimezone}
              </span>
            )}
            {isRealCalendar && (
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded font-semibold">
                Live Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRealCalendar
              ? `Real-time schedule synchronized from primary Google Calendar. Normalized to ${userTimezone || 'local time'}.`
              : 'Autonomous agent monitors calendar conflicts, dynamic prep windows, and flexible buffers.'}
          </p>
        </div>

        {/* Legend & Refresh */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-300"></span>
            <span>Fixed Meeting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-300"></span>
            <span>Flexible Work (Green)</span>
          </div>
          {isRealCalendar && onRefreshCalendar && (
            <button
              onClick={onRefreshCalendar}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh Google Calendar events"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {emailSimulated && (
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 animate-pulse"></span>
              <span>Autonomous Shift</span>
            </div>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            Your Google Calendar is connected. No events are scheduled today.
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            There are no calendar events on your primary Google Calendar for today. You can test autonomous schedule replanning and transcript synthesis in the Demo Sandbox below.
          </p>
        </div>
      ) : (
        /* Vertical Timeline Container */
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          
          {/* Real-time indicator */}
          <div className="relative flex items-center gap-2 py-1 my-1 -ml-6 sm:-ml-8 pl-1">
            <div className="w-6 sm:w-8 flex justify-center z-10">
              <div className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100 animate-pulse"></div>
            </div>
            <div className="flex-1 flex items-center gap-2 border-t border-rose-400/60 border-dashed pr-2">
              <span className="text-[11px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shadow-2xs">
                NOW
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Autonomous Day Orchestrator actively monitoring schedule
              </span>
            </div>
          </div>

          {events.map((event) => {
            const isSelected = selectedEventId === event.id;
            const isCompleted = event.status === 'completed';
            const isLeadership = event.id === 'evt-3';
            const isResearch = event.id === 'evt-4';

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className={`group relative rounded-xl p-4 transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-slate-900 border-slate-900 shadow-sm bg-slate-50/70'
                    : event.isRecentlyModified
                    ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400 shadow-2xs'
                    : isCompleted
                    ? 'border-slate-200/80 bg-slate-50/50 hover:bg-white text-slate-500'
                    : isLeadership
                    ? 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-300 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Left Timeline Node */}
                <div className="absolute -left-6 sm:-left-8 top-5 w-4 sm:w-5 flex justify-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'bg-slate-300 border-slate-400'
                        : isLeadership
                        ? 'bg-indigo-600 border-indigo-200 ring-2 ring-indigo-100'
                        : event.isRecentlyModified
                        ? 'bg-emerald-500 border-emerald-200 ring-2 ring-emerald-100'
                        : 'bg-white border-slate-400'
                    }`}
                  />
                </div>

                {/* Event Content Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {event.startTime} – {event.endTime}
                      </span>

                      {/* Status badge */}
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          Completed
                        </span>
                      ) : event.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          In Progress
                        </span>
                      ) : isLeadership ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200/60">
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          Next Up • 100% Prepared
                        </span>
                      ) : null}

                      {/* Flexibility & Policy Badge */}
                      {event.isFlexible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          Flexible Work (Green)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Fixed Meeting
                        </span>
                      )}

                      {/* Preserved Original Timezone Badge */}
                      {event.originalTimeZone && event.originalTimeZone !== userTimezone && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                          title={`Scheduled in ${event.originalTimeZone} • Accurately converted to planning timezone`}
                        >
                          <span>Origin: {event.originalTimeZone.split('/')[1]?.replace(/_/g, ' ') || event.originalTimeZone}</span>
                        </span>
                      )}

                      {event.modificationBadge && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 animate-pulse">
                          {event.modificationBadge}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-base font-semibold ${isCompleted ? 'text-slate-600 line-through decoration-slate-300' : 'text-slate-900'}`}>
                      {event.title}
                    </h4>

                    {event.notes && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {event.notes}
                      </p>
                    )}
                  </div>

                  {/* Right side metadata */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1 text-right text-xs text-slate-500 shrink-0">
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[140px]">{event.location}</span>
                      </div>
                    )}
                    {event.attendees && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.attendees.length} {event.attendees.length === 1 ? 'person' : 'people'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Context pill for Leadership Meeting */}
                {isLeadership && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-100/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {emailSimulated
                          ? 'AI Briefing updated with Escalation Driver analysis (+10m prep synced)'
                          : 'AI Briefing ready: Agenda, Emails, VOC, 3 Questions, Commitments'}
                      </span>
                    </div>
                    <span className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] flex items-center gap-0.5">
                      View brief <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                )}

                {/* Research Block Shift Explanation if modified */}
                {isResearch && emailSimulated && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800 bg-emerald-100/40 -mx-4 -mb-4 p-3 rounded-b-xl">
                    <span className="font-medium">
                      ⚡ Autonomously shifted +10 min to accommodate pre-meeting context synthesis.
                    </span>
                    <span className="text-[11px] font-mono font-semibold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded">
                      Green Tier (No approval needed)
                    </span>
                  </div>
                )}

              </div>
            );
          })}

        </div>
      )}
    </div>
  );
};

