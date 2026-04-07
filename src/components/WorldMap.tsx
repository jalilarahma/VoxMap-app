"use client";

import { useEffect, useRef, useState } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";

// SOS Categories
const SOS_CATEGORIES = [
  { id: "danger", icon: "⚠️", color: "#FF006E", anim: "animate-shake-icon" },
  { id: "robbery", icon: "💰", color: "#FF6B00", anim: "animate-pulse-icon" },
  { id: "assault", icon: "🤛", color: "#FF006E", anim: "animate-shake-icon" },
  { id: "medical", icon: "🏥", color: "#00F5FF", anim: "animate-pulse-icon" },
  { id: "fire", icon: "🔥", color: "#FF6B00", anim: "animate-glow-icon" },
  { id: "trapped", icon: "🚧", color: "#BFFF00", anim: "animate-bounce-icon" },
  { id: "flood", icon: "🌊", color: "#00F5FF", anim: "animate-bounce-icon" },
  { id: "shooting", icon: "🔫", color: "#FF006E", anim: "animate-shake-icon" },
  { id: "missing", icon: "👤", color: "#C084FC", anim: "animate-pulse-icon" },
  { id: "safe", icon: "✅", color: "#BFFF00", anim: "animate-glow-icon" },
  { id: "help", icon: "🆘", color: "#FF006E", anim: "animate-shake-icon" },
  { id: "info", icon: "ℹ️", color: "#00F5FF", anim: "animate-pulse-icon" },
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

interface WorldMapProps {
  lang: Lang;
}

export default function WorldMap({ lang }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tr = t[lang];
  const [pins, setPins] = useState<Pin[]>([]);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [pinNote, setPinNote] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeed, setShowFeed] = useState(false);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 12);
          }
        },
        () => {
          // Location denied — stay on default Morocco view
        },
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
      }
    }

    fetchPins();

    const channel = supabase
      .channel("pins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pins" },
        (payload) => {
          setPins((prev) => [payload.new as Pin, ...prev]);
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
        center: [31.5, -7.5], // Morocco center
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Zoom controls — bottom right to avoid overlapping
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

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:180px;">
            <div style="font-size:24px;text-align:center;margin-bottom:8px;">${cat.icon}</div>
            <div style="font-size:16px;font-weight:bold;text-align:center;color:${cat.color};">
              ${tr[pin.category as keyof typeof tr] || pin.category}
            </div>
            ${pin.city ? `<div style="text-align:center;color:#94a3b8;margin-top:4px;">${pin.city}</div>` : ""}
            ${pin.note ? `<div style="text-align:center;color:#e2e8f0;margin-top:8px;font-size:13px;">"${pin.note}"</div>` : ""}
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

  // Submit a new pin
  const handleSubmitPin = async () => {
    if (!selectedCategory || !selectedUrgency || isSubmitting) return;
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
        } catch {
          // Use Morocco-area default
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { error } = await supabase.from("pins").insert({
        device_id: deviceId,
        category: selectedCategory,
        urgency: selectedUrgency,
        note: pinNote || null,
        lat,
        lng,
        location: `POINT(${lng} ${lat})`,
        is_active: true,
      });

      if (error) {
        console.error("Pin creation error:", error);
      } else {
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

      {/* Minimal top bar — pins count + live feed button */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <div className="bg-[#141414]/90 backdrop-blur-sm px-3 py-1.5 border-l-2 border-[#BFFF00]">
          <span className="text-[10px] font-urban tracking-wider text-zinc-500">{tr.pins_active}</span>
          <span className="ml-2 text-sm font-bold text-[#BFFF00]">{pins.length}</span>
        </div>
        <button
          onClick={() => setShowFeed(!showFeed)}
          className="bg-[#141414]/90 backdrop-blur-sm px-3 py-1.5 border-l-2 border-[#FF006E]
            hover:bg-white/10 transition-all"
        >
          <span className="text-xs">📡</span>
        </button>
      </div>

      {/* Live Feed Panel */}
      {showFeed && (
        <div className="absolute top-14 right-4 z-[1000] w-72 max-h-80 overflow-y-auto
          bg-[#141414]/95 backdrop-blur-sm border border-[#2A2A2A] p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-urban text-white">📡 {tr.live_feed}</h3>
            <button onClick={() => setShowFeed(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
          </div>
          {pins.slice(0, 10).map((pin) => {
            const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
            return (
              <div
                key={pin.id}
                className="flex items-center gap-2 py-2 border-b border-[#2A2A2A] last:border-0 cursor-pointer hover:bg-white/5 rounded px-1"
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
                    {tr[pin.category as keyof typeof tr] || pin.category}
                    {pin.city && ` — ${pin.city}`}
                  </p>
                  <p className="text-[10px] text-zinc-600">{getTimeAgo(pin.created_at)}</p>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color }}
                />
              </div>
            );
          })}
          {pins.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">No active pins yet</p>
          )}
        </div>
      )}

      {/* SOS Button — clean, bottom center */}
      <button
        onClick={() => setShowCreatePin(true)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]
          px-8 py-3 text-sm font-urban uppercase tracking-wider text-black
          bg-[#FF006E] hover:bg-[#BFFF00]
          active:scale-95 transition-all duration-200
          shadow-lg shadow-[#FF006E]/30"
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        🆘 {tr.emergency}
      </button>

      {/* Create Pin Modal — categories only appear here */}
      {showCreatePin && (
        <div className="absolute inset-0 z-[2000] bg-black/70 flex items-end">
          <div className="w-full bg-[#141414] p-6 max-h-[80vh] overflow-y-auto border-t-2 border-[#FF006E]">
            {/* Step 0: Category selection */}
            {createStep === 0 && (
              <>
                <h3 className="text-lg font-urban tracking-wider mb-4">{tr.select_category}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {SOS_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setCreateStep(1);
                      }}
                      className="flex flex-col items-center gap-2 p-4 bg-[#0A0A0A]
                        border border-[#2A2A2A] hover:border-[#BFFF00] transition-all"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                    >
                      <span className={`text-2xl ${cat.anim}`}>{cat.icon}</span>
                      <span className="text-[10px] font-urban tracking-wider" style={{ color: cat.color }}>
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
                <h3 className="text-lg font-urban tracking-wider mb-4">{tr.select_urgency}</h3>
                <div className="space-y-3">
                  {URGENCY_LEVELS.map((urg) => (
                    <button
                      key={urg.id}
                      onClick={() => {
                        setSelectedUrgency(urg.id);
                        setCreateStep(2);
                      }}
                      className="w-full py-4 px-6 text-left font-urban
                        border border-[#2A2A2A] bg-[#0A0A0A]
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

            {/* Step 2: Note + Submit */}
            {createStep === 2 && (
              <>
                <h3 className="text-lg font-urban tracking-wider mb-4">{tr.add_note}</h3>
                <textarea
                  value={pinNote}
                  onChange={(e) => setPinNote(e.target.value)}
                  className="w-full h-28 bg-[#0A0A0A] p-4 text-white
                    border border-[#2A2A2A] focus:border-[#FF006E]
                    focus:outline-none resize-none font-urban text-sm"
                  placeholder="..."
                  maxLength={280}
                />
                <button
                  onClick={handleSubmitPin}
                  disabled={isSubmitting}
                  className={`w-full mt-4 py-4 text-sm font-urban uppercase tracking-wider text-black
                    bg-[#FF006E] active:scale-95 transition-all
                    ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-[#BFFF00]"}`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
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
                  className="flex-1 py-3 text-zinc-500 border border-[#2A2A2A]
                    hover:bg-white/5 transition-all text-sm font-urban"
                >
                  {tr.back}
                </button>
              )}
              <button
                onClick={resetCreate}
                className="flex-1 py-3 text-zinc-500 border border-[#2A2A2A]
                  hover:bg-white/5 transition-all text-sm font-urban"
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
