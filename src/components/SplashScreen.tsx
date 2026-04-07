"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";

interface SplashScreenProps {
  lang: Lang;
  onEnter: () => void;
}

export default function SplashScreen({ lang, onEnter }: SplashScreenProps) {
  const tr = t[lang];
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#0A0A0A]">
      {/* Background urban elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Spray paint splatters */}
        <div className="absolute top-10 left-10 w-40 h-40 bg-[#BFFF00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-[#FF006E]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-[#00F5FF]/5 rounded-full blur-3xl" />

        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Diagonal stripe */}
        <div className="absolute -top-20 -right-20 w-[600px] h-1 bg-[#BFFF00]/20 rotate-45" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-1 bg-[#FF006E]/20 -rotate-45" />
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Tag / sticker above logo */}
        <div className="mb-6 animate-spray">
          <span className="tape-strip text-xs font-bold tracking-widest">
            EST. 2026
          </span>
        </div>

        {/* Logo - graffiti style */}
        <h1 className="font-graffiti text-7xl md:text-9xl spray-text mb-1 animate-flicker"
          style={{ letterSpacing: '-2px' }}
        >
          {tr.app_name}
        </h1>

        {/* Tagline with urban styling */}
        <div className="flex items-center justify-center gap-3 mb-16">
          <div className="h-[2px] w-8 bg-[#BFFF00]" />
          <p className="font-urban text-[10px] tracking-[0.4em] text-[#BFFF00] uppercase">
            {tr.tagline}
          </p>
          <div className="h-[2px] w-8 bg-[#BFFF00]" />
        </div>

        {/* Slogan - raw/rebellious style */}
        <div className="space-y-2 mb-16 max-w-md mx-auto px-4">
          <p className="text-lg md:text-xl text-zinc-500 font-light italic animate-drip" style={{ animationDelay: '0.2s' }}>
            &ldquo;{tr.slogan_1}
          </p>
          <p className="text-lg md:text-xl text-zinc-400 font-light italic animate-drip" style={{ animationDelay: '0.4s' }}>
            {tr.slogan_2}
          </p>
          <p className="text-xl md:text-2xl text-white font-bold font-urban animate-drip neon-glow" style={{ animationDelay: '0.6s' }}>
            {tr.slogan_3}&rdquo;
          </p>
        </div>

        {/* Enter button - urban style */}
        <button
          onClick={onEnter}
          className="group relative px-10 py-4 text-lg font-urban uppercase tracking-wider
            bg-[#BFFF00] text-black
            hover:bg-[#00F5FF] hover:text-black
            transition-all duration-300
            active:scale-95
            border-0"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
        >
          <span className="relative z-10">{tr.enter}</span>
          {/* Corner cuts decoration */}
        </button>

        {/* Bottom tag */}
        <div className="mt-12 opacity-30">
          <p className="text-[10px] tracking-[0.3em] text-zinc-600 font-mono">
            [ POWERED BY THE PEOPLE ]
          </p>
        </div>
      </div>
    </div>
  );
}
