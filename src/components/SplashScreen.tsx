"use client";

import { Lang, t } from "@/i18n/translations";

interface SplashScreenProps {
  lang: Lang;
  onEnter: () => void;
}

export default function SplashScreen({ lang, onEnter }: SplashScreenProps) {
  const tr = t[lang];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-vox-dark">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 text-center">
        <h1 className="text-7xl md:text-8xl font-black gradient-text mb-2">
          {tr.app_name}
        </h1>
        <p className="text-sm tracking-[0.3em] text-slate-400 uppercase mb-16">
          {tr.tagline}
        </p>

        {/* Slogan */}
        <div className="space-y-2 mb-16">
          <p className="text-xl md:text-2xl text-slate-300 italic">
            &ldquo;{tr.slogan_1}
          </p>
          <p className="text-xl md:text-2xl text-slate-300 italic">
            {tr.slogan_2}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {tr.slogan_3}&rdquo;
          </p>
        </div>

        {/* Enter button */}
        <button
          onClick={onEnter}
          className="px-10 py-4 rounded-2xl text-xl font-bold text-white
            bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
            hover:from-orange-400 hover:via-red-400 hover:to-purple-400
            transition-all duration-300 glow-border
            hover:scale-105 active:scale-95"
        >
          {tr.enter}
        </button>
      </div>
    </div>
  );
}
