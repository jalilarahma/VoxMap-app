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

  // Close dropdown on outside click
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
        className="w-10 h-10 flex items-center justify-center
          bg-[#141414]/90 backdrop-blur-sm border border-[#2A2A2A]
          hover:border-[#BFFF00] transition-all text-lg"
        style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
      >
        🌍
      </button>

      {open && (
        <div className="absolute top-12 left-0 bg-[#141414]/95 backdrop-blur-sm
          border border-[#2A2A2A] overflow-hidden animate-spray"
          style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
        >
          {LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onChangeLang(lang);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-xs font-urban tracking-wider text-left
                transition-all whitespace-nowrap
                ${
                  currentLang === lang
                    ? "bg-[#BFFF00] text-black"
                    : "text-zinc-400 hover:bg-white/10 hover:text-[#BFFF00]"
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
