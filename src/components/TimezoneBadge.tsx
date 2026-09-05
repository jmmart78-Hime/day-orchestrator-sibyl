import React, { useState, useRef, useEffect } from 'react';
import { Globe, Clock, Check, ChevronDown, RefreshCw, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import {
  getTimezoneInfo,
  COMMON_TIMEZONES,
  SupportedTimezoneOption,
} from '../lib/timezone';

interface TimezoneBadgeProps {
  userTimezone: string;
  timezoneSource: 'calendar' | 'browser' | 'manual';
  onSelectTimezone: (tz: string, source: 'manual') => void;
  onResetToAuto: () => void;
  isRealCalendar: boolean;
}

export const TimezoneBadge: React.FC<TimezoneBadgeProps> = ({
  userTimezone,
  timezoneSource,
  onSelectTimezone,
  onResetToAuto,
  isRealCalendar,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep live time current
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const tzInfo = getTimezoneInfo(userTimezone, now);

  const filteredOptions = COMMON_TIMEZONES.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.iana.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Subtle, verifiable timezone trigger */}
      <button
        id="btn-active-timezone"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 shadow-2xs'
        }`}
        title={`Active Planning Timezone: ${userTimezone} (${tzInfo.offsetFormatted}). Click to verify or adjust.`}
      >
        <Globe className={`w-3.5 h-3.5 ${isOpen ? 'text-emerald-400' : 'text-slate-500'}`} />
        <span className="font-semibold text-slate-900 max-w-[130px] sm:max-w-[170px] truncate" style={{ color: isOpen ? 'inherit' : undefined }}>
          {tzInfo.abbreviation || tzInfo.city}
        </span>
        <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
          isOpen ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-500'
        }`}>
          {tzInfo.offsetFormatted}
        </span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Popover Header */}
          <div className="p-4 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold font-sans">Active Planning Timezone</h4>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                {tzInfo.currentTimeFormatted}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1 font-mono">
              {userTimezone}
            </p>

            <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-800/80 rounded-lg p-2 border border-slate-700/60">
              <span className="text-slate-400">
                Source:{' '}
                <strong className="text-slate-200 font-sans">
                  {timezoneSource === 'calendar'
                    ? 'Google Calendar Settings'
                    : timezoneSource === 'browser'
                    ? 'Browser System Time'
                    : 'User Specified'}
                </strong>
              </span>
              <button
                onClick={() => {
                  onResetToAuto();
                }}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans cursor-pointer text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                Auto-detect
              </button>
            </div>
          </div>

          {/* Timezone Governance Guarantee */}
          <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100/80 text-[11px] text-indigo-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong className="font-semibold text-indigo-950">Deterministic Time Guarantee: </strong>
              Day Orchestrator never infers timezones from email text. Cross-timezone invites are converted to this planning timezone.
            </div>
          </div>

          {/* Search box */}
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search timezones (e.g., Tokyo, London, New York)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Timezone list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredOptions.map((opt) => {
              const isSelected = opt.iana === userTimezone;
              const optInfo = getTimezoneInfo(opt.iana, now);

              return (
                <button
                  key={opt.iana}
                  onClick={() => {
                    onSelectTimezone(opt.iana, 'manual');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {opt.iana}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[11px]">
                    <div className="text-slate-900 font-medium">{optInfo.currentTimeFormatted}</div>
                    <div className="text-[10px] text-slate-400">{optInfo.offsetFormatted}</div>
                  </div>
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No timezones match "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center font-mono">
            {isRealCalendar
              ? 'Synced with your Google Calendar read-only authorization'
              : 'Switching timezones shifts all timeline events & prep blocks seamlessly'}
          </div>

        </div>
      )}
    </div>
  );
};
