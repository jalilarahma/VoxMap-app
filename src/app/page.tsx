"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/components/SplashScreen";
import DailyPoll from "@/components/DailyPoll";
import LanguagePicker from "@/components/LanguagePicker";
import Analytics from "@/components/Analytics";
import NotificationPrompt, { scheduleNotificationCheck } from "@/components/NotificationPrompt";
import UsernamePicker, { hasUsername, getUsername, setUsername as saveUsername } from "@/components/UsernamePicker";
import Community from "@/components/Community";
import Link from "next/link";
import { Lang, RTL_LANGS } from "@/i18n/translations";

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

  // Start notification scheduler if already granted
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      scheduleNotificationCheck();
    }
  }, []);

  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  return (
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

      {showUsernameEdit && (
        <UsernamePicker onComplete={(name) => {
          saveUsername(name);
          setShowUsernameEdit(false);
        }} />
      )}
    </div>
  );
}
