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
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all
            ${
              currentLang === lang
                ? "bg-orange-500 text-white"
                : "bg-vox-dark-card/80 text-slate-400 border border-vox-dark-border hover:bg-white/10"
            }`}
        >
          {LANG_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
