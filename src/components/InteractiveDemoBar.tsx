import React from 'react';
import { Mail, FileText, RotateCcw, Sparkles, ArrowRight, CheckCircle2, Loader2, Bot } from 'lucide-react';

interface InteractiveDemoBarProps {
  onSimulateEmail: () => void;
  onProcessTranscript: () => void;
  onReset: () => void;
  isSimulatingEmail: boolean;
  isProcessingTranscript: boolean;
  emailProcessed: boolean;
  transcriptProcessed: boolean;
  apiSource?: string;
}

export const InteractiveDemoBar: React.FC<InteractiveDemoBarProps> = ({
  onSimulateEmail,
  onProcessTranscript,
  onReset,
  isSimulatingEmail,
  isProcessingTranscript,
  emailProcessed,
  transcriptProcessed,
  apiSource,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Title and closed-loop lifecycle overview */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Agent Framework: Google Genkit • Gemini 3.7 Flash
            </span>
            {apiSource && (
              <span className="text-[11px] font-mono text-emerald-300/90 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                Flow: <span className="font-semibold text-white">dayOrchestrationFlow</span> ({apiSource})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            <span className="text-slate-100 font-semibold">Interactive Demonstration:</span> Test autonomous schedule replanning, email context synthesis, and transcript extraction on the sample Leadership Meeting without modifying your real calendar.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Demo Button 1: Simulate Incoming Email */}
          <button
            id="btn-simulate-email"
            onClick={onSimulateEmail}
            disabled={isSimulatingEmail}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              emailProcessed
                ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40 hover:bg-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow-md'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Simulates email: 'Jennifer, please bring last week’s escalation trend to today’s leadership meeting.'"
          >
            {isSimulatingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
            ) : emailProcessed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            <div className="text-left">
              <div className="font-bold">
                {emailProcessed ? 'Email Simulated & Replanned' : 'Simulate incoming email'}
              </div>
              <div className="text-[10px] opacity-80 font-normal truncate max-w-[190px]">
                “Bring escalation trend to 1pm sync”
              </div>
            </div>
          </button>

          {/* Demo Button 2: Process Meeting Transcript */}
          <button
            id="btn-process-transcript"
            onClick={onProcessTranscript}
            disabled={isProcessingTranscript}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              transcriptProcessed
                ? 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow-md'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Analyzes 1:00 PM sync transcript with Gemini, auto-schedules commitments, and drafts follow-up email for approval"
          >
            {isProcessingTranscript ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : transcriptProcessed ? (
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <div className="text-left">
              <div className="font-bold">
                {transcriptProcessed ? 'Transcript Processed' : 'Process meeting transcript'}
              </div>
              <div className="text-[10px] opacity-80 font-normal truncate max-w-[190px]">
                Extract action items & draft email
              </div>
            </div>
          </button>

          {/* Reset Button */}
          <button
            id="btn-reset-state"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Reset schedule and state to start of day"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

        </div>

      </div>

      {/* Autonomous Closed-Loop Flow Indicator */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-y-2 gap-x-1.5 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300 uppercase tracking-wider font-mono text-[10px] mr-1">
          Closed-Loop Flow:
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">1. Plan Schedule</span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">2. Prepare 1 PM Meeting</span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className={`px-2 py-0.5 rounded transition-colors ${emailProcessed ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-slate-800 text-slate-400'}`}>
          3. Incoming Email
        </span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className={`px-2 py-0.5 rounded transition-colors ${emailProcessed ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-slate-800 text-slate-400'}`}>
          4. Auto-Replan (Green)
        </span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className={`px-2 py-0.5 rounded transition-colors ${transcriptProcessed ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-slate-800 text-slate-400'}`}>
          5. Capture Commitments
        </span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className={`px-2 py-0.5 rounded transition-colors ${transcriptProcessed ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'bg-slate-800 text-slate-400'}`}>
          6. Request Approval (Yellow)
        </span>
      </div>
    </div>
  );
};
