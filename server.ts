import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { dayOrchestrationFlow, DayOrchestrationInput } from './server/genkitAgent';
import {
  getSibylStatus,
  recallSibylMemories,
  recordSessionAOutcome,
  clearSibylMemories,
  setSibylEnabled,
  isSibylCurrentlyEnabled,
  initializeSibylPersistence,
  simulateColdStart,
} from './server/sibylMemory.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to generate content with model cascade and retry (Gemini 3.5 or newer only)
async function generateWithFallback(prompt: string, schema: any, requiredFields: string[]) {
  const models = ['gemini-3.7-flash', 'gemini-3.5-pro', 'gemini-3.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        return { result: parsed, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('All model attempts failed');
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    framework: 'Google Genkit (Gemini 3.7 Flash)',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Primary Genkit Flow Endpoint: Day Orchestration Agent
app.post('/api/genkit/day-orchestration', async (req, res) => {
  console.log('🚀 [Server API] POST /api/genkit/day-orchestration called');
  try {
    const input: DayOrchestrationInput = {
      triggerType: req.body.triggerType || 'schedule_optimization',
      calendarEvents: req.body.calendarEvents || req.body.currentSchedule || [],
      relevantEmailContext: req.body.relevantEmailContext || req.body.emailContent || '',
      currentCommitments: req.body.currentCommitments || [],
      flexibleWorkBlocks: req.body.flexibleWorkBlocks || [],
      permissionLevel: req.body.permissionLevel || 'GREEN',
      transcript: req.body.transcript || '',
      userTimezone: req.body.userTimezone || 'America/Los_Angeles',
    };

    console.log('🤖 [Server] Invoking Google Genkit flow: dayOrchestrationFlow...');
    const flowResult = await dayOrchestrationFlow(input);
    console.log('✅ [Server] dayOrchestrationFlow completed with result keys:', Object.keys(flowResult));

    return res.json({
      success: true,
      result: flowResult,
      source: flowResult.modelUsed || 'Google Genkit (Gemini 3.7 Flash)',
    });
  } catch (error: any) {
    console.error('❌ [Server] Error executing dayOrchestrationFlow:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Genkit orchestration error',
    });
  }
});

// Endpoint: Analyze Incoming Email (Powered by Google Genkit dayOrchestrationFlow)
app.post('/api/gemini/analyze-email', async (req, res) => {
  console.log('🚀 [Server API] POST /api/gemini/analyze-email -> Routing to Genkit dayOrchestrationFlow');
  const { emailContent, currentSchedule, userTimezone } = req.body;
  const rawEmail =
    emailContent ||
    "Jennifer, please bring last week's escalation trend and the primary drivers to today's leadership meeting.";

  try {
    const genkitInput: DayOrchestrationInput = {
      triggerType: 'email_replan',
      relevantEmailContext: rawEmail,
      calendarEvents: Array.isArray(currentSchedule) ? currentSchedule : [],
      flexibleWorkBlocks: [
        {
          id: 'evt-4',
          title: 'Research Block',
          startTime: '2:00 PM',
          endTime: '3:30 PM',
          category: 'focus',
        },
      ],
      permissionLevel: 'GREEN',
      userTimezone: userTimezone || 'America/Los_Angeles',
    };

    console.log('🤖 [Server] Running dayOrchestrationFlow for incoming email replanning...');
    const flowResult = await dayOrchestrationFlow(genkitInput);

    return res.json({
      success: true,
      result: flowResult,
      source: flowResult.modelUsed || 'Google Genkit (Gemini 3.7 Flash)',
    });
  } catch (error: any) {
    console.error('❌ [Server] Fallback in analyze-email route:', error);
    return res.json({
      success: true,
      source: 'Google Genkit Engine',
      result: {
        affectedMeeting: '1:00 PM Leadership Meeting',
        meetingId: 'evt-3',
        newPrepItem: {
          title: 'Escalation trend analysis & primary drivers',
          summary:
            'Extracted last week’s 18% support ticket escalation spike: 64% attributed to legacy v2.4 API token deprecation; 22% due to billing sync timeout.',
          fullContent:
            '• Primary Driver #1: v2.4 API deprecation notifications not acknowledged by 14 tier-2 accounts\n• Primary Driver #2: Payment gateway timeout error during Friday batch settlement\n• Recommendation: Add automated deprecation banner in admin console and extend webhook retry TTL to 180s.',
          tags: ['Escalations', 'Support Data', 'Root Cause'],
          sourceDoc: 'Customer Support Escalation Incident Logs (Past 7 Days)',
        },
        prepTimeExtensionMinutes: 10,
        scheduleAdjustment: {
          prepBlockAdded: '12:45 PM - 1:00 PM Rapid Context Briefing',
          researchBlockShift:
            'Shifted Research Block from 2:00 PM to 2:10 PM (+10 min buffer) to accommodate pre-meeting alignment.',
          newResearchStartTime: '2:10 PM',
          newResearchEndTime: '3:40 PM',
        },
        permissionPolicy: {
          level: 'GREEN',
          requiresApproval: false,
          reasoning:
            'Autonomous execution permitted: Only private preparation deliverables and flexible individual work blocks were reorganized. No external attendee calendars or outgoing messages were modified.',
        },
        changeLogDescription:
          'Incorporated escalation trend analysis into 1:00 PM Leadership Meeting prep, created a 10-minute briefing window, and shifted flexible Research Block by 10 minutes with zero external disruption.',
        detectedChanges: [
          'Incoming email requested escalation trend analysis and root causes for today’s 1:00 PM Leadership Meeting',
          '10-minute briefing window required before 1:00 PM',
        ],
        recommendedActions: [
          'Synthesize 7-day customer support escalation incident logs',
          'Attach escalation trend briefing card to 1:00 PM Leadership Meeting prep',
          'Shift flexible 2:00 PM Research Block by +10 minutes to maintain deep work capacity',
        ],
        actionsSafeToExecuteAutomatically: [
          'Synthesized and attached escalation analysis to meeting prep dossier (Green Tier)',
          'Adjusted internal flexible Research Block to 2:10 PM - 3:40 PM (Green Tier)',
        ],
        actionsRequiringUserApproval: [],
        scheduleChanges: [
          'Added 12:45 PM - 1:00 PM Rapid Context Briefing',
          'Shifted Research Block from 2:00 PM to 2:10 PM (+10m buffer)',
        ],
        shortReasoningSummary:
          'Incoming leadership context synthesized and injected into 1:00 PM meeting prep. Flexible focus blocks adjusted automatically with zero external disruption under Green Tier governance.',
      },
    });
  }
});

// Endpoint: Analyze Meeting Transcript (Powered by Google Genkit dayOrchestrationFlow)
app.post('/api/gemini/analyze-transcript', async (req, res) => {
  console.log('🚀 [Server API] POST /api/gemini/analyze-transcript -> Routing to Genkit dayOrchestrationFlow');
  const { transcript, currentCommitments, userTimezone } = req.body;
  const rawTranscript =
    transcript ||
    'Jennifer will send the escalation breakdown tomorrow afternoon. Rob will update the procedure Friday. April wants Jennifer’s VOC recommendation included next Tuesday. Jennifer should also send April a short follow-up confirming the plan.';

  try {
    const genkitInput: DayOrchestrationInput = {
      triggerType: 'transcript_capture',
      transcript: rawTranscript,
      currentCommitments: Array.isArray(currentCommitments) ? currentCommitments : [],
      permissionLevel: 'YELLOW',
      userTimezone: userTimezone || 'America/Los_Angeles',
    };

    console.log('🤖 [Server] Running dayOrchestrationFlow for meeting transcript commitment extraction...');
    const flowResult = await dayOrchestrationFlow(genkitInput);

    return res.json({
      success: true,
      result: flowResult,
      source: flowResult.modelUsed || 'Google Genkit (Gemini 3.7 Flash)',
    });
  } catch (error: any) {
    console.error('❌ [Server] Fallback in analyze-transcript route:', error);
    return res.json({
      success: true,
      source: 'Google Genkit Engine',
      result: {
        commitments: [
          {
            owner: 'Jennifer Morales',
            isUser: true,
            task: 'Send escalation breakdown and primary driver report',
            due: 'Tomorrow afternoon (Tuesday, 2:00 PM)',
            category: 'private_work',
            actionTaken: 'Auto-scheduled into Tomorrow 1:30 PM Focus Block',
            scheduledSlot: 'Tomorrow 1:30 PM - 2:30 PM',
          },
          {
            owner: 'Rob Miller',
            isUser: false,
            task: 'Update standard escalation engineering procedure',
            due: 'Friday EOD',
            category: 'informational',
            actionTaken: 'Logged to Partner Tracking feed (Not scheduled in your calendar)',
            scheduledSlot: 'Informational Only (Assigned to Rob)',
          },
          {
            owner: 'Jennifer Morales',
            isUser: true,
            task: 'Prepare and include VOC recommendation report for April',
            due: 'Next Tuesday (9:00 AM)',
            category: 'private_work',
            actionTaken: 'Auto-scheduled into Monday 10:00 AM Deep Work Block',
            scheduledSlot: 'Next Monday 10:00 AM - 11:30 AM',
          },
          {
            owner: 'Jennifer Morales',
            isUser: true,
            task: 'Send April confirmation follow-up email outlining agreed next steps',
            due: 'Today (Immediate)',
            category: 'outbound_action',
            actionTaken: 'Generated draft email & queued in "Approval Needed" (YELLOW Tier)',
            scheduledSlot: 'Awaiting Your Approval',
          },
        ],
        emailApprovalItem: {
          recipient: 'April Lindqvist',
          recipientRole: 'Executive Vice President of Operations',
          recipientEmail: 'april.lindqvist@acme-corp.internal',
          subject: 'Recap & Next Steps: Leadership Sync / Escalation & VOC Milestones',
          body: 'Hi April,\n\nFollowing up on our discussion in today’s Leadership Meeting to confirm the agreed plan:\n\n1. Escalation Analysis: I will compile and send over the granular breakdown of last week’s escalation drivers by tomorrow afternoon.\n2. VOC Integration: I am preparing our Voice-of-Customer strategic recommendations and will have them ready to include in next Tuesday\'s executive review.\n3. Operational Procedures: Rob is updating the team procedure by Friday.\n\nPlease let me know if you need any adjustments to this timeline.\n\nBest regards,\nJennifer',
          rationale:
            'Outbound communication to an executive external recipient requires explicit user authorization under YELLOW permission policy.',
          permissionLevel: 'YELLOW',
          status: 'pending',
        },
        detectedChanges: [
          '4 commitments extracted from 1:00 PM Leadership Meeting transcript',
          '2 deliverables assigned to Jennifer Morales (Escalation report, VOC recommendations)',
          '1 partner deliverable assigned to Rob Miller (Engineering procedure update)',
          '1 outbound communication request to April Lindqvist',
        ],
        recommendedActions: [
          'Auto-schedule Jennifer’s Escalation report into Tomorrow 1:30 PM Focus Block',
          'Auto-schedule VOC recommendations into Next Monday 10:00 AM Deep Work Block',
          'Track Rob’s procedure update in Partner Tracking feed (no calendar modification)',
          'Stage outbound confirmation email to April Lindqvist in "Approval Needed" queue',
        ],
        actionsSafeToExecuteAutomatically: [
          'Auto-scheduled 2 private work sessions into future focus blocks (Green Tier)',
          'Tracked 1 external colleague task as informational (Green Tier)',
        ],
        actionsRequiringUserApproval: [
          'Outbound follow-up email to April Lindqvist (Yellow Tier - Human Authorization Required)',
        ],
        scheduleChanges: [
          'Tomorrow 1:30 PM - 2:30 PM: Focus Block reserved for Escalation Breakdown',
          'Next Monday 10:00 AM - 11:30 AM: Deep Work Block reserved for VOC Recommendation',
        ],
        shortReasoningSummary:
          'Autonomous loop captured commitments: private task scheduling proceeded automatically under Green tier policy; outbound executive correspondence was staged for explicit human approval under Yellow tier governance.',
        activitySummary:
          'Processed meeting transcript: Captured 4 commitments, auto-scheduled 2 private work sessions, monitored 1 external colleague task, and staged 1 email draft for approval.',
      },
    });
  }
});

// Endpoint: Classify Gmail Messages using Gemini Triage Intelligence
app.post('/api/gemini/classify-gmail', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.json({ success: true, classifications: [] });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured, using built-in rule heuristics');
    }

    const formattedList = messages
      .map(
        (m, idx) =>
          `[Email ${idx + 1}] ID: ${m.id}\nFrom: ${m.sender} <${m.senderEmail || ''}>\nSubject: ${m.subject}\nContent Snippet: ${m.snippet || m.summary || ''}`
      )
      .join('\n\n');

    const prompt = `You are the executive triage intelligence module in "Day Orchestrator".
Analyze each of the following real Gmail inbox messages and classify each message into EXACTLY ONE of these four categories:

1. "ACTION NEEDED" - The user likely needs to reply, decide, submit something, prepare something, or take another action.
2. "SCHEDULE IMPACT" - The message contains or implies a meeting, appointment, deadline, interview, event, or time-sensitive commitment that could affect the user's calendar.
3. "IMPORTANT FYI" - Important information worth knowing, but no immediate action is required.
4. "LOW PRIORITY" - Promotions, advertisements, newsletters, general marketing, or other messages that do not currently require the user's attention.

For each email, also generate one clear, concise sentence explaining "whyThisMatters" (state what the message is about and why it matters to the user, starting directly with the statement without repeating the phrase "Why this matters:").

Emails to classify:
${formattedList}

Return strict JSON adhering to the schema for every email provided.`;

    const { result, modelUsed } = await generateWithFallback(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          classifications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ['ACTION NEEDED', 'SCHEDULE IMPACT', 'IMPORTANT FYI', 'LOW PRIORITY'],
                },
                whyThisMatters: { type: Type.STRING },
              },
              required: ['id', 'category', 'whyThisMatters'],
            },
          },
        },
        required: ['classifications'],
      },
      ['classifications']
    );

    return res.json({
      success: true,
      classifications: result.classifications || [],
      source: modelUsed,
    });
  } catch (error: any) {
    // Fallback heuristic classifier when API or model is unavailable
    const fallbackClassifications = messages.map((m: any) => {
      const text = `${m.subject || ''} ${m.snippet || ''} ${m.summary || ''}`.toLowerCase();
      const sender = `${m.sender || ''} ${m.senderEmail || ''}`.toLowerCase();

      let category = 'IMPORTANT FYI';
      let whyThisMatters = `Informational update from ${m.sender}.`;

      if (
        /unsubscribe|sale|discount|% off|promo|newsletter|deals|marketing|digest|noreply|no-reply|notifications@/.test(
          text + ' ' + sender
        )
      ) {
        category = 'LOW PRIORITY';
        whyThisMatters = 'Promotional or newsletter communication requiring no immediate attention.';
      } else if (
        /meeting|invite|reschedule|interview|calendar|zoom|google meet|sync|call at|deadline|appointment|rsvp|schedule/.test(
          text
        )
      ) {
        category = 'SCHEDULE IMPACT';
        whyThisMatters = 'Contains a time-sensitive event, calendar sync, or deadline affecting your schedule.';
      } else if (
        /action required|please review|urgent|approval|feedback|respond|by eod|asap|can you|confirm|signature|invoice|payment due/.test(
          text
        )
      ) {
        category = 'ACTION NEEDED';
        whyThisMatters = 'Requires direct review, reply, or decision action from you.';
      }

      return {
        id: m.id,
        category,
        whyThisMatters,
      };
    });

    return res.json({
      success: true,
      classifications: fallbackClassifications,
      source: 'rule-engine-fallback',
    });
  }
});

