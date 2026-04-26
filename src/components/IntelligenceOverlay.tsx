"use client";

import { useEffect, useRef, useCallback } from "react";
import { generateSyntheticVotes, getArcConnections, type SyntheticVote } from "@/lib/syntheticData";

// ═══════════════════════════════════════════════════
// INTELLIGENCE OVERLAY
// Canvas-based heatmap, hex grid, and data arcs
// Renders on top of the Leaflet map for HUD effect
// ═══════════════════════════════════════════════════

// Color gradient: Cool → Warm
// Low: #00CFFF (Electric Cyan)
// Medium: #FF9E00 (Amber Neon)
// High: #FF4500 (Volcanic Neon Red)
function intensityToColor(intensity: number, alpha: number = 1): string {
  const t = Math.max(0, Math.min(1, intensity));
  let r: number, g: number, b: number;

  if (t < 0.5) {
    // Cyan → Amber
    const s = t * 2;
    r = Math.round(0 + (255 - 0) * s);
    g = Math.round(207 + (158 - 207) * s);
    b = Math.round(255 + (0 - 255) * s);
  } else {
    // Amber → Volcanic Red
    const s = (t - 0.5) * 2;
    r = Math.round(255 + (255 - 255) * s);
    g = Math.round(158 + (69 - 158) * s);
    b = Math.round(0 + (0 - 0) * s);
  }

  return `rgba(${r},${g},${b},${alpha})`;
}

// Get gradient stops for canvas radial gradient
function getGradientStops(intensity: number): { color: string; stop: number }[] {
  const coreAlpha = 0.35 + intensity * 0.35;
  const midAlpha = 0.12 + intensity * 0.15;
  return [
    { color: intensityToColor(intensity, coreAlpha), stop: 0 },
    { color: intensityToColor(intensity * 0.8, midAlpha), stop: 0.4 },
    { color: intensityToColor(intensity * 0.5, 0.03), stop: 0.8 },
    { color: "rgba(0,0,0,0)", stop: 1 },
  ];
}

interface IntelligenceOverlayProps {
  mapInstance: any; // Leaflet map instance
}

