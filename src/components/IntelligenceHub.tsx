"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════
// INTELLIGENCE HUB
// Merged view: Live Analytics + AI Insights + Expert Context
// Replaces 3 separate components with 1 tabbed experience
// ═══════════════════════════════════════════════════════

interface Insight {
  type: string;
  headline: string;
  body: string;
  emoji: string;
  strength: number;
}

interface Annotation {
  id: string;
  partner_name: string;
  partner_type: string;
  annotation_type: string;
  title: string;
  body: string;
  source_url: string | null;
  severity: string;
  created_at: string;
}

interface IntelligenceHubProps {
  lang: Lang;
  onClose: () => void;
}

type HubTab = "analytics" | "insights" | "context";

export default function IntelligenceHub({ lang, onClose }: IntelligenceHubProps) {
  const tr = t[lang];
  const [tab, setTab] = useState<HubTab>("analytics");

  // Analytics state
  const [results, setResults] = useState<number[]>([0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [questionText, setQuestionText] = useState("");

  // Insights state
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightVoteCount, setInsightVoteCount] = useState(0);
  const [activeInsight, setActiveInsight] = useState(0);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const [loading, setLoading] = useState(true);

  // Fetch analytics data
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // Get today's question
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      const { data: question } = await supabase
        .from("questions")
        .select("id, text_en, text_ar")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (question) {
        const key = `text_${lang}` as keyof typeof question;
        setQuestionText((question[key] as string) || question.text_en);

        // Fetch vote counts
        const { data: votes } = await supabase
          .from("votes")
          .select("option_index")
          .eq("question_id", question.id);

        if (votes) {
          const agree = votes.filter((v) => v.option_index === 0).length;
          const disagree = votes.filter((v) => v.option_index === 1).length;
          setResults([agree, disagree]);
          setTotalVotes(votes.length);
        }
      }

      // Fetch AI insights
      try {
        const res = await fetch("/api/insight");
        const data = await res.json();
        if (data.insights) {
          setInsights(data.insights);
          setInsightVoteCount(data.vote_count || 0);
        }
      } catch {}

      // Fetch annotations
      try {
        const res = await fetch("/api/annotations");
        const data = await res.json();
        if (data.annotations) setAnnotations(data.annotations);
      } catch {}

      setLoading(false);
    }

    fetchAll();
  }, [lang]);

  const agreePct = totalVotes > 0 ? Math.round((results[0] / totalVotes) * 100) : 50;
  const disagreePct = 100 - agreePct;

  function getTypeColor(type: string): string {
    switch (type) {
      case "geographic_contrast": return "#f97316";
      case "consensus": return "#22c55e";
      case "division": return "#ef4444";
      case "outlier": return "#a855f7";
      case "global_summary": return "#06b6d4";
      case "context": return "#06b6d4";
      case "correction": return "#f97316";
      case "correlation": return "#a855f7";
      case "warning": return "#ef4444";
      default: return "#94a3b8";
    }
  }

  const tabs: { key: HubTab; label: string; icon: string; count?: number }[] = [
    { key: "analytics", label: "Live Data", icon: "📊" },
    { key: "insights", label: "AI Insights", icon: "🧠", count: insights.length },
    { key: "context", label: "Expert Context", icon: "✅", count: annotations.length },
  ];

  return (
    <div className="fixed inset-0 z-[3000] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold gradient-text">Intelligence Hub</h2>
          <p className="text-[10px] text-slate-500">{questionText.length > 50 ? questionText.slice(0, 50) + "..." : questionText}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
              ${tab === t.key
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-white/20" : "bg-slate-700"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl animate-pulse mb-2">📊</div>
            <p className="text-slate-400 text-sm">Loading intelligence...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="flex-1 overflow-y-auto px-4 py-4">

          {/* ═══ TAB 1: LIVE ANALYTICS ═══ */}
          {tab === "analytics" && (
            <div className="space-y-4">
              {/* Vote results */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
                <p className="text-white font-bold text-base mb-4">{questionText}</p>

                {/* Agree bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-green-400">Agree</span>
                    <span className="text-sm font-bold text-green-400">{agreePct}%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000"
                      style={{ width: `${agreePct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">{results[0].toLocaleString()} votes</p>
                </div>

                {/* Disagree bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-red-400">Disagree</span>
                    <span className="text-sm font-bold text-red-400">{disagreePct}%</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-1000"
                      style={{ width: `${disagreePct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">{results[1].toLocaleString()} votes</p>
                </div>

                <div className="text-center pt-2 border-t border-slate-800">
                  <span className="text-lg font-black text-white">{totalVotes.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 ml-2">total votes</span>
                </div>
              </div>

              {/* Quick insight preview */}
              {insights.length > 0 && (
                <button
                  onClick={() => setTab("insights")}
                  className="w-full bg-slate-900 rounded-xl border border-slate-800 p-4 text-left hover:border-orange-500/30 transition-all"
                >
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">
                    🧠 Top AI Insight
                  </p>
                  <p className="text-white text-sm font-bold">{insights[0].emoji} {insights[0].headline}</p>
                  <p className="text-slate-500 text-xs mt-1">Tap to see all insights →</p>
                </button>
              )}
            </div>
          )}

          {/* ═══ TAB 2: AI INSIGHTS ═══ */}
          {tab === "insights" && (
            <div className="space-y-4">
              {insights.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Not enough vote data for insights yet</p>
                  <p className="text-slate-600 text-sm mt-1">Insights appear when votes come from multiple regions</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500">{insightVoteCount} votes analyzed</p>
                  {insights.map((insight, i) => {
                    const color = getTypeColor(insight.type);
                    return (
                      <div key={i} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}30` }}>
                        <div className="px-4 py-3" style={{ background: `${color}10` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${color}25`, color }}>{insight.type.replace("_", " ").toUpperCase()}</span>
                            <span className="text-2xl">{insight.emoji}</span>
                          </div>
                          <h3 className="text-white font-bold text-base">{insight.headline}</h3>
                        </div>
                        <div className="px-4 py-3 bg-slate-900">
                          <p className="text-slate-300 text-sm leading-relaxed">{insight.body}</p>
                          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${insight.strength * 100}%`,
                              background: `linear-gradient(to right, ${color}80, ${color})`,
                            }} />
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1">Signal strength: {Math.round(insight.strength * 100)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ═══ TAB 3: EXPERT CONTEXT ═══ */}
          {tab === "context" && (
            <div className="space-y-4">
              {annotations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No expert annotations yet</p>
                  <p className="text-slate-600 text-sm mt-1">Verified partners can add context via the API</p>
                  <p className="text-slate-700 text-xs mt-3">Partners: NGOs, researchers, journalists</p>
                </div>
              ) : (
                annotations.map((ann) => {
                  const color = getTypeColor(ann.annotation_type);
                  return (
                    <div key={ann.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4"
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}20`, color }}>{ann.annotation_type.toUpperCase()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ann.severity === "critical" ? "bg-red-500/20 text-red-400" :
                          ann.severity === "notable" ? "bg-orange-500/20 text-orange-400" :
                          "bg-slate-700 text-slate-400"
                        }`}>{ann.severity}</span>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1">{ann.title}</h3>
                      <p className="text-slate-400 text-xs leading-relaxed">{ann.body}</p>
                      {ann.source_url && (
                        <a href={ann.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-cyan-400 text-xs underline mt-2 inline-block">View source</a>
                      )}
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] text-slate-500">
                          Verified by <strong className="text-slate-300">{ann.partner_name}</strong> ({ann.partner_type})
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
