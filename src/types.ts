export type PermissionLevel = 'GREEN' | 'YELLOW' | 'RED';

export type LoopPhase = 'PLAN' | 'PREPARE' | 'WATCH' | 'ACT' | 'CAPTURE' | 'REPLAN';

export interface TimelineEvent {
  id: string;
  title: string;
  type: 'meeting' | 'focus_work' | 'prep_block' | 'research' | 'admin';
  startTime: string;
  endTime: string;
  startMinutes: number; // minutes from 0:00 (e.g. 9:00 AM = 540)
  durationMinutes: number;
  location: string;
  attendees?: string[];
  status: 'completed' | 'in_progress' | 'upcoming' | 'replanned';
  isFlexible: boolean;
  permissionLevel: PermissionLevel;
  notes?: string;
  prepReady?: boolean;
  isRecentlyModified?: boolean;
  modificationBadge?: string;
  originalTimeZone?: string; // e.g. "America/New_York" if event was scheduled in a different timezone
  startIso?: string; // ISO 8601 start timestamp
  endIso?: string; // ISO 8601 end timestamp
}

export interface PrepItem {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  summary: string;
  fullContent?: string;
  tags: string[];
  status: 'ready' | 'auto_added';
  permissionLevel: PermissionLevel;
  sourceDoc?: string;
  timestamp: string;
}

export interface ApprovalAction {
  id: string;
  type: 'email_draft' | 'calendar_reschedule';
  title: string;
  recipient: string;
  recipientRole?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  rationale: string;
  permissionLevel: PermissionLevel;
  status: 'pending' | 'approved_sent' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
  sourceContext?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  phase: LoopPhase;
  title: string;
  description: string;
  permissionLevel: PermissionLevel;
  reasoning: string;
  approvalRequired: boolean;
  impactTag: string;
  isNew?: boolean;
}

export interface CapturedCommitment {
  id: string;
  owner: string;
  isUser: boolean;
  task: string;
  due: string;
  actionTaken: string;
  scheduledSlot?: string;
  category: 'private_work' | 'informational' | 'outbound_action';
  status: 'scheduled' | 'monitored' | 'awaiting_approval';
}

export type GmailClassificationCategory =
  | 'ACTION NEEDED'
  | 'SCHEDULE IMPACT'
  | 'IMPORTANT FYI'
  | 'LOW PRIORITY';

export interface GmailInboxMessage {
  id: string;
  threadId?: string;
  sender: string;
  senderEmail?: string;
  subject: string;
  receivedTime: string;
  summary: string;
  snippet?: string;
  unread?: boolean;
  classification?: GmailClassificationCategory;
  whyThisMatters?: string;
}

export interface SibylRecalledMemory {
  source: string;
  category: string;
  name: string;
  lesson: string;
  requiredPrepBufferMinutes: number;
  scheduleStrategy: string;
  historicalFailure: string;
  rule: string;
  timestamp: string;
}

export interface SibylSnapshotStatus {
  durableSnapshotRestored: boolean;
  sibylMemoryWritten: boolean;
  durableSnapshotCheckpointed: boolean;
  freshRuntimeMemoryRestored: boolean;
  transportType: 'gcs' | 'local_archive' | 'none';
  backupBucket: string | null;
  backupObject: string;
  lastCheckpointTime?: string | null;
  lastRestoreTime?: string | null;
  lastCheckpointBytes?: number;
  lastCheckpointError?: string | null;
  lastRestoreError?: string | null;
  cloudStorageConfigured: boolean;
}

export interface SibylStatusResponse {
  connected: boolean;
  engine: string;
  schemaVersion: number;
  dbPath: string;
  entityCount: number;
  journalEventCount: number;
  hasSessionAMemory: boolean;
  enabled: boolean;
  error?: string;
  recentEntities?: any[];
  recentJournalEvents?: any[];
  snapshot?: SibylSnapshotStatus;
}
