import React from 'react';
import { History, ShieldCheck, ShieldAlert, Sparkles, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { ActivityLogEntry } from '../types';

interface WhatChangedStreamProps {
  logs: ActivityLogEntry[];
}

export const WhatChangedStream: React.FC<WhatChangedStreamProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                What Changed
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-100 text-slate-600">
                {logs.length} Actions Logged
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live audit stream of autonomous adjustments, replanning, and policy evaluations.
            </p>
          </div>
        </div>
      </div>

      {/* Activity Entries */}
      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {logs.map((log) => {
          const isGreen = log.permissionLevel === 'GREEN';
          const isYellow = log.permissionLevel === 'YELLOW';

          return (
            <div
              key={log.id}
              className={`relative rounded-xl p-3.5 sm:p-4 border transition-all ${
                log.isNew
                  ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200'
                  : 'border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300'
              }`}
            >
              {/* Bullet Node */}
              <div className="absolute -left-5 top-4 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-white" />

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 mb-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                    {log.timestamp}
                  </span>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-emerald-300">
                    {log.phase}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                      isGreen
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isYellow
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                    }`}
                  >
                    {isGreen ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <ShieldAlert className="w-3 h-3 text-amber-600" />}
                    {log.permissionLevel}
                  </span>
                </div>

                <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                  {log.impactTag}
                </span>
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-bold text-slate-900 mt-1">
                {log.title}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {log.description}
              </p>

              {/* Safety & Policy Justification */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-1.5">
                <span className="font-semibold text-slate-700 shrink-0">Policy reasoning:</span>
                <span>{log.reasoning}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
