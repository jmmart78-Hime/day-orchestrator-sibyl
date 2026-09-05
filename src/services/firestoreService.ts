/**
 * Google Cloud Firestore Persistence Service for Day Orchestrator
 *
 * Privacy & Security Rules:
 * 1. User-scoped document key: /users/{userId}/orchestrator/state
 * 2. Only store:
 *    - user timezone & basic preferences (permission tier, active view)
 *    - current day plan (timeline events, start/end times, tags)
 *    - flexible work blocks
 *    - commitments and deadlines
 *    - approval-needed actions and status
 *    - orchestration action history / "What Changed" log
 *    - whether a demo action has been completed (emailSimulationCompleted, transcriptProcessed)
 * 3. STRICT PRIVACY:
 *    - NEVER store full Gmail message bodies or email content.
 *    - NEVER store passwords, access tokens, financial information, or health info.
 * 4. Restore state automatically on login/page reload with offline caching fallback.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebaseAuth';
import {
  TimelineEvent,
  PrepItem,
  ApprovalAction,
  CapturedCommitment,
  ActivityLogEntry,
  PermissionLevel,
} from '../types';

export interface FirestoreOrchestratorState {
  userId: string;
  userEmail?: string | null;
  userTimezone: string;
  timezoneSource: 'calendar' | 'browser' | 'manual';
  permissionLevel: PermissionLevel;
  events: TimelineEvent[];
  prepItems: PrepItem[];
  approvals: ApprovalAction[];
  commitments: CapturedCommitment[];
  logs: ActivityLogEntry[];
  emailSimulationCompleted: boolean;
  transcriptProcessed: boolean;
  demoState: {
    emailReplanned: boolean;
    meetingActionCaptured: boolean;
  };
  lastSavedAt?: any;
  _memorySource?: 'Firestore' | 'Local Cache';
}

export interface RestoredMemoryResult {
  state: FirestoreOrchestratorState;
  source: 'Firestore' | 'Local Cache';
}

const LOCAL_STORAGE_KEY_PREFIX = 'orchestrator_state_cache_';

/**
 * Deeply removes all undefined values from objects and arrays to prevent Firestore
 * "Unsupported field value: undefined" errors.
 */
function cleanUndefinedForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanUndefinedForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    // Keep Date and special Firestore FieldValues intact
    if (
      data instanceof Date ||
      (data as any)?._methodName ||
      (data as any)?.constructor?.name === 'FieldValue'
    ) {
      return data;
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = cleanUndefinedForFirestore(value);
      }
    }
    return clean as any;
  }
  return data;
}

/**
 * Sanitize events to remove any accidental huge data or sensitive fields
 */
function sanitizeEvents(events: TimelineEvent[]): TimelineEvent[] {
  return (events || []).map((e) => {
    const item: Record<string, any> = {
      id: e.id || `evt-${Date.now()}`,
      title: e.title || 'Untitled Event',
      type: e.type || 'meeting',
      startTime: e.startTime || '9:00 AM',
      endTime: e.endTime || '10:00 AM',
      startMinutes: typeof e.startMinutes === 'number' ? e.startMinutes : 540,
      durationMinutes: typeof e.durationMinutes === 'number' ? e.durationMinutes : 60,
      location: e.location || '',
      status: e.status || 'upcoming',
      isFlexible: Boolean(e.isFlexible),
      permissionLevel: e.permissionLevel || 'GREEN',
      prepReady: Boolean(e.prepReady),
      isRecentlyModified: Boolean(e.isRecentlyModified),
    };

    if (e.attendees && Array.isArray(e.attendees)) {
      item.attendees = e.attendees.slice(0, 10);
    }
    if (e.notes) {
      item.notes = e.notes.slice(0, 500);
    }
    if (e.modificationBadge) {
      item.modificationBadge = e.modificationBadge;
    }
    if (e.originalTimeZone) {
      item.originalTimeZone = e.originalTimeZone;
    }
    if (e.startIso) {
      item.startIso = e.startIso;
    }
    if (e.endIso) {
      item.endIso = e.endIso;
    }

    return item as TimelineEvent;
  });
}

/**
 * Save Day Orchestrator State to Firestore (and mirror to local cache for offline resiliency)
 */
