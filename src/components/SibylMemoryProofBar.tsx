import React, { useState } from 'react';
import {
  Brain,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Loader2,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Code2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cloud,
  HardDrive,
  RefreshCw,
  Archive,
} from 'lucide-react';
import { SibylStatusResponse, SibylRecalledMemory } from '../types';

interface SibylMemoryProofBarProps {
  sibylStatus: SibylStatusResponse | null;
  isLoadingSibyl: boolean;
  recalledMemories: SibylRecalledMemory[];
  planningDecision: string | null;
  loadBearingActive: boolean;
  onRecordSessionA: () => Promise<void>;
  onStartFreshSessionB: () => Promise<void>;
  onToggleSibylEnabled: () => Promise<void>;
  onClearSibylMemory: () => Promise<void>;
  onRefreshStatus: () => Promise<void>;
  onSimulateColdStart?: () => Promise<void>;
  currentSession: 'A' | 'B' | 'INITIAL';
}

export const SibylMemoryProofBar: React.FC<SibylMemoryProofBarProps> = ({
  sibylStatus,
  isLoadingSibyl,
  recalledMemories,
  planningDecision,
  loadBearingActive,
  onRecordSessionA,
  onStartFreshSessionB,
  onToggleSibylEnabled,
  onClearSibylMemory,
  onSimulateColdStart,
  currentSession,
}) => {
  const [showDbInspector, setShowDbInspector] = useState(false);
  const [isRecordingA, setIsRecordingA] = useState(false);
  const [isStartingB, setIsStartingB] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isColdStarting, setIsColdStarting] = useState(false);

  const isEnabled = sibylStatus?.enabled ?? true;
  const hasSessionAData = sibylStatus?.hasSessionAMemory || (sibylStatus?.entityCount ?? 0) > 0;
  const snapshot = sibylStatus?.snapshot;

  const handleRecordA = async () => {
    setIsRecordingA(true);
    try {
      await onRecordSessionA();
    } finally {
      setIsRecordingA(false);
    }
  };

  const handleStartB = async () => {
    setIsStartingB(true);
    try {
      await onStartFreshSessionB();
    } finally {
      setIsStartingB(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleSibylEnabled();
    } finally {
      setIsToggling(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Reset Sibyl SQLite memory to 0-state?')) return;
    setIsClearing(true);
    try {
      await onClearSibylMemory();
    } finally {
      setIsClearing(false);
    }
  };

  const handleColdStart = async () => {
    if (!onSimulateColdStart) return;
    setIsColdStarting(true);
    try {
      await onSimulateColdStart();
    } finally {
      setIsColdStarting(false);
    }
  };

  return (
    <section aria-label="Sibyl Persistent Memory Proof Console" className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-indigo-950/80 mb-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Connectivity Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Sibyl Persistent Memory
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  Official SDK v0.8.0 • SQLite v4 + FTS5
                </span>
              </h3>

              {isEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Load-Bearing Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  Memory Disabled (Degraded Test)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-0.5">
              Consequential cross-session learning engine: stores historical prep failures and adapts fresh session plans with durable Cloud Storage snapshotting.
            </p>
          </div>
        </div>

        {/* Database Stats & Inspector Toggle */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-300 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Entities: <strong className="text-white">{sibylStatus?.entityCount ?? 0}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Journal: <strong className="text-white">{sibylStatus?.journalEventCount ?? 0}</strong></span>
          </div>

          <button
            onClick={() => setShowDbInspector(!showDbInspector)}
            className="px-2.5 py-1 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Inspect raw SQLite database contents and FTS5 index"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-300" />
            <span>Inspect SQLite & Snapshots</span>
            {showDbInspector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 5 Required Visible Diagnostic States */}
      <div className="mt-3 py-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Persistence Diagnostics:
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {/* State 1: Sibyl SDK Connected */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono ${
            snapshot?.sibylSdkConnected
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${snapshot?.sibylSdkConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            1. Sibyl SDK Connected
          </span>

          {/* State 2: Durable Snapshot Restored */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono ${
            snapshot?.durableSnapshotRestored
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-slate-800/60 text-slate-500 border border-slate-800'
          }`}>
            <Archive className="w-3 h-3" />
            2. Snapshot Restored
          </span>

          {/* State 3: Sibyl Memory Written */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono ${
            hasSessionAData || snapshot?.sibylMemoryWritten
              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              : 'bg-slate-800/60 text-slate-500 border border-slate-800'
          }`}>
            <Database className="w-3 h-3" />
            3. Memory Written
          </span>

          {/* State 4: Durable Snapshot Checkpointed */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono ${
            snapshot?.durableSnapshotCheckpointed
              ? 'bg-purple-950 text-purple-300 border border-purple-800'
              : 'bg-slate-800/60 text-slate-500 border border-slate-800'
          }`}>
            <Cloud className="w-3 h-3" />
            4. Snapshot Checkpointed
            {snapshot?.lastCheckpointBytes ? ` (${(snapshot.lastCheckpointBytes / 1024).toFixed(0)}KB)` : ''}
          </span>

          {/* State 5: Fresh Runtime Memory Restored */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono ${
            snapshot?.freshRuntimeMemoryRestored
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'bg-slate-800/60 text-slate-500 border border-slate-800'
          }`}>
            <RefreshCw className="w-3 h-3" />
            5. Fresh Runtime Restored
          </span>
        </div>

        {/* Transport Indicator */}
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <HardDrive className="w-3 h-3 text-indigo-400" />
          <span>Transport:</span>
          <span className="text-slate-200">
            {snapshot?.backupBucket ? `GCS (gs://${snapshot.backupBucket})` : 'Durable Local Archive (Offline Safe)'}
          </span>
        </div>
      </div>

      {/* 4-Step Hackathon Load-Bearing Proof Workflow */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Step 1: Record Session A Consequential Outcome */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          hasSessionAData
            ? 'bg-slate-800/60 border-indigo-500/40'
            : 'bg-slate-800/30 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-300">
              Step 1 • Session A
            </span>
            {hasSessionAData && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Learned
              </span>
            )}
          </div>

          <h4 className="text-xs font-bold text-white mb-1">
            End Session A with Prep Failure
          </h4>
          <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Overloaded afternoon: 10m prep was squeezed, 2 flexible tasks abandoned. Stores learned rule in Sibyl SQLite & checkpoints snapshot.
          </p>

          <button
            id="btn-sibyl-record-session-a"
            onClick={handleRecordA}
            disabled={isRecordingA || !isEnabled}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              hasSessionAData
                ? 'bg-slate-700 hover:bg-slate-600 text-indigo-200 border border-indigo-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecordingA ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" />
            ) : hasSessionAData ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Brain className="w-3.5 h-3.5" />
            )}
            <span>{hasSessionAData ? 'Re-Record Session A' : 'Record Session A Outcome'}</span>
          </button>
        </div>

        {/* Step 2: Start Genuinely Fresh Session B */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          currentSession === 'B'
            ? 'bg-slate-800/80 border-emerald-500/50 ring-1 ring-emerald-500/30'
            : 'bg-slate-800/30 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-300">
              Step 2 • Session B (Proof)
            </span>
            {currentSession === 'B' && loadBearingActive && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                Adaptive Replan
              </span>
            )}
          </div>

          <h4 className="text-xs font-bold text-white mb-1">
            Start Genuinely Fresh Session B
          </h4>
          <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Fresh morning session. Sibyl FTS5 recalls prior prep failure and autonomously allocates a 60m protected prep buffer.
          </p>

          <button
            id="btn-sibyl-fresh-session-b"
            onClick={handleStartB}
            disabled={isStartingB}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              currentSession === 'B'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isStartingB ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Start Fresh Session B</span>
          </button>
        </div>

        {/* Step 3: Cold-Start Verification */}
        <div className="p-3.5 rounded-xl border bg-slate-800/40 border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-300">
              Step 3 • Persistence Test
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {snapshot?.backupBucket ? 'GCS Snapshot' : 'Preview Simulation'}
            </span>
          </div>

          <h4 className="text-xs font-bold text-white mb-1">
            {snapshot?.backupBucket ? 'Simulate Cold-Start' : 'Simulate Preview Persistence'}
          </h4>
          <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            {snapshot?.backupBucket
              ? 'Wipes container disk (rm data/*.db), restores GCS snapshot, and tests cross-instance recall.'
              : 'Wipes disk (rm data/*.db), restores snapshot archive, and tests recall across simulated reboots.'}
          </p>

          <button
            id="btn-sibyl-cold-start-test"
            onClick={handleColdStart}
            disabled={isColdStarting || !hasSessionAData}
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
            title={snapshot?.backupBucket ? 'Simulates container cold-start using Cloud Storage snapshot' : 'Preview persistence simulation (local archive)'}
          >
            {isColdStarting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{snapshot?.backupBucket ? 'Test True Cold-Start' : 'Preview Persistence Simulation'}</span>
          </button>
        </div>

        {/* Step 4: Load-Bearing Degradation Verification */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          !isEnabled
            ? 'bg-rose-950/20 border-rose-500/50'
            : 'bg-slate-800/30 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-300">
              Step 4 • Hackathon Test
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Degradation Check
            </span>
          </div>

          <h4 className="text-xs font-bold text-white mb-1">
            Verify Load-Bearing Degradation
          </h4>
          <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Disable or delete Sibyl Memory layer. Session B will immediately degrade to unbuffered 10m briefing without protections.
          </p>

          <div className="flex items-center gap-2">
            <button
              id="btn-sibyl-toggle-layer"
              onClick={handleToggle}
              disabled={isToggling}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isEnabled
                  ? 'bg-slate-800 hover:bg-rose-900/40 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Toggle Sibyl memory layer on or off to test that adaptive planning degrades"
            >
              {isToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isEnabled ? (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{isEnabled ? 'Disable Sibyl (Test)' : 'Enable Sibyl'}</span>
            </button>

            <button
              id="btn-sibyl-clear-memory"
              onClick={handleClear}
              disabled={isClearing}
              className="py-2 px-2.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Reset Sibyl SQLite memory to pristine 0-state"
            >
              {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>

      {/* Recalled Memory Insight Banner */}
      {loadBearingActive && planningDecision && (
        <div className="mt-3.5 p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/40 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-indigo-200">Sibyl Consequential Adaptation Applied: </span>
            <span className="text-slate-200">{planningDecision}</span>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-indigo-300 font-mono">
              <span>• Source: SQLite FTS5 index (workload_patterns)</span>
              <span>• Required Prep Buffer: 60m</span>
              <span>• Afternoon Work: Deferred to prevent failure</span>
            </div>
          </div>
        </div>
      )}

      {!isEnabled && (
        <div className="mt-3.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-rose-200">Load-Bearing Test Mode Active: </span>
            <span className="text-slate-200">
              Sibyl Memory layer is disconnected. Launching Fresh Session B will demonstrate that adaptive scheduling degrades to an unbuffered 10m briefing without historical protections.
            </span>
          </div>
        </div>
      )}

      {/* SQLite DB & FTS5 Inspector Drawer */}
      {showDbInspector && (
        <div className="mt-4 pt-3.5 border-t border-slate-800/90 text-xs font-mono bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              SQLite Schema v4 • /data/sibyl_memory.db
            </span>
            <span className="text-slate-500 text-[11px]">
              Engine: sibyl-memory-client (Python bridge)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            {/* Entities Record */}
            <div>
              <div className="text-slate-400 mb-1 font-semibold flex items-center justify-between">
                <span>Entities (workload_patterns):</span>
                <span className="text-indigo-400 font-bold">{sibylStatus?.entityCount ?? 0}</span>
              </div>
              <pre className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {sibylStatus?.recentEntities && sibylStatus.recentEntities.length > 0
                  ? JSON.stringify(sibylStatus.recentEntities[0], null, 2)
                  : '// No entities stored in Sibyl SQLite DB yet.\n// Click "Record Session A Outcome" above to populate.'}
              </pre>
            </div>

            {/* Journal Audit Events */}
            <div>
              <div className="text-slate-400 mb-1 font-semibold flex items-center justify-between">
                <span>Journal Audit Events:</span>
                <span className="text-indigo-400 font-bold">{sibylStatus?.journalEventCount ?? 0}</span>
              </div>
              <pre className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-indigo-300 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {sibylStatus?.recentJournalEvents && sibylStatus.recentJournalEvents.length > 0
                  ? JSON.stringify(sibylStatus.recentJournalEvents[0], null, 2)
                  : '// No journal events logged yet.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
