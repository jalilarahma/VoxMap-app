"use client";

import { useEffect, useRef, useCallback } from "react";
import { generateSyntheticVotes, getArcConnections, type SyntheticVote } from "@/lib/syntheticData";

// ═══════════════════════════════════════════════════
// INTELLIGENCE OVERLAY v3
// Organic staggered pulse, coastline glow, depth layers
// ═══════════════════════════════════════════════════

// ── Color Gradient: Cyan → Amber → Volcanic Red ──
function intensityToColor(intensity: number, alpha: number = 1): string {
  const t = Math.max(0, Math.min(1, intensity));
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s = t * 2;
    r = Math.round(0 + 255 * s);
    g = Math.round(255 + (158 - 255) * s);
    b = Math.round(255 - 255 * s);
  } else {
    const s = (t - 0.5) * 2;
    r = 255;
    g = Math.round(158 + (69 - 158) * s);
    b = 0;
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Simple hash for deterministic per-point randomness ──
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Intelligent Zoom Scaling — smooth inversely-proportional radius ──
// zoom 2  → tiny sharp stars (2-3px)   — clean "starfield" cluster
// zoom 6  → moderate dots (6-8px)      — regional clusters emerge
// zoom 10 → soft heat zones (15-20px)  — city-level detail with blur
// zoom 14+ → expanded glows (20-25px)  — street-level exploration
// Uses continuous lerp — no jarring step transitions between brackets.
function getZoomParams(zoom: number) {
  const z = Math.max(2, Math.min(18, zoom));
  // Normalize to 0..1 over the useful zoom range (2–14)
  const t = Math.min(1, (z - 2) / 12);
  // Smooth easing (ease-in-out cubic)
  const s = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return {
    clusterGrid:  Math.round(8 + 30 * s),          // 8 → 38
    baseRadius:   2 + 18 * s,                       // 2px → 20px
    maxRadius:    3 + 22 * s,                       // 3px → 25px
    blur:         0.1 + 0.9 * s,                    // 0.1 → 1.0
    coreAlpha:    0.8 - 0.3 * s,                    // 0.8 → 0.5 (brighter when small)
    midAlpha:     0.3 - 0.12 * s,                   // 0.3 → 0.18
    outerAlpha:   0.01 + 0.06 * s,                  // 0.01 → 0.07
    arcWidth:     0.4 + 1.0 * s,                    // 0.4 → 1.4
  };
}

// ── Coastline & border paths for geopolitical grid ──
// Detailed outlines for key regions — rendered as cyber-blue depth layer
const COASTLINE_PATHS: { name: string; points: [number, number][]; glow: number }[] = [
  // Gulf region — highest detail
  { name: "Qatar", glow: 1.0, points: [
    [26.15,51.20],[26.08,51.35],[25.95,51.50],[25.80,51.58],[25.60,51.60],[25.35,51.57],
    [25.15,51.53],[24.95,51.45],[24.75,51.35],[24.60,51.25],[24.55,51.10],[24.58,50.95],
    [24.65,50.82],[24.80,50.77],[25.00,50.78],[25.20,50.80],[25.40,50.85],[25.60,50.90],
    [25.80,50.98],[26.00,51.05],[26.10,51.12],[26.15,51.20]
  ]},
  { name: "Bahrain", glow: 0.8, points: [
    [26.27,50.45],[26.22,50.55],[26.10,50.60],[25.98,50.58],[25.90,50.52],[25.85,50.42],
    [25.90,50.35],[26.00,50.32],[26.12,50.35],[26.22,50.40],[26.27,50.45]
  ]},
  { name: "UAE", glow: 0.9, points: [
    [26.08,56.00],[25.80,56.20],[25.60,56.38],[25.30,56.35],[24.95,56.28],[24.60,56.00],
    [24.30,55.70],[24.00,55.30],[23.65,55.10],[23.40,54.50],[23.10,54.00],[23.00,53.50],
    [23.50,53.00],[24.00,52.60],[24.25,51.85],[24.50,51.60],[24.75,51.58],[25.10,53.00],
    [25.30,54.20],[25.50,55.00],[25.80,55.60],[26.08,56.00]
  ]},
  { name: "Kuwait", glow: 0.7, points: [
    [30.10,47.70],[29.95,48.00],[29.60,48.10],[29.30,48.00],[29.10,47.85],[28.95,47.70],
    [29.00,47.50],[29.10,47.40],[29.35,47.30],[29.60,47.35],[29.85,47.50],[30.10,47.70]
  ]},
  { name: "Oman_N", glow: 0.7, points: [
    [24.60,56.30],[24.20,56.50],[23.80,56.60],[23.40,56.70],[23.00,57.00],[22.80,57.50],
    [22.50,58.00],[22.80,58.80],[23.20,59.20],[23.60,58.80],[24.00,57.50],[24.30,56.80],
    [24.60,56.30]
  ]},
  { name: "Saudi_E_Coast", glow: 0.85, points: [
    [28.50,48.50],[27.80,49.10],[27.20,49.60],[26.50,50.00],[25.80,50.30],[25.40,50.50],
    [24.80,51.00],[24.50,51.30],[24.00,51.20],[23.50,50.80],[23.00,50.50],[22.50,50.20],
    [22.00,50.00],[21.50,49.50],[21.00,49.20]
  ]},
  // Mediterranean
  { name: "Italy_W", glow: 0.5, points: [
    [44.00,8.00],[43.50,10.30],[42.80,10.60],[42.00,11.50],[41.50,12.50],[40.80,14.00],
    [40.00,15.50],[39.00,16.50],[38.00,15.60],[37.50,15.10],[37.00,15.30],[36.70,15.10]
  ]},
  { name: "Greece", glow: 0.5, points: [
    [41.70,26.00],[41.00,24.50],[40.00,22.90],[39.00,20.70],[38.50,20.50],[38.00,21.50],
    [37.50,22.50],[37.00,22.00],[36.40,22.40],[36.70,23.50],[37.50,24.00],[38.00,23.50],
    [39.00,23.00],[40.00,23.50],[40.50,24.00],[41.00,25.00],[41.70,26.00]
  ]},
  // East Asia
  { name: "Japan_Main", glow: 0.6, points: [
    [31.00,131.00],[32.50,131.50],[33.50,132.00],[34.20,133.50],[34.80,135.00],
    [35.50,136.80],[36.50,137.50],[37.50,138.50],[38.50,139.80],[39.50,140.00],
    [40.50,140.50],[41.50,141.00],[42.00,143.00],[43.00,145.50],[42.50,144.00],
    [41.00,141.50],[40.00,140.00],[38.50,139.00],[37.00,137.00],[35.50,135.50],
    [34.00,134.00],[33.00,130.50],[31.00,131.00]
  ]},
  { name: "Korea", glow: 0.5, points: [
    [38.50,128.40],[37.50,129.40],[36.00,129.50],[35.10,129.00],[34.50,127.50],
    [34.80,126.50],[35.50,126.00],[36.50,126.50],[37.50,126.80],[38.50,128.40]
  ]},
  // UK
  { name: "UK", glow: 0.6, points: [
    [50.00,-5.50],[50.30,-4.00],[50.60,-2.50],[50.80,-1.00],[51.10,1.00],[51.50,1.40],
    [52.00,1.80],[52.80,1.60],[53.20,0.30],[53.50,-0.10],[54.00,-0.50],[54.50,-1.20],
    [55.00,-1.50],[55.50,-1.70],[56.00,-2.50],[56.50,-3.50],[57.50,-5.50],[58.50,-5.00],
    [58.50,-3.00],[57.00,-2.00],[56.50,-2.80],[55.80,-4.50],[55.00,-4.80],[54.50,-3.50],
    [53.50,-3.00],[53.00,-4.00],[52.50,-4.50],[52.00,-5.00],[51.50,-5.10],[50.50,-5.20],
    [50.00,-5.50]
  ]},
  // Africa — key coastlines
  { name: "Morocco_N", glow: 0.4, points: [
    [35.80,-5.80],[35.90,-5.30],[35.70,-3.80],[35.20,-2.30],[35.00,-1.80],[34.80,-1.70],
    [33.90,-1.00],[33.30,-1.30],[32.80,-1.80],[32.00,-1.20],[31.50,-2.50],[31.00,-3.50],
    [30.40,-4.50],[29.80,-6.80],[30.50,-8.60],[31.50,-9.50],[32.50,-9.20],[33.50,-7.50],
    [34.50,-6.50],[35.30,-6.00],[35.80,-5.80]
  ]},
];

// ── Original border paths for animated pulse lines ──
const BORDER_PATHS: { name: string; points: [number, number][] }[] = [
  { name: "Qatar", points: [[26.15,51.2],[25.9,51.6],[25.3,51.6],[24.6,51.4],[24.6,50.8],[25.2,50.8],[26.1,51.0],[26.15,51.2]] },
  { name: "UAE", points: [[26.1,56.0],[25.6,56.4],[24.9,56.3],[24.2,55.8],[23.6,55.2],[23.0,54.0],[24.0,52.6],[24.3,51.6],[24.8,51.6],[25.6,54.5],[26.1,56.0]] },
  { name: "Saudi_N", points: [[32.0,39.0],[28.0,37.0],[25.5,38.5],[22.0,39.5],[20.0,41.0],[18.0,42.5],[17.5,44.0],[18.5,46.0],[21.0,49.0],[24.5,51.0],[25.5,50.5],[27.0,49.5],[29.0,47.5],[30.5,42.0],[32.0,39.0]] },
  { name: "UK", points: [[50.5,-3.5],[51.5,1.4],[52.5,1.8],[53.5,0.0],[55.0,-1.5],[57.7,-5.5],[58.5,-3.0],[56.0,-2.5],[55.0,-4.5],[54.0,-3.0],[53.0,-4.5],[52.0,-5.0],[51.5,-5.0],[50.5,-3.5]] },
  { name: "Japan", points: [[31.0,131.0],[33.0,132.0],[34.5,134.0],[35.5,137.0],[37.0,137.5],[39.0,140.0],[41.0,141.0],[43.0,145.5],[42.0,143.0],[40.5,140.0],[38.5,139.5],[36.0,136.5],[34.0,135.0],[33.0,130.5],[31.0,131.0]] },
];

interface IntelligenceOverlayProps {
  mapInstance: any;
}

export default function IntelligenceOverlay({ mapInstance }: IntelligenceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const votesRef = useRef<SyntheticVote[]>([]);
  const arcsRef = useRef<ReturnType<typeof getArcConnections>>([]);
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    votesRef.current = generateSyntheticVotes();
    arcsRef.current = getArcConnections();
  }, []);

  // Track map pan for parallax grid
  useEffect(() => {
    if (!mapInstance) return;
    const updatePan = () => {
      const center = mapInstance.getCenter();
      panOffsetRef.current = {
        x: (center.lng * 2) % 100,
        y: (center.lat * 2) % 100,
      };
    };
    mapInstance.on("move", updatePan);
    updatePan();
    return () => { mapInstance.off("move", updatePan); };
  }, [mapInstance]);

  const latLngToPixel = useCallback((lat: number, lng: number): { x: number; y: number } | null => {
    if (!mapInstance) return null;
    try {
      const point = mapInstance.latLngToContainerPoint([lat, lng]);
      return { x: point.x, y: point.y };
    } catch { return null; }
  }, [mapInstance]);

  // ── 1. Parallax dot-grid (moves with map pan) ──
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const spacing = 50;
    const offsetX = panOffsetRef.current.x;
    const offsetY = panOffsetRef.current.y;

    ctx.fillStyle = "rgba(0, 207, 255, 0.03)";

    for (let gx = -spacing; gx < w + spacing; gx += spacing) {
      for (let gy = -spacing; gy < h + spacing; gy += spacing) {
        const px = ((gx + offsetX) % spacing + spacing) % spacing + gx - (gx % spacing);
        const py = ((gy + offsetY) % spacing + spacing) % spacing + gy - (gy % spacing);
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Faint crosshair lines every 4th dot
    ctx.strokeStyle = "rgba(0, 207, 255, 0.012)";
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < w; gx += spacing * 4) {
      const px = ((gx + offsetX * 4) % (spacing * 4) + spacing * 4) % (spacing * 4);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += spacing * 4) {
      const py = ((gy + offsetY * 4) % (spacing * 4) + spacing * 4) % (spacing * 4);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }
  }, []);

  // ── 2. Neon Border Strokes — cyber-blue spatial definition (drawn UNDER heatmap) ──
  // #004466 neon glow gives users a sense of "where" without a bright map
  const drawCoastlineGlow = useCallback((ctx: CanvasRenderingContext2D) => {
    const zoom = mapInstance?.getZoom() || 4;
    if (zoom < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = ctx.canvas.width / dpr;
    const ch = ctx.canvas.height / dpr;

    for (const coast of COASTLINE_PATHS) {
      const pixels = coast.points
        .map(([lat, lng]) => latLngToPixel(lat, lng))
        .filter((p): p is { x: number; y: number } => p !== null);

      if (pixels.length < 3) continue;

      // Frustum check
      const onScreen = pixels.some(p => p.x > -200 && p.x < cw + 200 && p.y > -200 && p.y < ch + 200);
      if (!onScreen) continue;

      // Glow scales with zoom — visible even at world view, stronger up close
      const zoomScale = Math.min(1, (zoom - 1) / 8);
      const glowStrength = coast.glow * (0.5 + 0.5 * zoomScale);

      // Helper: trace the path
      const tracePath = () => {
        ctx.beginPath();
        ctx.moveTo(pixels[0].x, pixels[0].y);
        for (let i = 1; i < pixels.length; i++) {
          ctx.lineTo(pixels[i].x, pixels[i].y);
        }
      };

      // ── Layer 1: Wide neon bloom (4px, shadow blur) ──
      tracePath();
      ctx.strokeStyle = `rgba(0, 68, 102, ${0.12 * glowStrength})`; // #004466
      ctx.lineWidth = 4;
      ctx.shadowColor = `rgba(0, 68, 102, ${0.25 * glowStrength})`;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // ── Layer 2: Core neon line (1.5px, brighter) ──
      tracePath();
      ctx.strokeStyle = `rgba(0, 68, 102, ${0.22 * glowStrength})`; // #004466 solid
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Layer 3: Crisp highlight edge (0.5px, brightest) ──
      tracePath();
      ctx.strokeStyle = `rgba(0, 140, 210, ${0.15 * glowStrength})`; // lighter cyan accent
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }, [latLngToPixel, mapInstance]);

  // ── 3. Zoom-responsive heatmap with ORGANIC STAGGERED PULSE ──
  const drawHeatmap = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const votes = votesRef.current;
    if (!votes.length) return;

    const zoom = mapInstance?.getZoom() || 4;
    const zp = getZoomParams(zoom);

    // Cluster into grid cells sized for current zoom
    const clusterMap = new Map<string, { x: number; y: number; intensity: number; count: number; key: string }>();

    for (const vote of votes) {
      const pt = latLngToPixel(vote.lat, vote.lng);
      if (!pt) continue;

      const key = `${Math.round(pt.x / zp.clusterGrid)}_${Math.round(pt.y / zp.clusterGrid)}`;
      const existing = clusterMap.get(key);

      if (existing) {
        existing.x = (existing.x * existing.count + pt.x) / (existing.count + 1);
        existing.y = (existing.y * existing.count + pt.y) / (existing.count + 1);
        existing.intensity = Math.min(1, existing.intensity + vote.intensity * 0.15);
        existing.count++;
      } else {
        clusterMap.set(key, { x: pt.x, y: pt.y, intensity: vote.intensity, count: 1, key });
      }
    }

    const dpr = window.devicePixelRatio || 1;
    const cw = ctx.canvas.width / dpr;
    const ch = ctx.canvas.height / dpr;

    clusterMap.forEach((cluster) => {
      const { x, y, intensity, count, key } = cluster;
      if (x < -60 || y < -60 || x > cw + 60 || y > ch + 60) return;

      // ═══ ORGANIC STAGGERED PULSE ═══
      // Each point gets a unique period (2–4s) and phase offset (0–5s)
      // derived from a deterministic hash of its grid key.
      const h = hashKey(key);
      const period = 2.0 + (h % 1000) / 1000 * 2.0;           // 2s to 4s
      const phase = ((h >> 10) % 1000) / 1000 * 5.0;           // 0s to 5s delay
      const breathShape = ((h >> 20) % 1000) / 1000;           // secondary shape variation

      // Sine-based breathing with gentle easing
      const rawPulse = Math.sin(((time - phase) * Math.PI * 2) / period);
      // Mix in a secondary harmonic for organic feel (less mechanical)
      const secondaryPulse = Math.sin(((time - phase * 0.7) * Math.PI * 2) / (period * 1.618));
      const blendedPulse = rawPulse * 0.7 + secondaryPulse * 0.3 * breathShape;

      // Map from [-1, 1] to [0.88, 1.0] — extremely subtle glow expansion
      const pulse = 0.88 + 0.12 * (blendedPulse * 0.5 + 0.5);

      // Radius: zoom-dependent, count-scaled, clamped
      const countScale = Math.min(count * 0.5, 4);
      const radius = Math.min(zp.baseRadius + countScale, zp.maxRadius) * pulse;

      // ── Outer glow ──
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const ca = zp.coreAlpha * pulse;
      const ma = zp.midAlpha * pulse;
      const oa = zp.outerAlpha;
      grad.addColorStop(0, intensityToColor(intensity, ca));
      grad.addColorStop(0.35, intensityToColor(intensity * 0.85, ma));
      grad.addColorStop(0.7, intensityToColor(intensity * 0.6, oa));
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Sharp inner point ──
      const dotRadius = Math.max(1.5, radius * 0.15);
      const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, dotRadius * 2);
      dotGrad.addColorStop(0, `rgba(255,255,255,${0.4 * pulse * intensity})`);
      dotGrad.addColorStop(0.5, intensityToColor(intensity, 0.5 * pulse));
      dotGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(x, y, dotRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();

      // Solid crisp center dot
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = intensityToColor(intensity, 0.9);
      ctx.fill();
    });
  }, [latLngToPixel, mapInstance]);

  // ── 4. Data arcs between clusters ──
  const drawArcs = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const arcs = arcsRef.current;
    const zoom = mapInstance?.getZoom() || 4;
    const zp = getZoomParams(zoom);

    for (const arc of arcs) {
      const fromPt = latLngToPixel(arc.from.lat, arc.from.lng);
      const toPt = latLngToPixel(arc.to.lat, arc.to.lng);
      if (!fromPt || !toPt) continue;

      const dpr = window.devicePixelRatio || 1;
      const cw = ctx.canvas.width / dpr;
      const ch = ctx.canvas.height / dpr;
      if (fromPt.x < -200 && toPt.x < -200) continue;
      if (fromPt.x > cw + 200 && toPt.x > cw + 200) continue;
      if (fromPt.y < -200 && toPt.y < -200) continue;
      if (fromPt.y > ch + 200 && toPt.y > ch + 200) continue;

      const midX = (fromPt.x + toPt.x) / 2;
      const midY = (fromPt.y + toPt.y) / 2;
      const dx = toPt.x - fromPt.x;
      const dy = toPt.y - fromPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) continue;

      const curvature = dist * 0.15;
      const cpx = midX - (dy / dist) * curvature;
      const cpy = midY + (dx / dist) * curvature;

      const alpha = 0.06 + arc.strength * 0.1;

      // Arc line
      ctx.beginPath();
      ctx.moveTo(fromPt.x, fromPt.y);
      ctx.quadraticCurveTo(cpx, cpy, toPt.x, toPt.y);
      ctx.strokeStyle = intensityToColor(arc.strength, alpha);
      ctx.lineWidth = zp.arcWidth;
      ctx.stroke();

      // Traveling data packet
      const pulsePos = (time * 0.25 * arc.strength + arc.from.lat * 10) % 1;
      const t = pulsePos;
      const px = (1 - t) * (1 - t) * fromPt.x + 2 * (1 - t) * t * cpx + t * t * toPt.x;
      const py = (1 - t) * (1 - t) * fromPt.y + 2 * (1 - t) * t * cpy + t * t * toPt.y;

      const pSize = 3 + zp.arcWidth * 2;
      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize);
      pGrad.addColorStop(0, `rgba(255,255,255,0.5)`);
      pGrad.addColorStop(0.4, intensityToColor(arc.strength, 0.5));
      pGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = pGrad;
      ctx.fill();
    }
  }, [latLngToPixel, mapInstance]);

  // ── 5. Animated border pulse lines (dashed running light) ──
  const drawBorders = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const zoom = mapInstance?.getZoom() || 4;
    if (zoom < 4) return;

    for (const border of BORDER_PATHS) {
      const pixels = border.points
        .map(([lat, lng]) => latLngToPixel(lat, lng))
        .filter((p): p is { x: number; y: number } => p !== null);

      if (pixels.length < 3) continue;

      const dpr = window.devicePixelRatio || 1;
      const cw = ctx.canvas.width / dpr;
      const ch = ctx.canvas.height / dpr;
      const onScreen = pixels.some(p => p.x > -100 && p.x < cw + 100 && p.y > -100 && p.y < ch + 100);
      if (!onScreen) continue;

      // Running light
      const dashLen = 8;
      const gapLen = 16;
      const offset = time * 15;

      ctx.beginPath();
      ctx.moveTo(pixels[0].x, pixels[0].y);
      for (let i = 1; i < pixels.length; i++) {
        ctx.lineTo(pixels[i].x, pixels[i].y);
      }
      ctx.closePath();

      ctx.strokeStyle = "rgba(0, 207, 255, 0.08)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([dashLen, gapLen]);
      ctx.lineDashOffset = -offset;
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // Faint solid underneath
      ctx.beginPath();
      ctx.moveTo(pixels[0].x, pixels[0].y);
      for (let i = 1; i < pixels.length; i++) {
        ctx.lineTo(pixels[i].x, pixels[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(0, 207, 255, 0.025)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }, [latLngToPixel, mapInstance]);

  // ── HUD corner brackets + scanline ──
  const drawHUD = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    ctx.fillStyle = "rgba(0, 207, 255, 0.006)";
    const scanY = (time * 30) % (h + 200) - 100;
    ctx.fillRect(0, scanY, w, 2);

    const len = 25;
    const ins = 16;
    ctx.strokeStyle = "rgba(0, 207, 255, 0.12)";
    ctx.lineWidth = 1;

    ctx.beginPath(); ctx.moveTo(ins, ins + len); ctx.lineTo(ins, ins); ctx.lineTo(ins + len, ins); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - ins - len, ins); ctx.lineTo(w - ins, ins); ctx.lineTo(w - ins, ins + len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ins, h - ins - len); ctx.lineTo(ins, h - ins); ctx.lineTo(ins + len, h - ins); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - ins - len, h - ins); ctx.lineTo(w - ins, h - ins); ctx.lineTo(w - ins, h - ins - len); ctx.stroke();
  }, []);

  // ── Main render loop ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapInstance) {
      animFrameRef.current = requestAnimationFrame(render);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = canvas.parentElement;
    if (container) {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);
      timeRef.current += 0.016;
      const time = timeRef.current;

      // Draw layers back-to-front:
      // 1. Grid → 2. Coastline glow → 3. Border pulses → 4. Arcs → 5. Heatmap → 6. HUD
      drawGrid(ctx, w, h);
      drawCoastlineGlow(ctx);      // cyber-blue depth layer (UNDER heatmap)
      drawBorders(ctx, time);
      drawArcs(ctx, time);
      drawHeatmap(ctx, time);       // orange points ON TOP of coastline glow
      drawHUD(ctx, w, h, time);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [mapInstance, drawGrid, drawCoastlineGlow, drawBorders, drawArcs, drawHeatmap, drawHUD]);

  useEffect(() => {
    if (!mapInstance) return;
    animFrameRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [mapInstance, render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[400] pointer-events-none"
      style={{
        mixBlendMode: "screen",
        willChange: "transform, opacity",
      }}
    />
  );
}