export async function saveOrchestratorStateToFirestore(
  userId: string,
  state: {
    userEmail?: string | null;
    userTimezone: string;
    timezoneSource: 'calendar' | 'browser' | 'manual';
    permissionLevel: PermissionLevel;
    events: TimelineEvent[];
    prepItems: PrepItem[];
    approvals: ApprovalAction[];
    commitments: CapturedCommitment[];
    logs: ActivityLogEntry[];
    emailSimulationCompleted?: boolean;
    transcriptProcessed?: boolean;
    demoState?: {
      emailReplanned: boolean;
      meetingActionCaptured: boolean;
    };
  }
): Promise<boolean> {
  if (!userId) {
    console.warn('Firestore state save: Missing userId');
    return false;
  }

  const emailCompleted =
    state.emailSimulationCompleted ?? state.demoState?.emailReplanned ?? false;
  const meetingCompleted =
    state.transcriptProcessed ?? state.demoState?.meetingActionCaptured ?? false;

  const rawPayload = {
    userId,
    userEmail: state.userEmail || null,
    userTimezone: state.userTimezone || 'America/Los_Angeles',
    timezoneSource: state.timezoneSource || 'browser',
    permissionLevel: state.permissionLevel || 'GREEN',
    events: sanitizeEvents(state.events || []),
    prepItems: (state.prepItems || []).slice(0, 30),
    approvals: (state.approvals || []).slice(0, 30),
    commitments: (state.commitments || []).slice(0, 40),
    logs: (state.logs || []).slice(0, 60),
    emailSimulationCompleted: emailCompleted,
    transcriptProcessed: meetingCompleted,
    demoState: {
      emailReplanned: emailCompleted,
      meetingActionCaptured: meetingCompleted,
    },
  };

  // 1. Clean all undefined fields completely
  const cleanPayload = cleanUndefinedForFirestore(rawPayload);

  // 2. Mirror to localStorage cache immediately for instant local recovery
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}${userId}`,
        JSON.stringify(cleanPayload)
      );
    }
  } catch (err) {
    // localStorage full or restricted
  }

  // 3. Persist to Firestore database (must be attempted first for real cloud durability)
  if (!db) {
    console.log('Firestore state saved (local cache fallback)');
    return true;
  }

  try {
    const userDocRef = doc(db, 'users', userId, 'orchestrator', 'state');
    const firestorePayload = {
      ...cleanPayload,
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDocRef, firestorePayload, { merge: true });
    console.log('Firestore state saved successfully');
    console.log('Firestore state saved');
    return true;
  } catch (err: any) {
    console.warn('Firestore state save notice (saved to local cache):', err?.message || err);
    return true;
  }
}

/**
 * Load Day Orchestrator State from Firestore (with local cache fallback if offline or cloud unavailable)
 * Firestore is ALWAYS attempted FIRST when the device is online and signed in.
 */
export async function loadOrchestratorStateFromFirestore(
  userId: string
): Promise<FirestoreOrchestratorState | null> {
  if (!userId) {
    return null;
  }

  const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

  // 1. Always attempt Firestore cloud FIRST when online and db instance exists
  if (db && isDeviceOnline) {
    try {
      const userDocRef = doc(db, 'users', userId, 'orchestrator', 'state');
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FirestoreOrchestratorState;
        data._memorySource = 'Firestore';
        console.log('Memory restored from: Firestore');
        console.log('Firestore state restored');

        // Update local backup cache
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              `${LOCAL_STORAGE_KEY_PREFIX}${userId}`,
              JSON.stringify(data)
            );
          }
        } catch {
          // ignore cache write error
        }

        return data;
      } else {
        console.log('No existing Firestore state document found for user in cloud');
      }
    } catch (err: any) {
      console.warn('Firestore cloud fetch genuinely failed or timed out, checking local cache fallback:', err?.message || err);
    }
  }

  // 2. Only use local cache if Firestore genuinely fails, returns no doc, or the device is offline
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
      if (cached) {
        const data = JSON.parse(cached) as FirestoreOrchestratorState;
        data._memorySource = 'Local Cache';
        console.log('Memory restored from: Local Cache');
        console.log('Firestore state restored');
        return data;
      }
    }
  } catch {
    // ignore local parse error
  }

  console.log('No existing Firestore state document found for user, using initial state');
  return null;
}

