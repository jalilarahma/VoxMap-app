"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase } from "@/lib/supabase";

interface AnalyticsProps {
  lang: Lang;
  onClose: () => void;
}

// Analytics revealed every Sunday
function getAnalyticsAvailability(): { available: boolean; daysLeft: number; nextDay: string } {
  const now = new Date();
  const day = now.getDay();
  if (day === 0) {
    return { available: true, daysLeft: 0, nextDay: "Sunday" };
  }
  const daysLeft = 7 - day;
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysLeft);
  const nextDay = nextDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return { available: false, daysLeft, nextDay };
}

export default function Analytics({ lang, onClose }: AnalyticsProps) {
  const tr = t[lang];
  const [results, setResults] = useState<number[]>([0, 0, 0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalPins, setTotalPins] = useState(0);
  const [pinsByCategory, setPinsByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const { available, daysLeft, nextDay } = getAnalyticsAvailability();

  useEffect(() => {
    if (!available) {
      setLoading(false);
      return;
    }

    async function fetchAnalytics() {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      const { data: question } = await supabase
        .from("questions")
        .select("id")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (question) {
        const { data: votes } = await supabase
          .from("votes")
          .select("option_index")
          .eq("question_id", question.id);

        if (votes) {
          const counts = [0, 0, 0, 0];
          votes.forEach((v) => {
            if (v.option_index >= 0 && v.option_index <= 3) counts[v.option_index]++;
          });
          setResults(counts);
          setTotalVotes(votes.length);
        }
      }

      const { data: pins, count } = await supabase
        .from("pins")
        .select("category", { count: "exact" })
        .eq("is_active", true);

      if (pins) {
        setTotalPins(count || pins.length);
        const catCounts: Record<string, number> = {};
        pins.forEach((p) => {
          catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        });
        setPinsByCategory(catCounts);
      }

      setLoading(false);
    }

    fetchAnalytics();
  }, [available]);

  const options = [
    { label: tr.strongly_agree, color: "#22C55E" },
    { label: tr.agree, color: "#3B82F6" },
    { label: tr.disagree, color: "#F97316" },
    { label: tr.strongly_disagree, color: "#EF4444" },
  ];

  const categoryIcons: Record<string, string> = {
    danger: "⚠️", robbery: "💰", assault: "🤛", medical: "🏥",
    fire: "🔥", trapped: "🚧", flood: "🌊", shooting: "🔫",
    missing: "👤", safe: "✅", help: "🆘", info: "ℹ️",
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center">
        <div className="text-lg gradient-text font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl border border-slate-700/50 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">{tr.analytics}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* Weekly countdown or results */}
        {!available ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-6">🗓️</div>
            <h3 className="text-xl font-bold text-white mb-3">
              Results drop every Sunday
            </h3>
            <p className="text-slate-400 mb-6">
              See how the world voted — come back on <span className="text-orange-400 font-semibold">{nextDay}</span>
            </p>
            <div className="inline-flex items-center gap-3 bg-slate-800 rounded-2xl border border-slate-700/50 px-6 py-4">
              <span className="text-4xl font-black text-orange-400">{daysLeft}</span>
              <span className="text-sm text-slate-500">
                {daysLeft === 1 ? "day left" : "days left"}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Poll Results */}
            <div className="mb-8">
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
                {tr.todays_question} — {tr.global_results}
              </h3>

              {totalVotes === 0 ? (
                <p className="text-slate-500 text-center py-4">No votes yet</p>
              ) : (
                <div className="space-y-3">
                  {options.map((opt, idx) => {
                    const pct = totalVotes > 0 ? Math.round((results[idx] / totalVotes) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span style={{ color: opt.color }}>{opt.label}</span>
                          <span className="text-slate-500">{results[idx]} ({pct}%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, backgroundColor: opt.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-center text-sm text-slate-500 mt-2">
                    {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                  </p>
                </div>
              )}
            </div>

            {/* Pin Stats */}
            <div className="mb-6">
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
                Emergency Pins — {totalPins} active
              </h3>

              {totalPins === 0 ? (
                <p className="text-slate-500 text-center py-4">No active pins</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(pinsByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <div
                        key={cat}
                        className="flex items-center gap-2 bg-slate-800 rounded-xl p-3 border border-slate-700/50"
                      >
                        <span className="text-lg">{categoryIcons[cat] || "📍"}</span>
                        <div>
                          <p className="text-[10px] text-slate-500">
                            {tr[cat as keyof typeof tr] || cat}
                          </p>
                          <p className="text-lg font-bold text-white">{count}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-slate-400 border border-slate-700/50
            hover:bg-white/5 transition-all mt-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}
