"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ═══════════════════════════════════════════════════
// STEALTH MODE — Disguise VoxMap as Weather or News
// For users in countries with restricted press freedom
// ═══════════════════════════════════════════════════

export type StealthSkin = "voxmap" | "weather" | "news";

interface StealthContextType {
  skin: StealthSkin;
  isStealthy: boolean;
  setSkin: (skin: StealthSkin) => void;
  toggleStealth: () => void;
  panic: () => void; // instant switch to stealth + clear view
}

const StealthContext = createContext<StealthContextType>({
  skin: "voxmap",
  isStealthy: false,
  setSkin: () => {},
  toggleStealth: () => {},
  panic: () => {},
});

export function useStealthMode() {
  return useContext(StealthContext);
}

// ── Skin configurations ──
const SKIN_CONFIG: Record<StealthSkin, {
  title: string;
  faviconEmoji: string;
  bodyClass: string;
  appName: string;
  tagline: string;
}> = {
  voxmap: {
    title: "VoxMap — The Living Voice of the People",
    faviconEmoji: "🗺️",
    bodyClass: "skin-voxmap",
    appName: "VoxMap",
    tagline: "The Living Voice of the People",
  },
  weather: {
    title: "Weather Today — Local Forecast",
    faviconEmoji: "☀️",
    bodyClass: "skin-weather",
    appName: "Weather Today",
    tagline: "Your Local Forecast",
  },
  news: {
    title: "Daily Brief — News Reader",
    faviconEmoji: "📰",
    bodyClass: "skin-news",
    appName: "Daily Brief",
    tagline: "Stay Informed",
  },
};

const STORAGE_KEY = "voxmap_skin";

// Generate a data URL favicon from emoji
function generateFavicon(emoji: string): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.font = "56px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 32, 36);
  return canvas.toDataURL("image/png");
}

function applyFavicon(dataUrl: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = dataUrl;

  // Also update apple-touch-icon
  let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
  if (apple) {
    apple.href = dataUrl;
  }
}

function applyTitle(title: string) {
  if (typeof document !== "undefined") {
    document.title = title;
  }
}

function applyBodyClass(skin: StealthSkin) {
  if (typeof document === "undefined") return;
  const body = document.body;
  // Remove all skin classes
  body.classList.remove("skin-voxmap", "skin-weather", "skin-news");
  // Add current skin class
  body.classList.add(SKIN_CONFIG[skin].bodyClass);
}

interface StealthProviderProps {
  children: ReactNode;
  onPanic?: () => void; // callback to reset app view on panic
}

