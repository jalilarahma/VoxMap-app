"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";
import { canVote, recordVote } from "@/lib/rateLimit";
import { fuzzGPS } from "@/lib/security";
import { getTodaysQuestion, getCategoryIcon, getCategoryColor } from "@/lib/questionScheduler";

interface DailyPollProps {
  lang: Lang;
  onComplete: () => void;
}

interface Question {
  id: string;
  text_en: string;
  text_ar: string | null;
  text_ru: string | null;
  text_zh: string | null;
  text_he: string | null;
  text_fa: string | null;
}

function getQuestionText(q: Question, lang: Lang): string {
  const key = `text_${lang}` as keyof Question;
  return (q[key] as string) || q.text_en;
}

// ── Streak logic (stored in cookie-like approach via date keys) ──
function getStreakData(): { count: number; lastDate: string } {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage?.getItem("voxmap_streak") : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lastDate: "" };
}

function updateStreak(): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const data = getStreakData();

  if (data.lastDate === today) return data.count; // Already voted today

  let newCount = 1;
  if (data.lastDate === yesterday) {
    newCount = data.count + 1; // Consecutive day
  }

  const updated = { count: newCount, lastDate: today };
  try {
    window.localStorage?.setItem("voxmap_streak", JSON.stringify(updated));
  } catch {}
  return newCount;
}

function getCurrentStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const data = getStreakData();
  if (data.lastDate === today || data.lastDate === yesterday) return data.count;
  return 0;
}

// ── City detection via reverse geocoding ──
async function detectCity(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data?.address?.city || data?.address?.town || data?.address?.state || null;
  } catch {
    return null;
  }
}