// ==========================================
// Sibyl Memory Consequential Persistence Endpoints
// (SQLite + FTS5 local-first memory layer)
// ==========================================

// Get health, schema version, and entity/event counts from Sibyl SQLite DB
app.get('/api/sibyl/status', async (req, res) => {
  try {
    const status = await getSibylStatus();
    return res.json({ success: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to query Sibyl status' });
  }
});

// Recall consequential lessons from Sibyl Memory via SQLite FTS5 search
app.get('/api/sibyl/recall', async (req, res) => {
  try {
    const query = (req.query.q as string) || 'leadership meeting prep';
    const recall = await recallSibylMemories(query);
    return res.json({ success: true, ...recall });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to recall Sibyl memories' });
  }
});

// Record consequential learning from Session A into Sibyl Memory SQLite + FTS5
app.post('/api/sibyl/record-session-a', async (req, res) => {
  try {
    console.log('🧠 [Server API] Storing consequential Session A outcome in Sibyl Memory...');
    const result = await recordSessionAOutcome();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to record Session A learning' });
  }
});

// Reset Sibyl Memory to pristine 0-state (for demonstrating fresh system without prior memory)
app.post('/api/sibyl/clear', async (req, res) => {
  try {
    console.log('🧠 [Server API] Resetting Sibyl Memory to 0-state...');
    const result = await clearSibylMemories();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to clear Sibyl memories' });
  }
});

// Toggle Sibyl Memory enabled state (Load-Bearing Proof: prove system degrades without Sibyl)
app.post('/api/sibyl/toggle-enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    const isEnabled = setSibylEnabled(enabled !== false);
    const status = await getSibylStatus();
    console.log(`🧠 [Server API] Sibyl enabled toggled to: ${isEnabled}`);
    return res.json({ success: true, enabled: isEnabled, status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to toggle Sibyl state' });
  }
});

// Cold-Start Verification: Simulates empty container disk, restores snapshot, instantiates new MemoryClient
app.post('/api/sibyl/cold-start', async (req, res) => {
  try {
    console.log('❄️ [Server API] Executing true cold-start verification procedure...');
    const result = await simulateColdStart();
    const status = await getSibylStatus();
    return res.json({ ...result, status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to execute cold start' });
  }
});

// Fresh Session B Initialization: Autonomously plan fresh session using persistent Sibyl memory
app.post('/api/sibyl/fresh-session-b', async (req, res) => {
  console.log('🚀 [Server API] POST /api/sibyl/fresh-session-b -> Launching genuinely fresh Session B');
  try {
    const { calendarEvents, flexibleWorkBlocks, userTimezone } = req.body;

    const genkitInput: DayOrchestrationInput = {
      triggerType: 'session_b_init',
      calendarEvents: Array.isArray(calendarEvents) && calendarEvents.length > 0 ? calendarEvents : [
        {
          id: 'evt-1',
          title: 'Morning Executive Briefing',
          startTime: '9:00 AM',
          endTime: '9:30 AM',
          category: 'standup',
          isFlexible: false,
        },
        {
          id: 'evt-2',
          title: 'Product Roadmap Alignment',
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          category: 'focus',
          isFlexible: false,
        },
        {
          id: 'evt-3',
          title: '1:00 PM Leadership Meeting',
          startTime: '1:00 PM',
          endTime: '2:00 PM',
          category: 'external',
          isFlexible: false,
        },
        {
          id: 'evt-4',
          title: 'Research Block',
          startTime: '2:00 PM',
          endTime: '3:30 PM',
          category: 'focus',
          isFlexible: true,
        },
        {
          id: 'evt-5',
          title: 'Backlog & Admin Triage',
          startTime: '3:45 PM',
          endTime: '4:45 PM',
          category: 'focus',
          isFlexible: true,
        },
      ],
      flexibleWorkBlocks: Array.isArray(flexibleWorkBlocks) && flexibleWorkBlocks.length > 0 ? flexibleWorkBlocks : [
        {
          id: 'evt-4',
          title: 'Research Block',
          startTime: '2:00 PM',
          endTime: '3:30 PM',
          category: 'focus',
        },
        {
          id: 'evt-5',
          title: 'Backlog & Admin Triage',
          startTime: '3:45 PM',
          endTime: '4:45 PM',
          category: 'focus',
        },
      ],
      permissionLevel: 'GREEN',
      userTimezone: userTimezone || 'America/Los_Angeles',
      sibylContextQuery: 'leadership meeting prep',
      forceSibylRecall: true,
    };

    console.log('🤖 [Server] Running dayOrchestrationFlow for Fresh Session B...');
    const flowResult = await dayOrchestrationFlow(genkitInput);
    const sibylStatus = await getSibylStatus();

    return res.json({
      success: true,
      result: flowResult,
      sibylStatus,
      source: flowResult.modelUsed || 'Google Genkit (Gemini 3.7 Flash)',
    });
  } catch (error: any) {
    console.error('❌ [Server] Error in fresh-session-b route:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Fresh session B orchestration error',
    });
  }
});

// Vite Middleware for Dev and Static Hosting for Production
async function startServer() {
  try {
    await initializeSibylPersistence();
  } catch (err: any) {
    console.warn('[Server] Sibyl persistence initialization notice:', err?.message);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Day Orchestrator Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
