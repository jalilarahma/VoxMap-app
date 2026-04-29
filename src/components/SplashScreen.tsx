"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lang, t } from "@/i18n/translations";
import { useStealthMode, useSkinConfig } from "@/components/StealthMode";

// ═══════════════════════════════════════════════════════
// SPLASH SCREEN — Full Landing with Integrated About,
// Parallax Particles, ZKP Badge, Dynamic Glow
// ═══════════════════════════════════════════════════════

interface SplashScreenProps {
  lang: Lang;
  onEnter: () => void;
}

export default function SplashScreen({ lang, onEnter }: SplashScreenProps) {
  const tr = t[lang];
  const { isStealthy } = useStealthMode();
  const skinConfig = useSkinConfig();
  const [phase, setPhase] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  const [dots, setDots] = useState<
    { x: number; y: number; color: string; delay: number; size: number; depth: number }[]
  >([]);

  // Animate phases: 0 = globe, 1 = title, 2 = slogan, 3 = button
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Generate floating dots with depth layers for parallax
  useEffect(() => {
    const colors = ["#22C55E", "#EF4444", "#F97316", "#22C55E", "#EF4444", "#A855F7"];
    const generated = Array.from({ length: 45 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 3,
      size: 3 + Math.random() * 7,
      depth: 0.3 + Math.random() * 0.7,
    }));
    setDots(generated);
  }, []);

  // Mouse tracking for parallax
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.floor(eased * target));
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Scroll-reveal for about section
  const [aboutVisible, setAboutVisible] = useState(false);
  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAboutVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-[200vh] relative overflow-hidden bg-[#020617]"
    >
      {/* ── Parallax background dots (fixed layer) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {dots.map((dot, i) => {
          const offsetX = (mousePos.x - 0.5) * 30 * dot.depth;
          const offsetY = (mousePos.y - 0.5) * 30 * dot.depth;
          return (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                left: `calc(${dot.x}% + ${offsetX}px)`,
                top: `calc(${dot.y}% + ${offsetY}px)`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: dot.color,
                opacity: 0.25 + dot.depth * 0.15,
                animationDelay: `${dot.delay}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                transition: "left 0.3s ease-out, top 0.3s ease-out",
              }}
            />
          );
        })}
      </div>

      {/* ── Ambient glows (fixed) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-red-500/6 rounded-full blur-[80px]" />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 1 — Hero                           */}
      {/* ═══════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center relative z-10 px-6">
        <div className="text-center max-w-2xl">

          {/* Globe SVG */}
          <div
            className={`mb-8 transition-all duration-1000 ${
              phase >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
          >
            <svg viewBox="0 0 120 120" width="100" height="100" className="mx-auto animate-[spin_20s_linear_infinite]">
              <defs>
                <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#c026d3" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#globeGrad)" strokeWidth="2" opacity="0.8" />
              <ellipse cx="60" cy="60" rx="25" ry="50" fill="none" stroke="url(#globeGrad)" strokeWidth="1.5" opacity="0.5" />
              <ellipse cx="60" cy="60" rx="42" ry="50" fill="none" stroke="url(#globeGrad)" strokeWidth="1" opacity="0.3" />
              <line x1="10" y1="60" x2="110" y2="60" stroke="url(#globeGrad)" strokeWidth="1" opacity="0.4" />
              <line x1="15" y1="38" x2="105" y2="38" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.3" />
              <line x1="15" y1="82" x2="105" y2="82" stroke="url(#globeGrad)" strokeWidth="0.8" opacity="0.3" />
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
                  : "linear-gradient(135deg, #fb923c 0%, #ef4444 35%, #c026d3 70%, #9333ea 100%)",
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

            {/* Live counter with pulsing beacon */}
            <div className="flex items-center justify-center gap-2 mt-4 mb-10">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.4)]" />
              </span>
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
                <p className="text-lg md:text-xl text-slate-400 font-light tracking-wide">
                  &ldquo;{tr.slogan_1}
                </p>
                <p className="text-lg md:text-xl text-slate-400 font-light tracking-wide">
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
                transition-all duration-500
                hover:scale-105 active:scale-95
                shadow-lg shadow-red-500/25 hover:shadow-[0_0_40px_8px_rgba(239,68,68,0.35)]"
            >
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
                blur-xl opacity-20 group-hover:opacity-50 group-hover:blur-2xl transition-all duration-500" />
              <span className="relative">{isStealthy ? "Open App" : tr.enter}</span>
            </button>

            {/* ZKP Privacy badge */}
            {!isStealthy && (
              <div className="flex items-center justify-center gap-1.5 mt-4 mb-1">
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-emerald-500/70"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="text-[11px] text-slate-500">
                  Zero-Knowledge Privacy — 100% Anonymous
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 mt-2">
              {isStealthy
                ? (skinConfig.appName === "Weather Today" ? "Updated every hour" : "Updated every day")
                : "Join people from 195+ countries"}
            </p>
          </div>

          {/* Scroll indicator */}
          {!isStealthy && (
            <div className={`mt-16 transition-all duration-1000 delay-500 ${
              phase >= 3 ? "opacity-100" : "opacity-0"
            }`}>
              <div className="flex flex-col items-center gap-2 animate-bounce">
                <div className="w-5 h-8 rounded-full border-2 border-slate-600 flex justify-center pt-1.5">
                  <div className="w-1 h-2 bg-slate-500 rounded-full animate-pulse" />
                </div>
                <span className="text-[10px] text-slate-600 uppercase tracking-[0.3em]">Scroll</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* SECTION 2 — About Us (scroll-revealed)     */}
      {/* ═══════════════════════════════════════════ */}
      {!isStealthy && (
        <section
          ref={aboutRef}
          className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24"
        >
          <div className={`max-w-3xl w-full transition-all duration-1000 ${
            aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}>

            {/* Gradient divider */}
            <div className="w-24 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 rounded-full mx-auto mb-12" />

            {/* About heading */}
            <h2
              className="text-4xl md:text-5xl font-black text-center mb-4"
              style={{
                background: "linear-gradient(135deg, #fb923c 0%, #ef4444 35%, #c026d3 70%, #9333ea 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              About VoxMap
            </h2>
            <p className="text-xs tracking-[0.3em] text-slate-500 uppercase text-center mb-12">
              Why We Built This
            </p>

            {/* Mission text */}
            <div className="space-y-6 text-base md:text-lg text-slate-400 leading-relaxed text-center max-w-2xl mx-auto">
              <p>
                VoxMap is a real-time global sentiment engine — a platform where
                citizens worldwide answer one question per day and see how the
                world responds, live on a map.
              </p>
              <p>
                We believe that public opinion should be owned by the public.
                No filters. No algorithms deciding what you see. Just raw,
                anonymous human signal — mapped in real time.
              </p>
              <p className="text-white font-medium">
                Your voice matters. Your privacy is non-negotiable.
              </p>
            </div>

            {/* Three pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
              {[
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                  title: "Zero-Knowledge Privacy",
                  desc: "Your identity is never collected, stored, or linked to your vote. Built on ZKP architecture from day one.",
                },
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  ),
                  title: "Real-Time Intelligence",
                  desc: "Every vote appears on the map instantly. Watch global sentiment shift in real time, country by country.",
                },
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                      <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
                    </svg>
                  ),
                  title: "Democratic Visualization",
                  desc: "No editorial filters. No algorithmic curation. Pure signal from 195+ countries, visible to everyone equally.",
                },
              ].map((pillar, i) => (
                <div
                  key={i}
                  className={`p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80
                    hover:border-slate-600/60 transition-all duration-500 text-center
                    ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ transitionDelay: `${300 + i * 150}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl
                    bg-slate-800/60 border border-slate-700/40 mb-4">
                    {pillar.icon}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{pillar.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{pillar.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats bar */}
            <div className={`grid grid-cols-3 gap-6 mt-14 pt-8 border-t border-slate-800/60
              ${aboutVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: "700ms", transition: "all 1s" }}
            >
              {[
                { value: "195+", label: "Countries" },
                { value: "24/7", label: "Live Monitoring" },
                { value: "0 PII", label: "Data Collected" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-white">{s.value}</div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-[0.2em] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tagline */}
            <p className={`text-center text-sm text-slate-600 mt-14 ${aboutVisible ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: "900ms", transition: "all 1s" }}
            >
              The map is alive. Be the signal.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