export default function DailyPoll({ lang, onComplete }: DailyPollProps) {
  const tr = t[lang];
  const [voted, setVoted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCounts, setVoteCounts] = useState<number[]>([0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [cityRanking, setCityRanking] = useState<{ city: string; topOption: number; topPct: number; globalPct: number } | null>(null);

  useEffect(() => {
    setStreak(getCurrentStreak());
  }, []);

  useEffect(() => {
    async function fetchQuestion() {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      const { data: q, error } = await supabase
        .from("questions")
        .select("*")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (error || !q) {
        // Use the smart question scheduler as fallback
        const scheduled = getTodaysQuestion();
        setQuestion({
          id: "fallback",
          text_en: scheduled.text_en,
          text_ar: scheduled.text_ar,
          text_ru: null,
          text_zh: null,
          text_he: null,
          text_fa: null,
        });
        setLoading(false);
        return;
      }

      setQuestion(q);

      try {
        const deviceId = await getDeviceId();
        const { data: existingVote } = await supabase
          .from("votes")
          .select("option_index")
          .eq("question_id", q.id)
          .eq("device_id", deviceId)
          .single();

        if (existingVote) {
          setAlreadyVoted(true);
          setSelectedOption(existingVote.option_index);
          await fetchVoteCounts(q.id);
        }
      } catch (e) {
        // continue
      }

      setLoading(false);
    }

    fetchQuestion();
  }, []);

  async function fetchVoteCounts(questionId: string) {
    const { data: votes } = await supabase
      .from("votes")
      .select("option_index, country_code")
      .eq("question_id", questionId);

    if (votes) {
      const counts = [0, 0];
      votes.forEach((v) => {
        if (v.option_index >= 0 && v.option_index <= 1) counts[v.option_index]++;
      });
      setVoteCounts(counts);
      setTotalVotes(votes.length);

      // Compute local ranking if we know the user's city
      const city = userCity;
      if (city) {
        const cityVotes = votes.filter((v) => v.country_code === city);
        if (cityVotes.length >= 2) {
          const cityCounts = [0, 0];
          cityVotes.forEach((v) => {
            if (v.option_index >= 0 && v.option_index <= 1) cityCounts[v.option_index]++;
          });
          const topIdx = cityCounts.indexOf(Math.max(...cityCounts));
          const topPct = Math.round((cityCounts[topIdx] / cityVotes.length) * 100);
          const globalPct = votes.length > 0 ? Math.round((counts[topIdx] / votes.length) * 100) : 0;
          setCityRanking({ city, topOption: topIdx, topPct, globalPct });
        }
      }
    }
  }

  const handleVote = async (index: number) => {
    if (voted || alreadyVoted) return;
    if (!canVote()) return; // Anti-spam cooldown
    setSelectedOption(index);

    try {
      const deviceId = await getDeviceId();

      let location = null;
      let cityName: string | null = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          const fuzzed = fuzzGPS(pos.coords.latitude, pos.coords.longitude);
          location = `POINT(${fuzzed.lng} ${fuzzed.lat})`;
          cityName = await detectCity(pos.coords.latitude, pos.coords.longitude);
          if (cityName) setUserCity(cityName);
        } catch {}
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      if (question && question.id !== "fallback") {
        const { error } = await supabase.from("votes").insert({
          question_id: question.id,
          device_id: deviceId,
          option_index: index,
          location: location,
          country_code: cityName || null,
        });

        if (error) {
          console.error("Vote error:", error);
        } else {
          await fetchVoteCounts(question.id);
        }
      }
    } catch (e) {
      console.error("Vote submission error:", e);
    }

    // Record vote for rate limiting
    recordVote();

    // Update streak
    const newStreak = updateStreak();
    setStreak(newStreak);

    setTimeout(() => setVoted(true), 300);
  };

  // Share vote to social media / WhatsApp
  const handleShare = async () => {
    const optionLabels = ["Agree", "Disagree"];
    const myVote = selectedOption !== null ? optionLabels[selectedOption] : "";
    const questionText = question ? getQuestionText(question, "en") : "";

    const shareText = `I voted "${myVote}" on VoxMap!\n\n"${questionText}"\n\nWhat do YOU think? Have your voice heard:\nhttps://voxmap-app.vercel.app`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "VoxMap - My Vote", text: shareText });
        return;
      } catch {}
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch {}
  };

  // Share directly to WhatsApp
  const handleWhatsAppShare = () => {
    const optionLabels = ["Agree", "Disagree"];
    const myVote = selectedOption !== null ? optionLabels[selectedOption] : "";
    const questionText = question ? getQuestionText(question, "en") : "";

    const text = encodeURIComponent(
      `I voted "${myVote}" on VoxMap!\n\n"${questionText}"\n\nWhat do YOU think?\nhttps://voxmap-app.vercel.app`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const options = [
    tr.agree,
    tr.disagree,
  ];

  const optionColors = [
    "from-green-500 to-emerald-600",
    "from-red-500 to-rose-600",
  ];

  const barColors = ["bg-green-500", "bg-red-500"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vox-dark">
        <div className="text-xl gradient-text font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  // ── Results screen (after voting) ──
  if (voted || alreadyVoted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-vox-dark px-4">
        <div className="text-center space-y-6 w-full max-w-lg">
          <div className="text-6xl">{alreadyVoted && !voted ? "\ud83d\udcca" : "\u2713"}</div>
          <h2 className="text-3xl font-bold gradient-text">
            {alreadyVoted && !voted ? tr.analytics : tr.thank_you}
          </h2>

          {/* Streak display */}
          {streak > 0 && (
            <div className="inline-flex items-center gap-2 bg-slate-800/80 rounded-2xl px-5 py-2.5 border border-orange-500/30">
              <span className="text-2xl">{streak >= 7 ? "\ud83d\udd25" : streak >= 3 ? "\u2b50" : "\u26a1"}</span>
              <span className="text-orange-400 font-bold text-lg">{streak} day streak!</span>
            </div>
          )}

          {/* Local ranking card */}
          {cityRanking && (
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">📍 Local vs Global</p>
              <p className="text-white text-sm leading-relaxed">
                <span className="text-orange-400 font-bold">{cityRanking.city}</span> voted{" "}
                <span className="text-white font-bold">{cityRanking.topPct}%</span>{" "}
                {["Agree", "Disagree"][cityRanking.topOption]}
                {" vs "}
                <span className="text-slate-300">{cityRanking.globalPct}%</span> globally
              </p>
            </div>
          )}

          {!alreadyVoted && (
            <p className="text-2xl text-yellow-400 font-bold">{tr.points}</p>
          )}

          {/* Vote results */}
          {totalVotes > 0 && (
            <div className="mt-6 space-y-3 text-left">
              {options.map((option, idx) => {
                const pct = totalVotes > 0 ? Math.round((voteCounts[idx] / totalVotes) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={selectedOption === idx ? "text-white font-bold" : "text-slate-400"}>
                        {option} {selectedOption === idx && "\u2190 You"}
                      </span>
                      <span className="text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColors[idx]} rounded-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
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

          {/* Share buttons */}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                bg-green-600 hover:bg-green-500 text-white
                active:scale-95 transition-all"
            >
              Share on WhatsApp
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                bg-slate-700 hover:bg-slate-600 text-white border border-slate-600
                active:scale-95 transition-all"
            >
              Share
            </button>
          </div>

          {/* Copied toast */}
          {showShareToast && (
            <p className="text-green-400 text-sm animate-pulse">Copied to clipboard!</p>
          )}

          <button
            onClick={onComplete}
            className="mt-4 px-8 py-4 rounded-2xl text-lg font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-105 active:scale-95 transition-all duration-300"
          >
            {tr.view_map}
          </button>
        </div>
      </div>
    );
  }

  // ── Voting screen ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-vox-dark">
      <div className="w-full max-w-lg">
        {/* Streak badge at top */}
        {streak > 0 && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-slate-800/60 rounded-full px-4 py-1.5 border border-slate-700/50">
              <span>{streak >= 7 ? "\ud83d\udd25" : streak >= 3 ? "\u2b50" : "\u26a1"}</span>
              <span className="text-orange-400 font-bold text-sm">{streak} day streak</span>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2 text-center">
          {tr.todays_question}
        </p>

        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 leading-relaxed">
          {question ? getQuestionText(question, lang) : ""}
        </h2>

        <div className="space-y-4">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              className={`w-full py-4 px-6 rounded-xl text-lg font-semibold text-white
                bg-gradient-to-r ${optionColors[idx]}
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                border border-white/10 hover:border-white/20
                ${selectedOption === idx ? "ring-2 ring-white scale-[1.02]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
