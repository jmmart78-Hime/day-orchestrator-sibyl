/**
 * Robust Timezone Management Module for Day Orchestrator
 *
 * Requirements:
 * 1. Detect IANA timezone from Google Calendar primary settings or browser.
 * 2. Store timezone in user profile/state & persist in localStorage.
 * 3. Consistent formatting across all displayed times, deadlines, prep items, and logs.
 * 4. Never infer timezone from email text.
 * 5. Preserve event-specific timezones when they differ from user's planning timezone.
 * 6. Convert cross-timezone events accurately into user's current planning timezone.
 * 7. Recalculate schedule timings when user's timezone changes.
 * 8. Provide subtle, verifiable UI indicators for the active timezone.
 */

import { TimelineEvent, PrepItem, ActivityLogEntry, CapturedCommitment } from '../types';

export const STORAGE_KEY_TIMEZONE = 'day_orchestrator_planning_tz';
export const STORAGE_KEY_TZ_SOURCE = 'day_orchestrator_tz_source';

export interface TimezoneInfo {
  iana: string;
  abbreviation: string;
  offsetFormatted: string; // e.g. "UTC-07:00"
  offsetMinutes: number;
  displayName: string;
  city: string;
  currentTimeFormatted: string;
}

export interface SupportedTimezoneOption {
  iana: string;
  label: string;
  region: string;
}

export const COMMON_TIMEZONES: SupportedTimezoneOption[] = [
  { iana: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', region: 'North America' },
  { iana: 'America/Denver', label: 'Mountain Time (US & Canada)', region: 'North America' },
  { iana: 'America/Chicago', label: 'Central Time (US & Canada)', region: 'North America' },
  { iana: 'America/New_York', label: 'Eastern Time (US & Canada)', region: 'North America' },
  { iana: 'America/Sao_Paulo', label: 'Brasilia Time (São Paulo)', region: 'South America' },
  { iana: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Universal' },
  { iana: 'Europe/London', label: 'Greenwich Mean Time / BST (London)', region: 'Europe' },
  { iana: 'Europe/Paris', label: 'Central European Time (Paris, Berlin)', region: 'Europe' },
  { iana: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', region: 'Middle East' },
  { iana: 'Asia/Kolkata', label: 'India Standard Time (IST)', region: 'Asia' },
  { iana: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', region: 'Asia' },
  { iana: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo, JST)', region: 'Asia' },
  { iana: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Australia/Pacific' },
  { iana: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)', region: 'Australia/Pacific' },
];

/**
 * Detect browser's IANA timezone safely
 */
export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string' && tz.trim().length > 0) {
      return tz;
    }
  } catch (e) {
    console.warn('Could not detect browser timezone:', e);
  }
  return 'America/Los_Angeles';
}

/**
 * Fetch primary Google Calendar timezone via Google Calendar API
 */
export async function fetchGoogleCalendarTimezone(accessToken: string): Promise<string | null> {
  try {
    // Attempt 1: Fetch user's primary timezone setting
    const settingsUrl = 'https://www.googleapis.com/calendar/v3/users/me/settings/timezone';
    const settingsRes = await fetch(settingsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      if (data?.value && typeof data.value === 'string') {
        return data.value;
      }
    }

    // Attempt 2: Fetch primary calendar metadata
    const calUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary';
    const calRes = await fetch(calUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (calRes.ok) {
      const data = await calRes.json();
      if (data?.timeZone && typeof data.timeZone === 'string') {
        return data.timeZone;
      }
    }
  } catch (err) {
    console.warn('Could not fetch Google Calendar timezone:', err);
  }
  return null;
}

/**
 * Get initial stored or detected timezone
 */
export function getInitialPlanningTimezone(): { timeZone: string; source: 'calendar' | 'browser' | 'manual' } {
  try {
    const storedTz = localStorage.getItem(STORAGE_KEY_TIMEZONE);
    const storedSource = localStorage.getItem(STORAGE_KEY_TZ_SOURCE) as 'calendar' | 'browser' | 'manual' | null;

    if (storedTz && isValidIanaTimezone(storedTz)) {
      return { timeZone: storedTz, source: storedSource || 'manual' };
    }
  } catch {
    // Ignore storage issues
  }

  return { timeZone: detectBrowserTimezone(), source: 'browser' };
}

/**
 * Save planning timezone in localStorage
 */
export function persistPlanningTimezone(timeZone: string, source: 'calendar' | 'browser' | 'manual'): void {
  try {
    localStorage.setItem(STORAGE_KEY_TIMEZONE, timeZone);
    localStorage.setItem(STORAGE_KEY_TZ_SOURCE, source);
  } catch {
    // Ignore
  }
}

/**
 * Validate IANA timezone string
 */
export function isValidIanaTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a Date object into "9:00 AM" in specified timezone
 */
export function formatTimeInTimezone(
  dateInput: Date | string | number,
  timeZone: string,
  options?: { includeSeconds?: boolean }
): string {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return '--:--';

    const validTz = isValidIanaTimezone(timeZone) ? timeZone : detectBrowserTimezone();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      hour: 'numeric',
      minute: '2-digit',
      second: options?.includeSeconds ? '2-digit' : undefined,
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    return '--:--';
  }
}

/**
 * Format date & time into "Aug 29, 9:00 AM" in specified timezone
 */
export function formatDateTimeInTimezone(
  dateInput: Date | string | number,
  timeZone: string
): string {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return 'Today';

    const validTz = isValidIanaTimezone(timeZone) ? timeZone : detectBrowserTimezone();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    return 'Today';
  }
}

/**
 * Calculate minutes from midnight (0:00) in the user's specific planning timezone
 */
export function getMinutesFromMidnightInTimezone(
  dateInput: Date | string | number,
  timeZone: string
): number {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return 0;

    const validTz = isValidIanaTimezone(timeZone) ? timeZone : detectBrowserTimezone();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date);

    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    return (hour % 24) * 60 + minute;
  } catch {
    return 0;
  }
}

