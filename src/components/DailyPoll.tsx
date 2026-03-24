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

// Get question text in the right language
function getQuestionText(q: Question, lang: Lang): string {
  const key = `text_${lang}` as keyof Question;
  return (q[key] as string) || q.text_en;
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

  // Fetch today's question from Supabase
  useEffect(() => {
    async function fetchQuestion() {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      // Get today's question
      const { data: q, error } = await supabase
        .from("questions")
        .select("*")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (error || !q) {
        // Fallback question
        setQuestion({
          id: "fallback",
          text_en: "Do you trust your government to act in the people's best interest?",
          text_ar: "هل تثق بحكومتك لتعمل لمصلحة الشعب؟",
          text_ru: "Доверяете ли вы своему правительству действовать в интересах народа?",
          text_zh: "你信任你的政府会为人民的最佳利益行事吗？",
          text_he: "האם אתה סומך על הממשלה שלך לפעול לטובת העם?",
          text_fa: "آیا به دولت خود اعتماد دارید که به نفع مردم عمل کند؟",
        });
        setLoading(false);
        return;
      }

      setQuestion(q);

      // Check if user already voted today
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
        // Device ID not available (SSR), continue
      }

      setLoading(false);
    }

    fetchQuestion();
  }, []);

  // Fetch vote counts for a question
  async function fetchVoteCounts(questionId: string) {
    const { data: votes } = await supabase
      .from("votes")
      .select("option_index")
      .eq("question_id", questionId);

    if (votes) {
      const counts = [0, 0, 0, 0];
      votes.forEach((v) => {
        if (v.option_index >= 0 && v.option_index <= 3) {
          counts[v.option_index]++;
        }
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

      // Get user's location
      let location = null;
      let countryCode = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          location = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`;
        } catch {
          // Location not available, continue without it
        }
      }

      // Sign in anonymously if not already
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      // Submit vote
      if (question && question.id !== "fallback") {
        const { error } = await supabase.from("votes").insert({
          question_id: question.id,
          device_id: deviceId,
          option_index: index,
          location: location,
          country_code: countryCode,
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

    setTimeout(() => setVoted(true), 300);
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
        <div className="text-xl gradient-text font-bold animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  // Show results after voting
  if (voted || alreadyVoted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-vox-dark px-4">
        <div className="text-center space-y-6 w-full max-w-lg">
          <div className="text-6xl">{alreadyVoted && !voted ? "📊" : "✓"}</div>
          <h2 className="text-3xl font-bold gradient-text">
            {alreadyVoted && !voted ? tr.analytics : tr.thank_you}
          </h2>
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
                        {option} {selectedOption === idx && "← You"}
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

          <button
            onClick={onComplete}
            className="mt-8 px-8 py-4 rounded-2xl text-lg font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-105 active:scale-95 transition-all duration-300"
          >
            {tr.view_map}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-vox-dark">
      <div className="w-full max-w-lg">
        {/* Header */}
        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2 text-center">
          {tr.todays_question}
        </p>

        {/* Question */}
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 leading-relaxed">
          {question ? getQuestionText(question, lang) : ""}
        </h2>

        {/* Options */}
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
