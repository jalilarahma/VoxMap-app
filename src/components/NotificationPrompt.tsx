"use client";

import { useState, useEffect } from "react";

/**
 * NotificationPrompt — asks users to enable daily vote reminders.
 * Shows once after first vote, remembers the choice, and schedules
 * periodic check-ins via the service worker to fire local notifications.
 */

const PREF_KEY = "voxmap_notif_pref"; // "granted" | "denied" | "dismissed"
const LAST_NOTIF_KEY = "voxmap_last_notif";

function getNotifPref(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(PREF_KEY) : null;
  } catch {
    return null;
  }
}

function setNotifPref(val: string) {
  try {
    localStorage.setItem(PREF_KEY, val);
  } catch {}
}

export function scheduleNotificationCheck() {
  // Register a periodic check — if user hasn't voted today and it's after 9 AM,
  // fire a reminder notification
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const checkAndNotify = () => {
    try {
      const lastNotif = localStorage.getItem(LAST_NOTIF_KEY) || "";
      const today = new Date().toISOString().slice(0, 10);
      const hour = new Date().getHours();

      // Only notify once per day, after 9 AM
      if (lastNotif === today || hour < 9) return;

      // Check if user already voted today (from streak data)
      const streakRaw = localStorage.getItem("voxmap_streak");
      if (streakRaw) {
        const streak = JSON.parse(streakRaw);
        if (streak.lastDate === today) return; // Already voted today
      }

      // Send reminder
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title: "VoxMap — Time to Vote!",
          body: "Today's question is waiting for your voice. Keep your streak alive!",
          icon: "/icons/icon-192.png",
        });
      } else {
        // Fallback: direct notification
        new Notification("VoxMap — Time to Vote!", {
          body: "Today's question is waiting for your voice. Keep your streak alive!",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
        });
      }

      localStorage.setItem(LAST_NOTIF_KEY, today);
    } catch {}
  };

  // Check every 30 minutes
  checkAndNotify();
  setInterval(checkAndNotify, 30 * 60 * 1000);
}

interface NotificationPromptProps {
  onDismiss: () => void;
}

export default function NotificationPrompt({ onDismiss }: NotificationPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if: no Notification API, already decided, or already granted
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      // Already granted — just start the scheduler
      scheduleNotificationCheck();
      return;
    }
    if (Notification.permission === "denied") return;

    const pref = getNotifPref();
    if (pref) return; // User already made a choice

    // Show prompt after a short delay
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotifPref("granted");
        scheduleNotificationCheck();

        // Show a confirmation notification
        new Notification("You're all set!", {
          body: "You'll get a daily reminder to vote on VoxMap.",
          icon: "/icons/icon-192.png",
        });
      } else {
        setNotifPref("denied");
      }
    } catch {
      setNotifPref("denied");
    }
    setVisible(false);
    onDismiss();
  };

  const handleDismiss = () => {
    setNotifPref("dismissed");
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-4 shadow-2xl">
        {/* Bell icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-500 mb-2">
            <span className="text-2xl">🔔</span>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white text-center">
          Never miss a vote!
        </h3>
        <p className="text-slate-400 text-sm text-center leading-relaxed">
          Get a daily reminder when a new question drops. Keep your streak alive and make your voice count.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={handleEnable}
            className="w-full py-3 rounded-xl text-base font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-[1.02] active:scale-95 transition-all"
          >
            Enable Reminders
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-white
              transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