export default function IntelligenceOverlay({ mapInstance }: IntelligenceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const votesRef = useRef<SyntheticVote[]>([]);
  const arcsRef = useRef<ReturnType<typeof getArcConnections>>([]);

  // Initialize data
  useEffect(() => {
    votesRef.current = generateSyntheticVotes();
    arcsRef.current = getArcConnections();
  }, []);

  // Project lat/lng to canvas pixel coordinates
  const latLngToPixel = useCallback((lat: number, lng: number): { x: number; y: number } | null => {
    if (!mapInstance) return null;
    try {
      const point = mapInstance.latLngToContainerPoint([lat, lng]);
      return { x: point.x, y: point.y };
    } catch {
      return null;
    }
  }, [mapInstance]);

  // ── Draw hex grid ──
  const drawHexGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const hexSize = 40;
    const hexH = hexSize * Math.sqrt(3);
    const hexW = hexSize * 2;

    ctx.strokeStyle = "rgba(0, 207, 255, 0.04)";
    ctx.lineWidth = 0.5;

    for (let row = -1; row < h / hexH + 1; row++) {
      for (let col = -1; col < w / (hexW * 0.75) + 1; col++) {
        const cx = col * hexW * 0.75;
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const x = cx + hexSize * Math.cos(angle);
          const y = cy + hexSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }, []);

  // ── Draw pulsating heatmap orbs ──
  const drawHeatmap = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const votes = votesRef.current;
    if (!votes.length) return;

    // Group nearby votes into clusters for performance
    const clusterMap = new Map<string, { x: number; y: number; intensity: number; count: number }>();

    for (const vote of votes) {
      const pt = latLngToPixel(vote.lat, vote.lng);
      if (!pt) continue;

      // Cluster key: round to 20px grid
      const key = `${Math.round(pt.x / 20)}_${Math.round(pt.y / 20)}`;
      const existing = clusterMap.get(key);

      if (existing) {
        existing.x = (existing.x * existing.count + pt.x) / (existing.count + 1);
        existing.y = (existing.y * existing.count + pt.y) / (existing.count + 1);
        existing.intensity = Math.min(1, existing.intensity + vote.intensity * 0.3);
        existing.count++;
      } else {
        clusterMap.set(key, { x: pt.x, y: pt.y, intensity: vote.intensity, count: 1 });
      }
    }

    // Draw each cluster as a pulsating orb
    clusterMap.forEach((cluster) => {
      const { x, y, intensity, count } = cluster;

      // Skip offscreen
      if (x < -100 || y < -100 || x > ctx.canvas.width + 100 || y > ctx.canvas.height + 100) return;

      // Pulse: different rates based on intensity
      const pulseRate = 0.5 + intensity * 2;
      const pulse = 0.85 + 0.15 * Math.sin(time * pulseRate + x * 0.01 + y * 0.01);

      // Size based on zoom and cluster count
      const zoom = mapInstance?.getZoom() || 4;
      const baseRadius = Math.max(15, 8 + count * 3) * pulse;
      const radius = baseRadius * (0.5 + zoom * 0.08);

      // Draw radial gradient orb
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const stops = getGradientStops(intensity);
      for (const s of stops) {
        gradient.addColorStop(s.stop, s.color);
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Inner bright core for high intensity
      if (intensity > 0.6) {
        const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.2);
        coreGrad.addColorStop(0, intensityToColor(intensity, 0.6 * pulse));
        coreGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();
      }
    });
  }, [latLngToPixel, mapInstance]);

  // ── Draw data arcs between clusters ──
  const drawArcs = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const arcs = arcsRef.current;

    for (const arc of arcs) {
      const fromPt = latLngToPixel(arc.from.lat, arc.from.lng);
      const toPt = latLngToPixel(arc.to.lat, arc.to.lng);
      if (!fromPt || !toPt) continue;

      // Skip if both points offscreen
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      if (fromPt.x < -200 && toPt.x < -200) continue;
      if (fromPt.x > w + 200 && toPt.x > w + 200) continue;
      if (fromPt.y < -200 && toPt.y < -200) continue;
      if (fromPt.y > h + 200 && toPt.y > h + 200) continue;

      // Curved arc via control point
      const midX = (fromPt.x + toPt.x) / 2;
      const midY = (fromPt.y + toPt.y) / 2;
      const dx = toPt.x - fromPt.x;
      const dy = toPt.y - fromPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Curve offset perpendicular to line
      const curvature = dist * 0.15;
      const cpx = midX - (dy / dist) * curvature;
      const cpy = midY + (dx / dist) * curvature;

      // Animated pulse along arc
      const pulsePos = (time * 0.3 * arc.strength + arc.from.lat * 10) % 1;
      const alpha = 0.06 + arc.strength * 0.08;

      // Draw arc line
      ctx.beginPath();
      ctx.moveTo(fromPt.x, fromPt.y);
      ctx.quadraticCurveTo(cpx, cpy, toPt.x, toPt.y);
      ctx.strokeStyle = intensityToColor(arc.strength, alpha);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Animated data packet traveling along arc
      const t = pulsePos;
      const packetX = (1 - t) * (1 - t) * fromPt.x + 2 * (1 - t) * t * cpx + t * t * toPt.x;
      const packetY = (1 - t) * (1 - t) * fromPt.y + 2 * (1 - t) * t * cpy + t * t * toPt.y;

      const packetGrad = ctx.createRadialGradient(packetX, packetY, 0, packetX, packetY, 6);
      packetGrad.addColorStop(0, intensityToColor(arc.strength, 0.5));
      packetGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(packetX, packetY, 6, 0, Math.PI * 2);
      ctx.fillStyle = packetGrad;
      ctx.fill();
    }
  }, [latLngToPixel]);

  // ── Draw HUD elements (scanlines, corner brackets) ──
  const drawHUD = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    // Subtle scanline effect
    ctx.fillStyle = "rgba(0, 207, 255, 0.008)";
    const scanY = (time * 40) % (h + 200) - 100;
    ctx.fillRect(0, scanY, w, 2);
    ctx.fillRect(0, scanY - 4, w, 1);

    // Corner brackets (HUD frame)
    const bracketLen = 30;
    const bracketInset = 20;
    ctx.strokeStyle = "rgba(0, 207, 255, 0.15)";
    ctx.lineWidth = 1.5;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(bracketInset, bracketInset + bracketLen);
    ctx.lineTo(bracketInset, bracketInset);
    ctx.lineTo(bracketInset + bracketLen, bracketInset);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(w - bracketInset - bracketLen, bracketInset);
    ctx.lineTo(w - bracketInset, bracketInset);
    ctx.lineTo(w - bracketInset, bracketInset + bracketLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(bracketInset, h - bracketInset - bracketLen);
    ctx.lineTo(bracketInset, h - bracketInset);
    ctx.lineTo(bracketInset + bracketLen, h - bracketInset);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(w - bracketInset - bracketLen, h - bracketInset);
    ctx.lineTo(w - bracketInset, h - bracketInset);
    ctx.lineTo(w - bracketInset, h - bracketInset - bracketLen);
    ctx.stroke();
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

    // Match canvas to container size
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
        ctx.scale(dpr, dpr);
      }

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Update time
      timeRef.current += 0.016; // ~60fps
      const time = timeRef.current;

      // Draw layers in order (back to front)
      drawHexGrid(ctx, w, h);
      drawArcs(ctx, time);
      drawHeatmap(ctx, time);
      drawHUD(ctx, w, h, time);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [mapInstance, drawHexGrid, drawArcs, drawHeatmap, drawHUD]);

  // Start render loop
  useEffect(() => {
    if (!mapInstance) return;

    animFrameRef.current = requestAnimationFrame(render);

    // Re-render on map move/zoom
    const onMove = () => {}; // render loop handles it continuously

    mapInstance.on("move", onMove);
    mapInstance.on("zoom", onMove);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      mapInstance.off("move", onMove);
      mapInstance.off("zoom", onMove);
    };
  }, [mapInstance, render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[400] pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
