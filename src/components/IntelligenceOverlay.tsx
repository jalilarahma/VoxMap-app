"use client";

import { useEffect, useRef, useCallback } from "react";
import { generateSyntheticVotes, getArcConnections, type SyntheticVote } from "@/lib/syntheticData";

// ═══════════════════════════════════════════════════
// INTELLIGENCE OVERLAY v2
// Zoom-responsive heatmap, parallax grid, border pulses
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

// ── Zoom-responsive radius calculation ──
// Zoom out (2-4): small, sharp points — no bleeding
// Zoom mid (5-8): moderate glow zones
// Zoom in (9+): expanded soft zones
function getZoomParams(zoom: number) {
  if (zoom <= 3) {
    return { clusterGrid: 12, baseRadius: 4, maxRadius: 8, blur: 0.3, coreAlpha: 0.7, midAlpha: 0.25, outerAlpha: 0.02, arcWidth: 0.5 };
  } else if (zoom <= 5) {
    return { clusterGrid: 16, baseRadius: 6, maxRadius: 14, blur: 0.5, coreAlpha: 0.65, midAlpha: 0.22, outerAlpha: 0.04, arcWidth: 0.8 };
  } else if (zoom <= 8) {
    return { clusterGrid: 24, baseRadius: 10, maxRadius: 25, blur: 0.7, coreAlpha: 0.55, midAlpha: 0.2, outerAlpha: 0.05, arcWidth: 1.0 };
  } else {
    return { clusterGrid: 35, baseRadius: 16, maxRadius: 45, blur: 1.0, coreAlpha: 0.5, midAlpha: 0.18, outerAlpha: 0.06, arcWidth: 1.2 };
  }
}

// ── Simplified border paths for key regions ──
// Each is an array of [lat, lng] points forming approximate outlines
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

  // ── 2. Zoom-responsive heatmap ──
  const drawHeatmap = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const votes = votesRef.current;
    if (!votes.length) return;

    const zoom = mapInstance?.getZoom() || 4;
    const zp = getZoomParams(zoom);

    // Cluster into grid cells sized for current zoom
    const clusterMap = new Map<string, { x: number; y: number; intensity: number; count: number }>();

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
        clusterMap.set(key, { x: pt.x, y: pt.y, intensity: vote.intensity, count: 1 });
      }
    }

    const dpr = window.devicePixelRatio || 1;
    const cw = ctx.canvas.width / dpr;
    const ch = ctx.canvas.height / dpr;

    clusterMap.forEach((cluster) => {
      const { x, y, intensity, count } = cluster;
      if (x < -60 || y < -60 || x > cw + 60 || y > ch + 60) return;

      // Breathing pulse — speed varies with intensity
      const pulseRate = 0.4 + intensity * 1.5;
      const pulse = 0.9 + 0.1 * Math.sin(time * pulseRate + x * 0.007 + y * 0.007);

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

      // ── Sharp inner point (always visible, prevents "isolated dot" feel) ──
      const dotRadius = Math.max(1.5, radius * 0.15);
      const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, dotRadius * 2);
      dotGrad.addColorStop(0, `rgba(255,255,255,${0.5 * pulse * intensity})`);
      dotGrad.addColorStop(0.5, intensityToColor(intensity, 0.6 * pulse));
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

  // ── 3. Data arcs between clusters ──
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

  // ── 4. Animated border pulse lines ──
  const drawBorders = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const zoom = mapInstance?.getZoom() || 4;
    if (zoom < 4) return; // Too zoomed out — borders become noise

    for (const border of BORDER_PATHS) {
      const pixels = border.points
        .map(([lat, lng]) => latLngToPixel(lat, lng))
        .filter((p): p is { x: number; y: number } => p !== null);

      if (pixels.length < 3) continue;

      // Check if any point is on screen
      const dpr = window.devicePixelRatio || 1;
      const cw = ctx.canvas.width / dpr;
      const ch = ctx.canvas.height / dpr;
      const onScreen = pixels.some(p => p.x > -100 && p.x < cw + 100 && p.y > -100 && p.y < ch + 100);
      if (!onScreen) continue;

      // Running light: animated stroke-dasharray
      const dashLen = 8;
      const gapLen = 16;
      const offset = time * 15; // speed of running light

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

      // Reset dash
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // Faint solid border underneath
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
    // Scanline
    ctx.fillStyle = "rgba(0, 207, 255, 0.006)";
    const scanY = (time * 30) % (h + 200) - 100;
    ctx.fillRect(0, scanY, w, 2);

    // Corner brackets
    const len = 25;
    const ins = 16;
    ctx.strokeStyle = "rgba(0, 207, 255, 0.12)";
    ctx.lineWidth = 1;

    // TL
    ctx.beginPath(); ctx.moveTo(ins, ins + len); ctx.lineTo(ins, ins); ctx.lineTo(ins + len, ins); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(w - ins - len, ins); ctx.lineTo(w - ins, ins); ctx.lineTo(w - ins, ins + len); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(ins, h - ins - len); ctx.lineTo(ins, h - ins); ctx.lineTo(ins + len, h - ins); ctx.stroke();
    // BR
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

      // Draw layers back-to-front
      drawGrid(ctx, w, h);
      drawBorders(ctx, time);
      drawArcs(ctx, time);
      drawHeatmap(ctx, time);
      drawHUD(ctx, w, h, time);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [mapInstance, drawGrid, drawBorders, drawArcs, drawHeatmap, drawHUD]);

  useEffect(() => {
    if (!mapInstance) return;
    animFrameRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [mapInstance, render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[400] pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
