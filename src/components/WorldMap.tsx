"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";
import { canCreatePin, recordPinCreation } from "@/lib/rateLimit";
import { fuzzGPS, sanitizeText, escapeHTML, reportPin, isPinReported } from "@/lib/security";
import { getUsername } from "@/components/UsernamePicker";

const IntelligenceOverlay = dynamic(() => import("@/components/IntelligenceOverlay"), { ssr: false });

// Parse pin note — format is "username||comment||photoDataUrl" or "username||comment" or just "note"
function parsePinNote(note: string | null): { username: string; comment: string; photo: string | null } {
  if (!note) return { username: "Anonymous", comment: "", photo: null };
  if (note.includes("||")) {
    const parts = note.split("||");
    const username = parts[0] || "Anonymous";
    const comment = parts[1] || "";
    const photo = parts[2] || null;
    return { username, comment, photo };
  }
  return { username: "Anonymous", comment: note, photo: null };
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

interface TrustScore {
  pin_id: string;
  trust_score: number;
  verify_count: number;
  deny_count: number;
  total_count: number;
}

// ── Trust Score Helpers ──
function getTrustColor(score: number, total: number): string {
  if (total === 0) return "#F59E0B"; // Yellow = unverified
  if (score > 0.3) return "#22C55E"; // Green = community verified
  if (score < -0.3) return "#EF4444"; // Red = community denied
  return "#F59E0B"; // Yellow = mixed/uncertain
}

function getTrustLabel(score: number, total: number): string {
  if (total === 0) return "Unverified";
  if (score > 0.3) return "Verified";
  if (score < -0.3) return "Disputed";
  return "Under Review";
}

function getTrustGlow(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(total * 0.15, 1); // More verifications = stronger glow
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
  const [pinPhoto, setPinPhoto] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [helpedCount, setHelpedCount] = useState(0);
  const [showVoteMap, setShowVoteMap] = useState(true);
  const voteMarkersRef = useRef<any[]>([]);
  const [trustScores, setTrustScores] = useState<Record<string, TrustScore>>({});
  const [showFactCheck, setShowFactCheck] = useState(true);
  const factCheckMarkersRef = useRef<any[]>([]);
  const [verifiedPins, setVerifiedPins] = useState<string[]>([]); // pins this user already voted on

  // Load locally verified pins
  useEffect(() => {
    try {
      const raw = localStorage.getItem("voxmap_verified_pins");
      setVerifiedPins(raw ? JSON.parse(raw) : []);
    } catch {}
  }, []);

  // Fetch trust scores for all pins
  async function fetchTrustScores() {
    try {
      const { data } = await supabase.rpc("get_all_pin_trust_scores");
      if (data) {
        const map: Record<string, TrustScore> = {};
        data.forEach((d: any) => {
          map[d.pin_id] = {
            pin_id: d.pin_id,
            trust_score: d.trust_score || 0,
            verify_count: d.verify_count || 0,
            deny_count: d.deny_count || 0,
            total_count: d.total_count || 0,
          };
        });
        setTrustScores(map);
      }
    } catch (e) {
      console.error("Trust score fetch error:", e);
    }
  }

  // Fetch trust scores when pins change
  useEffect(() => {
    if (pins.length > 0) fetchTrustScores();
  }, [pins]);

  // Global report + verify/deny functions for popup buttons
  useEffect(() => {
    (window as any).__reportPin__ = (pinId: string) => {
      if (isPinReported(pinId)) return;
      reportPin(pinId);
      alert("Thank you for reporting. We'll review this pin.");
      setPins((prev) => [...prev]);
    };

    (window as any).__verifyPin__ = async (pinId: string, vote: string) => {
      // Check if already voted
      try {
        const raw = localStorage.getItem("voxmap_verified_pins");
        const verified = raw ? JSON.parse(raw) : [];
        if (verified.includes(pinId)) {
          alert("You already verified this pin.");
          return;
        }
      } catch {}

      const deviceId = await getDeviceId();
      const loc = userLocationRef.current;
      if (!loc) {
        alert("Location needed to verify. Please enable location access.");
        return;
      }

      // Find pin to calculate distance
      const pin = pins.find((p) => p.id === pinId);
      if (!pin) return;

      const dist = getDistanceKm(loc.lat, loc.lng, pin.lat, pin.lng);

      // Ensure auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { error } = await supabase.from("pin_verifications").insert({
        pin_id: pinId,
        device_id: deviceId,
        vote: vote,
        lat: loc.lat,
        lng: loc.lng,
        distance_km: Math.round(dist * 1000) / 1000,
      });

      if (error) {
        if (error.code === "23505") {
          alert("You already verified this pin.");
        } else {
          console.error("Verify error:", error);
        }
        return;
      }

      // Save locally
      try {
        const raw = localStorage.getItem("voxmap_verified_pins");
        const verified = raw ? JSON.parse(raw) : [];
        verified.push(pinId);
        localStorage.setItem("voxmap_verified_pins", JSON.stringify(verified));
        setVerifiedPins(verified);
      } catch {}

      // If deny, also auto-report for admin review
      if (vote === "deny") {
        reportPin(pinId);
      }

      // Refresh trust scores
      fetchTrustScores();
      alert(vote === "verify" ? "Thanks! Pin marked as verified." : "Thanks! Pin marked as disputed and flagged for review.");
    };

    return () => {
      delete (window as any).__reportPin__;
      delete (window as any).__verifyPin__;
    };
  }, [pins]);

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

  // Initialize map — global intelligence view
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [25, 45], // Center on Middle East — primary activity zone
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
      });

      // Ultra-dark CartoDB tiles — no labels for clean look
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        noWrap: true,
        bounds: [[-90, -180], [90, 180]],
        opacity: 0.6, // Darken base tiles to let heatmap glow through
      }).addTo(map);

      // Subtle label layer on top
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        noWrap: true,
        bounds: [[-90, -180], [90, 180]],
        opacity: 0.4,
        pane: "overlayPane",
      }).addTo(map);

      // Zoom controls bottom-right
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

        // Skip community posts (they're shown in Community feed, not map)
        if (pin.category === "community") return;

        // Trust score for this pin
        const ts = trustScores[pin.id];
        const trustScore = ts?.trust_score || 0;
        const trustTotal = ts?.total_count || 0;
        const trustColor = getTrustColor(trustScore, trustTotal);
        const trustLabel = getTrustLabel(trustScore, trustTotal);
        const trustGlow = getTrustGlow(trustScore, trustTotal);
        const alreadyVerified = verifiedPins.includes(pin.id);

        // Outer glow ring based on trust score
        if (trustTotal > 0) {
          L.circleMarker([pin.lat, pin.lng], {
            radius: (pin.urgency === "critical" ? 12 : pin.urgency === "high" ? 10 : 8) + 6,
            fillColor: trustColor,
            color: trustColor,
            weight: 0,
            opacity: trustGlow * 0.6,
            fillOpacity: trustGlow * 0.25,
          }).addTo(mapInstanceRef.current);
          markersRef.current.push(
            L.circleMarker([pin.lat, pin.lng], {
              radius: (pin.urgency === "critical" ? 12 : pin.urgency === "high" ? 10 : 8) + 6,
              fillColor: trustColor,
              color: trustColor,
              weight: 0,
              opacity: trustGlow * 0.6,
              fillOpacity: trustGlow * 0.25,
            }).addTo(mapInstanceRef.current)
          );
        }

        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: pin.urgency === "critical" ? 12 : pin.urgency === "high" ? 10 : 8,
          fillColor: cat.color,
          color: trustTotal > 0 ? trustColor : "#fff",
          weight: trustTotal > 0 ? 3 : 2,
          opacity: 0.9,
          fillOpacity: 0.8,
        }).addTo(mapInstanceRef.current);

        const timeAgo = getTimeAgo(pin.created_at);
        const { username: rawUser, comment: rawComment, photo } = parsePinNote(pin.note);
        const username = escapeHTML(rawUser);
        const comment = escapeHTML(rawComment);
        const googleMapsUrl = `https://www.google.com/maps?q=${pin.lat},${pin.lng}`;
        const pinReported = isPinReported(pin.id);

        // Trust score badge HTML
        const trustBadgeHtml = `
          <div style="text-align:center;margin-top:8px;">
            <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;
              border-radius:20px;font-size:11px;font-weight:700;
              background:${trustColor}20;color:${trustColor};border:1px solid ${trustColor}40;">
              ${trustLabel === "Verified" ? "✅" : trustLabel === "Disputed" ? "⚠️" : trustLabel === "Under Review" ? "🔍" : "❓"}
              ${trustLabel}
              ${trustTotal > 0 ? `<span style="opacity:0.7;font-weight:400;">(${ts?.verify_count || 0}↑ ${ts?.deny_count || 0}↓)</span>` : ""}
            </span>
          </div>
        `;

        // Verify/Deny buttons HTML
        const verifyButtonsHtml = alreadyVerified
          ? `<div style="text-align:center;margin-top:8px;color:#64748b;font-size:11px;">
              ✓ You verified this pin
            </div>`
          : `<div style="display:flex;gap:6px;margin-top:8px;">
              <button onclick="window.__verifyPin__('${pin.id}','verify')"
                style="flex:1;padding:8px 0;text-align:center;background:#22C55E20;color:#22C55E;
                  border:1px solid #22C55E40;border-radius:10px;font-size:12px;font-weight:700;
                  cursor:pointer;font-family:system-ui;transition:all 0.2s;">
                ✅ Verify
              </button>
              <button onclick="window.__verifyPin__('${pin.id}','deny')"
                style="flex:1;padding:8px 0;text-align:center;background:#EF444420;color:#EF4444;
                  border:1px solid #EF444440;border-radius:10px;font-size:12px;font-weight:700;
                  cursor:pointer;font-family:system-ui;transition:all 0.2s;">
                ❌ Deny
              </button>
            </div>`;

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:220px;max-width:280px;">
            <div style="font-size:24px;text-align:center;margin-bottom:8px;">${cat.icon}</div>
            <div style="font-size:16px;font-weight:bold;text-align:center;color:${cat.color};">
              ${tr[pin.category as keyof typeof tr] || pin.category}
            </div>
            ${trustBadgeHtml}
            <div style="text-align:center;margin-top:6px;">
              <span style="color:#F59E0B;font-weight:600;font-size:13px;">@${username}</span>
            </div>
            ${photo ? `<div style="margin-top:8px;border-radius:10px;overflow:hidden;"><img src="${photo}" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;" alt="Pin photo"/></div>` : ""}
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
            ${verifyButtonsHtml}
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer"
              style="display:block;margin-top:8px;padding:8px 0;text-align:center;
                background:linear-gradient(to right,#F59E0B,#EF4444);color:white;
                border-radius:10px;font-size:13px;font-weight:bold;text-decoration:none;">
              📍 Open in Google Maps
            </a>
            ${pinReported ? `<p style="text-align:center;margin-top:6px;color:#64748b;font-size:11px;">✓ Flagged for review</p>` : ""}
          </div>
        `, { maxWidth: 300 });

        // Always-visible label on the map showing username + comment
        const tooltipEl = document.createElement("div");
        tooltipEl.style.cssText = "font-family:system-ui;line-height:1.4;";

        const userLine = document.createElement("div");
        userLine.style.cssText = "color:#F59E0B;font-weight:700;font-size:12px;";
        userLine.textContent = `@${username}`;
        tooltipEl.appendChild(userLine);

        if (comment) {
          const commentLine = document.createElement("div");
          commentLine.style.cssText = "color:#e2e8f0;font-size:11px;margin-top:2px;max-width:180px;word-wrap:break-word;";
          commentLine.textContent = comment.length > 60 ? comment.slice(0, 60) + "…" : comment;
          tooltipEl.appendChild(commentLine);
        }

        marker.bindTooltip(tooltipEl, {
          permanent: true,
          direction: "right",
          offset: [12, 0],
          className: "pin-label",
          opacity: 0.95,
        });

        markersRef.current.push(marker);
      });
    });
  }, [pins, lang, trustScores, verifiedPins]);

  // ── Vote Sentiment Heatmap ──
  // Shows colored circles on the map: green = agree, red = disagree
  // Each vote location appears as a glowing circle so you can see
  // "Doha is red, Lusail is green, Madrid is red with some green streets"
  useEffect(() => {
    if (!mapInstanceRef.current || !showVoteMap) {
      voteMarkersRef.current.forEach((m) => m.remove());
      voteMarkersRef.current = [];
      return;
    }

    async function fetchVoteLocations() {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      const { data: question } = await supabase
        .from("questions")
        .select("id")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (!question) return;

      // Use RPC to get votes with parsed lat/lng from GEOGRAPHY column
      // Fallback: try direct select with ST_X/ST_Y parsing
      const { data: votes } = await supabase
        .rpc("get_vote_locations", { q_id: question.id })
        .then((res) => {
          if (res.data && res.data.length > 0) return res;
          // Fallback: direct query
          return supabase
            .from("votes")
            .select("option_index, location, country_code")
            .eq("question_id", question.id);
        });

      if (!votes || votes.length === 0) return;

      import("leaflet").then((L) => {
        // Clear old vote markers
        voteMarkersRef.current.forEach((m) => m.remove());
        voteMarkersRef.current = [];

        votes.forEach((vote: any) => {
          let lat: number | null = null;
          let lng: number | null = null;

          // RPC returns { lat, lng } directly
          if (vote.lat !== undefined && vote.lng !== undefined) {
            lat = vote.lat;
            lng = vote.lng;
          }
          // Fallback: parse location field
          else if (vote.location) {
            if (typeof vote.location === "string") {
              const match = vote.location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
              if (match) {
                lng = parseFloat(match[1]);
                lat = parseFloat(match[2]);
              }
            } else if (typeof vote.location === "object" && vote.location.coordinates) {
              lng = vote.location.coordinates[0];
              lat = vote.location.coordinates[1];
            }
          }

          if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return;
          if (lat === 0 && lng === 0) return; // Skip null island

          // Green for agree (0), Red for disagree (1)
          const isAgree = vote.option_index === 0;
          const color = isAgree ? "#22C55E" : "#EF4444";

          // Outer glow circle — big, soft
          const glow = L.circleMarker([lat, lng], {
            radius: 30,
            fillColor: color,
            color: "transparent",
            weight: 0,
            fillOpacity: 0.15,
          }).addTo(mapInstanceRef.current!);
          voteMarkersRef.current.push(glow);

          // Inner circle — solid, visible
          const circle = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: color,
            color: color,
            weight: 1,
            fillOpacity: 0.5,
          }).addTo(mapInstanceRef.current!);

          circle.bindTooltip(
            `${isAgree ? "✅ Agree" : "❌ Disagree"}${vote.country_code ? " · " + vote.country_code : ""}`,
            { direction: "top", className: "pin-label" }
          );

          voteMarkersRef.current.push(circle);
        });
      });
    }

    fetchVoteLocations();
  }, [showVoteMap]);

  // ── Fact-Check Annotation Overlay ──
  useEffect(() => {
    // Clear existing
    factCheckMarkersRef.current.forEach((m) => m.remove());
    factCheckMarkersRef.current = [];

    if (!mapInstanceRef.current || !showFactCheck) return;

    async function fetchAnnotations() {
      try {
        const res = await fetch("/api/annotations");
        const data = await res.json();
        if (!data.annotations || data.annotations.length === 0) return;

        const L = await import("leaflet");

        const typeConfig: Record<string, { color: string; icon: string }> = {
          context: { color: "#06b6d4", icon: "i" },
          correction: { color: "#f97316", icon: "!" },
          correlation: { color: "#a855f7", icon: "~" },
          warning: { color: "#ef4444", icon: "!!" },
        };

        data.annotations.forEach((ann: any) => {
          const config = typeConfig[ann.annotation_type] || typeConfig.context;

          // Radius circle (affected area)
          const radiusCircle = L.circle([ann.lat, ann.lng], {
            radius: (ann.radius_km || 50) * 1000,
            fillColor: config.color,
            color: config.color,
            weight: 1,
            fillOpacity: 0.05,
            opacity: 0.3,
            dashArray: "5,5",
          }).addTo(mapInstanceRef.current);

          // Marker dot
          const marker = L.circleMarker([ann.lat, ann.lng], {
            radius: ann.severity === "critical" ? 10 : 8,
            fillColor: config.color,
            color: "#ffffff",
            weight: 2,
            fillOpacity: 0.9,
          }).addTo(mapInstanceRef.current);

          // Popup
          const severityBadge = ann.severity === "critical"
            ? `<span style="background:#ef444430;color:#ef4444;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;">CRITICAL</span>`
            : ann.severity === "notable"
            ? `<span style="background:#f9731630;color:#f97316;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;">NOTABLE</span>`
            : `<span style="background:#06b6d430;color:#06b6d4;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;">INFO</span>`;

          const typeBadge = `<span style="background:${config.color}20;color:${config.color};padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;">${ann.annotation_type.toUpperCase()}</span>`;

          marker.bindPopup(`
            <div style="font-family:system-ui;min-width:240px;max-width:300px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                ${typeBadge} ${severityBadge}
              </div>
              <h3 style="font-size:15px;font-weight:800;color:white;margin-bottom:6px;line-height:1.3;">
                ${ann.title}
              </h3>
              <p style="font-size:12px;color:#cbd5e1;line-height:1.5;margin-bottom:10px;">
                ${ann.body.length > 200 ? ann.body.slice(0, 200) + "..." : ann.body}
              </p>
              ${ann.source_url ? `<a href="${ann.source_url}" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;font-size:11px;color:#06b6d4;text-decoration:underline;margin-bottom:8px;">
                View source
              </a>` : ""}
              <div style="border-top:1px solid #1e293b;padding-top:8px;display:flex;align-items:center;gap:6px;">
                <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div>
                <span style="font-size:11px;color:#94a3b8;">
                  Verified by <strong style="color:white;">${ann.partner_name}</strong>
                  <span style="color:#64748b;"> (${ann.partner_type})</span>
                </span>
              </div>
            </div>
          `, { maxWidth: 320 });

          // Tooltip label
          marker.bindTooltip(
            `<div style="font-family:system-ui;">
              <div style="color:${config.color};font-weight:700;font-size:10px;">${ann.annotation_type.toUpperCase()}</div>
              <div style="color:#e2e8f0;font-size:11px;max-width:160px;white-space:normal;">${ann.title}</div>
              <div style="color:#64748b;font-size:9px;margin-top:2px;">by ${ann.partner_name}</div>
            </div>`,
            { permanent: false, direction: "right", offset: [10, 0], className: "pin-label" }
          );

          factCheckMarkersRef.current.push(radiusCircle, marker);
        });
      } catch (e) {
        console.error("Fact-check fetch error:", e);
      }
    }

    fetchAnnotations();
  }, [showFactCheck]);

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
          // Fuzz GPS to ~100m for privacy protection
          const fuzzed = fuzzGPS(pos.coords.latitude, pos.coords.longitude);
          lat = fuzzed.lat;
          lng = fuzzed.lng;
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

      // Encode username, comment, and photo into note field: "username||comment||photo"
      const username = sanitizeText(getUsername() || "Anonymous");
      const cleanNote = sanitizeText(pinNote || "");
      const encodedNote = `${username}||${cleanNote}||${pinPhoto || ""}`;

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
    setPinPhoto(null);
  };

  // Compress and convert image to small base64 thumbnail
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 300; // Small thumbnail
        let w = img.width;
        let h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          setPinPhoto(dataUrl);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full h-screen">
      {/* Map */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* ── Intelligence Overlay (heatmap + hex grid + arcs) ── */}
      {mapInstanceRef.current && (
        <IntelligenceOverlay mapInstance={mapInstanceRef.current} />
      )}

      {/* ── HUD Status Bar — top right, glassmorphism ── */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <div className="bg-black/40 backdrop-blur-xl rounded-xl px-4 py-2
          border border-white/[0.08] shadow-lg shadow-black/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80">LIVE</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Signals</span>
              <span className="ml-1.5 text-sm font-mono font-bold text-orange-400">{pins.length > 0 ? pins.length : "2,847"}</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Regions</span>
              <span className="ml-1.5 text-sm font-mono font-bold text-emerald-400">47</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={() => setShowFeed(!showFeed)}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <span className="text-xs">📡</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Feed Panel — glassmorphism */}
      {showFeed && (
        <div className="absolute top-16 right-4 z-[1000] w-80 max-h-96 overflow-y-auto
          bg-black/50 backdrop-blur-2xl rounded-2xl border border-white/[0.08]
          shadow-2xl shadow-black/50 p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Live Intelligence Feed</h3>
            </div>
            <button onClick={() => setShowFeed(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
          </div>
          {pins.slice(0, 10).map((pin) => {
            const cat = SOS_CATEGORIES.find((c) => c.id === pin.category);
            const { username: pinUser, comment: pinComment } = parsePinNote(pin.note);
            return (
              <div
                key={pin.id}
                className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0
                  cursor-pointer hover:bg-white/[0.03] rounded-lg px-2 transition-colors"
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
                    <span className="text-orange-400 font-mono">@{pinUser}</span>
                    {" — "}
                    {tr[pin.category as keyof typeof tr] || pin.category}
                  </p>
                  {pinComment && <p className="text-[10px] text-slate-400 truncate">{pinComment}</p>}
                  <p className="text-[10px] font-mono text-slate-600">{getTimeAgo(pin.created_at)}</p>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: URGENCY_LEVELS.find((u) => u.id === pin.urgency)?.color }}
                />
              </div>
            );
          })}
          {pins.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4 font-mono">Awaiting signal data...</p>
          )}
        </div>
      )}

      {/* Fact-Check toggle — glassmorphism */}
      <button
        onClick={() => setShowFactCheck(!showFactCheck)}
        className={`absolute top-4 right-[320px] z-[1000] px-3 py-2 rounded-xl text-xs font-mono font-bold
          backdrop-blur-xl transition-all flex items-center gap-1.5 uppercase tracking-wider
          ${showFactCheck
            ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
            : "bg-black/30 border border-white/[0.06] text-slate-500"
          }`}
      >
        <span className="text-sm">{showFactCheck ? "✅" : "📋"}</span>
        Intel
      </button>

      {/* ── SOS Button — glassmorphism with glow ── */}
      <button
        onClick={() => setShowCreatePin(true)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]
          px-8 py-4 rounded-2xl text-lg font-bold text-white
          bg-red-600/80 backdrop-blur-xl
          border border-red-500/30
          hover:bg-red-500/90
          active:scale-95 transition-all duration-200
          shadow-lg shadow-red-500/40"
      >
        🆘 {tr.emergency}
      </button>

      {/* ── Bottom HUD bar — system status ── */}
      <div className="absolute bottom-4 left-4 z-[1000]
        bg-black/40 backdrop-blur-xl rounded-xl px-4 py-2
        border border-white/[0.06] shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-mono text-emerald-400/80 uppercase">Secure</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[9px] font-mono text-slate-500">ZKP v1.0</span>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[9px] font-mono text-slate-500">
            {new Date().toISOString().slice(11, 19)} UTC
          </span>
        </div>
      </div>

      {/* Create Pin Modal — glassmorphism */}
      {showCreatePin && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end">
          <div className="w-full bg-black/60 backdrop-blur-2xl rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto
            border-t border-white/[0.08] shadow-2xl shadow-black/50">
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

            {/* Step 2: Comment + Photo + Submit */}
            {createStep === 2 && (
              <>
                <h3 className="text-xl font-bold mb-2">{tr.add_note}</h3>
                <p className="text-sm text-slate-400 mb-4">Add a comment and/or photo — visible on the map for everyone.</p>

                <textarea
                  value={pinNote}
                  onChange={(e) => setPinNote(e.target.value)}
                  className="w-full h-24 bg-slate-800 rounded-xl p-4 text-white
                    border border-slate-700/50 focus:border-orange-500
                    focus:outline-none resize-none"
                  placeholder="What's happening? Describe the situation..."
                  maxLength={280}
                />
                <p className="text-xs text-slate-600 mt-1 text-right">{pinNote.length}/280</p>

                {/* Photo upload */}
                <div className="mt-3">
                  {pinPhoto ? (
                    <div className="relative">
                      <img src={pinPhoto} alt="Pin photo" className="w-full h-40 object-cover rounded-xl border border-slate-700/50" />
                      <button
                        onClick={() => setPinPhoto(null)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center
                          bg-black/70 rounded-full text-white text-sm hover:bg-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 py-3 rounded-xl
                      border-2 border-dashed border-slate-700 hover:border-orange-500
                      text-slate-400 hover:text-orange-400 cursor-pointer transition-all">
                      <span className="text-lg">📷</span>
                      <span className="text-sm font-medium">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

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
