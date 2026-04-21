/**
 * Security utilities for VoxMap.
 * GPS fuzzing, input sanitization, and content safety.
 */

// ── GPS Fuzzing ──
// Rounds coordinates to ~100m precision to protect user privacy.
// Critical for users in sensitive regions who fear tracking.

export function fuzzGPS(lat: number, lng: number): { lat: number; lng: number } {
  // 0.001 degrees ≈ 111m at equator, good enough for privacy
  const precision = 0.001;
  return {
    lat: Math.round(lat / precision) * precision,
    lng: Math.round(lng / precision) * precision,
  };
}

// ── Input Sanitization ──
// Strips HTML tags, scripts, and dangerous characters from user input.

export function sanitizeText(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove script-related patterns
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    // Remove data: URLs (prevent base64 injection in text fields)
    .replace(/data:[^,]*,/gi, "")
    // Trim whitespace
    .trim();
}

export function sanitizeUsername(input: string): string {
  return input
    // Only allow letters, numbers, underscores, Arabic characters, spaces
    .replace(/[^a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g, "")
    .trim()
    .slice(0, 20);
}

// Escape HTML for safe display in Leaflet popups
export function escapeHTML(str: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = str;
    return div.innerHTML;
  }
  // Fallback for SSR
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Report Storage ──
const REPORTS_KEY = "voxmap_reported_pins";

export function getReportedPins(): string[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function reportPin(pinId: string) {
  try {
    const reported = getReportedPins();
    if (!reported.includes(pinId)) {
      reported.push(pinId);
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reported));
    }
  } catch {}
}

export function isPinReported(pinId: string): boolean {
  return getReportedPins().includes(pinId);
}
