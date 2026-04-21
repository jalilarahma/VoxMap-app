"use client";

import { useEffect, useRef, useState } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";
import { canCreatePin, recordPinCreation } from "@/lib/rateLimit";
import { getUsername } from "@/components/UsernamePicker";

// Parse pin note — format is "username||actual note" or just "note"
function parsePinNote(note: string | null): { username: string; comment: string } {
  if (!note) return { username: "Anonymous", comment: "" };
  if (note.includes("||")) {
    const [username, ...rest] = note.split("||");
    return { username: username || "Anonymous", comment: rest.join("||") };
  }
  return { username: "Anonymous", comment: note };
}

// SOS Categories — original clean colors
const SOS_CATEGORIES = [
  { id: "danger", icon: "⚠️", color: "#EF4444" },
  { id: "robbery", icon: "💰", color: "#F59E0B" },
  { id: "assault", icon: "🤛", color: "#DC2626" },
  { id: "medical", icon: "🏥", color: "#10B981" },
  { id: "fire", icon: "🔥", color: "#F97316" },
  { id: "trapped", icon: "🚧", color: "#8B5CF6" },
  { id: "flood", icon: "🌊", color: "#3B82F6" },
  { id: "shooting", icon: "🔫", color: "#991B1B" },
  { id: "missing", icon: "👤", color: "#6366F1" },
  { id: "safe", icon: "✅", color: "#22C55E" },
  { id: "help", icon: "🆘", color: "#E11D48" },
  { id: "info", icon: "ℹ️", color: "#0EA5E9" },
];

const URGENCY_LEVELS = [
  { id: "critical", color: "#DC2626" },
  { id: "high", color: "#F59E0B" },
  { id: "medium", color: "#3B82F6" },
  { id: "low", color: "#22C55E" },
];

interface Pin {
  id: string;
  lat: number;
  lng: number;
  category: string;
  urgency: string;
  note: string | null;
  city: string | null;
  created_at: string;
  helpful_count: number;
}

// ── Nearby Alert Logic ──
const NEARBY_RADIUS_KM = 5;
const ALERT_COOLDOWN_KEY = "voxmap_alert_cooldown";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function canSendAlert(): boolean {
  try {
    const last = localStorage.getItem(ALERT_COOLDOWN_KEY);
    if (!last) return true;
    // Minimum 2 minutes between alerts
    return Date.now() - parseInt(last) > 120000;
  } catch { return true; }
}

function markAlertSent() {
  try { localStorage.setItem(ALERT_COOLDOWN_KEY, Date.now().toString()); } catch {}
}

