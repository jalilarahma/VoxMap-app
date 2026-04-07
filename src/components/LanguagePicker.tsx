"use client";

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
  return (
    <div className="fixed top-4 left-4 z-[3000] flex flex-wrap gap-1">
      {LANGS.map((lang) => (
        <button
          key={lang}
          onClick={() => onChangeLang(lang)}
          className={`px-2 py-1 text-[10px] font-urban tracking-wider transition-all
            ${
              currentLang === lang
                ? "bg-[#BFFF00] text-black"
                : "bg-[#141414] text-zinc-500 border border-[#2A2A2A] hover:border-[#BFFF00] hover:text-[#BFFF00]"
            }`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
        >
          {LANG_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
