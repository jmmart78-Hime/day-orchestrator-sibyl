import { TimelineEvent } from '../types';
import {
  formatTimeInTimezone,
  getMinutesFromMidnightInTimezone,
  detectBrowserTimezone,
  isValidIanaTimezone,
} from '../lib/timezone';

export interface GoogleCalendarEventRaw {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; self?: boolean }>;
  hangoutLink?: string;
  conferenceData?: any;
  status?: string;
}

/**
 * Formats a Date object to "9:00 AM" / "1:30 PM" in user's planning timezone
 */
export function formatEventTime(date: Date, timeZone?: string): string {
  const targetTz = timeZone && isValidIanaTimezone(timeZone) ? timeZone : detectBrowserTimezone();
  return formatTimeInTimezone(date, targetTz);
}

/**
 * Fetch today's Google Calendar events for the primary calendar converted to planning timezone
 */
export async function fetchTodayGoogleCalendarEvents(
  accessToken: string,
  planningTimezone?: string
): Promise<TimelineEvent[]> {
  const targetTz = planningTimezone && isValidIanaTimezone(planningTimezone) ? planningTimezone : detectBrowserTimezone();
  const now = new Date();
  
  // Calculate start of today and end of today in the planning timezone
  // Use a +/- 36 hour UTC window to ensure no local-day events are clipped across GMT offset shifts
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const timeMin = windowStart.toISOString();
  const timeMax = windowEnd.toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');
  url.searchParams.append('maxResults', '100');
  if (targetTz) {
    url.searchParams.append('timeZone', targetTz);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawEvents: GoogleCalendarEventRaw[] = data.items || [];

  const currentTimeMs = now.getTime();

  // Determine today's date string in planning timezone (e.g. "2026-08-29")
  const todayYMDInPlanningTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: targetTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return rawEvents
    .filter((e) => e.status !== 'cancelled')
    .filter((raw) => {
      // Filter events to only those that occur today in the planning timezone
      let startDt: Date;
      if (raw.start?.dateTime) {
        startDt = new Date(raw.start.dateTime);
      } else if (raw.start?.date) {
        return raw.start.date === todayYMDInPlanningTz;
      } else {
        return true;
      }

      const eventYMD = new Intl.DateTimeFormat('en-CA', {
        timeZone: targetTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(startDt);

      return eventYMD === todayYMDInPlanningTz;
    })
    .map((raw, index): TimelineEvent => {
      const title = raw.summary || '(Untitled Event)';
      
      let startDt: Date;
      let endDt: Date;
      let startIso: string;
      let endIso: string;

      if (raw.start?.dateTime) {
        startDt = new Date(raw.start.dateTime);
        startIso = raw.start.dateTime;
      } else if (raw.start?.date) {
        startDt = new Date(`${raw.start.date}T09:00:00`);
        startIso = startDt.toISOString();
      } else {
        startDt = new Date();
        startIso = startDt.toISOString();
      }

      if (raw.end?.dateTime) {
        endDt = new Date(raw.end.dateTime);
        endIso = raw.end.dateTime;
      } else if (raw.end?.date) {
        endDt = new Date(`${raw.end.date}T10:00:00`);
        endIso = endDt.toISOString();
      } else {
        endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
        endIso = endDt.toISOString();
      }

      // Convert event time and minutes to user's active planning timezone
      const startTime = formatTimeInTimezone(startDt, targetTz);
      const endTime = formatTimeInTimezone(endDt, targetTz);
      const startMinutes = getMinutesFromMidnightInTimezone(startDt, targetTz);
      const durationMinutes = Math.max(
        15,
        Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60))
      );

      // Preserve event-specific original timezone if provided
      const originalTimeZone = raw.start?.timeZone || raw.end?.timeZone;

      // Determine if event is flexible or fixed meeting
      const attendeesList = raw.attendees?.map((a) => a.displayName || a.email) || [];
      const hasOtherAttendees = (raw.attendees?.filter((a) => !a.self).length || 0) > 0;
      
      const lowerTitle = title.toLowerCase();
      const lowerDesc = (raw.description || '').toLowerCase();
      
      const flexibleKeywords = ['focus', 'deep work', 'research', 'prep', 'study', 'write', 'draft', 'gym', 'reading', 'personal', 'buffer', 'catch up', 'reviewing'];
      const isFlexibleKeyword = flexibleKeywords.some((k) => lowerTitle.includes(k) || lowerDesc.includes(k));

      const isFlexible = !hasOtherAttendees && isFlexibleKeyword;

      let eventType: 'meeting' | 'focus_work' | 'prep_block' | 'research' | 'admin' = 'meeting';
      if (lowerTitle.includes('research')) {
        eventType = 'research';
      } else if (lowerTitle.includes('focus') || lowerTitle.includes('deep work')) {
        eventType = 'focus_work';
      } else if (lowerTitle.includes('prep')) {
        eventType = 'prep_block';
      } else if (lowerTitle.includes('admin') || lowerTitle.includes('catch up')) {
        eventType = 'admin';
      } else if (!hasOtherAttendees && isFlexible) {
        eventType = 'focus_work';
      }

      // Determine current status
      let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';
      if (endDt.getTime() < currentTimeMs) {
        status = 'completed';
      } else if (startDt.getTime() <= currentTimeMs && endDt.getTime() >= currentTimeMs) {
        status = 'in_progress';
      }

      // Determine location / link
      let location = raw.location || '';
      if (!location && raw.hangoutLink) {
        location = 'Google Meet';
      } else if (!location && raw.conferenceData) {
        location = 'Video Conference';
      } else if (!location) {
        location = hasOtherAttendees ? 'Meeting Room' : 'Desk / Remote';
      }

      return {
        id: raw.id || `gcal-${index}-${Date.now()}`,
        title,
        type: eventType,
        startTime,
        endTime,
        startMinutes,
        durationMinutes,
        location,
        attendees: attendeesList.length > 0 ? attendeesList : undefined,
        status,
        isFlexible,
        permissionLevel: isFlexible ? 'GREEN' : 'YELLOW',
        notes: raw.description || (isFlexible ? 'Flexible solo block' : 'Fixed calendar commitment'),
        prepReady: isFlexible ? undefined : true,
        originalTimeZone: originalTimeZone && originalTimeZone !== targetTz ? originalTimeZone : undefined,
        startIso,
        endIso,
      };
    });
}
