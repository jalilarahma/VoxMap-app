import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Anonymous device-based auth
export async function getOrCreateDeviceSession() {
  // Check for existing session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) return session;

  // Create anonymous session
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

// Advanced browser fingerprinting — much harder to bypass than localStorage
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    // Draw text with specific styling — renders differently across devices
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("VoxMap fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("VoxMap fingerprint", 4, 17);

    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

async function getWebGLFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "no-webgl";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown";
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown";
    return `${vendor}~${renderer}`;
  } catch {
    return "webgl-error";
  }
}

function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) { resolve("no-audio"); return; }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      const processor = context.createScriptProcessor(4096, 1, 1);

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(10000, context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);

      oscillator.connect(analyser);
      analyser.connect(processor);
      processor.connect(gain);
      gain.connect(context.destination);

      let fingerprint = "";
      processor.onaudioprocess = (event) => {
        const data = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(data);
        fingerprint = data.slice(0, 30).join(",");
        processor.disconnect();
        oscillator.disconnect();
        gain.disconnect();
        context.close();
        resolve(fingerprint || "audio-empty");
      };

      oscillator.start(0);
      setTimeout(() => {
        if (!fingerprint) resolve("audio-timeout");
      }, 1000);
    } catch {
      resolve("audio-error");
    }
  });
}

// Generate a robust device fingerprint (hashed, not raw)
// Combines multiple signals that survive incognito mode and cache clears
export async function getDeviceId(): Promise<string> {
  // Check for cached fingerprint first (faster on repeat visits)
  const cached = localStorage.getItem("voxmap_device_fp");

  // Collect all fingerprint signals
  const [canvasFp, webglFp, audioFp] = await Promise.all([
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getAudioFingerprint(),
  ]);

  const raw = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(",") || "",
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    navigator.maxTouchPoints || 0,
    navigator.platform || "",
    new Date().getTimezoneOffset(),
    canvasFp,
    webglFp,
    audioFp,
    // Font detection — different devices have different installed fonts
    typeof document !== "undefined" ? document.fonts?.size || 0 : 0,
  ].join("|");

  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  const fingerprint = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Cache for faster future lookups
  try { localStorage.setItem("voxmap_device_fp", fingerprint); } catch {}

  return fingerprint;
}
