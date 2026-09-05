import React from 'react';
import { LogOut, CheckCircle2, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleSignInButtonProps {
  user: User | null;
  isLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  calendarEventCount?: number;
  gmailCount?: number;
  isRealConnected: boolean;
  error?: string | null;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  user,
  isLoading,
  onSignIn,
  onSignOut,
  calendarEventCount,
  gmailCount,
  isRealConnected,
  error,
}) => {
  if (user && isRealConnected) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
        <div className="flex items-center gap-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-6 h-6 rounded-full border border-emerald-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1 leading-tight">
              <span>{user.displayName || user.email?.split('@')[0]}</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-semibold">
                Google Workspace
              </span>
            </div>
            <div className="text-[10px] text-emerald-700 font-mono">
              {calendarEventCount !== undefined ? `${calendarEventCount} events` : 'Calendar'} • {gmailCount !== undefined ? `${gmailCount} emails` : 'Gmail'} (Read-only)
            </div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="ml-1 p-1 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60 transition-colors"
          title="Switch back to Demo Mode"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <button
          disabled
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-medium shadow-2xs"
        >
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Connecting Workspace...</span>
        </button>
      ) : (
        <button
          id="btn-google-workspace-signin"
          onClick={onSignIn}
          className="gsi-material-button inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-98"
          title="Sign in with Google to read your Calendar & Gmail inbox in read-only mode"
        >
          <div className="gsi-material-button-icon w-4 h-4 shrink-0 flex items-center justify-center">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-4 h-4 block"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </div>
          <span className="gsi-material-button-contents font-sans">
            Connect Google Workspace
          </span>
        </button>
      )}


      {error && (
        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate max-w-[150px]">{error}</span>
        </span>
      )}
    </div>
  );
};