function sendNearbyAlert(pin: Pin, distKm: number) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!canSendAlert()) return;

  const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
  const distText = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`;

  const title = `⚠️ ${cat?.icon || "📍"} Alert nearby — ${distText} away`;
  const body = `${pin.category.toUpperCase()}${pin.urgency === "critical" ? " (CRITICAL)" : ""}: ${pin.note || "Emergency pin dropped near you."}`;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      title,
      body,
      icon: "/icons/icon-192.png",
    });
  } else {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  }

  markAlertSent();
}

interface WorldMapProps {
  lang: Lang;
}

export default function WorldMap({ lang }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tr = t[lang];
  const [pins, setPins] = useState<Pin[]>([]);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [pinNote, setPinNote] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [helpedCount, setHelpedCount] = useState(0);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 12);
          }
        },
        () => {},
        { timeout: 10000 }
      );
    }
  }, []);

  // Fetch pins
  useEffect(() => {
    async function fetchPins() {
      const { data, error } = await supabase
        .from("pins")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (data && !error) {
        setPins(data);
        setHelpedCount(data.reduce((sum, p) => sum + (p.helpful_count || 0), 0));
      }
    }

    fetchPins();

    const channel = supabase
      .channel("pins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pins" },
        (payload) => {
          const newPin = payload.new as Pin;
          setPins((prev) => [newPin, ...prev]);

          // Check nearby alert
          const loc = userLocationRef.current;
          if (loc && newPin.lat && newPin.lng) {
            const dist = getDistanceKm(loc.lat, loc.lng, newPin.lat, newPin.lng);
            if (dist <= NEARBY_RADIUS_KM) {
              sendNearbyAlert(newPin, dist);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initialize map — centered on Morocco
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [31.5, -7.5], // Morocco
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      // Use CartoDB tiles with English-only labels
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Zoom controls bottom-right — away from everything
      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      pins.forEach((pin) => {
        const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
        if (!cat) return;

        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: pin.urgency === "critical" ? 12 : pin.urgency === "high" ? 10 : 8,
          fillColor: cat.color,
          color: "#fff",
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.8,
        }).addTo(mapInstanceRef.current);

        const timeAgo = getTimeAgo(pin.created_at);
        const { username, comment } = parsePinNote(pin.note);

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:200px;">
            <div style="font-size:24px;text-align:center;margin-bottom:8px;">${cat.icon}</div>
            <div style="font-size:16px;font-weight:bold;text-align:center;color:${cat.color};">
              ${tr[pin.category as keyof typeof tr] || pin.category}
            </div>
            <div style="text-align:center;margin-top:6px;">
              <span style="color:#F59E0B;font-weight:600;font-size:13px;">@${username}</span>
            </div>
            ${comment ? `<div style="background:#1e293b;border-radius:10px;padding:8px 12px;margin-top:8px;color:#e2e8f0;font-size:13px;line-height:1.4;border-left:3px solid ${cat.color};">${comment}</div>` : ""}
            ${pin.city ? `<div style="text-align:center;color:#94a3b8;margin-top:6px;font-size:11px;">📍 ${pin.city}</div>` : ""}
            <div style="text-align:center;margin-top:8px;">
              <span style="padding:2px 8px;border-radius:8px;font-size:12px;
                background:${URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color}22;
                color:${URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color};">
                ${tr[pin.urgency as keyof typeof tr] || pin.urgency}
              </span>
            </div>
            <div style="text-align:center;color:#64748b;margin-top:8px;font-size:11px;">
              ${timeAgo}
            </div>
          </div>
        `);

        markersRef.current.push(marker);
      });
    });
  }, [pins, lang]);

  function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  // Submit pin
  const handleSubmitPin = async () => {
    if (!selectedCategory || !selectedUrgency || isSubmitting) return;

    // Rate limit check
    const rateCheck = canCreatePin();
    if (!rateCheck.allowed) {
      alert(rateCheck.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceId = await getDeviceId();

      let lat = 31.5 + Math.random() * 4 - 2;
      let lng = -7.5 + Math.random() * 4 - 2;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {}
      }

      // Must be authenticated to insert (RLS policy)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          console.error("Auth error:", authError);
          alert("Authentication failed. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // Encode username into note field: "username||comment"
      const username = getUsername() || "Anonymous";
      const encodedNote = pinNote ? `${username}||${pinNote}` : `${username}||`;

      const { error } = await supabase.from("pins").insert({
        device_id: deviceId,
        category: selectedCategory,
        urgency: selectedUrgency,
        note: encodedNote,
        lat,
        lng,
        location: `POINT(${lng} ${lat})`,
        is_active: true,
      });

      if (error) {
        console.error("Pin creation error:", error);
      } else {
        recordPinCreation();
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 14);
        }
      }
    } catch (e) {
      console.error("Pin error:", e);
    }

    setIsSubmitting(false);
    resetCreate();
  };

  const resetCreate = () => {
    setShowCreatePin(false);
    setCreateStep(0);
    setSelectedCategory(null);
    setSelectedUrgency(null);
    setPinNote("");
  };

  return (
    <div className="relative w-full h-screen">
      {/* Map */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Top-right stats — small, no overlap with zoom (zoom is bottom-right) */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400">{tr.pins_active}</span>
          <span className="ml-1.5 text-sm font-bold text-orange-400">{pins.length}</span>
        </div>
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400">{tr.people_helped}</span>
          <span className="ml-1.5 text-sm font-bold text-green-400">{helpedCount}</span>
        </div>
        <button
          onClick={() => setShowFeed(!showFeed)}
          className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-700/50
            hover:bg-white/10 transition-all"
        >
          <span className="text-xs">📡</span>
        </button>
      </div>

      {/* Live Feed Panel */}
      {showFeed && (
        <div className="absolute top-14 right-4 z-[1000] w-72 max-h-80 overflow-y-auto
          bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-white">📡 {tr.live_feed}</h3>
            <button onClick={() => setShowFeed(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
          </div>
          {pins.slice(0, 10).map((pin) => {
            const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
            const { username: pinUser, comment: pinComment } = parsePinNote(pin.note);
            return (
              <div
                key={pin.id}
                className="flex items-center gap-2 py-2 border-b border-slate-700/50 last:border-0 cursor-pointer hover:bg-white/5 rounded px-1"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([pin.lat, pin.lng], 14);
                  }
                  setShowFeed(false);
                }}
              >
                <span className="text-lg">{cat?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    <span className="text-orange-400">@{pinUser}</span>
                    {" — "}
                    {tr[pin.category as keyof typeof tr] || pin.category}
                  </p>
                  {pinComment && <p className="text-[10px] text-slate-400 truncate">{pinComment}</p>}
                  <p className="text-[10px] text-slate-500">{getTimeAgo(pin.created_at)}</p>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color }}
                />
              </div>
            );
          })}
          {pins.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No active pins yet</p>
          )}
        </div>
      )}

      {/* SOS Button — clean, bottom center */}
      <button
        onClick={() => setShowCreatePin(true)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]
          px-8 py-4 rounded-2xl text-lg font-bold text-white
          bg-gradient-to-r from-red-600 to-red-500
          hover:from-red-500 hover:to-red-400
          active:scale-95 transition-all duration-200
          shadow-lg shadow-red-500/30"
      >
        🆘 {tr.emergency}
      </button>

      {/* Create Pin Modal — categories ONLY appear here */}
      {showCreatePin && (
        <div className="absolute inset-0 z-[2000] bg-black/70 flex items-end">
          <div className="w-full bg-slate-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto border-t border-slate-700/50">
            {/* Step 0: Category */}
            {createStep === 0 && (
              <>
                <h3 className="text-xl font-bold mb-4">{tr.select_category}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {SOS_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setCreateStep(1);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border
                        border-slate-700/50 bg-slate-800/50 hover:bg-white/5
                        transition-all hover:scale-105"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs" style={{ color: cat.color }}>
                        {tr[cat.id as keyof typeof tr] || cat.id}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 1: Urgency */}
            {createStep === 1 && (
              <>
                <h3 className="text-xl font-bold mb-4">{tr.select_urgency}</h3>
                <div className="space-y-3">
                  {URGENCY_LEVELS.map((urg) => (
                    <button
                      key={urg.id}
                      onClick={() => {
                        setSelectedUrgency(urg.id);
                        setCreateStep(2);
                      }}
                      className="w-full py-4 px-6 rounded-xl text-left font-semibold
                        border border-slate-700/50 bg-slate-800/50
                        hover:bg-white/5 transition-all"
                      style={{ borderLeftColor: urg.color, borderLeftWidth: 4 }}
                    >
                      <span style={{ color: urg.color }}>
                        {tr[urg.id as keyof typeof tr] || urg.id}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Comment + Submit */}
            {createStep === 2 && (
              <>
                <h3 className="text-xl font-bold mb-2">{tr.add_note}</h3>
                <p className="text-sm text-slate-400 mb-4">Your comment will be visible on the map for everyone to see.</p>
                <textarea
                  value={pinNote}
                  onChange={(e) => setPinNote(e.target.value)}
                  className="w-full h-32 bg-slate-800 rounded-xl p-4 text-white
                    border border-slate-700/50 focus:border-orange-500
                    focus:outline-none resize-none"
                  placeholder="What's happening? Describe the situation..."
                  maxLength={280}
                />
                <p className="text-xs text-slate-600 mt-1 text-right">{pinNote.length}/280</p>
                <button
                  onClick={handleSubmitPin}
                  disabled={isSubmitting}
                  className={`w-full mt-4 py-4 rounded-xl text-lg font-bold text-white
                    bg-gradient-to-r from-red-600 to-orange-500
                    active:scale-95 transition-all
                    ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:from-red-500 hover:to-orange-400"}`}
                >
                  {isSubmitting ? "..." : tr.confirm_pin}
                </button>
              </>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-4">
              {createStep > 0 && (
                <button
                  onClick={() => setCreateStep(createStep - 1)}
                  className="flex-1 py-3 rounded-xl text-slate-400 border border-slate-700/50
                    hover:bg-white/5 transition-all"
                >
                  {tr.back}
                </button>
              )}
              <button
                onClick={resetCreate}
                className="flex-1 py-3 rounded-xl text-slate-400 border border-slate-700/50
                  hover:bg-white/5 transition-all"
              >
                {tr.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
