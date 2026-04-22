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

// ── Content Moderation (Free Speech Mode) ──
// VoxMap is a free speech platform. We don't block language or opinions.
// We only block: spam, flooding, bots, and username impersonation.

// Normalize text for spam duplicate detection
function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*@#$!._%+\-=~`^&(){}[\]|\\:;"'<>,?/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  filtered?: string;
}

/** Content check — free speech: only blocks repeated char spam, not language. */
export function moderateContent(text: string): ModerationResult {
  // Only block obvious spam patterns (repeated characters like "aaaaaaaaaa")
  if (/(.)\1{10,}/i.test(text)) {
    return {
      allowed: false,
      reason: "Please avoid repeating characters excessively.",
    };
  }

  return { allowed: true };
}

/** Check username — only blocks impersonation of platform roles. */
export function moderateUsername(username: string): ModerationResult {
  // Block usernames impersonating roles
  const impersonation = ["admin", "moderator", "voxmap", "official", "support", "staff"];
  const lower = username.toLowerCase().replace(/[^a-z]/g, "");
  for (const word of impersonation) {
    if (lower.includes(word)) {
      return {
        allowed: false,
        reason: "This username is reserved. Please choose a different one.",
      };
    }
  }

  return { allowed: true };
}

// ── Spam Detection ──
// Tracks posting frequency and content patterns to prevent spam/flooding.

const SPAM_LOG_KEY = "voxmap_post_log";
const MAX_POSTS_PER_MINUTE = 3;
const MAX_POSTS_PER_HOUR = 15;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface PostLog {
  timestamps: number[];
  recentTexts: { text: string; time: number }[];
}

function getPostLog(): PostLog {
  try {
    const raw = localStorage.getItem(SPAM_LOG_KEY);
    return raw ? JSON.parse(raw) : { timestamps: [], recentTexts: [] };
  } catch {
    return { timestamps: [], recentTexts: [] };
  }
}

function savePostLog(log: PostLog) {
  try {
    localStorage.setItem(SPAM_LOG_KEY, JSON.stringify(log));
  } catch {}
}

/** Check if the user is spamming. Call before allowing a post. */
export function checkSpam(text: string): ModerationResult {
  const now = Date.now();
  const log = getPostLog();

  // Clean old entries (older than 1 hour)
  const oneHourAgo = now - 60 * 60 * 1000;
  log.timestamps = log.timestamps.filter((t) => t > oneHourAgo);
  log.recentTexts = log.recentTexts.filter((t) => t.time > now - DUPLICATE_WINDOW_MS);

  // Rate limit: per minute
  const oneMinuteAgo = now - 60 * 1000;
  const postsLastMinute = log.timestamps.filter((t) => t > oneMinuteAgo).length;
  if (postsLastMinute >= MAX_POSTS_PER_MINUTE) {
    return {
      allowed: false,
      reason: "You're posting too fast. Please wait a moment before posting again.",
    };
  }

  // Rate limit: per hour
  if (log.timestamps.length >= MAX_POSTS_PER_HOUR) {
    return {
      allowed: false,
      reason: "You've reached the posting limit for this hour. Try again later.",
    };
  }

  // Duplicate detection
  const normalizedNew = normalizeForFilter(text);
  const isDuplicate = log.recentTexts.some(
    (entry) => normalizeForFilter(entry.text) === normalizedNew
  );
  if (isDuplicate) {
    return {
      allowed: false,
      reason: "You already posted this. Try sharing something different.",
    };
  }

  // Too short / gibberish (less than 3 real characters)
  const realChars = text.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "");
  if (realChars.length < 3) {
    return {
      allowed: false,
      reason: "Your message is too short. Please write at least a few words.",
    };
  }

  return { allowed: true };
}

/** Record a successful post for spam tracking */
export function recordPost(text: string) {
  const log = getPostLog();
  log.timestamps.push(Date.now());
  log.recentTexts.push({ text, time: Date.now() });
  savePostLog(log);
}

// ── Report System ──
// Enhanced reporting: stores reason, supports both pins and community posts,
// and syncs reports to Supabase for admin review.

const REPORTS_KEY = "voxmap_reported_pins";

export type ReportReason =
  | "hate_speech"
  | "spam"
  | "false_emergency"
  | "harassment"
  | "inappropriate"
  | "other";

export const REPORT_LABELS: Record<ReportReason, string> = {
  hate_speech: "Hate speech or slurs",
  spam: "Spam or advertising",
  false_emergency: "False emergency",
  harassment: "Harassment or threats",
  inappropriate: "Inappropriate content",
  other: "Other",
};

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
