import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { InteractiveDemoBar } from './components/InteractiveDemoBar';
import { SibylMemoryProofBar } from './components/SibylMemoryProofBar';
import { NextEventCard } from './components/NextEventCard';
import { TimelineView } from './components/TimelineView';
import { PreparedForYou } from './components/PreparedForYou';
import { ApprovalNeeded } from './components/ApprovalNeeded';
import { WhatChangedStream } from './components/WhatChangedStream';
import { CommitmentsSection } from './components/CommitmentsSection';
import { PermissionGuideModal } from './components/PermissionGuideModal';
import { EditEmailModal } from './components/EditEmailModal';
import {
  INITIAL_EVENTS,
  INITIAL_PREP_ITEMS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_APPROVALS,
} from './data/initialState';
import {
  TimelineEvent,
  PrepItem,
  ActivityLogEntry,
  ApprovalAction,
  CapturedCommitment,
  LoopPhase,
  PermissionLevel,
  SibylStatusResponse,
  SibylRecalledMemory,
} from './types';
import { CheckCircle2, AlertCircle, Sparkles, X, Info, Calendar } from 'lucide-react';
import { initAuth, googleSignIn, logoutGoogle } from './lib/firebaseAuth';
import { fetchTodayGoogleCalendarEvents } from './services/calendarService';
import { fetchRecentInboxMessages } from './services/gmailService';
import { LiveGmailSection } from './components/LiveGmailSection';
import { User } from 'firebase/auth';
import { GmailInboxMessage } from './types';
import {
  getInitialPlanningTimezone,
  persistPlanningTimezone,
  detectBrowserTimezone,
  fetchGoogleCalendarTimezone,
  recalculateEventsForPlanningTimezone,
} from './lib/timezone';
import {
  saveOrchestratorStateToFirestore,
  loadOrchestratorStateFromFirestore,
} from './services/firestoreService';

