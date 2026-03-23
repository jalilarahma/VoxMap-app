"use client";

import { useEffect, useRef, useState } from "react";
import { Lang, t } from "@/i18n/translations";

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

// Demo pins around the world
const DEMO_PINS = [
  { lat: 33.89, lng: 35.50, category: "danger", urgency: "high", city: "Beirut" },
  { lat: 33.31, lng: 44.37, category: "medical", urgency: "critical", city: "Baghdad" },
  { lat: 31.95, lng: 35.93, category: "help", urgency: "high", city: "Amman" },
  { lat: 36.19, lng: 37.16, category: "safe", urgency: "low", city: "Aleppo" },
  { lat: 30.04, lng: 31.24, category: "robbery", urgency: "medium", city: "Cairo" },
  { lat: 34.68, lng: 36.72, category: "fire", urgency: "high", city: "Homs" },
  { lat: 32.08, lng: 34.78, category: "info", urgency: "low", city: "Tel Aviv" },
  { lat: 35.69, lng: 51.39, category: "assault", urgency: "high", city: "Tehran" },
  { lat: 24.71, lng: 46.67, category: "safe", urgency: "low", city: "Riyadh" },
  { lat: 41.01, lng: 28.98, category: "flood", urgency: "medium", city: "Istanbul" },
  { lat: 48.86, lng: 2.35, category: "robbery", urgency: "medium", city: "Paris" },
  { lat: 40.71, lng: -74.01, category: "danger", urgency: "high", city: "New York" },
  { lat: 51.51, lng: -0.13, category: "medical", urgency: "medium", city: "London" },
  { lat: 55.76, lng: 37.62, category: "info", urgency: "low", city: "Moscow" },
  { lat: 39.90, lng: 116.40, category: "help", urgency: "medium", city: "Beijing" },
  { lat: 35.68, lng: 139.69, category: "safe", urgency: "low", city: "Tokyo" },
  { lat: -33.87, lng: 151.21, category: "fire", urgency: "high", city: "Sydney" },
  { lat: -23.55, lng: -46.63, category: "assault", urgency: "high", city: "São Paulo" },
  { lat: 19.43, lng: -99.13, category: "shooting", urgency: "critical", city: "Mexico City" },
  { lat: 6.52, lng: 3.38, category: "flood", urgency: "high", city: "Lagos" },
  { lat: -1.29, lng: 36.82, category: "medical", urgency: "medium", city: "Nairobi" },
  { lat: 28.61, lng: 77.21, category: "trapped", urgency: "high", city: "New Delhi" },
  { lat: 25.20, lng: 55.27, category: "safe", urgency: "low", city: "Dubai" },
  { lat: -34.60, lng: -58.38, category: "robbery", urgency: "medium", city: "Buenos Aires" },
];

interface WorldMapProps {
  lang: Lang;
}

export default function WorldMap({ lang }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tr = t[lang];
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [pinNote, setPinNote] = useState("");

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import Leaflet (client-side only)
    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [25, 45],
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
      });

      // OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Zoom control on right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Add demo pins
      DEMO_PINS.forEach((pin) => {
        const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
        if (!cat) return;

        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: pin.urgency === "critical" ? 12 : pin.urgency === "high" ? 10 : 8,
          fillColor: cat.color,
          color: "#fff",
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.8,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:180px;">
            <div style="font-size:24px;text-align:center;margin-bottom:8px;">${cat.icon}</div>
            <div style="font-size:16px;font-weight:bold;text-align:center;color:${cat.color};">
              ${tr[pin.category as keyof typeof tr] || pin.category}
            </div>
            <div style="text-align:center;color:#94a3b8;margin-top:4px;">
              ${pin.city}
            </div>
            <div style="text-align:center;margin-top:8px;">
              <span style="padding:2px 8px;border-radius:8px;font-size:12px;
                background:${URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color}22;
                color:${URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color};">
                ${tr[pin.urgency as keyof typeof tr] || pin.urgency}
              </span>
            </div>
          </div>
        `);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
          <span className="ml-2 text-lg font-bold text-orange-400">{DEMO_PINS.length}</span>
        </div>
        <div className="bg-vox-dark-card/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-vox-dark-border pointer-events-auto">
          <span className="text-xs text-slate-400">{tr.people_helped}</span>
          <span className="ml-2 text-lg font-bold text-green-400">147</span>
        </div>
      </div>

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
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border
                        transition-all hover:scale-105
                        ${selectedCategory === cat.id
                          ? "border-white bg-white/10"
                          : "border-vox-dark-border bg-vox-dark/50 hover:bg-white/5"
                        }`}
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

            {/* Step 2: Note */}
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
                />
                <button
                  onClick={() => {
                    // TODO: Get GPS and submit to Supabase
                    alert("Pin created! (Will use GPS in production)");
                    resetCreate();
                  }}
                  className="w-full mt-4 py-4 rounded-xl text-lg font-bold text-white
                    bg-gradient-to-r from-red-600 to-orange-500
                    hover:from-red-500 hover:to-orange-400
                    active:scale-95 transition-all"
                >
                  {tr.confirm_pin}
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
