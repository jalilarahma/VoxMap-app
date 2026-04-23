"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/components/SplashScreen";
import DailyPoll from "@/components/DailyPoll";
import LanguagePicker from "@/components/LanguagePicker";
import Analytics from "@/components/Analytics";
import NotificationPrompt, { scheduleNotificationCheck } from "@/components/NotificationPrompt";
import UsernamePicker, { hasUsername, getUsername, setUsername as saveUsername } from "@/components/UsernamePicker";
import Community from "@/components/Community";
import StealthProvider, { StealthToggle } from "@/components/StealthMode";
import { Lang, RTL_LANGS } from "@/i18n/translations";

const TimeLapse = dynamic(() => import("@/components/TimeLapse"), { ssr: false });
const DailyInsight = dynamic(() => import("@/components/DailyInsight"), { ssr: false });
const CityChallenge = dynamic(() => import("@/components/CityChallenge"), { ssr: false });

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="text-xl gradient-text font-bold animate-pulse">Loading Map...</div>
    </div>
  ),
});

type Screen = "splash" | "username" | "poll" | "map";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [lang, setLang] = useState<Lang>("en");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [showCityChallenge, setShowCityChallenge] = useState(false);

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
    setShowAnalytics(false);
    setShowCommunity(false);
    setShowUsernameEdit(false);
    setShowNotifPrompt(false);
    setShowTimeLapse(false);
    setShowInsight(false);
    setShowCityChallenge(false);
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
            setScreen("map");
            setShowNotifPrompt(true);
          }} />
        )}

        {screen === "map" && (
          <>
            <WorldMap lang={lang} />
            {/* Analytics button — bottom left */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="fixed bottom-8 left-4 z-[1500] w-10 h-10 flex items-center justify-center
                rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
                hover:border-orange-400 transition-all text-sm"
            >
              📊
            </button>
            {/* Community button */}
            <button
              onClick={() => setShowCommunity(true)}
              className="fixed bottom-20 left-4 z-[1500] w-10 h-10 flex items-center justify-center
                rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
                hover:border-orange-400 transition-all text-sm"
            >
              💬
            </button>
            {/* Profile/username button */}
            <button
              onClick={() => setShowUsernameEdit(true)}
              className="fixed bottom-32 left-4 z-[1500] w-10 h-10 flex items-center justify-center
                rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
                hover:border-orange-400 transition-all text-sm"
              title={`@${getUsername() || "Anonymous"}`}
            >
              👤
            </button>
            {/* Daily Insight button */}
            <button
              onClick={() => setShowInsight(true)}
              className="fixed bottom-44 left-4 z-[1500] w-10 h-10 flex items-center justify-center
                rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
                hover:border-orange-400 transition-all text-sm"
              title="Daily Insight"
            >
              🧠
            </button>
            {/* Time-lapse button */}
            <button
              onClick={() => setShowTimeLapse(true)}
              className="fixed bottom-56 left-4 z-[1500] w-10 h-10 flex items-center justify-center
                rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
                hover:border-orange-400 transition-all text-sm"
              title="Sentiment Time-Lapse"
            >
              🎬
            </button>
            {/* City Challenge button — right side */}
            <button
              onClick={() => setShowCityChallenge(true)}
              className="fixed bottom-8 right-4 z-[1500] w-10 h-10 flex items-center justify-center
                rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
                hover:border-orange-400 transition-all text-sm"
              title="City Challenge"
            >
              🏙️
            </button>
            {/* Stealth mode toggle */}
            <StealthToggle />
          </>
        )}

        {showAnalytics && (
          <Analytics lang={lang} onClose={() => setShowAnalytics(false)} />
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

        {showInsight && (
          <DailyInsight onClose={() => setShowInsight(false)} />
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
