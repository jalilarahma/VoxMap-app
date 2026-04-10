"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";

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

export default function DailyPoll({ lang, onComplete }: DailyPollProps) {
  const tr = t[lang];
  const [voted, setVoted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCounts, setVoteCounts] = useState<number[]>([0, 0, 0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);

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
        setQuestion({
          id: "fallback",
          text_en: "Do you trust your government to act in the people's best interest?",
          text_ar: "\u0647\u0644 \u062a\u062b\u0642 \u0628\u062d\u0643\u0648\u0645\u062a\u0643 \u0644\u062a\u0639\u0645\u0644 \u0644\u0645\u0635\u0644\u062d\u0629 \u0627\u0644\u0634\u0639\u0628\u061f",
          text_ru: "\u0414\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0435 \u043b\u0438 \u0432\u044b \u0441\u0432\u043e\u0435\u043c\u0443 \u043f\u0440\u0430\u0432\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0443 \u0434\u0435\u0439\u0441\u0442\u0432\u043e\u0432\u0430\u0442\u044c \u0432 \u0438\u043d\u0442\u0435\u0440\u0435\u0441\u0430\u0445 \u043d\u0430\u0440\u043e\u0434\u0430?",
          text_zh: "\u4f60\u4fe1\u4efb\u4f60\u7684\u653f\u5e9c\u4f1a\u4e3a\u4eba\u6c11\u7684\u6700\u4f73\u5229\u76ca\u884c\u4e8b\u5417\uff1f",
          text_he: "\u05d4\u05d0\u05dd \u05d0\u05ea\u05d4 \u05e1\u05d5\u05de\u05da \u05e2\u05dc \u05d4\u05de\u05de\u05e9\u05dc\u05d4 \u05e9\u05dc\u05da \u05dc\u05e4\u05e2\u05d5\u05dc \u05dc\u05d8\u05d5\u05d1\u05ea \u05d4\u05e2\u05dd?",
          text_fa: "\u0622\u06cc\u0627 \u0628\u0647 \u062f\u0648\u0644\u062a \u062e\u0648\u062f \u0627\u0639\u062a\u0645\u0627\u062f \u062f\u0627\u0631\u06cc\u062f \u06a9\u0647 \u0628\u0647 \u0646\u0641\u0639 \u0645\u0631\u062f\u0645 \u0639\u0645\u0644 \u06a9\u0646\u062f\u061f",
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
      .select("option_index")
      .eq("question_id", questionId);

    if (votes) {
      const counts = [0, 0, 0, 0];
      votes.forEach((v) => {
        if (v.option_index >= 0 && v.option_index <= 3) counts[v.option_index]++;
      });
      setVoteCounts(counts);
      setTotalVotes(votes.length);
    }
  }

  const handleVote = async (index: number) => {
    if (voted || alreadyVoted) return;
    setSelectedOption(index);

    try {
      const deviceId = await getDeviceId();

      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          location = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`;
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
          country_code: null,
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

    // Update streak
    const newStreak = updateStreak();
    setStreak(newStreak);

    setTimeout(() => setVoted(true), 300);
  };

  // Share vote to social media / WhatsApp
  const handleShare = async () => {
    const optionLabels = ["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"];
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
    const optionLabels = ["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"];
    const myVote = selectedOption !== null ? optionLabels[selectedOption] : "";
    const questionText = question ? getQuestionText(question, "en") : "";

    const text = encodeURIComponent(
      `I voted "${myVote}" on VoxMap!\n\n"${questionText}"\n\nWhat do YOU think?\nhttps://voxmap-app.vercel.app`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const options = [
    tr.strongly_agree,
    tr.agree,
    tr.disagree,
    tr.strongly_disagree,
  ];

  const optionColors = [
    "from-green-500 to-green-600",
    "from-blue-500 to-blue-600",
    "from-orange-500 to-orange-600",
    "from-red-500 to-red-600",
  ];

  const barColors = ["bg-green-500", "bg-blue-500", "bg-orange-500", "bg-red-500"];

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
