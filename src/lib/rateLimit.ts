/**
 * Client-side rate limiting for VoxMap.
 * Prevents spam by throttling pin creation and voting per device.
 *
 * Limits:
 * - Pins: max 3 per hour, max 10 per day
 * - Votes: max 1 per question (already enforced by DB unique constraint)
 * - General actions: configurable cooldown
 */

const STORAGE_KEY = "voxmap_rate_limits";

interface RateLimitData {
  pins: number[]; // timestamps of pin creations
  lastVote: number; // timestamp of last vote
}

function getData(): RateLimitData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { pins: [], lastVote: 0 };
}

function saveData(data: RateLimitData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Check if user can create a pin.
 * Returns { allowed: true } or { allowed: false, reason: string, retryAfter: number }
 */
export function canCreatePin(): { allowed: boolean; reason?: string; retryAfter?: number } {
  const data = getData();
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;

  // Clean old entries
  data.pins = data.pins.filter((ts) => ts > oneDayAgo);
  saveData(data);

  const pinsLastHour = data.pins.filter((ts) => ts > oneHourAgo);
  const pinsLastDay = data.pins;

  // Max 3 pins per hour
  if (pinsLastHour.length >= 3) {
    const oldestInHour = Math.min(...pinsLastHour);
    const retryAfter = Math.ceil((oldestInHour + 3600000 - now) / 60000);
    return {
      allowed: false,
      reason: `You can only create 3 pins per hour. Try again in ${retryAfter} min.`,
      retryAfter: retryAfter * 60000,
    };
  }

  // Max 10 pins per day
  if (pinsLastDay.length >= 10) {
    const oldestInDay = Math.min(...pinsLastDay);
    const retryAfter = Math.ceil((oldestInDay + 86400000 - now) / 3600000);
    return {
      allowed: false,
      reason: `You've reached the daily limit of 10 pins. Try again in ${retryAfter}h.`,
      retryAfter: retryAfter * 3600000,
    };
  }

  return { allowed: true };
}

/**
 * Record that a pin was created.
 */
export function recordPinCreation() {
  const data = getData();
  data.pins.push(Date.now());
  // Keep only last 24h
  const oneDayAgo = Date.now() - 86400000;
  data.pins = data.pins.filter((ts) => ts > oneDayAgo);
  saveData(data);
}

/**
 * Check if user can vote (minimum 2 second cooldown between votes).
 */
export function canVote(): boolean {
  const data = getData();
  return Date.now() - data.lastVote > 2000;
}

/**
 * Record that a vote was cast.
 */
export function recordVote() {
  const data = getData();
  data.lastVote = Date.now();
  saveData(data);
}
