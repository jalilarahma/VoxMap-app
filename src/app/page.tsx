"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/components/SplashScreen";
import DailyPoll from "@/components/DailyPoll";
import LanguagePicker from "@/components/LanguagePicker";
import NotificationPrompt, { scheduleNotificationCheck } from "@/components/NotificationPrompt";
import UsernamePicker, { hasUsername, getUsername, setUsername as saveUsername } from "@/components/UsernamePicker";
import Community from "@/components/Community";
import StealthProvider, { StealthToggle } from "@/components/StealthMode";
import DemographicTags from "@/components/DemographicTags";
import { Lang, RTL_LANGS } from "@/i18n/translations";

const TimeLapse = dynamic(() => import("@/components/TimeLapse"), { ssr: false });
const CityChallenge = dynamic(() => import("@/components/CityChallenge"), { ssr: false });
const IntelligenceHub = dynamic(() => import("@/components/IntelligenceHub"), { ssr: false });

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="text-xl gradient-text font-bold animate-pulse">Loading Map...</div>
    </div>
  ),
});

type Screen = "splash" | "username" | "poll" | "demographics" | "map";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [lang, setLang] = useState<Lang>("en");
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [showCityChallenge, setShowCityChallenge] = useState(false);
  const [showIntelHub, setShowIntelHub] = useState(false);

  // Start notification scheduler if already granted
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      scheduleNotificationCheck();
    }
  }, []);

  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  // Panic handler: reset to splash screen with disguise active
  const handlePanic = useCallback(() => {
    setScreen("splash");
    setShowCommunity(false);
    setShowUsernameEdit(false);
    setShowNotifPrompt(false);
    setShowTimeLapse(false);
    setShowCityChallenge(false);
    setShowIntelHub(false);
  }, []);

  return (
    <StealthProvider onPanic={handlePanic}>
      <div dir={dir}>
        <LanguagePicker currentLang={lang} onChangeLang={setLang} />

        {screen === "splash" && (
          <SplashScreen lang={lang} onEnter={() => {
            if (hasUsername()) {
              setScreen("poll");
            } else {
              setScreen("username");
            }
          }} />
        )}

        {screen === "username" && (
          <UsernamePicker onComplete={() => setScreen("poll")} />
        )}

        {screen === "poll" && (
          <DailyPoll lang={lang} onComplete={() => {
            // Show demographic tags before going to map
            setScreen("demographics");
            setShowNotifPrompt(true);
          }} />
        )}

        {screen === "demographics" && (
          <DemographicTags
            voteId={null}
            onComplete={() => {
              setScreen("map");
            }}
          />
        )}

        {screen === "map" && (
          <>
            <WorldMap lang={lang} />

            {/* ── All tool buttons: single column below the language globe ── */}
            <div className="fixed left-4 top-16 z-[1500] flex flex-col gap-2">
              <button onClick={() => setShowIntelHub(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 hover:border-orange-400 transition-all text-sm" title="Intelligence Hub">📊</button>
              <button onClick={() => setShowCommunity(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 hover:border-orange-400 transition-all text-sm" title="Community">💬</button>
              <button onClick={() => setShowCityChallenge(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 hover:border-orange-400 transition-all text-sm" title="City Challenge">🏙️</button>
              <button onClick={() => setShowTimeLapse(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 hover:border-orange-400 transition-all text-sm" title="Time-Lapse">🎬</button>
              <button onClick={() => setShowUsernameEdit(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 hover:border-orange-400 transition-all text-sm" title={`@${getUsername() || "Anonymous"}`}>👤</button>
              <StealthToggle />
            </div>
          </>
        )}

        {showNotifPrompt && (
          <NotificationPrompt onDismiss={() => setShowNotifPrompt(false)} />
        )}

        {showCommunity && (
          <Community lang={lang} onClose={() => setShowCommunity(false)} />
        )}

        {showTimeLapse && (
          <TimeLapse onClose={() => setShowTimeLapse(false)} />
        )}

        {showIntelHub && (
          <IntelligenceHub lang={lang} onClose={() => setShowIntelHub(false)} />
        )}

        {showCityChallenge && (
          <CityChallenge onClose={() => setShowCityChallenge(false)} />
        )}

        {showUsernameEdit && (
          <UsernamePicker onComplete={(name) => {
            saveUsername(name);
            setShowUsernameEdit(false);
          }} />
        )}
      </div>
    </StealthProvider>
  );
}
