"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase } from "@/lib/supabase";

interface AnalyticsProps {
  lang: Lang;
  onClose: () => void;
}

interface VoteResult {
  option_index: number;
  count: number;
}

export default function Analytics({ lang, onClose }: AnalyticsProps) {
  const tr = t[lang];
  const [results, setResults] = useState<number[]>([0, 0, 0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalPins, setTotalPins] = useState(0);
  const [pinsByCategory, setPinsByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      // Get today's question
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      const { data: question } = await supabase
        .from("questions")
        .select("id")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (question) {
        // Get vote counts
        const { data: votes } = await supabase
          .from("votes")
          .select("option_index")
          .eq("question_id", question.id);

        if (votes) {
          const counts = [0, 0, 0, 0];
          votes.forEach((v) => {
            if (v.option_index >= 0 && v.option_index <= 3) {
              counts[v.option_index]++;
            }
          });
          setResults(counts);
          setTotalVotes(votes.length);
        }
      }

      // Get pin stats
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
  }, []);

  const options = [
    { label: tr.strongly_agree, color: "bg-green-500" },
    { label: tr.agree, color: "bg-blue-500" },
    { label: tr.disagree, color: "bg-orange-500" },
    { label: tr.strongly_disagree, color: "bg-red-500" },
  ];

  const categoryIcons: Record<string, string> = {
    danger: "⚠️", robbery: "💰", assault: "🤛", medical: "🏥",
    fire: "🔥", trapped: "🚧", flood: "🌊", shooting: "🔫",
    missing: "👤", safe: "✅", help: "🆘", info: "ℹ️",
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center">
        <div className="text-xl gradient-text font-bold animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-vox-dark-card rounded-2xl border border-vox-dark-border p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">📊 {tr.analytics}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Today's Poll Results */}
        <div className="mb-8">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
            {tr.todays_question} — {tr.global_results}
          </h3>

          {totalVotes === 0 ? (
            <p className="text-slate-500 text-center py-4">No votes yet today. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {options.map((opt, idx) => {
                const pct = totalVotes > 0 ? Math.round((results[idx] / totalVotes) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{opt.label}</span>
                      <span className="text-slate-400">{results[idx]} ({pct}%)</span>
                    </div>
                    <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${opt.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-sm text-slate-500 mt-2">
                Total: {totalVotes} votes
              </p>
            </div>
          )}
        </div>

        {/* Emergency Pin Stats */}
        <div className="mb-6">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">
            🆘 Emergency Pins — {totalPins} active
          </h3>

          {totalPins === 0 ? (
            <p className="text-slate-500 text-center py-4">No active pins.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(pinsByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center gap-2 bg-vox-dark/50 rounded-lg p-3 border border-vox-dark-border"
                  >
                    <span className="text-lg">{categoryIcons[cat] || "📍"}</span>
                    <div>
                      <p className="text-xs text-slate-400">
                        {tr[cat as keyof typeof tr] || cat}
                      </p>
                      <p className="text-lg font-bold text-white">{count}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-slate-400 border border-vox-dark-border
            hover:bg-white/5 transition-all mt-2"
        >
          {tr.cancel}
        </button>
      </div>
    </div>
  );
}
