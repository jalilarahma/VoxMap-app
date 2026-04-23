"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════
// SENTIMENT TIME-LAPSE
// Animated replay of votes spreading across the map
// Export as WebM video or GIF for social media sharing
// ═══════════════════════════════════════════════════════

interface TimelapseVote {
  vote_option: number; // 0 = agree, 1 = disagree
  lat: number;
  lng: number;
  voted_at: string;
  country: string | null;
}

interface Question {
  id: string;
  text_en: string;
  day_of_year: number;
}

interface TimeLapseProps {
  onClose: () => void;
}

export default function TimeLapse({ onClose }: TimeLapseProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const markersRef = useRef<any[]>([]);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [votes, setVotes] = useState<TimelapseVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVotes, setLoadingVotes] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [visibleCount, setVisibleCount] = useState(0);
  const [agreeCount, setAgreeCount] = useState(0);
  const [disagreeCount, setDisagreeCount] = useState(0);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const speedOptions = [1, 2, 5, 10];

  // ── Fetch available questions ──
  useEffect(() => {
    async function fetchQuestions() {
      const { data } = await supabase
        .from("questions")
        .select("id, text_en, day_of_year")
        .order("day_of_year", { ascending: false })
        .limit(30);

      if (data && data.length > 0) {
        setQuestions(data);
        setSelectedQuestion(data[0]);
      }
      setLoading(false);
    }
    fetchQuestions();
  }, []);

  // ── Fetch votes for selected question ──
  useEffect(() => {
    if (!selectedQuestion) return;

    async function fetchVotes() {
      setLoadingVotes(true);
      setVotes([]);
      setProgress(0);
      setVisibleCount(0);
      setAgreeCount(0);
      setDisagreeCount(0);
      setIsPlaying(false);

      // Try RPC first, fallback to direct query
      let voteData: TimelapseVote[] = [];

      try {
        const { data } = await supabase.rpc("get_vote_timelapse", {
          q_id: selectedQuestion.id,
        });
        if (data && data.length > 0) {
          voteData = data;
        }
      } catch {
        // Fallback: direct query
        const { data } = await supabase
          .from("votes")
          .select("option_index, location, created_at, country_code")
          .eq("question_id", selectedQuestion.id)
          .not("location", "is", null)
          .order("created_at", { ascending: true });

        if (data) {
          voteData = data.map((v: any) => ({
            vote_option: v.option_index,
            lat: v.lat || 0,
            lng: v.lng || 0,
            voted_at: v.created_at,
            country: v.country_code,
          }));
        }
      }

      setVotes(voteData);
      setLoadingVotes(false);
    }
    fetchVotes();
  }, [selectedQuestion]);

  // ── Initialize map ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapContainerRef.current!, {
        center: [25, 45],
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        noWrap: true,
        bounds: [[-90, -180], [90, 180]],
      }).addTo(map);

      mapRef.current = map;

      // Fit to world
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Clear markers ──
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // ── Render votes up to index ──
  const renderVotesUpTo = useCallback((count: number) => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      // Only add new markers (incremental)
      const existingCount = markersRef.current.length;
      if (count <= existingCount) return;

      let agree = agreeCount;
      let disagree = disagreeCount;

      for (let i = existingCount; i < count && i < votes.length; i++) {
        const vote = votes[i];
        if (!vote.lat || !vote.lng) continue;

        const isAgree = vote.vote_option === 0;
        const color = isAgree ? "#22C55E" : "#EF4444";

        if (isAgree) agree++;
        else disagree++;

        // Outer glow
        const glow = L.circleMarker([vote.lat, vote.lng], {
          radius: 12,
          fillColor: color,
          color: color,
          weight: 0,
          fillOpacity: 0.15,
        }).addTo(mapRef.current);

        // Inner dot
        const dot = L.circleMarker([vote.lat, vote.lng], {
          radius: 4,
          fillColor: color,
          color: "#fff",
          weight: 1,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);

        markersRef.current.push(glow, dot);
      }

      setAgreeCount(agree);
      setDisagreeCount(disagree);
      setVisibleCount(count);
    });
  }, [votes, agreeCount, disagreeCount]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying || votes.length === 0) return;

    const totalVotes = votes.length;
    const baseDuration = 10000; // 10 seconds at 1x speed
    const duration = baseDuration / speed;
    const startProgress = progress;
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(startProgress + (elapsed / duration) * (1 - startProgress), 1);
      const targetCount = Math.floor(newProgress * totalVotes);

      setProgress(newProgress);
      renderVotesUpTo(targetCount);

      if (newProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, speed, votes.length, progress, renderVotesUpTo]);

  // ── Play/Pause toggle ──
  const togglePlay = () => {
    if (progress >= 1) {
      // Reset and play from start
      clearMarkers();
      setProgress(0);
      setVisibleCount(0);
      setAgreeCount(0);
      setDisagreeCount(0);
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // ── Reset ──
  const reset = () => {
    setIsPlaying(false);
    clearMarkers();
    setProgress(0);
    setVisibleCount(0);
    setAgreeCount(0);
    setDisagreeCount(0);
  };

  // ── Seek (scrub timeline) ──
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setIsPlaying(false);
    clearMarkers();
    setAgreeCount(0);
    setDisagreeCount(0);
    setProgress(value);
    const targetCount = Math.floor(value * votes.length);
    // Need to render all at once — reset markers and rebuild
    markersRef.current = [];
    setTimeout(() => renderVotesUpTo(targetCount), 50);
  };

  // ── Format timestamp ──
  const getTimeLabel = (p: number): string => {
    if (votes.length === 0) return "--:--";
    const idx = Math.min(Math.floor(p * votes.length), votes.length - 1);
    const vote = votes[idx];
    if (!vote) return "--:--";
    const d = new Date(vote.voted_at);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // ═══════════════════════════════════════════════════════
  // VIDEO EXPORT — MediaRecorder API
  // Captures the map + overlay as WebM video
  // ═══════════════════════════════════════════════════════
  const exportVideo = async () => {
    if (!mapContainerRef.current || votes.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportUrl(null);

    // Reset playback
    clearMarkers();
    setProgress(0);
    setVisibleCount(0);
    setAgreeCount(0);
    setDisagreeCount(0);

    try {
      const L = await import("leaflet");

      // Create an offscreen canvas matching the map container
      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      canvas.width = rect.width * 2; // 2x for quality
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext("2d")!;

      // Use html2canvas-like approach: capture map tiles as background
      // Then draw vote dots frame by frame
      const stream = canvas.captureStream(30); // 30 fps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setExportUrl(url);
        setIsExporting(false);
      };

      mediaRecorder.start();

      // Animate on canvas
      const totalFrames = 300; // 10 seconds at 30fps
      const totalVotes = votes.length;

      for (let frame = 0; frame <= totalFrames; frame++) {
        const p = frame / totalFrames;
        const targetCount = Math.floor(p * totalVotes);

        // Draw dark background
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines (simple world map background)
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
          const x = (i / 12) * canvas.width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const y = (i / 6) * canvas.height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw votes as dots
        for (let i = 0; i < targetCount && i < totalVotes; i++) {
          const vote = votes[i];
          if (!vote.lat || !vote.lng) continue;

          // Convert lat/lng to canvas coordinates (simple Mercator)
          const x = ((vote.lng + 180) / 360) * canvas.width;
          const y = ((90 - vote.lat) / 180) * canvas.height;

          const isAgree = vote.vote_option === 0;

          // Glow
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fillStyle = isAgree ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";
          ctx.fill();

          // Dot
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = isAgree ? "#22C55E" : "#EF4444";
          ctx.fill();
          ctx.strokeStyle = "#ffffff40";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw question text
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${canvas.width * 0.025}px system-ui`;
        ctx.textAlign = "center";
        const qText = selectedQuestion?.text_en || "Daily Question";
        ctx.fillText(qText, canvas.width / 2, canvas.height * 0.06);

        // Draw VoxMap branding
        ctx.font = `bold ${canvas.width * 0.035}px system-ui`;
        ctx.fillStyle = "#f97316";
        ctx.textAlign = "left";
        ctx.fillText("VoxMap", canvas.width * 0.03, canvas.height * 0.06);

        // Draw stats
        let agree = 0, disagree = 0;
        for (let i = 0; i < targetCount && i < totalVotes; i++) {
          if (votes[i].vote_option === 0) agree++;
          else disagree++;
        }

        const statsY = canvas.height * 0.94;
        ctx.font = `bold ${canvas.width * 0.02}px system-ui`;

        ctx.fillStyle = "#22C55E";
        ctx.textAlign = "left";
        ctx.fillText(`Agree: ${agree}`, canvas.width * 0.03, statsY);

        ctx.fillStyle = "#EF4444";
        ctx.fillText(`Disagree: ${disagree}`, canvas.width * 0.2, statsY);

        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "right";
        const timeLabel = targetCount > 0 && votes[Math.min(targetCount - 1, totalVotes - 1)]
          ? new Date(votes[Math.min(targetCount - 1, totalVotes - 1)].voted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";
        ctx.fillText(timeLabel, canvas.width * 0.97, statsY);

        // Progress bar
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, canvas.height - 6, canvas.width, 6);
        const gradient = ctx.createLinearGradient(0, 0, canvas.width * p, 0);
        gradient.addColorStop(0, "#f97316");
        gradient.addColorStop(0.5, "#ef4444");
        gradient.addColorStop(1, "#a855f7");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - 6, canvas.width * p, 6);

        setExportProgress(Math.round(p * 100));

        // Wait for next frame (give browser breathing room)
        await new Promise((r) => setTimeout(r, 33));
      }

      mediaRecorder.stop();

    } catch (err) {
      console.error("Export error:", err);
      setIsExporting(false);
      alert("Export failed. Your browser may not support video recording.");
    }
  };

  // ── Download handler ──
  const downloadVideo = () => {
    if (!exportUrl) return;
    const a = document.createElement("a");
    a.href = exportUrl;
    a.download = `voxmap-timelapse-${selectedQuestion?.day_of_year || "vote"}.webm`;
    a.click();
  };

  // ── Share handler ──
  const shareVideo = async () => {
    if (!exportUrl) return;
    try {
      const response = await fetch(exportUrl);
      const blob = await response.blob();
      const file = new File([blob], "voxmap-timelapse.webm", { type: "video/webm" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "VoxMap Time-Lapse",
          text: `Watch how the world voted: "${selectedQuestion?.text_en}"\n\nvoxmap.net`,
          files: [file],
        });
      } else {
        downloadVideo();
      }
    } catch {
      downloadVideo();
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold gradient-text">Sentiment Time-Lapse</h2>
          <p className="text-[10px] text-slate-500">Watch opinions spread across the world</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
      </div>

      {/* Question selector */}
      <div className="px-4 py-3 border-b border-slate-800">
        <select
          value={selectedQuestion?.id || ""}
          onChange={(e) => {
            const q = questions.find((q) => q.id === e.target.value);
            if (q) setSelectedQuestion(q);
          }}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5
            text-white text-sm focus:border-orange-500 focus:outline-none"
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>
              Day {q.day_of_year}: {q.text_en.length > 50 ? q.text_en.slice(0, 50) + "..." : q.text_en}
            </option>
          ))}
        </select>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {(loading || loadingVotes) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center">
              <div className="text-2xl animate-pulse mb-2">🗺️</div>
              <p className="text-slate-400 text-sm">{loading ? "Loading questions..." : "Loading votes..."}</p>
            </div>
          </div>
        )}

        {/* No votes message */}
        {!loading && !loadingVotes && votes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center px-8">
              <p className="text-slate-400 text-lg mb-2">No vote location data for this question</p>
              <p className="text-slate-600 text-sm">Try selecting a different question above</p>
            </div>
          </div>
        )}

        {/* Live stats overlay */}
        {votes.length > 0 && (
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase">Agree</p>
              <p className="text-green-400 font-bold text-lg">{agreeCount}</p>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase">Disagree</p>
              <p className="text-red-400 font-bold text-lg">{disagreeCount}</p>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase">Total</p>
              <p className="text-white font-bold text-lg">{visibleCount}<span className="text-slate-500 text-sm font-normal">/{votes.length}</span></p>
            </div>
          </div>
        )}

        {/* Time label */}
        {votes.length > 0 && progress > 0 && (
          <div className="absolute top-3 right-3 z-10 bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-2
            border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase">Time</p>
            <p className="text-orange-400 font-bold text-sm">{getTimeLabel(progress)}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {votes.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800 space-y-3">
          {/* Timeline scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600 w-16">{getTimeLabel(0)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #ef4444 ${progress * 100}%, #1e293b ${progress * 100}%, #1e293b 100%)`,
              }}
            />
            <span className="text-[10px] text-slate-600 w-16 text-right">{getTimeLabel(1)}</span>
          </div>

          {/* Playback buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center rounded-full
                  bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
                  text-white text-xl font-bold hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? "⏸" : progress >= 1 ? "↺" : "▶"}
              </button>

              {/* Reset */}
              <button
                onClick={reset}
                className="w-10 h-10 flex items-center justify-center rounded-xl
                  bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
              >
                ⏹
              </button>

              {/* Speed selector */}
              <div className="flex gap-1 ml-2">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all
                      ${speed === s
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-white"
                      }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              {exportUrl ? (
                <>
                  <button
                    onClick={downloadVideo}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white
                      bg-gradient-to-r from-green-500 to-emerald-600
                      hover:scale-105 active:scale-95 transition-all"
                  >
                    ⬇ Download
                  </button>
                  <button
                    onClick={shareVideo}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white
                      bg-gradient-to-r from-orange-500 to-red-500
                      hover:scale-105 active:scale-95 transition-all"
                  >
                    📤 Share
                  </button>
                </>
              ) : (
                <button
                  onClick={exportVideo}
                  disabled={isExporting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all
                    ${isExporting
                      ? "bg-slate-700 cursor-wait"
                      : "bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 hover:scale-105 active:scale-95"
                    }`}
                >
                  {isExporting ? `Recording ${exportProgress}%` : "🎬 Export Video"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
