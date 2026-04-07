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

const SLIDER_LABELS = [
  { emoji: "😤", color: "#FF006E" },
  { emoji: "😕", color: "#FF6B00" },
  { emoji: "🤔", color: "#FFB800" },
  { emoji: "😊", color: "#7FFF00" },
  { emoji: "🔥", color: "#BFFF00" },
];

export default function DailyPoll({ lang, onComplete }: DailyPollProps) {
  const tr = t[lang];
  const [voted, setVoted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCounts, setVoteCounts] = useState<number[]>([0, 0, 0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map slider (0-100) to option index (0-3)
  function sliderToOption(val: number): number {
    if (val < 25) return 3; // strongly disagree
    if (val < 50) return 2; // disagree
    if (val < 75) return 1; // agree
    return 0; // strongly agree
  }

  // Get current emoji based on slider position
  function getCurrentEmoji(): { emoji: string; color: string } {
    const idx = Math.min(Math.floor(sliderValue / 20), 4);
    return SLIDER_LABELS[idx];
  }

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
          await fetchVoteCounts(q.id);
        }
      } catch (e) {}

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

  const handleVote = async () => {
    if (isSubmitting || alreadyVoted) return;
    setIsSubmitting(true);

    const optionIndex = sliderToOption(sliderValue);

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
      if (!session) await supabase.auth.signInAnonymously();

      if (question && question.id !== "fallback") {
        const { error } = await supabase.from("votes").insert({
          question_id: question.id,
          device_id: deviceId,
          option_index: optionIndex,
          location,
        });

        if (!error) await fetchVoteCounts(question.id);
      }
    } catch (e) {
      console.error("Vote error:", e);
    }

    setIsSubmitting(false);
    setVoted(true);
  };

  const options = [
    { label: tr.strongly_agree, color: "#BFFF00" },
    { label: tr.agree, color: "#00F5FF" },
    { label: tr.disagree, color: "#FF6B00" },
    { label: tr.strongly_disagree, color: "#FF006E" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="font-graffiti text-3xl spray-text animate-flicker">VoxMap</div>
      </div>
    );
  }

  // Results screen
  if (voted || alreadyVoted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] px-4">
        <div className="text-center w-full max-w-lg">
          {!alreadyVoted && (
            <div className="mb-8 animate-spray">
              <div className="text-6xl mb-4">{getCurrentEmoji().emoji}</div>
              <h2 className="font-urban text-2xl neon-glow">{tr.thank_you}</h2>
              <div className="mt-2">
                <span className="tape-strip text-sm font-bold">{tr.points}</span>
              </div>
            </div>
          )}

          {alreadyVoted && !voted && (
            <div className="mb-8">
              <p className="font-urban text-lg text-[#BFFF00]">You already voted today!</p>
            </div>
          )}

          {/* Results bars - urban style */}
          {totalVotes > 0 && (
            <div className="space-y-4 text-left mb-8">
              {options.map((opt, idx) => {
                const pct = totalVotes > 0 ? Math.round((voteCounts[idx] / totalVotes) * 100) : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-urban text-xs tracking-wider" style={{ color: opt.color }}>
                        {opt.label}
                      </span>
                      <span className="font-mono text-zinc-500">{pct}%</span>
                    </div>
                    <div className="w-full h-6 bg-zinc-900 overflow-hidden" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                      <div
                        className="h-full transition-all duration-1000"
                        style={{ width: `${pct}%`, backgroundColor: opt.color }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-center font-mono text-xs text-zinc-600 mt-3">
                {totalVotes} voices heard
              </p>
            </div>
          )}

          <button
            onClick={onComplete}
            className="px-8 py-4 font-urban uppercase tracking-wider
              bg-[#BFFF00] text-black hover:bg-[#00F5FF]
              transition-all duration-300 active:scale-95"
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
          >
            {tr.view_map}
          </button>
        </div>
      </div>
    );
  }

  // Voting screen with slider
  const currentMood = getCurrentEmoji();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0A0A0A]">
      <div className="w-full max-w-lg">
        {/* Tag label */}
        <div className="text-center mb-6 animate-spray">
          <span className="tape-strip text-[10px] font-bold tracking-widest">
            {tr.todays_question}
          </span>
        </div>

        {/* Question - graffiti style */}
        <h2 className="font-urban text-xl md:text-2xl text-white text-center mb-12 leading-relaxed">
          {question ? getQuestionText(question, lang) : ""}
        </h2>

        {/* Current mood emoji - big and animated */}
        <div className="text-center mb-6 transition-all duration-300">
          <span
            className="text-7xl inline-block animate-bounce-icon"
            style={{ filter: `drop-shadow(0 0 20px ${currentMood.color})` }}
          >
            {currentMood.emoji}
          </span>
        </div>

        {/* Slider */}
        <div className="mb-8 px-2">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => setSliderValue(parseInt(e.target.value))}
            className="w-full cursor-pointer"
          />
          {/* Labels under slider */}
          <div className="flex justify-between mt-3">
            <span className="text-[10px] font-urban tracking-wider text-[#FF006E]">
              {tr.strongly_disagree}
            </span>
            <span className="text-[10px] font-urban tracking-wider text-[#BFFF00]">
              {tr.strongly_agree}
            </span>
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleVote}
          disabled={isSubmitting}
          className={`w-full py-5 font-urban text-lg uppercase tracking-wider
            bg-[#BFFF00] text-black
            transition-all duration-300 active:scale-95
            ${isSubmitting ? "opacity-50" : "hover:bg-[#00F5FF]"}`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
          {isSubmitting ? "..." : "SUBMIT YOUR VOICE"}
        </button>
      </div>
    </div>
  );
}
