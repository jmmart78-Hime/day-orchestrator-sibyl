import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Storage } from '@google-cloud/storage';

const execFileAsync = promisify(execFile);

// Configuration from environment variables
export const SIBYL_DB_PATH = process.env.SIBYL_DB_PATH || 'data/sibyl_memory.db';
export const SIBYL_BACKUP_BUCKET = process.env.SIBYL_BACKUP_BUCKET || '';
export const SIBYL_BACKUP_OBJECT = process.env.SIBYL_BACKUP_OBJECT || 'sibyl/sibyl_memory_snapshot.db';

const DURABLE_LOCAL_STORE_DIR = 'data/.durable_snapshot_store';
const DURABLE_LOCAL_STORE_FILE = path.join(DURABLE_LOCAL_STORE_DIR, 'sibyl_memory_snapshot.db');
const STAGING_CHECKPOINT_FILE = 'data/.staging_checkpoint.db';

// Visible diagnostic states
export interface SnapshotDiagnostics {
  sibylSdkConnected: boolean;
  durableSnapshotRestored: boolean;
  sibylMemoryWritten: boolean;
  durableSnapshotCheckpointed: boolean;
  freshRuntimeMemoryRestored: boolean;
  transportType: 'gcs' | 'local_archive' | 'none';
  backupBucket: string | null;
  backupObject: string;
  lastCheckpointTime: string | null;
  lastRestoreTime: string | null;
  lastCheckpointBytes: number;
  lastCheckpointError: string | null;
  lastRestoreError: string | null;
  cloudStorageConfigured: boolean;
}

class SibylSnapshotManager {
  private diagnostics: SnapshotDiagnostics = {
    sibylSdkConnected: true,
    durableSnapshotRestored: false,
    sibylMemoryWritten: false,
    durableSnapshotCheckpointed: false,
    freshRuntimeMemoryRestored: false,
    transportType: SIBYL_BACKUP_BUCKET ? 'gcs' : 'local_archive',
    backupBucket: SIBYL_BACKUP_BUCKET || null,
    backupObject: SIBYL_BACKUP_OBJECT,
    lastCheckpointTime: null,
    lastRestoreTime: null,
    lastCheckpointBytes: 0,
    lastCheckpointError: null,
    lastRestoreError: null,
    cloudStorageConfigured: Boolean(SIBYL_BACKUP_BUCKET),
  };

  private storage: Storage | null = null;

  constructor() {
    if (SIBYL_BACKUP_BUCKET) {
      try {
        this.storage = new Storage();
      } catch (err: any) {
        console.warn('[SibylSnapshot] Cloud Storage client initialization error:', err?.message);
      }
    }
  }

  public getDiagnostics(): SnapshotDiagnostics {
    return { ...this.diagnostics };
  }

  public setSibylSdkConnected(connected: boolean) {
    this.diagnostics.sibylSdkConnected = connected;
  }

  public setSibylMemoryWritten(written: boolean) {
    this.diagnostics.sibylMemoryWritten = written;
  }

