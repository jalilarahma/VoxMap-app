"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/components/SplashScreen";
import DailyPoll from "@/components/DailyPoll";
import LanguagePicker from "@/components/LanguagePicker";
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

      {screen === "map" && <WorldMap lang={lang} />}
    </div>
  );
}
