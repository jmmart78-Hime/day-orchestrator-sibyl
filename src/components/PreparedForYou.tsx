import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronDown, ChevronUp, FileText, Mail, HelpCircle, TrendingUp, Target, ShieldCheck, Tag, ExternalLink } from 'lucide-react';
import { PrepItem } from '../types';

interface PreparedForYouProps {
  prepItems: PrepItem[];
  emailSimulated: boolean;
  isRealCalendar?: boolean;
}

export const PreparedForYou: React.FC<PreparedForYouProps> = ({ prepItems, emailSimulated, isRealCalendar }) => {
  const [expandedId, setExpandedId] = useState<string | null>('prep-1');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getItemIcon = (title: string) => {
    if (title.toLowerCase().includes('agenda')) return <FileText className="w-4 h-4 text-indigo-600" />;
    if (title.toLowerCase().includes('email')) return <Mail className="w-4 h-4 text-blue-600" />;
    if (title.toLowerCase().includes('voc') || title.toLowerCase().includes('customer')) return <Target className="w-4 h-4 text-emerald-600" />;
    if (title.toLowerCase().includes('question')) return <HelpCircle className="w-4 h-4 text-amber-600" />;
    if (title.toLowerCase().includes('commitment')) return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
    return <TrendingUp className="w-4 h-4 text-rose-600" />;
  };

  return (
    <div id="prep-section" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Prepared For You
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {prepItems.length} Ready
              </span>
              {isRealCalendar && (
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                  Demo Sandbox Scenario
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Autonomous context synthesis for <span className="font-semibold text-slate-700">1:00 PM Leadership Meeting</span>
            </p>
          </div>
        </div>

        {/* Safety Level Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">GREEN TIER</span>
          <span className="text-slate-400">• Safe Private Synthesis</span>
        </div>
      </div>

      {/* Preparation Items List */}
      <div className="space-y-3">
        {prepItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const isAutoAdded = item.status === 'auto_added';

          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isAutoAdded
                  ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400 ring-1 ring-emerald-200/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Header Bar */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                    {getItemIcon(item.title)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </h4>
                      {isAutoAdded && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-600 text-white tracking-wide animate-pulse">
                          Auto-Added via Email
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-slate-400">
                  <span className="text-[11px] font-mono hidden sm:inline text-slate-400">
                    {item.timestamp}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>

              {/* Expanded Briefing Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 text-xs space-y-2.5">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 font-sans text-slate-700 whitespace-pre-line leading-relaxed">
                    {item.fullContent || item.summary}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {item.sourceDoc && (
                      <span className="font-mono text-slate-400 flex items-center gap-1">
                        Source: {item.sourceDoc}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
