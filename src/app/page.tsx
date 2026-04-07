"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/components/SplashScreen";
import DailyPoll from "@/components/DailyPoll";
import LanguagePicker from "@/components/LanguagePicker";
import Analytics from "@/components/Analytics";
import { Lang, RTL_LANGS } from "@/i18n/translations";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="text-xl gradient-text font-bold animate-pulse">Loading Map...</div>
    </div>
  ),
});

type Screen = "splash" | "poll" | "map";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [lang, setLang] = useState<Lang>("en");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  return (
    <div dir={dir}>
      <LanguagePicker currentLang={lang} onChangeLang={setLang} />

      {screen === "splash" && (
        <SplashScreen lang={lang} onEnter={() => setScreen("poll")} />
      )}

      {screen === "poll" && (
        <DailyPoll lang={lang} onComplete={() => setScreen("map")} />
      )}

      {screen === "map" && (
        <>
          <WorldMap lang={lang} />
          {/* Analytics button — bottom left, subtle */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="fixed bottom-8 left-4 z-[1500] w-10 h-10 flex items-center justify-center
              rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
              hover:border-orange-400 transition-all text-sm"
          >
            📊
          </button>
        </>
      )}

      {showAnalytics && (
        <Analytics lang={lang} onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}
