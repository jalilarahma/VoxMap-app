"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { useStealthMode, useSkinConfig } from "@/components/StealthMode";

interface SplashScreenProps {
  lang: Lang;
  onEnter: () => void;
}

export default function SplashScreen({ lang, onEnter }: SplashScreenProps) {
  const tr = t[lang];
  const { isStealthy } = useStealthMode();
  const skinConfig = useSkinConfig();
  const [phase, setPhase] = useState(0);
  const [dots, setDots] = useState<{ x: number; y: number; color: string; delay: number }[]>([]);

  // Animate phases: 0 = globe, 1 = title, 2 = slogan, 3 = button
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Generate floating dots (simulating vote locations on a globe)
  useEffect(() => {
    const colors = ["#22C55E", "#EF4444", "#F97316", "#22C55E", "#EF4444", "#A855F7"];
    const generated = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 3,
    }));
    setDots(generated);
  }, []);

  // Live counter animation
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    const target = 8247;
    const duration = 2000;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.floor(eased * target));
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#020617]">
      {/* Animated background dots — simulating global votes */}
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            backgroundColor: dot.color,
            opacity: 0.3,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}

      {/* Large ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-red-500/6 rounded-full blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl">

        {/* Globe SVG animation */}
        <div
          className={`mb-8 transition-all duration-1000 ${
            phase >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          <svg viewBox="0 0 120 120" width="100" height="100" className="mx-auto animate-[spin_20s_linear_infinite]">
            <defs>
              <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#globeGrad)" strokeWidth="2" opacity="0.8" />
            <ellipse cx="60" cy="60" rx="25" ry="50" fill="none" stroke="url(#globeGrad)" strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="60" cy="60" rx="42" ry="50" fill="none" stroke="url(#globeGrad)" strokeWidth="1" opacity="0.3" />
            <line x1="10" y1="60" x2="110" y2="60" stroke="url(#globeGrad)" strokeWidth="1" opacity="0.4" />
            <line x1="15" y1="38" x2="105" y2="38" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.3" />
            <line x1="15" y1="82" x2="105" y2="82" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.3" />
            {/* Vote dots on globe */}
            <circle cx="45" cy="42" r="3" fill="#22C55E" opacity="0.9">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="72" cy="55" r="3" fill="#EF4444" opacity="0.9">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="55" cy="75" r="2.5" fill="#22C55E" opacity="0.8">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="80" cy="38" r="2.5" fill="#EF4444" opacity="0.8">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="38" cy="62" r="2" fill="#F97316" opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* Title */}
        <div
          className={`transition-all duration-1000 ${
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h1
            className="text-6xl md:text-8xl font-black mb-1"
            style={{
              background: isStealthy
                ? (skinConfig.appName === "Weather Today"
                  ? "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 40%, #7DD3FC 100%)"
                  : "linear-gradient(135deg, #374151 0%, #4B5563 40%, #6B7280 100%)")
                : "linear-gradient(135deg, #f97316 0%, #ef4444 40%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            {isStealthy ? skinConfig.appName : tr.app_name}
          </h1>
          <p className="text-xs md:text-sm tracking-[0.4em] text-slate-500 uppercase mt-3 mb-2">
            {isStealthy ? skinConfig.tagline : tr.tagline}
          </p>

          {/* Live counter */}
          <div className="flex items-center justify-center gap-2 mt-4 mb-10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-slate-400">
              <span className="text-green-400 font-bold">{counter.toLocaleString()}</span>
              {isStealthy ? " locations tracked" : " voices heard worldwide"}
            </span>
          </div>
        </div>

        {/* Slogan */}
        <div
          className={`transition-all duration-1000 delay-200 ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {!isStealthy && (
            <div className="space-y-2 mb-12">
              <p className="text-lg md:text-xl text-slate-400 italic font-light">
                &ldquo;{tr.slogan_1}
              </p>
              <p className="text-lg md:text-xl text-slate-400 italic font-light">
                {tr.slogan_2}
              </p>
              <p className="text-xl md:text-2xl font-bold text-white mt-3">
                {tr.slogan_3}&rdquo;
              </p>
            </div>
          )}

          {isStealthy && skinConfig.appName === "Weather Today" && (
            <p className="text-lg text-slate-400 mb-12">
              Real-time weather updates and forecasts for your area.
            </p>
          )}

          {isStealthy && skinConfig.appName === "Daily Brief" && (
            <p className="text-lg text-slate-400 mb-12">
              Your personalized news digest, updated every day.
            </p>
          )}

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {(isStealthy
              ? skinConfig.appName === "Weather Today"
                ? [
                    { icon: "🌤️", text: "Forecast" },
                    { icon: "🌡️", text: "Temperature" },
                    { icon: "💨", text: "Wind Speed" },
                    { icon: "🌧️", text: "Rain Alerts" },
                  ]
                : [
                    { icon: "📰", text: "Headlines" },
                    { icon: "🌍", text: "World News" },
                    { icon: "📊", text: "Trends" },
                    { icon: "🔔", text: "Alerts" },
                  ]
              : [
                  { icon: "🗳️", text: "Vote Daily" },
                  { icon: "🗺️", text: "Live Map" },
                  { icon: "👑", text: "Earn Points" },
                  { icon: "🚨", text: "Emergency Alerts" },
                ]
            ).map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-slate-800/60 backdrop-blur-sm rounded-full px-3 py-1.5
                  border border-slate-700/50 text-xs text-slate-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enter button */}
        <div
          className={`transition-all duration-1000 delay-300 ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <button
            onClick={onEnter}
            className="group relative px-12 py-4 rounded-2xl text-xl font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:from-orange-400 hover:via-red-400 hover:to-purple-400
              transition-all duration-300
              hover:scale-105 active:scale-95
              shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <span className="relative">{isStealthy ? "Open App" : tr.enter}</span>
          </button>

          <p className="text-xs text-slate-600 mt-6">
            {isStealthy
              ? (skinConfig.appName === "Weather Today" ? "Updated every hour" : "Updated every day")
              : "Join people from 195+ countries"}
          </p>
        </div>
      </div>

    </div>
  );
}
