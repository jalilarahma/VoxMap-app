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

            {/* ── Tool sidebar: glassmorphism panel with hover labels ── */}
            <div className="fixed left-4 top-16 z-[1500] flex flex-col gap-1.5
              bg-black/30 backdrop-blur-xl rounded-2xl p-1.5
              border border-white/[0.06] shadow-xl shadow-black/30">
              <button onClick={() => setShowIntelHub(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl
                  hover:bg-white/[0.08] transition-all text-sm group relative" title="Intelligence Hub">
                📊
                <span className="absolute left-12 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-xl
                  border border-white/[0.08] text-[10px] font-mono text-cyan-400 whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  INTEL HUB
                </span>
              </button>
              <button onClick={() => setShowCommunity(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl
                  hover:bg-white/[0.08] transition-all text-sm group relative" title="Community">
                💬
                <span className="absolute left-12 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-xl
                  border border-white/[0.08] text-[10px] font-mono text-cyan-400 whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  COMMUNITY
                </span>
              </button>
              <button onClick={() => setShowCityChallenge(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl
                  hover:bg-white/[0.08] transition-all text-sm group relative" title="City Challenge">
                🏙️
                <span className="absolute left-12 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-xl
                  border border-white/[0.08] text-[10px] font-mono text-cyan-400 whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  CITY CHALLENGE
                </span>
              </button>
              <button onClick={() => setShowTimeLapse(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl
                  hover:bg-white/[0.08] transition-all text-sm group relative" title="Time-Lapse">
                🎬
                <span className="absolute left-12 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-xl
                  border border-white/[0.08] text-[10px] font-mono text-cyan-400 whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  TIME-LAPSE
                </span>
              </button>
              <button onClick={() => setShowUsernameEdit(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl
                  hover:bg-white/[0.08] transition-all text-sm group relative" title={`@${getUsername() || "Anonymous"}`}>
                👤
                <span className="absolute left-12 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-xl
                  border border-white/[0.08] text-[10px] font-mono text-cyan-400 whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  PROFILE
                </span>
              </button>
              <div className="h-px bg-white/[0.06] mx-1" />
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
