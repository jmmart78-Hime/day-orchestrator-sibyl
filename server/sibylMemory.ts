import { execFile } from 'child_process';
import path from 'path';
import { sibylSnapshotManager, SIBYL_DB_PATH, SnapshotDiagnostics } from './sibylSnapshotStorage.js';

export interface SibylStatus {
  connected: boolean;
  engine: string;
  schemaVersion: number;
  dbPath: string;
  entityCount: number;
  journalEventCount: number;
  hasSessionAMemory: boolean;
  enabled: boolean;
  recentEntities?: any[];
  recentJournalEvents?: any[];
  snapshot?: SnapshotDiagnostics;
  error?: string;
}

export interface SibylRecalledItem {
  source: string;
  category: string;
  name: string;
  lesson: string;
  requiredPrepBufferMinutes: number;
  scheduleStrategy: string;
  historicalFailure?: string;
  rule?: string;
  timestamp?: string;
}

export interface SibylRecallResult {
  success: boolean;
  query: string;
  recalledMemories: SibylRecalledItem[];
  matchedJournalEntries: any[];
  hasConsequentialLearning: boolean;
  enabled: boolean;
  error?: string;
}

// Runtime flag allowing demonstration of the Load-Bearing rule
// When disabled, Sibyl memory recall fails to prove the system degrades without it.
let sibylEnabled = true;

const BRIDGE_SCRIPT_PATH = path.resolve(process.cwd(), 'server', 'sibyl_bridge.py');

/**
 * Execute Python bridge script calling official sibyl-memory-client
 */
function runBridgeCommand(command: string, args: string[] = []): Promise<any> {
  return new Promise((resolve) => {
    execFile('python3', [BRIDGE_SCRIPT_PATH, command, '--db', SIBYL_DB_PATH, ...args], (error, stdout, stderr) => {
      if (error) {
        console.error(`[Sibyl Bridge Error] ${command}:`, stderr || error.message);
        return resolve({
          success: false,
          error: stderr || error.message,
        });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (parseErr) {
        console.error(`[Sibyl Parse Error] Invalid JSON output from bridge:`, stdout);
        resolve({
          success: false,
          error: 'Failed to parse JSON response from Sibyl bridge',
          raw: stdout,
        });
      }
    });
  });
}

/**
 * Restore durable snapshot on boot before initializing MemoryClient
 */
export async function initializeSibylPersistence(): Promise<any> {
  console.log('[Sibyl Memory] Checking for durable Cloud Storage snapshot...');
  const restoreResult = await sibylSnapshotManager.restoreDurableSnapshotIfPresent();
  // Probe Sibyl SDK to verify connectivity
  const status = await runBridgeCommand('status');
  sibylSnapshotManager.setSibylSdkConnected(status.connected === true);
  return { restoreResult, status };
}

/**
 * Get current health, schema, and snapshot status of Sibyl SQLite + FTS5 memory
 */
export async function getSibylStatus(): Promise<SibylStatus> {
  const snapshotDiag = sibylSnapshotManager.getDiagnostics();

  if (!sibylEnabled) {
    return {
      connected: false,
      engine: 'sibyl-memory-client (Disabled for Load-Bearing Test)',
      schemaVersion: 4,
      dbPath: path.resolve(process.cwd(), SIBYL_DB_PATH),
      entityCount: 0,
      journalEventCount: 0,
      hasSessionAMemory: false,
      enabled: false,
      snapshot: snapshotDiag,
      error: 'Sibyl Memory manually disabled to test degraded adaptive baseline',
    };
  }

  const res = await runBridgeCommand('status');
  sibylSnapshotManager.setSibylSdkConnected(res.connected === true);

  return {
    ...res,
    enabled: sibylEnabled,
    snapshot: sibylSnapshotManager.getDiagnostics(),
  };
}

/**
 * Recalls memories relevant to schedule planning via official Sibyl search + list_entities
 */
export async function recallSibylMemories(query: string = 'leadership meeting prep'): Promise<SibylRecallResult> {
  if (!sibylEnabled) {
    return {
      success: false,
      query,
      recalledMemories: [],
      matchedJournalEntries: [],
      hasConsequentialLearning: false,
      enabled: false,
      error: 'Sibyl Memory unavailable - adaptive historical planning degraded',
    };
  }

  const res = await runBridgeCommand('recall', ['--query', query]);
  return {
    ...res,
    enabled: sibylEnabled,
  };
}

/**
 * Record Session A outcome into Sibyl Memory SQLite + FTS5
 * and subsequently checkpoint durable snapshot to Cloud Storage
 */
export async function recordSessionAOutcome(): Promise<any> {
  // Step 1: Write through official Sibyl SDK
  const sibylWriteResult = await runBridgeCommand('record-session-a');
  if (!sibylWriteResult.success) {
    return {
      sibylWrite: sibylWriteResult,
      checkpoint: { success: false, error: 'Sibyl write failed; checkpoint skipped' },
    };
  }

  sibylSnapshotManager.setSibylMemoryWritten(true);

  // Step 2: Checkpoint consistent SQLite snapshot to Cloud Storage (reported separately)
  const checkpointResult = await sibylSnapshotManager.checkpointDurableSnapshot();

  return {
    ...sibylWriteResult,
    sibylWrite: {
      success: true,
      entity: sibylWriteResult.entity,
      journalId: sibylWriteResult.journalId,
      lessonSummary: sibylWriteResult.lessonSummary,
    },
    checkpoint: checkpointResult,
  };
}

/**
 * Reset Sibyl Memory to pristine 0-state in both local working DB and durable snapshot
 */
export async function clearSibylMemories(): Promise<any> {
  const clearLocalResult = await runBridgeCommand('clear');
  const clearSnapshotResult = await sibylSnapshotManager.clearDurableSnapshot();
  return {
    ...clearLocalResult,
    snapshotCleared: clearSnapshotResult.cleared,
  };
}

/**
 * Simulate container cold-start:
 * Discards local disk, downloads snapshot, instantiates fresh MemoryClient, and verifies recall
 */
export async function simulateColdStart(): Promise<any> {
  const coldStart = await sibylSnapshotManager.simulateColdStart();
  if (!coldStart.success) {
    return {
      success: false,
      message: 'Cold start simulation failed: No durable snapshot available to restore',
      coldStart,
    };
  }

  // Instantiate new MemoryClient from restored database
  const statusAfterRestore = await runBridgeCommand('status');
  // Verify recall through official Sibyl APIs
  const recallAfterRestore = await runBridgeCommand('recall', ['--query', 'leadership meeting prep']);

  return {
    success: true,
    message: 'Cold start simulated successfully: Local disk cleared, DB snapshot restored, new MemoryClient instantiated',
    coldStart,
    statusAfterRestore,
    recallAfterRestore,
  };
}

/**
 * Toggle Sibyl Memory enabled state for load-bearing tests
 */
export function setSibylEnabled(enabled: boolean): boolean {
  sibylEnabled = enabled;
  console.log(`[Sibyl Memory] Runtime enabled state set to: ${sibylEnabled}`);
  return sibylEnabled;
}

export function isSibylCurrentlyEnabled(): boolean {
  return sibylEnabled;
}
