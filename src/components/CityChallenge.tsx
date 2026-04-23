"use client";

import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════
// INTER-CITY CHALLENGES
// City vs City leaderboard with weekly Active City badge
// ═══════════════════════════════════════════════════════

interface CityData {
  city: string;
  country_code: string;
  vote_count: number;
  pin_count: number;
  post_count: number;
  unique_voters: number;
  engagement_score: number;
}

interface LeaderboardData {
  leaderboard: CityData[];
  active_city: CityData | null;
  period_days: number;
}

// Country flag emoji from code
function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// Medal for top 3
function getMedal(rank: number): string {
  if (rank === 0) return "🥇";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return "";
}

// Rank colors
function getRankColor(rank: number): string {
  if (rank === 0) return "#f97316";
  if (rank === 1) return "#94a3b8";
  if (rank === 2) return "#b45309";
  return "#475569";
}

interface CityChallengeProps {
  onClose: () => void;
}

export default function CityChallenge({ onClose }: CityChallengeProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cities?days=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.leaderboard) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  function shareLeaderboard() {
    if (!data || !data.active_city) return;
    const text = `🏆 This week's most active city on VoxMap: ${data.active_city.city} ${getFlag(data.active_city.country_code)}\n\n${data.active_city.vote_count} votes from ${data.active_city.unique_voters} citizens!\n\nIs YOUR city on the leaderboard?\nhttps://vox-map-app.vercel.app`;

    if (navigator.share) {
      navigator.share({ title: "VoxMap City Challenge", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🏙️</span>
            <h2 className="text-lg font-bold gradient-text">City Challenge</h2>
          </div>
          <p className="text-[10px] text-slate-500">Which city leads the conversation?</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-800">
        {[
          { days: 1, label: "Today" },
          { days: 7, label: "This Week" },
          { days: 30, label: "This Month" },
        ].map((p) => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all
              ${period === p.days
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl animate-pulse mb-3">🏙️</div>
            <p className="text-slate-400 text-sm">Ranking cities...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <div className="flex-1 overflow-y-auto">

          {/* Active City Banner */}
          {data.active_city && (
            <div className="mx-4 mt-4 rounded-2xl overflow-hidden"
              style={{ border: "1px solid #f9731640" }}>
              <div className="bg-gradient-to-r from-orange-500/15 via-red-500/10 to-purple-500/15 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                    🏆 Active City of the Week
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{getFlag(data.active_city.country_code)}</span>
                  <div className="flex-1">
                    <h3 className="text-white font-black text-2xl">{data.active_city.city}</h3>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {data.active_city.vote_count} votes · {data.active_city.unique_voters} citizens · Score: {Math.round(data.active_city.engagement_score)}
                    </p>
                  </div>
                  <div className="text-5xl">👑</div>
                </div>
              </div>

              {/* Stats bar */}
              <div className="bg-slate-900 px-5 py-3 flex gap-4">
                <div className="flex-1 text-center">
                  <p className="text-orange-400 font-bold text-lg">{data.active_city.vote_count}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Votes</p>
                </div>
                <div className="flex-1 text-center border-x border-slate-800">
                  <p className="text-green-400 font-bold text-lg">{data.active_city.unique_voters}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Citizens</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-purple-400 font-bold text-lg">{data.active_city.pin_count}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Pins</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-cyan-400 font-bold text-lg">{Math.round(data.active_city.engagement_score)}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Score</p>
                </div>
              </div>
            </div>
          )}

          {/* Scoring explanation */}
          <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="text-orange-400 font-bold">How scoring works:</span>{" "}
              Votes (40%) + Emergency Pins (25%) + Community Posts (20%) + Unique Voters (15%).
              The city with the highest engagement score earns the Active City badge each week.
            </p>
          </div>

          {/* Leaderboard */}
          <div className="px-4 mt-4 mb-4">
            <h3 className="text-sm font-bold text-white mb-3">Leaderboard</h3>

            {data.leaderboard.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500">No city data yet. Vote with location enabled to see rankings!</p>
              </div>
            )}

            <div className="space-y-2">
              {data.leaderboard.map((city, i) => {
                const isActive = data.active_city?.city === city.city;
                const isExpanded = selectedCity?.city === city.city;

                return (
                  <div key={city.city + i}>
                    <button
                      onClick={() => setSelectedCity(isExpanded ? null : city)}
                      className={`w-full text-left rounded-xl transition-all
                        ${isActive
                          ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30"
                          : "bg-slate-900 border border-slate-800 hover:border-slate-700"
                        }
                        ${i < 3 ? "p-4" : "p-3"}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div
                          className={`flex items-center justify-center font-black
                            ${i < 3 ? "w-10 h-10 text-xl" : "w-8 h-8 text-sm"}`}
                          style={{
                            borderRadius: "50%",
                            background: i < 3 ? `${getRankColor(i)}20` : "transparent",
                            color: getRankColor(i),
                          }}
                        >
                          {i < 3 ? getMedal(i) : i + 1}
                        </div>

                        {/* Flag */}
                        <span className={i < 3 ? "text-2xl" : "text-lg"}>{getFlag(city.country_code)}</span>

                        {/* City info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold truncate ${i < 3 ? "text-white text-base" : "text-slate-300 text-sm"}`}>
                              {city.city}
                            </p>
                            {isActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                                👑 ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {city.vote_count} votes · {city.unique_voters} citizens
                          </p>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <p className={`font-bold ${i < 3 ? "text-orange-400 text-lg" : "text-slate-400 text-sm"}`}>
                            {Math.round(city.engagement_score)}
                          </p>
                          <p className="text-[9px] text-slate-600">score</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mx-2 mt-1 mb-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                        <div className="grid grid-cols-4 gap-3 text-center">
                          <div>
                            <p className="text-orange-400 font-bold">{city.vote_count}</p>
                            <p className="text-[9px] text-slate-500">Votes</p>
                          </div>
                          <div>
                            <p className="text-green-400 font-bold">{city.unique_voters}</p>
                            <p className="text-[9px] text-slate-500">Citizens</p>
                          </div>
                          <div>
                            <p className="text-purple-400 font-bold">{city.pin_count}</p>
                            <p className="text-[9px] text-slate-500">Pins</p>
                          </div>
                          <div>
                            <p className="text-cyan-400 font-bold">{Math.round(city.engagement_score)}</p>
                            <p className="text-[9px] text-slate-500">Score</p>
                          </div>
                        </div>

                        {/* Score breakdown bar */}
                        <div className="mt-3">
                          <div className="h-2 rounded-full overflow-hidden flex">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min((city.vote_count / (data.leaderboard[0]?.vote_count || 1)) * 100, 100)}%`,
                                background: "linear-gradient(to right, #f97316, #ef4444)",
                              }}
                            />
                            <div className="h-full flex-1 bg-slate-700" />
                          </div>
                          <p className="text-[9px] text-slate-600 mt-1 text-center">
                            {Math.round((city.engagement_score / (data.leaderboard[0]?.engagement_score || 1)) * 100)}% of top city score
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Share button */}
          {data.active_city && (
            <div className="px-4 pb-6">
              <button
                onClick={shareLeaderboard}
                className="w-full py-3 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
                  hover:scale-[1.02] active:scale-95 transition-all"
              >
                📤 Share City Leaderboard
              </button>
            </div>
          )}

          {/* Challenge description */}
          <div className="px-4 pb-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-2">How to boost your city</h4>
              <div className="text-xs text-slate-400 space-y-1.5">
                <p>🗳️ Vote daily — every vote earns your city points</p>
                <p>🚨 Create emergency pins — helps your community AND your city rank</p>
                <p>💬 Post in Community — engagement drives your score up</p>
                <p>📢 Invite friends from your city — more unique voters = higher rank</p>
                <p>🏆 The top city each week earns the Active City badge on the map</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No data */}
      {!loading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <p className="text-slate-400 text-lg mb-2">No city data yet</p>
            <p className="text-slate-600 text-sm">Vote with location enabled to put your city on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
