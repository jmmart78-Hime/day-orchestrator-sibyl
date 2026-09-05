import React from 'react';
import { ShieldCheck, Sparkles, Clock, Calendar, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { LoopPhase, PermissionLevel } from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';
import { TimezoneBadge } from './TimezoneBadge';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentPhase: LoopPhase;
  onOpenGovernance: () => void;
  notificationCount: number;
  user: User | null;
  isRealCalendar: boolean;
  isLoadingAuth: boolean;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  calendarEventCount?: number;
  gmailCount?: number;
  calendarError?: string | null;
  userTimezone: string;
  timezoneSource: 'calendar' | 'browser' | 'manual';
  onSelectTimezone: (tz: string, source: 'manual') => void;
  onResetTimezoneToAuto: () => void;
  isCloudMemoryConnected?: boolean;
  memoryRestoredSource?: 'Firestore' | 'Local Cache' | null;
  lastSaveStatus?: string | null;
}

const PHASES: LoopPhase[] = ['PLAN', 'PREPARE', 'WATCH', 'ACT', 'CAPTURE', 'REPLAN'];

export const Header: React.FC<HeaderProps> = ({
  currentPhase,
  onOpenGovernance,
  notificationCount,
  user,
  isRealCalendar,
  isLoadingAuth,
  onSignInGoogle,
  onSignOutGoogle,
  calendarEventCount,
  gmailCount,
  calendarError,
  userTimezone,
  timezoneSource,
  onSelectTimezone,
  onResetTimezoneToAuto,
  isCloudMemoryConnected,
  memoryRestoredSource,
  lastSaveStatus,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & User Identification */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                  Day Orchestrator
                </h1>
                {isRealCalendar ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Workspace Connected (Read-Only)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Demo Mode • Sample Day
                  </span>
                )}
                
                {/* Temporary Developer/Debug Memory Restoration Indicator */}
                {memoryRestoredSource ? (
                  <span
                    id="badge-memory-restoration-debug"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border transition-all ${
                      memoryRestoredSource === 'Firestore'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                    title={
                      memoryRestoredSource === 'Firestore'
                        ? 'State restored directly from Google Cloud Firestore database'
                        : 'State restored from browser local storage backup'
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        memoryRestoredSource === 'Firestore'
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-amber-500'
                      }`}
                    ></span>
                    Memory restored from: {memoryRestoredSource}
                  </span>
                ) : (
                  isCloudMemoryConnected && (
                    <span
                      id="badge-cloud-memory"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-50 text-sky-800 border border-sky-200"
                      title="User profile, day plan, commitments, approvals, and logs are persisted securely in Google Cloud Firestore"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                      Cloud Memory: Connected
                    </span>
                  )
                )}

                {/* Firestore Save Verification Badge */}
                {lastSaveStatus && (
                  <span
                    id="badge-firestore-saved"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 animate-in fade-in"
                    title="Google Cloud Firestore persistence verified"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {lastSaveStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isRealCalendar && user ? (
                  <>
                    <span className="text-slate-900 font-bold">{user.displayName || user.email}</span>{' '}
                    <span className="text-slate-300">•</span>{' '}
                    <span className="text-emerald-700 font-semibold">Calendar & Gmail synchronized</span>
                  </>
                ) : (
                  <>
                    Jennifer Morales <span className="text-slate-300">•</span> VP Product Operations <span className="text-slate-300">•</span> <span className="text-slate-700 font-semibold">Ready to orchestrate</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Center / Right: Calendar Auth, Timezone Badge, Loop Status & Governance Trigger */}
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            
            {/* Active Timezone Badge */}
            <TimezoneBadge
              userTimezone={userTimezone}
              timezoneSource={timezoneSource}
              onSelectTimezone={onSelectTimezone}
              onResetToAuto={onResetTimezoneToAuto}
              isRealCalendar={isRealCalendar}
            />

            {/* Google Calendar & Gmail Sign-in / Connected Badge */}
            <GoogleSignInButton
              user={user}
              isLoading={isLoadingAuth}
              onSignIn={onSignInGoogle}
              onSignOut={onSignOutGoogle}
              calendarEventCount={calendarEventCount}
              gmailCount={gmailCount}
              isRealConnected={isRealCalendar}
              error={calendarError}
            />

            {/* Autonomous Loop Visualizer */}
            <div className="hidden xl:flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2 font-mono">
                AI Loop
              </span>
              <div className="flex items-center space-x-1">
                {PHASES.map((phase, idx) => {
                  const isActive = currentPhase === phase;
                  return (
                    <React.Fragment key={phase}>
                      <span
                        className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded transition-all duration-300 ${
                          isActive
                            ? 'bg-slate-900 text-emerald-300 shadow-2xs scale-105'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {phase}
                      </span>
                      {idx < PHASES.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Safety Policy Trigger */}
            <div className="flex items-center gap-2">
              <button
                id="btn-governance-policy"
                onClick={onOpenGovernance}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="View Safety & Permission Boundaries (Green / Yellow / Red)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Safety Policies</span>
                <span className="flex items-center gap-0.5 ml-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Green: Safe Auto-actions"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="Yellow: Requires Approval"></span>
                  <span className="w-2 h-2 rounded-full bg-rose-500" title="Red: Strict Explicit Guard"></span>
                </span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};


