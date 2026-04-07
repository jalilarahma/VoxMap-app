"use client";

import { useState, useRef, useEffect } from "react";
import { Lang, LANG_LABELS } from "@/i18n/translations";

interface LanguagePickerProps {
  currentLang: Lang;
  onChangeLang: (lang: Lang) => void;
}

const LANGS: Lang[] = ["en", "ar", "ru", "zh", "he", "fa"];

export default function LanguagePicker({
  currentLang,
  onChangeLang,
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="fixed top-4 left-4 z-[3000]">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-xl
          bg-slate-900/90 backdrop-blur-sm border border-slate-700/50
          hover:border-orange-400 transition-all text-lg"
      >
        🌍
      </button>

      {open && (
        <div className="absolute top-12 left-0 bg-slate-900/95 backdrop-blur-sm
          rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
          {LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onChangeLang(lang);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2.5 text-sm text-left
                transition-all whitespace-nowrap
                ${
                  currentLang === lang
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
