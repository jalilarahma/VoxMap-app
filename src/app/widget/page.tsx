"use client";

import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════
// LIVE PULSE WIDGET — Embeddable voting experience
// This page renders inside an iframe on third-party sites
// ═══════════════════════════════════════════════════════

interface QuestionData {
  id: string;
  question: string;
  category: string;
  day: number;
  results: {
    agree: number;
    disagree: number;
    total: number;
    agree_pct: number;
    disagree_pct: number;
  };
}

// Generate a simple device fingerprint for widget users
function getWidgetDeviceId(): string {
  const key = "voxmap_widget_device";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = "w_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
    return id;
  } catch {
    return "w_" + Math.random().toString(36).slice(2);
  }
}

export default function WidgetPage() {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [voted, setVoted] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  // Read theme from URL params
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setTheme((params.get("theme") as "dark" | "light") || "dark");
      setCompact(params.get("size") === "compact");

      // Check if already voted
      try {
        const votedQ = localStorage.getItem("voxmap_widget_voted");
        if (votedQ) {
          const parsed = JSON.parse(votedQ);
          if (parsed.question_id) setVoted(parsed.option);
        }
      } catch {}
    }
  }, []);

  // Fetch today's question
  useEffect(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    fetch(`${baseUrl}/api/question`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setQuestion(data);
          // Check if voted on THIS question
          try {
            const votedQ = localStorage.getItem("voxmap_widget_voted");
            if (votedQ) {
              const parsed = JSON.parse(votedQ);
              if (parsed.question_id === data.id) {
                setVoted(parsed.option);
              }
            }
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load question");
        setLoading(false);
      });
  }, []);

  // Handle vote
  async function handleVote(option: number) {
    if (!question || voted !== null || voting) return;
    setVoting(true);

    try {
      const deviceId = getWidgetDeviceId();
      const baseUrl = window.location.origin;
      const res = await fetch(`${baseUrl}/api/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.id,
          device_id: deviceId,
          option_index: option,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setVoted(option);
        setQuestion((prev) => prev ? { ...prev, results: data.results } : prev);
        // Save vote locally
        try {
          localStorage.setItem("voxmap_widget_voted", JSON.stringify({
            question_id: question.id,
            option,
          }));
        } catch {}
      } else if (data.code === "DUPLICATE") {
        setVoted(option);
      } else {
        setError(data.error || "Vote failed");
      }
    } catch {
      setError("Network error");
    }
    setVoting(false);
  }

  const isDark = theme === "dark";
  const bg = isDark ? "#0f172a" : "#ffffff";
  const cardBg = isDark ? "#1e293b" : "#f1f5f9";
  const textColor = isDark ? "#ffffff" : "#0f172a";
  const subtextColor = isDark ? "#94a3b8" : "#64748b";
  const borderColor = isDark ? "#334155" : "#e2e8f0";

  return (
    <div style={{
          background: bg,
          borderRadius: 16,
          border: `1px solid ${borderColor}`,
          padding: compact ? 16 : 20,
          maxWidth: 480,
          width: "100%",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: compact ? 12 : 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#22c55e", animation: "pulse 2s infinite",
              }} />
              <span style={{ fontSize: 11, color: subtextColor, fontWeight: 600, letterSpacing: "0.05em" }}>
                LIVE POLL
              </span>
            </div>
            <a
              href="https://vox-map-app.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12, fontWeight: 800, textDecoration: "none",
                background: "linear-gradient(135deg, #f97316, #ef4444, #a855f7)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              VoxMap
            </a>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: 20, color: subtextColor }}>
              Loading...
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ textAlign: "center", padding: 20, color: "#ef4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Question */}
          {question && !loading && (
            <>
              <p style={{
                fontSize: compact ? 15 : 17, fontWeight: 700, color: textColor,
                lineHeight: 1.4, marginBottom: compact ? 14 : 18,
              }}>
                {question.question}
              </p>

              {/* Vote buttons or results */}
              {voted === null ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => handleVote(0)}
                    disabled={voting}
                    style={{
                      flex: 1, padding: compact ? "10px 0" : "14px 0", borderRadius: 12,
                      border: `2px solid #22c55e40`, background: `#22c55e15`,
                      color: "#22c55e", fontSize: 15, fontWeight: 700,
                      cursor: voting ? "wait" : "pointer", transition: "all 0.2s",
                      fontFamily: "system-ui",
                    }}
                  >
                    Agree
                  </button>
                  <button
                    onClick={() => handleVote(1)}
                    disabled={voting}
                    style={{
                      flex: 1, padding: compact ? "10px 0" : "14px 0", borderRadius: 12,
                      border: `2px solid #ef444440`, background: `#ef444415`,
                      color: "#ef4444", fontSize: 15, fontWeight: 700,
                      cursor: voting ? "wait" : "pointer", transition: "all 0.2s",
                      fontFamily: "system-ui",
                    }}
                  >
                    Disagree
                  </button>
                </div>
              ) : (
                <div>
                  {/* Results bars */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: voted === 0 ? "#22c55e" : textColor }}>
                        {voted === 0 && "✓ "}Agree
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
                        {question.results.agree_pct}%
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: cardBg, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        width: `${question.results.agree_pct}%`,
                        background: "linear-gradient(to right, #22c55e, #16a34a)",
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: voted === 1 ? "#ef4444" : textColor }}>
                        {voted === 1 && "✓ "}Disagree
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                        {question.results.disagree_pct}%
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: cardBg, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        width: `${question.results.disagree_pct}%`,
                        background: "linear-gradient(to right, #ef4444, #dc2626)",
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>

                  <div style={{ textAlign: "center", fontSize: 12, color: subtextColor }}>
                    {question.results.total.toLocaleString()} votes
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: compact ? 12 : 16, paddingTop: 12,
                borderTop: `1px solid ${borderColor}`,
              }}>
                <span style={{ fontSize: 10, color: subtextColor }}>
                  Day {question.day} · {question.category}
                </span>
                <a
                  href="https://vox-map-app.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 10, color: "#f97316", textDecoration: "none", fontWeight: 600,
                  }}
                >
                  Explore full results on VoxMap →
                </a>
              </div>
            </>
          )}
        </div>

  );
}
