"use client";

import { useEffect, useRef, useState } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";

// SOS Categories
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

interface WorldMapProps {
  lang: Lang;
}

export default function WorldMap({ lang }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tr = t[lang];
  const [pins, setPins] = useState<Pin[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [pinNote, setPinNote] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [helpedCount, setHelpedCount] = useState(0);

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
          // Location denied — default to Middle East view
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Fetch pins from Supabase
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

    // Real-time subscription for new pins
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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [25, 45],
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when pins or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const filteredPins = activeFilter
        ? pins.filter((p) => p.category === activeFilter)
        : pins;

      filteredPins.forEach((pin) => {
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
  }, [pins, activeFilter, lang]);

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

      // Get GPS location
      let lat = 25 + Math.random() * 20;
      let lng = 35 + Math.random() * 20;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Use default if location denied
        }
      }

      // Sign in anonymously if needed
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
        alert("Error creating pin. Please try again.");
      } else {
        // Pan map to new pin
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
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Top stats bar */}
      <div className="absolute top-4 left-4 right-16 z-[1000] flex gap-2 pointer-events-none">
        <div className="bg-vox-dark-card/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-vox-dark-border pointer-events-auto">
          <span className="text-xs text-slate-400">{tr.pins_active}</span>
          <span className="ml-2 text-lg font-bold text-orange-400">{pins.length}</span>
        </div>
        <div className="bg-vox-dark-card/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-vox-dark-border pointer-events-auto">
          <span className="text-xs text-slate-400">{tr.people_helped}</span>
          <span className="ml-2 text-lg font-bold text-green-400">{helpedCount}</span>
        </div>
        {/* Live feed button */}
        <button
          onClick={() => setShowFeed(!showFeed)}
          className="bg-vox-dark-card/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-vox-dark-border pointer-events-auto hover:bg-white/10 transition-all"
        >
          <span className="text-xs">📡 {tr.live_feed}</span>
        </button>
      </div>

      {/* Live Feed Panel */}
      {showFeed && (
        <div className="absolute top-16 right-4 z-[1000] w-72 max-h-80 overflow-y-auto
          bg-vox-dark-card/95 backdrop-blur-sm rounded-xl border border-vox-dark-border p-3">
          <h3 className="text-sm font-bold text-white mb-2">📡 {tr.live_feed}</h3>
          {pins.slice(0, 10).map((pin) => {
            const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
            return (
              <div
                key={pin.id}
                className="flex items-center gap-2 py-2 border-b border-vox-dark-border last:border-0 cursor-pointer hover:bg-white/5 rounded px-1"
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
            <p className="text-xs text-slate-500 text-center py-4">No active pins yet. Be the first!</p>
          )}
        </div>
      )}

      {/* Category filter bar */}
      <div className="absolute bottom-24 left-0 right-0 z-[1000] px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {SOS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap
                transition-all border
                ${activeFilter === cat.id
                  ? "bg-white/20 border-white/40"
                  : "bg-vox-dark-card/80 border-vox-dark-border hover:bg-white/10"
                }`}
            >
              <span>{cat.icon}</span>
              <span>{tr[cat.id as keyof typeof tr] || cat.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SOS Button */}
      <button
        onClick={() => setShowCreatePin(true)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]
          px-8 py-4 rounded-2xl text-lg font-bold text-white
          bg-gradient-to-r from-red-600 to-red-500
          hover:from-red-500 hover:to-red-400
          active:scale-95 transition-all duration-200
          shadow-lg shadow-red-500/30"
      >
        🆘 {tr.emergency}
      </button>

      {/* Create Pin Modal */}
      {showCreatePin && (
        <div className="absolute inset-0 z-[2000] bg-black/70 flex items-end">
          <div className="w-full bg-vox-dark-card rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto border-t border-vox-dark-border">
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
                        border-vox-dark-border bg-vox-dark/50 hover:bg-white/5
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
                        border border-vox-dark-border bg-vox-dark/50
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
                <h3 className="text-xl font-bold mb-4">{tr.add_note}</h3>
                <textarea
                  value={pinNote}
                  onChange={(e) => setPinNote(e.target.value)}
                  className="w-full h-32 bg-vox-dark rounded-xl p-4 text-white
                    border border-vox-dark-border focus:border-orange-500
                    focus:outline-none resize-none"
                  placeholder="..."
                  maxLength={280}
                />
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
                  className="flex-1 py-3 rounded-xl text-slate-400 border border-vox-dark-border
                    hover:bg-white/5 transition-all"
                >
                  {tr.back}
                </button>
              )}
              <button
                onClick={resetCreate}
                className="flex-1 py-3 rounded-xl text-slate-400 border border-vox-dark-border
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
