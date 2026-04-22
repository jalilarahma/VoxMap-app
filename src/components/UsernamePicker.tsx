"use client";

import { useState } from "react";
import Link from "next/link";
import { sanitizeUsername, moderateUsername } from "@/lib/security";

const USERNAME_KEY = "voxmap_username";

/** Get stored username, or null if not set */
export function getUsername(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(USERNAME_KEY) : null;
  } catch {
    return null;
  }
}

/** Save username */
export function setUsername(name: string) {
  try {
    localStorage.setItem(USERNAME_KEY, name);
  } catch {}
}

/** Check if user has already chosen a username */
export function hasUsername(): boolean {
  return !!getUsername();
}

interface UsernamePickerProps {
  onComplete: (username: string) => void;
}

export default function UsernamePicker({ onComplete }: UsernamePickerProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = sanitizeUsername(name);

    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be under 20 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+$/.test(trimmed)) {
      setError("Letters, numbers, underscores, and Arabic only");
      return;
    }

    // Content moderation on username
    const modResult = moderateUsername(trimmed);
    if (!modResult.allowed) {
      setError(modResult.reason || "Username not allowed");
      return;
    }

    setUsername(trimmed);
    onComplete(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-vox-dark px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
            bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 mb-4">
            <span className="text-4xl">👤</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Welcome to VoxMap
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Choose a username that will appear with your pins on the map.
            This is how others will see you.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">@</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="your_username"
              maxLength={20}
              autoFocus
              className="w-full py-4 pl-10 pr-4 rounded-xl text-lg text-white
                bg-slate-800 border border-slate-700/50
                focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50
                placeholder-slate-600 transition-all"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <p className="text-slate-600 text-xs text-center">
            {name.trim().length}/20 characters
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={name.trim().length < 2}
          className={`w-full py-4 rounded-2xl text-lg font-bold text-white transition-all duration-300
            ${name.trim().length >= 2
              ? "bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 hover:scale-[1.02] active:scale-95"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
        >
          Continue
        </button>

        {/* Skip option */}
        <button
          onClick={() => {
            setUsername("Anonymous");
            onComplete("Anonymous");
          }}
          className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Skip — stay anonymous
        </button>

        {/* Legal links */}
        <p className="text-center text-xs text-slate-600 mt-4">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-orange-400/70 hover:text-orange-300 underline underline-offset-2 transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-orange-400/70 hover:text-orange-300 underline underline-offset-2 transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