export default function App() {
  // Timezone State: Detected from Google Calendar or Browser, stored in user's profile/state
  const initialTzState = getInitialPlanningTimezone();
  const [userTimezone, setUserTimezone] = useState<string>(initialTzState.timeZone);
  const [timezoneSource, setTimezoneSource] = useState<'calendar' | 'browser' | 'manual'>(initialTzState.source);

  // Application Data State
  const [events, setEvents] = useState<TimelineEvent[]>(INITIAL_EVENTS);
  const [prepItems, setPrepItems] = useState<PrepItem[]>(INITIAL_PREP_ITEMS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(INITIAL_ACTIVITY_LOGS);
  const [approvals, setApprovals] = useState<ApprovalAction[]>(INITIAL_APPROVALS);
  const [commitments, setCommitments] = useState<CapturedCommitment[]>([]);
  const [currentPhase, setCurrentPhase] = useState<LoopPhase>('WATCH');
  const [selectedEventId, setSelectedEventId] = useState<string>('evt-3');

  // Sibyl Persistent Memory State (SQLite v4 + FTS5)
  const [sibylStatus, setSibylStatus] = useState<SibylStatusResponse | null>(null);
  const [isLoadingSibyl, setIsLoadingSibyl] = useState<boolean>(false);
  const [recalledMemories, setRecalledMemories] = useState<SibylRecalledMemory[]>([]);
  const [planningDecision, setPlanningDecision] = useState<string | null>(null);
  const [loadBearingActive, setLoadBearingActive] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<'A' | 'B' | 'INITIAL'>('INITIAL');

  // Cloud Firestore Persistence State
  const [isCloudMemoryConnected, setIsCloudMemoryConnected] = useState<boolean>(false);
  const [hasLoadedInitialCloudMemory, setHasLoadedInitialCloudMemory] = useState<boolean>(false);
  const [memoryRestoredSource, setMemoryRestoredSource] = useState<'Firestore' | 'Local Cache' | null>(null);
  const [lastSaveStatus, setLastSaveStatus] = useState<string | null>(null);
  const isRestoredRef = useRef<boolean>(false);

  // Google Workspace (Calendar & Gmail) Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isRealCalendar, setIsRealCalendar] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(null);

  // Live Gmail State
  const [gmailMessages, setGmailMessages] = useState<GmailInboxMessage[]>([]);
  const [isLoadingGmail, setIsLoadingGmail] = useState<boolean>(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Simulation State
  const [isSimulatingEmail, setIsSimulatingEmail] = useState(false);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [emailSimulated, setEmailSimulated] = useState(false);
  const [transcriptProcessed, setTranscriptProcessed] = useState(false);
  const [apiSource, setApiSource] = useState<string>('Genkit (Gemini 3.7 Flash)');

  // Modals & Banners
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<ApprovalAction | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'replan';
  } | null>(null);

  // Load Gmail messages (Strict Read-Only)
  const loadGmailMessages = useCallback(async (token: string) => {
    setIsLoadingGmail(true);
    setGmailError(null);
    try {
      const messages = await fetchRecentInboxMessages(token);
      setGmailMessages(messages);
    } catch (err: any) {
      console.warn('Could not load Gmail inbox messages:', err);
      setGmailError(err?.message || 'Failed to load Gmail messages');
    } finally {
      setIsLoadingGmail(false);
    }
  }, []);

  // Load calendar events & Gmail for an access token with timezone detection
  const loadWorkspaceData = useCallback(async (token: string, currentUser?: User, overrideTz?: string) => {
    setIsLoadingAuth(true);
    setCalendarError(null);

    // 0. Detect user's Google Calendar primary timezone
    let activeTz = overrideTz || userTimezone;
    try {
      const gcalTz = await fetchGoogleCalendarTimezone(token);
      if (gcalTz && !overrideTz) {
        activeTz = gcalTz;
        setUserTimezone(gcalTz);
        setTimezoneSource('calendar');
        persistPlanningTimezone(gcalTz, 'calendar');
      }
    } catch (e) {
      console.warn('Could not auto-detect Google Calendar timezone:', e);
    }

    // 1. Fetch Calendar Events normalized to active planning timezone
    try {
      const realEvents = await fetchTodayGoogleCalendarEvents(token, activeTz);
      setEvents(realEvents);
      setIsRealCalendar(true);
      if (currentUser) setUser(currentUser);

      // Select first upcoming or first event
      if (realEvents.length > 0) {
        const nextIdx = realEvents.find(
          (e) => e.status === 'upcoming' || e.status === 'in_progress'
        );
        setSelectedEventId(nextIdx ? nextIdx.id : realEvents[0].id);
      }

      setNotificationBanner({
        title: 'Google Workspace Connected (Read-Only)',
        message: `Synchronized Calendar events for today in ${activeTz} and 10 recent Gmail messages. Strictly read-only.`,
        type: 'success',
      });
    } catch (err: any) {
      console.warn('Could not load Google Calendar events, keeping Demo Mode sample schedule:', err);
      setCalendarError('Failed to load events');
      setIsRealCalendar(false);
      setEvents(INITIAL_EVENTS);
      setNotificationBanner({
        title: 'Demo Mode Active',
        message: 'Could not load Google Calendar. Displaying interactive sample schedule.',
        type: 'info',
      });
    } finally {
      setIsLoadingAuth(false);
    }

    // 2. Fetch Live Gmail Inbox (Read-Only)
    loadGmailMessages(token);
  }, [loadGmailMessages, userTimezone]);

  // Handle user changing planning timezone manually
  const handleSelectTimezone = (newTz: string) => {
    if (newTz === userTimezone) return;
    const prevTz = userTimezone;
    setUserTimezone(newTz);
    setTimezoneSource('manual');
    persistPlanningTimezone(newTz, 'manual');

    // If connected to real Google Calendar, re-fetch events for new timezone
    if (cachedToken && isRealCalendar) {
      loadWorkspaceData(cachedToken, user || undefined, newTz);
    } else {
      // For demo mode events, recalculate time strings and startMinutes
      setEvents((prev) => recalculateEventsForPlanningTimezone(prev, prevTz, newTz));
    }

    setNotificationBanner({
      title: 'Planning Timezone Updated',
      message: `Active planning timezone changed to ${newTz}. Schedule timings, prep blocks, and deadlines updated.`,
      type: 'info',
    });
  };

  // Reset timezone to auto-detection (Calendar or Browser)
  const handleResetTimezoneToAuto = async () => {
    let targetTz = detectBrowserTimezone();
    let source: 'calendar' | 'browser' = 'browser';

    if (cachedToken && isRealCalendar) {
      const gcalTz = await fetchGoogleCalendarTimezone(cachedToken);
      if (gcalTz) {
        targetTz = gcalTz;
        source = 'calendar';
      }
    }

    const prevTz = userTimezone;
    setUserTimezone(targetTz);
    setTimezoneSource(source);
    persistPlanningTimezone(targetTz, source);

    if (cachedToken && isRealCalendar) {
      loadWorkspaceData(cachedToken, user || undefined, targetTz);
    } else {
      setEvents((prev) => recalculateEventsForPlanningTimezone(prev, prevTz, targetTz));
    }

    setNotificationBanner({
      title: 'Timezone Auto-Detected',
      message: `Restored ${source === 'calendar' ? 'Google Calendar settings' : 'browser system'} timezone: ${targetTz}`,
      type: 'success',
    });
  };

  // Initialize Firebase Auth listener on mount and load Cloud Memory
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authenticatedUser, token) => {
        setUser(authenticatedUser);
        setCachedToken(token);

        // Load persisted Cloud Memory from Firestore for this user
        try {
          const savedState = await loadOrchestratorStateFromFirestore(authenticatedUser.uid);
          if (savedState) {
            setIsCloudMemoryConnected(true);
            setMemoryRestoredSource(savedState._memorySource || 'Firestore');
            if (savedState.userTimezone) setUserTimezone(savedState.userTimezone);
            if (savedState.timezoneSource) setTimezoneSource(savedState.timezoneSource);
            if (savedState.events && savedState.events.length > 0) {
              setEvents(savedState.events);
              const nextIdx = savedState.events.find(
                (e) => e.status === 'upcoming' || e.status === 'in_progress'
              );
              if (nextIdx) setSelectedEventId(nextIdx.id);
            }
            if (savedState.prepItems && savedState.prepItems.length > 0) {
              setPrepItems(savedState.prepItems);
            }
            if (savedState.approvals && savedState.approvals.length > 0) {
              setApprovals(savedState.approvals);
            }
            if (savedState.commitments && savedState.commitments.length > 0) {
              setCommitments(savedState.commitments);
            }
            if (savedState.logs && savedState.logs.length > 0) {
              setActivityLogs(savedState.logs);
            }

            const isEmailDone =
              savedState.emailSimulationCompleted ??
              savedState.demoState?.emailReplanned ??
              false;
            const isTranscriptDone =
              savedState.transcriptProcessed ??
              savedState.demoState?.meetingActionCaptured ??
              false;

            setEmailSimulated(isEmailDone);
            setTranscriptProcessed(isTranscriptDone);
          } else {
            // First time user or fresh state; mark connected
            setIsCloudMemoryConnected(true);
          }
        } catch (e) {
          console.error('Firestore state restore error:', e);
        } finally {
          isRestoredRef.current = true;
          setHasLoadedInitialCloudMemory(true);
        }

        // If Google OAuth access token is available, refresh calendar & Gmail
        if (token) {
          loadWorkspaceData(token, authenticatedUser);
        }
      },
      () => {
        setUser(null);
        setCachedToken(null);
        setIsRealCalendar(false);
        setIsCloudMemoryConnected(false);
        setGmailMessages([]);
      }
    );

    return () => unsubscribe();
  }, [loadWorkspaceData]);

  // Cloud State Persistence Helper (with instant UI verification)
  const saveStateToCloud = useCallback(
    async (statePayload: {
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
    }) => {
      if (!user) return false;
      const success = await saveOrchestratorStateToFirestore(user.uid, statePayload);
      if (success) {
        setLastSaveStatus('Firestore state saved successfully');
      }
      return success;
    },
    [user]
  );

  // Auto-persist state changes to Cloud Memory (Firestore) whenever state updates after initial restore
  useEffect(() => {
    if (!user || !isRestoredRef.current || !hasLoadedInitialCloudMemory) return;

    const timeoutId = setTimeout(async () => {
      await saveStateToCloud({
        userEmail: user.email,
        userTimezone,
        timezoneSource,
        permissionLevel: 'GREEN',
        events,
        prepItems,
        approvals,
        commitments,
        logs: activityLogs,
        emailSimulationCompleted: emailSimulated,
        transcriptProcessed,
        demoState: {
          emailReplanned: emailSimulated,
          meetingActionCaptured: transcriptProcessed,
        },
      });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [
    user,
    hasLoadedInitialCloudMemory,
    userTimezone,
    timezoneSource,
    events,
    prepItems,
    approvals,
    commitments,
    activityLogs,
    emailSimulated,
    transcriptProcessed,
    saveStateToCloud,
  ]);

  // Handle Google Sign In
  const handleSignInGoogle = async () => {
    setIsLoadingAuth(true);
    setCalendarError(null);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setUser(authResult.user);
        setCachedToken(authResult.accessToken);
        await loadWorkspaceData(authResult.accessToken, authResult.user);
      }
    } catch (err: any) {
      console.error('Sign-in or workspace fetch failed:', err);
      setCalendarError(err?.message || 'Sign in failed');
      setIsRealCalendar(false);
      setEvents(INITIAL_EVENTS);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Handle Sign Out / Switch to Demo Mode
  const handleSignOutGoogle = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setCachedToken(null);
      setIsRealCalendar(false);
      setGmailMessages([]);
      setEvents(INITIAL_EVENTS);
      setSelectedEventId('evt-3');
      setNotificationBanner({
        title: 'Switched to Demo Mode',
        message: 'Disconnected Google Workspace. Sample schedule restored for interactive testing.',
        type: 'info',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Refresh Google Calendar & Gmail
  const handleRefreshCalendar = () => {
    if (cachedToken) {
      loadWorkspaceData(cachedToken, user || undefined);
    }
  };

  const handleRefreshGmail = () => {
    if (cachedToken) {
      loadGmailMessages(cachedToken);
    }
  };

  // DEMO INTERACTION 1: Simulate Incoming Email
  const handleSimulateEmail = async () => {
    setIsSimulatingEmail(true);
    setCurrentPhase('WATCH');
    setNotificationBanner({
      title: 'Incoming Email Detected',
      message: '“Jennifer, please bring last week’s escalation trend and the primary drivers to today’s leadership meeting.”',
      type: 'info',
    });

    try {
      // Transition phase to REPLAN
      setCurrentPhase('REPLAN');

      const res = await fetch('/api/gemini/analyze-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent: "Jennifer, please bring last week's escalation trend and the primary drivers to today's leadership meeting.",
          currentSchedule: events,
          userTimezone: userTimezone,
        }),
      });

      const data = await res.json();
      const result = data.result;
      setApiSource(data.source || 'gemini-3.7-flash');

      // 1. Add "Escalation trend analysis" to prep items
      const newPrep: PrepItem = {
        id: `prep-${Date.now()}`,
        eventId: selectedEventId || 'evt-3',
        eventTitle: '1:00 PM Leadership Meeting',
        title: result.newPrepItem?.title || 'Escalation trend analysis & primary drivers',
        summary: result.newPrepItem?.summary || 'Synthesized last week’s support escalation spikes and root causes for 1:00 PM executive review.',
        fullContent: result.newPrepItem?.fullContent || '• Escalation Root Causes: Legacy API token deprecation (64%), Payment timeout (22%)\n• Action: Admin deprecation banner and extended webhook retry window.',
        tags: result.newPrepItem?.tags || ['Escalations', 'Support Data'],
        status: 'auto_added',
        permissionLevel: 'GREEN',
        sourceDoc: result.newPrepItem?.sourceDoc || 'Customer Incident Log Feed',
        timestamp: '12:36 PM',
      };

      const updatedPrepItems = [newPrep, ...prepItems];
      setPrepItems(updatedPrepItems);

      // 2. Extend preparation block and shift Research Block
      const updatedEvents = events.map((evt) => {
        if (evt.id === 'evt-3' || evt.id === selectedEventId) {
          return {
            ...evt,
            notes: (evt.notes ? evt.notes + ' • ' : '') + '[Auto-Added: Escalation Trend & Drivers brief synced].',
            isRecentlyModified: true,
            modificationBadge: '+10m Prep Added',
          };
        }
        if (evt.id === 'evt-4' || evt.isFlexible) {
          return {
            ...evt,
            startTime: evt.startTime === '2:00 PM' ? '2:10 PM' : evt.startTime,
            endTime: evt.endTime === '3:30 PM' ? '3:40 PM' : evt.endTime,
            notes: 'Shifted +10 min by autonomous agent to accommodate pre-meeting escalation context briefing.',
            isRecentlyModified: true,
            modificationBadge: 'Shifted +10m (Green Tier)',
          };
        }
        return evt;
      });
      setEvents(updatedEvents);

      // 3. Add activity log record
      const newLog: ActivityLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: '12:36 PM',
        phase: 'REPLAN',
        title: 'Day Autonomously Replanned: Escalation Briefing Added',
        description: result.changeLogDescription || 'Synthesized escalation trend for 1:00 PM Leadership Meeting, added 10-minute prep buffer, and shifted flexible Research Block by 10 minutes.',
        permissionLevel: 'GREEN',
        reasoning: result.permissionPolicy?.reasoning || 'Executed autonomously under GREEN tier policy: only private research/prep and flexible work blocks were adjusted. No external attendee calendars were modified (read-only calendar preservation).',
        approvalRequired: false,
        impactTag: 'Day Replanned',
        isNew: true,
      };

      const updatedLogs = [newLog, ...activityLogs];
      setActivityLogs(updatedLogs);
      setEmailSimulated(true);
      setCurrentPhase('PREPARE');

      // Save IMMEDIATELY to Firestore
      await saveStateToCloud({
        userEmail: user?.email,
        userTimezone,
        timezoneSource,
        permissionLevel: 'GREEN',
        events: updatedEvents,
        prepItems: updatedPrepItems,
        approvals,
        commitments,
        logs: updatedLogs,
        emailSimulationCompleted: true,
        transcriptProcessed,
        demoState: {
          emailReplanned: true,
          meetingActionCaptured: transcriptProcessed,
        },
      });

      // Visible banner
      setNotificationBanner({
        title: 'Day Replanned Autonomously',
        message: 'Escalation analysis added to meeting prep. Flexible focus blocks adjusted. No external calendar changes made (Read-Only).',
        type: 'replan',
      });
    } catch (err) {
      console.error('Error simulating email:', err);
    } finally {
      setIsSimulatingEmail(false);
    }
  };

  // DEMO INTERACTION 2: Process Meeting Transcript
  const handleProcessTranscript = async () => {
    setIsProcessingTranscript(true);
    setCurrentPhase('CAPTURE');
    setNotificationBanner({
      title: 'Processing 1:00 PM Meeting Transcript',
      message: 'Extracting action commitments and evaluating outbound authorization policies...',
      type: 'info',
    });

    try {
      const res = await fetch('/api/gemini/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:
            'Jennifer will send the escalation breakdown tomorrow afternoon. Rob will update the procedure Friday. April wants Jennifer’s VOC recommendation included next Tuesday. Jennifer should also send April a short follow-up confirming the plan.',
          userTimezone: userTimezone,
        }),
      });

      const data = await res.json();
      const result = data.result;
      setApiSource(data.source || 'gemini-3.7-flash');

      // 1. Commitments
      const parsedCommitments: CapturedCommitment[] = (result.commitments || []).map(
        (c: any, index: number) => ({
          id: `commit-${Date.now()}-${index}`,
          owner: c.owner,
          isUser: c.isUser,
          task: c.task,
          due: c.due,
          category: c.category || (c.isUser ? 'private_work' : 'informational'),
          actionTaken: c.actionTaken,
          scheduledSlot: c.scheduledSlot,
          status: c.isUser ? 'scheduled' : 'monitored',
        })
      );

      setCommitments(parsedCommitments);

      // 2. Draft Email to April (Approval Needed - Yellow Tier)
      const emailItem = result.emailApprovalItem;
      const newApproval: ApprovalAction = {
        id: `approval-${Date.now()}`,
        type: 'email_draft',
        title: 'Outbound Confirmation Email to April Lindqvist',
        recipient: emailItem?.recipient || 'April Lindqvist',
        recipientRole: emailItem?.recipientRole || 'Executive VP of Operations',
        recipientEmail: emailItem?.recipientEmail || 'april.lindqvist@acme-corp.internal',
        subject: emailItem?.subject || 'Recap & Next Steps: Leadership Sync / Escalation & VOC Milestones',
        body: emailItem?.body || `Hi April,\n\nFollowing up on our discussion in today’s Leadership Meeting to confirm the agreed plan:\n\n1. Escalation Analysis: I will send over the granular breakdown of last week’s escalation drivers by tomorrow afternoon.\n2. VOC Integration: I am preparing our VOC strategic recommendations for next Tuesday's executive review.\n3. Operational Procedures: Rob is updating the team procedure by Friday.\n\nPlease let me know if you need any adjustments to this timeline.\n\nBest regards,\nJennifer`,
        rationale: emailItem?.rationale || 'Outbound communication to an executive external recipient requires explicit user authorization under YELLOW permission policy.',
        permissionLevel: 'YELLOW',
        status: 'pending',
        createdAt: '2:01 PM',
      };

      const updatedApprovals = [newApproval, ...approvals];
      setApprovals(updatedApprovals);

      // 3. Activity Log
      const captureLog: ActivityLogEntry = {
        id: `log-capture-${Date.now()}`,
        timestamp: '2:01 PM',
        phase: 'CAPTURE',
        title: 'Transcript Analyzed: 4 Commitments Extracted',
        description: 'Scheduled Jennifer’s private deliverables into future work blocks; marked Rob’s task as informational; queued draft email to April in "Approval Needed".',
        permissionLevel: 'YELLOW',
        reasoning: 'Scheduling private work is Green Tier; outbound email to colleague requires explicit user review under YELLOW Tier.',
        approvalRequired: true,
        impactTag: 'Approval Staged',
        isNew: true,
      };

      const updatedLogs = [captureLog, ...activityLogs];
      setActivityLogs(updatedLogs);
      setTranscriptProcessed(true);
      setCurrentPhase('ACT');

      // Save IMMEDIATELY to Firestore
      await saveStateToCloud({
        userEmail: user?.email,
        userTimezone,
        timezoneSource,
        permissionLevel: 'GREEN',
        events,
        prepItems,
        approvals: updatedApprovals,
        commitments: parsedCommitments,
        logs: updatedLogs,
        emailSimulationCompleted: emailSimulated,
        transcriptProcessed: true,
        demoState: {
          emailReplanned: emailSimulated,
          meetingActionCaptured: true,
        },
      });

      setNotificationBanner({
        title: 'Meeting Transcript Processed',
        message: 'Personal work items auto-scheduled. Draft confirmation email to April staged in "Approval Needed" (Yellow Tier).',
        type: 'success',
      });
    } catch (err) {
      console.error('Error processing transcript:', err);
    } finally {
      setIsProcessingTranscript(false);
    }
  };

  // Handle User Email Approval (SEND)
  const handleSendApproval = async (id: string) => {
    const updatedApprovals = approvals.map((a) =>
      a.id === id
        ? {
            ...a,
            status: 'approved_sent' as const,
            resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        : a
    );
    setApprovals(updatedApprovals);

    const sentLog: ActivityLogEntry = {
      id: `log-sent-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      phase: 'ACT',
      title: 'Action Approved & Executed: Email Dispatched to April Lindqvist',
      description: 'User granted explicit authorization for YELLOW Tier outbound follow-up email confirming escalation and VOC deliverables.',
      permissionLevel: 'YELLOW',
      reasoning: 'Authorized by user in accordance with Yellow-tier governance.',
      approvalRequired: false,
      impactTag: 'Email Dispatched',
      isNew: true,
    };

    const updatedLogs = [sentLog, ...activityLogs];
    setActivityLogs(updatedLogs);
    setCurrentPhase('WATCH');

    await saveStateToCloud({
      userEmail: user?.email,
      userTimezone,
      timezoneSource,
      permissionLevel: 'GREEN',
      events,
      prepItems,
      approvals: updatedApprovals,
      commitments,
      logs: updatedLogs,
      emailSimulationCompleted: emailSimulated,
      transcriptProcessed,
      demoState: {
        emailReplanned: emailSimulated,
        meetingActionCaptured: transcriptProcessed,
      },
    });

    setNotificationBanner({
      title: 'Email Approved & Sent',
      message: 'Confirmation email dispatched to April Lindqvist. Execution audit logged to activity stream.',
      type: 'success',
    });
  };

  // Handle User Email Edit
  const handleEditApproval = (action: ApprovalAction) => {
    setEditingApproval(action);
  };

  // Handle User Email Dismiss
  const handleDismissApproval = async (id: string) => {
    const updatedApprovals = approvals.map((a) =>
      a.id === id ? { ...a, status: 'dismissed' as const } : a
    );
    setApprovals(updatedApprovals);

    const dismissLog: ActivityLogEntry = {
      id: `log-dismiss-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      phase: 'ACT',
      title: 'Draft Email Dismissed by User',
      description: 'Outbound confirmation email to April Lindqvist was dismissed; no message was sent.',
      permissionLevel: 'YELLOW',
      reasoning: 'User opted not to send draft.',
      approvalRequired: false,
      impactTag: 'Draft Dismissed',
      isNew: true,
    };

    const updatedLogs = [dismissLog, ...activityLogs];
    setActivityLogs(updatedLogs);

    await saveStateToCloud({
      userEmail: user?.email,
      userTimezone,
      timezoneSource,
      permissionLevel: 'GREEN',
      events,
      prepItems,
      approvals: updatedApprovals,
      commitments,
      logs: updatedLogs,
      emailSimulationCompleted: emailSimulated,
      transcriptProcessed,
      demoState: {
        emailReplanned: emailSimulated,
        meetingActionCaptured: transcriptProcessed,
      },
    });
  };

  // Handle Save from Edit Modal
  const handleSaveAndSend = async (id: string, updatedFields: Partial<ApprovalAction>) => {
    const updatedApprovals = approvals.map((a) =>
      a.id === id
        ? {
            ...a,
            ...updatedFields,
            status: 'approved_sent' as const,
            resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        : a
    );
    setApprovals(updatedApprovals);

    const editSendLog: ActivityLogEntry = {
      id: `log-editsend-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      phase: 'ACT',
      title: 'Edited Email Approved & Sent',
      description: 'Modified email content was approved and dispatched to April Lindqvist.',
      permissionLevel: 'YELLOW',
      reasoning: 'User reviewed, edited, and authorized transmission.',
      approvalRequired: false,
      impactTag: 'Edited & Dispatched',
      isNew: true,
    };

    const updatedLogs = [editSendLog, ...activityLogs];
    setActivityLogs(updatedLogs);
    setCurrentPhase('WATCH');

    await saveStateToCloud({
      userEmail: user?.email,
      userTimezone,
      timezoneSource,
      permissionLevel: 'GREEN',
      events,
      prepItems,
      approvals: updatedApprovals,
      commitments,
      logs: updatedLogs,
      emailSimulationCompleted: emailSimulated,
      transcriptProcessed,
      demoState: {
        emailReplanned: emailSimulated,
        meetingActionCaptured: transcriptProcessed,
      },
    });

    setNotificationBanner({
      title: 'Edited Email Sent',
      message: 'Your revised email was approved and dispatched to April Lindqvist.',
      type: 'success',
    });
  };

  const handleSaveDraft = async (id: string, updatedFields: Partial<ApprovalAction>) => {
    const updatedApprovals = approvals.map((a) =>
      a.id === id ? { ...a, ...updatedFields } : a
    );
    setApprovals(updatedApprovals);

    await saveStateToCloud({
      userEmail: user?.email,
      userTimezone,
      timezoneSource,
      permissionLevel: 'GREEN',
      events,
      prepItems,
      approvals: updatedApprovals,
      commitments,
      logs: activityLogs,
      emailSimulationCompleted: emailSimulated,
      transcriptProcessed,
      demoState: {
        emailReplanned: emailSimulated,
        meetingActionCaptured: transcriptProcessed,
      },
    });
  };

  // Handle Scenario Reset
  const handleReset = async () => {
    if (isRealCalendar && cachedToken) {
      loadWorkspaceData(cachedToken, user || undefined);
    } else {
      setEvents(INITIAL_EVENTS);
      setSelectedEventId('evt-3');
    }
    setPrepItems(INITIAL_PREP_ITEMS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setApprovals(INITIAL_APPROVALS);
    setCommitments([]);
    setCurrentPhase('WATCH');
    setEmailSimulated(false);
    setTranscriptProcessed(false);

    await saveStateToCloud({
      userEmail: user?.email,
      userTimezone,
      timezoneSource,
      permissionLevel: 'GREEN',
      events: INITIAL_EVENTS,
      prepItems: INITIAL_PREP_ITEMS,
      approvals: INITIAL_APPROVALS,
      commitments: [],
      logs: INITIAL_ACTIVITY_LOGS,
      emailSimulationCompleted: false,
      transcriptProcessed: false,
      demoState: {
        emailReplanned: false,
        meetingActionCaptured: false,
      },
    });

    setPlanningDecision(null);
    setLoadBearingActive(false);
    setRecalledMemories([]);
    setCurrentSession('INITIAL');
    await fetchSibylStatus();

    setNotificationBanner({
      title: 'Scenario Reset',
      message: isRealCalendar
        ? 'Refreshed today’s Google Calendar schedule.'
        : 'Day Orchestrator restored to initial morning state.',
      type: 'info',
    });
  };

  // Fetch Sibyl Memory Status
  const fetchSibylStatus = useCallback(async () => {
    try {
      setIsLoadingSibyl(true);
      const res = await fetch('/api/sibyl/status');
      if (res.ok) {
        const data = await res.json();
        setSibylStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch Sibyl status:', err);
    } finally {
      setIsLoadingSibyl(false);
    }
  }, []);

  useEffect(() => {
    fetchSibylStatus();
  }, [fetchSibylStatus]);

  // Sibyl Consequential Step 1: Record Session A Failure
  const handleRecordSessionA = async () => {
    try {
      const res = await fetch('/api/sibyl/record-session-a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await res.json();
      await fetchSibylStatus();
      setCurrentSession('A');

      const newLog: ActivityLogEntry = {
        id: `log-sibyl-${Date.now()}`,
        timestamp: '5:00 PM',
        phase: 'ACT',
        title: 'Session A Consequential Outcome Stored in Sibyl Memory',
        description:
          'Session A failure recorded: prep was squeezed to 10 mins and 2 afternoon flexible tasks were abandoned. Stored learned rule in Sibyl SQLite (workload_patterns): Enforce 60m prep buffer + defer flexible tasks.',
        permissionLevel: 'GREEN',
        reasoning:
          'Persistent memory record created in SQLite + indexed via FTS5 for cross-session recall in Session B.',
        approvalRequired: false,
        impactTag: 'Sibyl Learned',
        isNew: true,
      };
      setActivityLogs((prev) => [newLog, ...prev]);

      setNotificationBanner({
        title: 'Session A Consequential Memory Recorded',
        message:
          'Sibyl stored learned rule in SQLite: User historically requires 60m protected buffer before high-stakes syncs; flexible tasks must be deferred away from pre-meeting crunch.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to record Session A:', err);
      setNotificationBanner({
        title: 'Error Recording to Sibyl',
        message: err?.message || 'Could not write to Sibyl SQLite memory.',
        type: 'info',
      });
    }
  };

  // Sibyl Consequential Step 2: Start Genuinely Fresh Session B
  const handleStartFreshSessionB = async () => {
    try {
      setCurrentPhase('REPLAN');
      const res = await fetch('/api/sibyl/fresh-session-b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTimezone,
          calendarEvents: INITIAL_EVENTS,
        }),
      });
      const data = await res.json();
      const result = data.result;
      const status = data.sibylStatus;
      if (status) setSibylStatus(status);

      setCurrentSession('B');
      setApiSource(data.source || 'gemini-3.7-flash (Genkit)');
      setPlanningDecision(result.sibylPlanningDecision || null);
      setLoadBearingActive(!!result.sibylLoadBearingActive);
      setRecalledMemories(result.sibylMemoryRecalled || []);

      if (result.sibylLoadBearingActive) {
        // Material adaptation due to recalled Sibyl memory:
        // 1. Enforce 60m protected prep buffer on the Leadership Meeting (12:00 PM - 1:00 PM)
        // 2. Autonomously shift flexible Research Block to 2:30 PM - 3:45 PM
        const updatedEvents = INITIAL_EVENTS.map((evt) => {
          if (evt.id === 'evt-3') {
            return {
              ...evt,
              notes:
                '[Sibyl Memory Rule Applied]: Enforced 60-minute protected executive prep buffer (12:00 PM - 1:00 PM) to eliminate prep squeeze failure from Session A.',
              isRecentlyModified: true,
              modificationBadge: '+60m Prep Protected (Sibyl)',
            };
          }
          if (evt.id === 'evt-4') {
            return {
              ...evt,
              startTime: '2:30 PM',
              endTime: '3:45 PM',
              startMinutes: 870,
              durationMinutes: 75,
              notes:
                'Shifted from 2:00 PM to 2:30 PM by Sibyl Memory rule to ensure deep work does not collide with high-stakes preparation.',
              isRecentlyModified: true,
              modificationBadge: 'Shifted to 2:30 PM (Sibyl)',
            };
          }
          return evt;
        });
        setEvents(updatedEvents);

        if (result.newPrepItem) {
          const newPrep: PrepItem = {
            id: `prep-sibyl-${Date.now()}`,
            eventId: 'evt-3',
            eventTitle: '1:00 PM Leadership Meeting',
            title: result.newPrepItem.title || 'Protected Executive Briefing (60m Buffer)',
            summary:
              result.newPrepItem.summary ||
              'Dedicated 60-minute protected focus buffer enforced by Sibyl Memory.',
            fullContent:
              result.newPrepItem.fullContent ||
              '• Historical Lesson: Session A demonstrated that <30m prep before executive syncs leads to task abandonment.\n• Autonomous Directive: Protected 12:00 PM - 1:00 PM window reserved for core escalation synthesis.',
            tags: result.newPrepItem.tags || ['Sibyl Memory', '60m Buffer'],
            status: 'auto_added',
            permissionLevel: 'GREEN',
            sourceDoc:
              result.newPrepItem.sourceDoc || 'Sibyl Persistent Memory (workload_patterns)',
            timestamp: '8:00 AM',
          };
          // Filter out any prior Sibyl-generated prep items before adding the fresh one
          setPrepItems((prev) => [
            newPrep,
            ...prev.filter(
              (p) =>
                !p.id.startsWith('prep-sibyl') &&
                !p.title.includes('60m Buffer') &&
                !p.tags?.includes('Sibyl Memory')
            ),
          ]);
        }

        const newLog: ActivityLogEntry = {
          id: `log-fresh-b-sibyl-active`,
          timestamp: '8:00 AM',
          phase: 'PLAN',
          title: 'Fresh Session B Planned: Sibyl Memory Enforced 60m Prep Buffer',
          description:
            result.changeLogDescription ||
            'Sibyl recalled: Previous high-stakes meeting preparation was displaced and two flexible tasks went unfinished. Decision: Protected 60 minutes of preparation and moved two lower-priority tasks.',
          permissionLevel: 'GREEN',
          reasoning:
            'Autonomous execution under Green Tier: Schedule materially adapted based on persistent historical patterns in Sibyl SQLite.',
          approvalRequired: false,
          impactTag: 'Sibyl Adapted',
          isNew: true,
        };
        // Idempotent comparison logging: Replace prior Sibyl-enforced entry, preserve baseline entry
        setActivityLogs((prev) => [
          newLog,
          ...prev.filter(
            (log) =>
              log.title !== 'Fresh Session B Planned: Sibyl Memory Enforced 60m Prep Buffer' &&
              !log.id.startsWith('log-fresh-b-sibyl')
          ),
        ]);

        setNotificationBanner({
          title: 'Fresh Session B Autonomously Adapted by Sibyl Memory',
          message:
            'Sibyl recalled Session A: Previous high-stakes meeting preparation was displaced and two flexible tasks went unfinished. Decision: Protected 60 minutes of preparation and moved two lower-priority tasks.',
          type: 'replan',
        });
      } else {
        // Unlearned baseline: reset to default unbuffered schedule
        setEvents(INITIAL_EVENTS);
        // Remove all Sibyl-generated prep items and restore clean baseline prep items
        setPrepItems((prev) => {
          const nonSibylItems = prev.filter(
            (p) =>
              !p.id.startsWith('prep-sibyl') &&
              !p.title.includes('60m Buffer') &&
              !p.tags?.includes('Sibyl Memory')
          );
          return nonSibylItems.length > 0 ? nonSibylItems : INITIAL_PREP_ITEMS;
        });

        const newLog: ActivityLogEntry = {
          id: `log-fresh-b-degraded-baseline`,
          timestamp: '8:00 AM',
          phase: 'PLAN',
          title: 'Fresh Session B: Unlearned Baseline Planning',
          description:
            result.changeLogDescription ||
            'Session B initialized using standard unlearned baseline (Sibyl Memory empty or disconnected). Standard 10m briefing assigned.',
          permissionLevel: 'GREEN',
          reasoning:
            'No persistent historical memories available in Sibyl: System degraded to default unlearned baseline without protected buffers.',
          approvalRequired: false,
          impactTag: 'Baseline',
          isNew: true,
        };
        // Idempotent comparison logging: Replace prior baseline entry, preserve Sibyl-enforced entry
        setActivityLogs((prev) => [
          newLog,
          ...prev.filter(
            (log) =>
              log.title !== 'Fresh Session B: Unlearned Baseline Planning' &&
              !log.id.startsWith('log-fresh-b-degraded')
          ),
        ]);

        setNotificationBanner({
          title: 'Fresh Session B (Unlearned Baseline)',
          message:
            'Planned without historical memory protections. Standard 10m briefing assigned. Proves that Day Orchestrator requires Sibyl Memory for adaptive planning.',
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error('Failed to run fresh Session B:', err);
      setNotificationBanner({
        title: 'Session B Orchestration Error',
        message: err?.message || 'Error executing Session B flow.',
        type: 'info',
      });
    } finally {
      setCurrentPhase('WATCH');
    }
  };

  // Sibyl Step 3: Toggle Layer for Load-Bearing Verification
  const handleToggleSibylEnabled = async () => {
    try {
      const current = sibylStatus?.enabled ?? true;
      const res = await fetch('/api/sibyl/toggle-enabled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current }),
      });
      const data = await res.json();
      if (data.status) setSibylStatus(data.status);

      if (!current) {
        setNotificationBanner({
          title: 'Sibyl Persistent Memory Re-Enabled',
          message: 'Autonomous adaptive cross-session planning restored.',
          type: 'success',
        });
      } else {
        setNotificationBanner({
          title: 'Sibyl Memory Disabled (Load-Bearing Proof Mode)',
          message:
            'Sibyl layer disconnected. Starting Fresh Session B will now demonstrate degradation to standard unlearned baseline.',
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle Sibyl:', err);
    }
  };

  // Sibyl Step 3: Clear Memory
  const handleClearSibylMemory = async () => {
    try {
      const res = await fetch('/api/sibyl/clear', { method: 'POST' });
      await res.json();
      await fetchSibylStatus();
      setPlanningDecision(null);
      setLoadBearingActive(false);
      setRecalledMemories([]);
      setEvents(INITIAL_EVENTS);
      setPrepItems(INITIAL_PREP_ITEMS);
      setNotificationBanner({
        title: 'Sibyl SQLite Memory Cleared',
        message:
          'Database reset to 0 entities and 0 events. Ready to demonstrate fresh baseline vs. learned behavior.',
        type: 'info',
      });
    } catch (err: any) {
      console.error('Failed to clear Sibyl memory:', err);
    }
  };

  // Sibyl Cold-Start Verification Procedure
  const handleSimulateColdStart = async () => {
    try {
      setIsLoadingSibyl(true);
      const res = await fetch('/api/sibyl/cold-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setNotificationBanner({
          title: 'Cold-Start Verified: Disk Erased & Snapshot Restored',
          message: `Simulated container restart with blank disk. Restored ${data.coldStart?.restoredBytes || 0} bytes from ${data.coldStart?.source || 'durable storage'}. New MemoryClient recalled ${data.recallAfterRestore?.recalledMemories?.length || 0} learned rules.`,
          type: 'success',
        });
        await fetchSibylStatus();
        // Trigger fresh Session B to complete the end-to-end verification
        await handleStartFreshSessionB();
      } else {
        setNotificationBanner({
          title: 'Cold-Start Notice',
          message: data.message || 'Cold-start simulation returned no snapshot.',
          type: 'info',
        });
      }
    } catch (err: any) {
      console.error('Cold start error:', err);
    } finally {
      setIsLoadingSibyl(false);
    }
  };

  const nextEvent = isRealCalendar
    ? (events.length > 0 ? (events.find((e) => e.id === selectedEventId) || events[0]) : null)
    : (events.find((e) => e.id === selectedEventId) || events[0] || INITIAL_EVENTS[2]);

  const scrollToPrep = () => {
    const el = document.getElementById('prep-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Application Header */}
      <Header
        currentPhase={currentPhase}
        onOpenGovernance={() => setIsGovernanceOpen(true)}
        notificationCount={approvals.filter((a) => a.status === 'pending').length}
        user={user}
        isRealCalendar={isRealCalendar}
        isLoadingAuth={isLoadingAuth}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        calendarEventCount={isRealCalendar ? events.length : undefined}
        gmailCount={isRealCalendar ? gmailMessages.length : undefined}
        calendarError={calendarError}
        userTimezone={userTimezone}
        timezoneSource={timezoneSource}
        onSelectTimezone={handleSelectTimezone}
        onResetTimezoneToAuto={handleResetTimezoneToAuto}
        isCloudMemoryConnected={isCloudMemoryConnected}
        memoryRestoredSource={memoryRestoredSource}
        lastSaveStatus={lastSaveStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Sibyl Persistent Memory Hackathon Proof Console */}
        <SibylMemoryProofBar
          sibylStatus={sibylStatus}
          isLoadingSibyl={isLoadingSibyl}
          recalledMemories={recalledMemories}
          planningDecision={planningDecision}
          loadBearingActive={loadBearingActive}
          onRecordSessionA={handleRecordSessionA}
          onStartFreshSessionB={handleStartFreshSessionB}
          onToggleSibylEnabled={handleToggleSibylEnabled}
          onClearSibylMemory={handleClearSibylMemory}
          onRefreshStatus={fetchSibylStatus}
          onSimulateColdStart={handleSimulateColdStart}
          currentSession={currentSession}
        />

        {/* Interactive Simulation Sandbox Toolbar */}
        <InteractiveDemoBar
          onSimulateEmail={handleSimulateEmail}
          onProcessTranscript={handleProcessTranscript}
          onReset={handleReset}
          isSimulatingEmail={isSimulatingEmail}
          isProcessingTranscript={isProcessingTranscript}
          emailProcessed={emailSimulated}
          transcriptProcessed={transcriptProcessed}
          apiSource={apiSource}
        />

        {/* Dynamic Notification / Replanning Banner */}
        {notificationBanner && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start justify-between gap-3 border shadow-xs transition-all animate-in fade-in slide-in-from-top-2 ${
              notificationBanner.type === 'replan'
                ? 'bg-emerald-950 text-white border-emerald-800'
                : notificationBanner.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {notificationBanner.type === 'replan' ? (
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : notificationBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {notificationBanner.title}
                </h4>
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                  {notificationBanner.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => setNotificationBanner(null)}
              className="p-1 rounded hover:bg-black/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Next Upcoming Event Hero Spotlight */}
        <NextEventCard
          nextEvent={nextEvent}
          prepItems={prepItems}
          onScrollToPrep={scrollToPrep}
          emailSimulated={emailSimulated}
          isRealCalendar={isRealCalendar}
        />

        {/* Core Dashboard Grid: Timeline (Center) + Intelligence Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Center Column: Timeline (Visual Center of Product) */}
          <div className="lg:col-span-7 space-y-6">
            <TimelineView
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={(id) => setSelectedEventId(id)}
              emailSimulated={emailSimulated}
              onOpenGovernance={() => setIsGovernanceOpen(true)}
              isRealCalendar={isRealCalendar}
              onRefreshCalendar={handleRefreshCalendar}
              userTimezone={userTimezone}
            />

            {/* Commitments captured from transcript */}
            {transcriptProcessed && (
              <CommitmentsSection commitments={commitments} />
            )}

            {/* Live Gmail Section (Strict Read-Only) */}
            {isRealCalendar && (
              <LiveGmailSection
                messages={gmailMessages}
                isLoading={isLoadingGmail}
                onRefresh={handleRefreshGmail}
                error={gmailError}
                userEmail={user?.email}
              />
            )}
          </div>

          {/* Right Column: Prepared For You + Approval Needed + What Changed */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Approval Needed Area (Yellow Tier) */}
            <ApprovalNeeded
              approvals={approvals}
              onSend={handleSendApproval}
              onEdit={handleEditApproval}
              onDismiss={handleDismissApproval}
              onOpenGovernance={() => setIsGovernanceOpen(true)}
            />

            {/* Prepared For You Area (Green Tier) */}
            <div id="prep-section">
              <PreparedForYou
                prepItems={prepItems}
                emailSimulated={emailSimulated}
                isRealCalendar={isRealCalendar}
              />
            </div>

            {/* What Changed Activity Stream */}
            <WhatChangedStream logs={activityLogs} />

          </div>

        </div>

      </main>

      {/* Safety Policy / Governance Modal */}
      <PermissionGuideModal
        isOpen={isGovernanceOpen}
        onClose={() => setIsGovernanceOpen(false)}
      />

      {/* Edit Email Draft Modal */}
      <EditEmailModal
        action={editingApproval}
        isOpen={!!editingApproval}
        onClose={() => setEditingApproval(null)}
        onSaveAndSend={handleSaveAndSend}
        onSaveDraft={handleSaveDraft}
      />

    </div>
  );
}