/**
 * Extract comprehensive timezone details (Abbreviation, UTC Offset, City)
 */
export function getTimezoneInfo(timeZone: string, referenceDate: Date = new Date()): TimezoneInfo {
  const validTz = isValidIanaTimezone(timeZone) ? timeZone : detectBrowserTimezone();

  // Abbreviation (e.g. PDT, EST, GMT)
  let abbreviation = '';
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      timeZoneName: 'short',
    })
      .formatToParts(referenceDate)
      .find((p) => p.type === 'timeZoneName');
    abbreviation = part?.value || '';
  } catch {
    abbreviation = '';
  }

  // Calculate GMT / UTC Offset in minutes and string formatted
  let offsetFormatted = 'UTC';
  let offsetMinutes = 0;
  try {
    const tzDateStr = referenceDate.toLocaleString('en-US', { timeZone: validTz });
    const utcDateStr = referenceDate.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzDate = new Date(tzDateStr);
    const utcDate = new Date(utcDateStr);
    offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);

    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    offsetFormatted = `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  } catch {
    offsetFormatted = 'UTC';
  }

  // City display name from IANA ID
  const parts = validTz.split('/');
  const city = parts.length > 1 ? parts[parts.length - 1].replace(/_/g, ' ') : validTz;

  const currentTimeFormatted = formatTimeInTimezone(referenceDate, validTz);

  return {
    iana: validTz,
    abbreviation,
    offsetFormatted,
    offsetMinutes,
    displayName: `${city} (${abbreviation || offsetFormatted})`,
    city,
    currentTimeFormatted,
  };
}

/**
 * Parses time string like "9:00 AM" and updates it to target timezone if referenced against base date
 */
export function adjustSampleTimeToTimezone(
  timeStr: string,
  baseTimezone: string,
  targetTimezone: string
): string {
  if (baseTimezone === targetTimezone) return timeStr;

  try {
    // Parse "9:00 AM" into hours and minutes
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return timeStr;

    let hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    // Build ISO in base timezone
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = String(now.getMonth() + 1).padStart(2, '0');
    const todayD = String(now.getDate()).padStart(2, '0');
    const isoString = `${todayY}-${todayM}-${todayD}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

    // Convert using standard offset math
    const baseInfo = getTimezoneInfo(baseTimezone, now);
    const targetInfo = getTimezoneInfo(targetTimezone, now);
    const diffMinutes = targetInfo.offsetMinutes - baseInfo.offsetMinutes;

    const shiftedMinutes = (hour * 60 + min + diffMinutes + 1440) % 1440;
    const newHour24 = Math.floor(shiftedMinutes / 60);
    const newMin = shiftedMinutes % 60;

    const newAmpm = newHour24 >= 12 ? 'PM' : 'AM';
    const newHour12 = newHour24 % 12 === 0 ? 12 : newHour24 % 12;

    return `${newHour12}:${String(newMin).padStart(2, '0')} ${newAmpm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Re-computes TimelineEvents when user changes planning timezone
 */
export function recalculateEventsForPlanningTimezone(
  events: TimelineEvent[],
  previousTimezone: string,
  newTimezone: string
): TimelineEvent[] {
  if (previousTimezone === newTimezone) return events;

  return events.map((event) => {
    // If event has exact ISO timestamps (from real Google Calendar), format directly
    if (event.startIso && event.endIso) {
      const startDt = new Date(event.startIso);
      const endDt = new Date(event.endIso);
      const startTime = formatTimeInTimezone(startDt, newTimezone);
      const endTime = formatTimeInTimezone(endDt, newTimezone);
      const startMinutes = getMinutesFromMidnightInTimezone(startDt, newTimezone);

      return {
        ...event,
        startTime,
        endTime,
        startMinutes,
      };
    }

    // For sample/demo events, shift relative to previous timezone
    const startTime = adjustSampleTimeToTimezone(event.startTime, previousTimezone, newTimezone);
    const endTime = adjustSampleTimeToTimezone(event.endTime, previousTimezone, newTimezone);
    
    // Parse new startMinutes
    const match = startTime.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    let startMinutes = event.startMinutes;
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      startMinutes = (h % 24) * 60 + m;
    }

    return {
      ...event,
      startTime,
      endTime,
      startMinutes,
    };
  });
}
