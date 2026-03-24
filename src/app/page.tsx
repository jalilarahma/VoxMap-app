"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/components/SplashScreen";
import DailyPoll from "@/components/DailyPoll";
import LanguagePicker from "@/components/LanguagePicker";
import Analytics from "@/components/Analytics";
import { Lang, RTL_LANGS } from "@/i18n/translations";

// Dynamically import map (needs window/document)
const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-vox-dark">
      <div className="text-2xl gradient-text font-bold animate-pulse">
        Loading Map...
      </div>
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
          {/* Analytics button */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="fixed top-4 right-4 z-[1500] bg-vox-dark-card/90 backdrop-blur-sm
              rounded-xl px-4 py-2 border border-vox-dark-border
              hover:bg-white/10 transition-all text-sm"
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