export default function StealthProvider({ children, onPanic }: StealthProviderProps) {
  const [skin, setSkinState] = useState<StealthSkin>("voxmap");

  // Load saved skin on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as StealthSkin | null;
      if (saved && SKIN_CONFIG[saved]) {
        setSkinState(saved);
        applySkin(saved);
      }
    } catch {}
  }, []);

  function applySkin(s: StealthSkin) {
    const config = SKIN_CONFIG[s];
    applyTitle(config.title);
    applyFavicon(generateFavicon(config.faviconEmoji));
    applyBodyClass(s);
  }

  const setSkin = useCallback((s: StealthSkin) => {
    setSkinState(s);
    applySkin(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {}
  }, []);

  const toggleStealth = useCallback(() => {
    const next: StealthSkin = skin === "voxmap" ? "weather" : "voxmap";
    setSkin(next);
  }, [skin, setSkin]);

  const panic = useCallback(() => {
    // Instantly switch to weather (most innocent-looking)
    setSkin("weather");
    // Trigger panic callback to reset view
    onPanic?.();
  }, [setSkin, onPanic]);

  const isStealthy = skin !== "voxmap";

  // ── Panic Gesture: Double-tap detection ──
  useEffect(() => {
    let lastTap = 0;

    function handleDoubleTap(e: TouchEvent) {
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap detected — only on the logo area (top-left corner)
        const touch = e.touches[0] || e.changedTouches[0];
        if (touch && touch.clientX < 150 && touch.clientY < 80) {
          e.preventDefault();
          panic();
        }
      }
      lastTap = now;
    }

    // Also support rapid click for desktop
    let lastClick = 0;
    function handleDoubleClick(e: MouseEvent) {
      const now = Date.now();
      if (now - lastClick < 300) {
        if (e.clientX < 150 && e.clientY < 80) {
          panic();
        }
      }
      lastClick = now;
    }

    document.addEventListener("touchstart", handleDoubleTap, { passive: false });
    document.addEventListener("click", handleDoubleClick);

    return () => {
      document.removeEventListener("touchstart", handleDoubleTap);
      document.removeEventListener("click", handleDoubleClick);
    };
  }, [panic]);

  // ── Panic Gesture: Device shake detection ──
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let shakeCount = 0;
    let lastShakeTime = 0;
    const SHAKE_THRESHOLD = 25;

    function handleMotion(e: DeviceMotionEvent) {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const deltaX = Math.abs(acc.x - lastX);
      const deltaY = Math.abs(acc.y - lastY);
      const deltaZ = Math.abs(acc.z - lastZ);

      if (deltaX + deltaY + deltaZ > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime > 200) {
          shakeCount++;
          lastShakeTime = now;

          // 3 shakes within 2 seconds = panic
          if (shakeCount >= 3) {
            panic();
            shakeCount = 0;
          }

          // Reset shake count after 2 seconds of no shaking
          setTimeout(() => {
            shakeCount = Math.max(0, shakeCount - 1);
          }, 2000);
        }
      }

      lastX = acc.x;
      lastY = acc.y;
      lastZ = acc.z;
    }

    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("devicemotion", handleMotion);
      }
    };
  }, [panic]);

  return (
    <StealthContext.Provider value={{ skin, isStealthy, setSkin, toggleStealth, panic }}>
      {children}
    </StealthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════
// Stealth Mode Toggle Button — Settings gear icon
// ═══════════════════════════════════════════════════
export function StealthToggle() {
  const { skin, setSkin, isStealthy } = useStealthMode();
  const [showMenu, setShowMenu] = useState(false);

  const skins: { id: StealthSkin; icon: string; label: string; desc: string }[] = [
    { id: "voxmap", icon: "🗺️", label: "VoxMap", desc: "Default appearance" },
    { id: "weather", icon: "☀️", label: "Weather Today", desc: "Weather app disguise" },
    { id: "news", icon: "📰", label: "Daily Brief", desc: "News reader disguise" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`fixed bottom-[17rem] left-4 z-[1500] w-10 h-10 flex items-center justify-center
          rounded-xl backdrop-blur-sm border transition-all text-sm
          ${isStealthy
            ? "bg-green-900/90 border-green-700/50 hover:border-green-400"
            : "bg-slate-900/90 border-slate-700/50 hover:border-orange-400"
          }`}
        title="Appearance"
      >
        {isStealthy ? "🛡️" : "⚙️"}
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[2900]" onClick={() => setShowMenu(false)} />

          {/* Menu */}
          <div className="fixed bottom-[17rem] left-16 z-[3000] w-64 rounded-2xl overflow-hidden
            bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50">

            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-white font-bold text-sm">Appearance</p>
              <p className="text-slate-500 text-xs mt-0.5">Change how VoxMap looks on your screen</p>
            </div>

            <div className="p-2 space-y-1">
              {skins.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSkin(s.id);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
                    ${skin === s.id
                      ? "bg-orange-500/20 border border-orange-500/30"
                      : "hover:bg-slate-800 border border-transparent"
                    }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{s.label}</p>
                    <p className="text-slate-500 text-xs">{s.desc}</p>
                  </div>
                  {skin === s.id && (
                    <span className="text-green-400 text-xs font-bold">Active</span>
                  )}
                </button>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-800">
              <p className="text-slate-600 text-[10px] leading-relaxed">
                Shake your device or double-tap the top-left corner to instantly switch to a disguised mode.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Helper: Get skin-aware app name and tagline
// ═══════════════════════════════════════════════════
export function useSkinConfig() {
  const { skin } = useStealthMode();
  return SKIN_CONFIG[skin];
}
