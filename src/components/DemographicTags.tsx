"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════
// DEMOGRAPHIC TAGS — Optional, Anonymous
// Shows after voting. Never required, always skippable.
// Increases B2B data value by adding demographic signals.
// ═══════════════════════════════════════════════════════

interface DemographicTagsProps {
  voteId: string | null; // The vote record ID to attach tags to
  onComplete: () => void;
}

const AGE_RANGES = [
  { id: "13-17", label: "13-17" },
  { id: "18-24", label: "18-24" },
  { id: "25-34", label: "25-34" },
  { id: "35-44", label: "35-44" },
  { id: "45-54", label: "45-54" },
  { id: "55-64", label: "55-64" },
  { id: "65+", label: "65+" },
];

const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
  { id: "prefer_not", label: "Prefer not to say" },
];

export default function DemographicTags({ voteId, onComplete }: DemographicTagsProps) {
  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!voteId || (!age && !gender)) {
      onComplete();
      return;
    }

    setSaving(true);
    try {
      // Build update payload — only include fields that were selected
      const updates: Record<string, string | undefined> = {};
      if (age) updates.age_group = age;
      if (gender) updates.gender = gender;

      // Update the vote record with demographic tags
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("votes")
          .update(updates)
          .eq("id", voteId);

        if (error) {
          console.error("[DemographicTags] Update failed:", error.message);
        }
      }

      // Store demographic locally to not ask again today
      try {
        localStorage.setItem("voxmap_demo_date", new Date().toISOString().slice(0, 10));
      } catch {}
    } catch (e) {
      console.error("Demo tag error:", e);
    }
    setSaving(false);
    onComplete();
  }

  // Check if already submitted today — auto-skip
  const [shouldSkip, setShouldSkip] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("voxmap_demo_date");
      if (saved === new Date().toISOString().slice(0, 10)) {
        setShouldSkip(true);
        onComplete();
      }
    } catch {}
  }, [onComplete]);

  if (shouldSkip) return null;

  return (
    <div className="fixed inset-0 z-[2500] bg-black/80 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-700
        p-6 max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full
            bg-gradient-to-r from-orange-500/20 to-purple-500/20 mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <h2 className="text-lg font-bold text-white">Help us understand voters</h2>
          <p className="text-xs text-slate-500 mt-1">
            100% optional and anonymous. This helps create better insights.
          </p>
        </div>

        {/* Age Range */}
        <div className="mb-5">
          <p className="text-sm text-slate-400 mb-2 font-semibold">Age Range</p>
          <div className="grid grid-cols-4 gap-2">
            {AGE_RANGES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAge(age === a.id ? null : a.id)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all
                  ${age === a.id
                    ? "bg-orange-500/20 border-2 border-orange-500 text-orange-400"
                    : "bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-2 font-semibold">Gender</p>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGender(gender === g.id ? null : g.id)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all
                  ${gender === g.id
                    ? "bg-purple-500/20 border-2 border-purple-500 text-purple-400"
                    : "bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-[1.02] active:scale-95 transition-all"
          >
            {saving ? "Saving..." : (age || gender) ? "Submit" : "Skip"}
          </button>
          <button
            onClick={onComplete}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip — stay anonymous
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-[10px] text-slate-700 text-center mt-4">
          This data is anonymous and never linked to your identity.
          It helps researchers understand demographic patterns in global opinion.
        </p>
      </div>
    </div>
  );
}