  /**
   * Called during server initialization before initializing MemoryClient.local().
   * Checks if durable snapshot exists in Cloud Storage (or local archive).
   * If found, downloads and installs it as SIBYL_DB_PATH.
   * If not found, allows official Sibyl SDK to initialize a fresh database.
   */
  public async restoreDurableSnapshotIfPresent(): Promise<{
    restored: boolean;
    source: 'gcs' | 'local_archive' | 'none';
    bytes: number;
    error?: string;
  }> {
    const dbDir = path.dirname(SIBYL_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Attempt 1: Check Google Cloud Storage if bucket is configured
    if (this.storage && SIBYL_BACKUP_BUCKET) {
      try {
        const bucket = this.storage.bucket(SIBYL_BACKUP_BUCKET);
        const file = bucket.file(SIBYL_BACKUP_OBJECT);
        const [exists] = await file.exists();

        if (exists) {
          const tempRestorePath = `${SIBYL_DB_PATH}.restore_staging`;
          await file.download({ destination: tempRestorePath });

          // Validate SQLite file header
          if (this.isValidSqliteFile(tempRestorePath)) {
            // Clean up any existing db and WAL files
            this.cleanLocalDbFiles(SIBYL_DB_PATH);
            fs.renameSync(tempRestorePath, SIBYL_DB_PATH);

            const stat = fs.statSync(SIBYL_DB_PATH);
            this.diagnostics.durableSnapshotRestored = true;
            this.diagnostics.freshRuntimeMemoryRestored = true;
            this.diagnostics.transportType = 'gcs';
            this.diagnostics.lastRestoreTime = new Date().toISOString();
            this.diagnostics.lastRestoreError = null;

            console.log(`[SibylSnapshot] Restored ${stat.size} bytes from gs://${SIBYL_BACKUP_BUCKET}/${SIBYL_BACKUP_OBJECT}`);
            return { restored: true, source: 'gcs', bytes: stat.size };
          } else {
            fs.unlinkSync(tempRestorePath);
            throw new Error('Downloaded snapshot is not a valid SQLite database');
          }
        }
      } catch (err: any) {
        console.warn(`[SibylSnapshot] GCS restore check failed: ${err.message}`);
        this.diagnostics.lastRestoreError = err.message;
      }
    }

    // Attempt 2: Check local durable archive
    if (fs.existsSync(DURABLE_LOCAL_STORE_FILE)) {
      try {
        if (this.isValidSqliteFile(DURABLE_LOCAL_STORE_FILE)) {
          this.cleanLocalDbFiles(SIBYL_DB_PATH);
          fs.copyFileSync(DURABLE_LOCAL_STORE_FILE, SIBYL_DB_PATH);

          const stat = fs.statSync(SIBYL_DB_PATH);
          this.diagnostics.durableSnapshotRestored = true;
          this.diagnostics.freshRuntimeMemoryRestored = true;
          this.diagnostics.transportType = 'local_archive';
          this.diagnostics.lastRestoreTime = new Date().toISOString();
          this.diagnostics.lastRestoreError = null;

          console.log(`[SibylSnapshot] Restored ${stat.size} bytes from local durable snapshot archive`);
          return { restored: true, source: 'local_archive', bytes: stat.size };
        }
      } catch (err: any) {
        console.warn(`[SibylSnapshot] Local archive restore failed: ${err.message}`);
        this.diagnostics.lastRestoreError = err.message;
      }
    }

    console.log('[SibylSnapshot] No existing durable snapshot found. Official Sibyl SDK will initialize fresh database.');
    return { restored: false, source: 'none', bytes: 0 };
  }

  /**
   * After every successful consequential Sibyl write:
   * 1. Checkpoints WAL via SQLite backup API (export-snapshot).
   * 2. Uploads consistent database copy to private Cloud Storage bucket.
   * 3. Retains durable archive copy for cold-start testing.
   * 4. Reports checkpoint success/failure separately from Sibyl write success.
   */
  public async checkpointDurableSnapshot(): Promise<{
    success: boolean;
    bytes: number;
    gcsUploaded: boolean;
    localArchiveSaved: boolean;
    error?: string;
  }> {
    if (!fs.existsSync(SIBYL_DB_PATH)) {
      return { success: false, bytes: 0, gcsUploaded: false, localArchiveSaved: false, error: 'Database file not found' };
    }

    let exportedBytes = 0;
    try {
      // Step 1: Use Python bridge + SQLite online backup to create a 100% consistent copy with committed WAL
      const bridgeScript = path.resolve('server/sibyl_bridge.py');
      const stagingTarget = path.resolve(STAGING_CHECKPOINT_FILE);

      const { stdout } = await execFileAsync('python3', [
        bridgeScript,
        'export-snapshot',
        '--db', SIBYL_DB_PATH,
        '--target', stagingTarget,
      ]);

      const exportResult = JSON.parse(stdout.trim());
      exportedBytes = exportResult.sizeBytes || fs.statSync(stagingTarget).size;

      // Step 2: Always maintain local durable archive
      fs.mkdirSync(DURABLE_LOCAL_STORE_DIR, { recursive: true });
      fs.copyFileSync(stagingTarget, DURABLE_LOCAL_STORE_FILE);
      const localArchiveSaved = true;

      // Step 3: Upload to Cloud Storage if bucket is configured
      let gcsUploaded = false;
      let gcsError: string | null = null;

      if (this.storage && SIBYL_BACKUP_BUCKET) {
        try {
          const bucket = this.storage.bucket(SIBYL_BACKUP_BUCKET);
          await bucket.upload(stagingTarget, {
            destination: SIBYL_BACKUP_OBJECT,
            metadata: {
              contentType: 'application/x-sqlite3',
              metadata: {
                engine: 'sibyl-memory-client',
                checkpointTime: new Date().toISOString(),
              },
            },
          });
          gcsUploaded = true;
          this.diagnostics.transportType = 'gcs';
        } catch (uploadErr: any) {
          gcsError = uploadErr.message;
          console.warn(`[SibylSnapshot] GCS upload error: ${uploadErr.message}`);
        }
      }

      // Cleanup staging file
      if (fs.existsSync(stagingTarget)) {
        fs.unlinkSync(stagingTarget);
      }

      this.diagnostics.durableSnapshotCheckpointed = true;
      this.diagnostics.lastCheckpointTime = new Date().toISOString();
      this.diagnostics.lastCheckpointBytes = exportedBytes;
      this.diagnostics.lastCheckpointError = gcsError;

      return {
        success: true,
        bytes: exportedBytes,
        gcsUploaded,
        localArchiveSaved,
        error: gcsError || undefined,
      };
    } catch (err: any) {
      console.error('[SibylSnapshot] Checkpoint export failed:', err);
      this.diagnostics.lastCheckpointError = err.message;
      return {
        success: false,
        bytes: 0,
        gcsUploaded: false,
        localArchiveSaved: false,
        error: err.message,
      };
    }
  }

  /**
   * Resets both the local working DB and durable snapshot to 0-state.
   */
  public async clearDurableSnapshot(): Promise<{ cleared: boolean; error?: string }> {
    try {
      this.cleanLocalDbFiles(SIBYL_DB_PATH);
      if (fs.existsSync(DURABLE_LOCAL_STORE_FILE)) {
        fs.unlinkSync(DURABLE_LOCAL_STORE_FILE);
      }

      if (this.storage && SIBYL_BACKUP_BUCKET) {
        try {
          const bucket = this.storage.bucket(SIBYL_BACKUP_BUCKET);
          const file = bucket.file(SIBYL_BACKUP_OBJECT);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }
        } catch (gcsDelErr: any) {
          console.warn('[SibylSnapshot] GCS delete error:', gcsDelErr.message);
        }
      }

      this.diagnostics.durableSnapshotRestored = false;
      this.diagnostics.durableSnapshotCheckpointed = false;
      this.diagnostics.sibylMemoryWritten = false;
      this.diagnostics.freshRuntimeMemoryRestored = false;
      this.diagnostics.lastCheckpointTime = null;
      this.diagnostics.lastRestoreTime = null;

      return { cleared: true };
    } catch (err: any) {
      return { cleared: false, error: err.message };
    }
  }

  /**
   * Simulates a true container cold-start with empty local disk:
   * 1. Deletes working SQLite DB files from local disk.
   * 2. Restores DB snapshot from durable Cloud Storage / store.
   * 3. Instantiates a new MemoryClient from restored DB.
   */
  public async simulateColdStart(): Promise<{
    success: boolean;
    restoredBytes: number;
    source: 'gcs' | 'local_archive' | 'none';
    error?: string;
  }> {
    // Simulate container death: erase local working disk
    this.cleanLocalDbFiles(SIBYL_DB_PATH);

    // Boot fresh container restore procedure
    const restoreResult = await this.restoreDurableSnapshotIfPresent();

    return {
      success: restoreResult.restored,
      restoredBytes: restoreResult.bytes,
      source: restoreResult.source,
      error: restoreResult.error,
    };
  }

  private cleanLocalDbFiles(dbPath: string) {
    const targets = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`];
    for (const file of targets) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (e) {
          // Ignore unlink errors
        }
      }
    }
  }

  private isValidSqliteFile(filePath: string): boolean {
    try {
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
      return buffer.toString('utf8', 0, 15) === 'SQLite format 3';
    } catch (e) {
      return false;
    }
  }
}

export const sibylSnapshotManager = new SibylSnapshotManager();
