"use client";

import { useState } from "react";
import { Lang, t } from "@/i18n/translations";

interface DailyPollProps {
  lang: Lang;
  onComplete: () => void;
}

// Get today's question (will be replaced with Supabase fetch)
function getTodayQuestion(lang: Lang) {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const questions = [
    {
      en: "Do you trust your government to act in the people's best interest?",
      ar: "هل تثق بحكومتك لتعمل لمصلحة الشعب؟",
      ru: "Доверяете ли вы своему правительству действовать в интересах народа?",
      zh: "你信任你的政府会为人民的最佳利益行事吗？",
      he: "?האם אתה סומך על הממשלה שלך לפעול לטובת העם",
      fa: "آیا به دولت خود اعتماد دارید که به نفع مردم عمل کند؟",
    },
    {
      en: "Do you feel safe walking alone at night in your neighborhood?",
      ar: "هل تشعر بالأمان عند المشي وحدك ليلاً في حيك؟",
      ru: "Чувствуете ли вы себя в безопасности, гуляя ночью в одиночку?",
      zh: "你在夜间独自走在社区里感到安全吗？",
      he: "?האם אתה מרגיש בטוח ללכת לבד בלילה בשכונה שלך",
      fa: "آیا احساس امنیت می‌کنید وقتی شب تنها در محله‌تان قدم می‌زنید؟",
    },
    {
      en: "Is the cost of living in your area affordable?",
      ar: "هل تكلفة المعيشة في منطقتك معقولة؟",
      ru: "Доступна ли стоимость жизни в вашем районе?",
      zh: "你所在地区的生活成本负担得起吗？",
      he: "?האם יוקר המחייה באזורך סביר",
      fa: "آیا هزینه زندگی در منطقه شما مقرون به صرفه است؟",
    },
  ];

  const idx = (dayOfYear - 1) % questions.length;
  return questions[idx][lang] || questions[idx].en;
}

export default function DailyPoll({ lang, onComplete }: DailyPollProps) {
  const tr = t[lang];
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const question = getTodayQuestion(lang);
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

  const handleVote = (index: number) => {
    setSelectedOption(index);
    // TODO: Submit to Supabase
    setTimeout(() => setVoted(true), 300);
  };

  if (voted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-vox-dark">
        <div className="text-center space-y-6">
          <div className="text-6xl">✓</div>
          <h2 className="text-3xl font-bold gradient-text">{tr.thank_you}</h2>
          <p className="text-2xl text-yellow-400 font-bold">{tr.points}</p>
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
          {question}
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
