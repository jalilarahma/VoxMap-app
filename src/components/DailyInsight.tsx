"use client";

import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════
// DAILY INSIGHT — AI Pattern Analyst
// Shows auto-generated insights from vote pattern analysis
// ═══════════════════════════════════════════════════════

interface Insight {
  type: string;
  headline: string;
  body: string;
  emoji: string;
  strength: number;
}

interface InsightData {
  question: string;
  insights: Insight[];
  vote_count: number;
  generated_at: string;
}

interface DailyInsightProps {
  onClose: () => void;
}

export default function DailyInsight({ onClose }: DailyInsightProps) {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeInsight, setActiveInsight] = useState(0);

  useEffect(() => {
    fetch("/api/insight")
      .then((r) => r.json())
      .then((d) => {
        if (d.insights) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getTypeColor(type: string): string {
    switch (type) {
      case "geographic_contrast": return "#f97316";
      case "consensus": return "#22c55e";
      case "division": return "#ef4444";
      case "outlier": return "#a855f7";
      case "trend": return "#3b82f6";
      case "global_summary": return "#06b6d4";
      default: return "#94a3b8";
    }
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case "geographic_contrast": return "Geographic Contrast";
      case "consensus": return "Global Consensus";
      case "division": return "World Divided";
      case "outlier": return "Outlier Detected";
      case "trend": return "Emerging Trend";
      case "global_summary": return "Daily Pulse";
      default: return "Insight";
    }
  }

  function getStrengthLabel(strength: number): string {
    if (strength >= 0.8) return "Very Strong Signal";
    if (strength >= 0.6) return "Strong Signal";
    if (strength >= 0.4) return "Moderate Signal";
    return "Emerging Pattern";
  }

  // Share insight
  function shareInsight(insight: Insight) {
    const text = `${insight.emoji} ${insight.headline}\n\n${insight.body}\n\nSee live results on VoxMap:\nhttps://vox-map-app.vercel.app`;

    if (navigator.share) {
      navigator.share({ title: "VoxMap Daily Insight", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert("Insight copied to clipboard!");
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h2 className="text-lg font-bold gradient-text">Daily Insight</h2>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">AI Pattern Analysis of today&apos;s votes</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl animate-pulse mb-3">🧠</div>
            <p className="text-slate-400 text-sm">Analyzing vote patterns...</p>
            <p className="text-slate-600 text-xs mt-1">Scanning geographic contrasts and outliers</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <div className="flex-1 overflow-y-auto">
          {/* Question card */}
          <div className="mx-4 mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
              Today&apos;s Question
            </p>
            <p className="text-white font-bold text-lg leading-snug">
              {data.question}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">{data.vote_count} votes analyzed</span>
              </div>
              {data.generated_at && (
                <span className="text-xs text-slate-600">
                  Updated {new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {/* Insight tabs */}
          {data.insights.length > 1 && (
            <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto">
              {data.insights.map((insight, i) => {
                const color = getTypeColor(insight.type);
                return (
                  <button
                    key={i}
                    onClick={() => setActiveInsight(i)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all
                      ${activeInsight === i
                        ? "text-white"
                        : "text-slate-500 hover:text-white"
                      }`}
                    style={{
                      background: activeInsight === i ? `${color}30` : "transparent",
                      border: `1px solid ${activeInsight === i ? `${color}60` : "#334155"}`,
                    }}
                  >
                    {insight.emoji} {getTypeLabel(insight.type)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active insight card */}
          {data.insights.map((insight, i) => {
            if (i !== activeInsight) return null;
            const color = getTypeColor(insight.type);

            return (
              <div key={i} className="mx-4 mt-4 mb-4">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${color}30` }}
                >
                  {/* Insight header */}
                  <div
                    className="px-5 py-4"
                    style={{ background: `${color}10` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}25`, color }}
                        >
                          {getTypeLabel(insight.type)}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "#1e293b", color: "#94a3b8" }}
                        >
                          {getStrengthLabel(insight.strength)}
                        </span>
                      </div>
                      <span className="text-2xl">{insight.emoji}</span>
                    </div>

                    <h3 className="text-white font-bold text-xl leading-tight">
                      {insight.headline}
                    </h3>
                  </div>

                  {/* Insight body */}
                  <div className="px-5 py-4 bg-slate-900">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {insight.body}
                    </p>

                    {/* Strength meter */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Signal Strength</span>
                        <span className="text-[10px] font-bold" style={{ color }}>
                          {Math.round(insight.strength * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${insight.strength * 100}%`,
                            background: `linear-gradient(to right, ${color}80, ${color})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Share button */}
                    <button
                      onClick={() => shareInsight(insight)}
                      className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-white transition-all
                        hover:scale-[1.02] active:scale-95"
                      style={{
                        background: `linear-gradient(to right, ${color}90, ${color})`,
                      }}
                    >
                      📤 Share this insight
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Navigation dots */}
          {data.insights.length > 1 && (
            <div className="flex justify-center gap-2 pb-4">
              {data.insights.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveInsight(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i === activeInsight
                      ? getTypeColor(data.insights[i].type)
                      : "#334155",
                    transform: i === activeInsight ? "scale(1.3)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Powered by footer */}
          <div className="text-center pb-6">
            <p className="text-[10px] text-slate-600">
              Insights generated by VoxMap Pattern Analysis Engine
            </p>
            <p className="text-[10px] text-slate-700 mt-1">
              Updated every 10 minutes as new votes arrive
            </p>
          </div>
        </div>
      )}

      {/* No data */}
      {!loading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <p className="text-slate-400 text-lg mb-2">No insights yet</p>
            <p className="text-slate-600 text-sm">Vote on today&apos;s question to start generating insights</p>
          </div>
        </div>
      )}
    </div>
  );
}
