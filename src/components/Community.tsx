"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUsername } from "@/components/UsernamePicker";
import {
  sanitizeText,
  moderateContent,
  checkSpam,
  recordPost,
  reportPin,
  REPORT_LABELS,
  ReportReason,
} from "@/lib/security";
import { Lang, t } from "@/i18n/translations";

interface CommunityPost {
  id: string;
  username: string;
  text: string;
  likes: number;
  created_at: string;
  category: string;
}

// Points system
const POINTS_KEY = "voxmap_points";
function getPoints(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function addPoints(username: string, pts: number) {
  const points = getPoints();
  points[username] = (points[username] || 0) + pts;
  try { localStorage.setItem(POINTS_KEY, JSON.stringify(points)); } catch {}
}
function getUserPoints(username: string): number {
  return getPoints()[username] || 0;
}

// Track which posts this user already liked
const LIKED_KEY = "voxmap_liked_posts";
function getLikedPosts(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function markLiked(postId: string) {
  const liked = getLikedPosts();
  if (!liked.includes(postId)) {
    liked.push(postId);
    try { localStorage.setItem(LIKED_KEY, JSON.stringify(liked)); } catch {}
  }
}

interface CommunityProps {
  lang: Lang;
  onClose: () => void;
}

export default function Community({ lang, onClose }: CommunityProps) {
  const tr = t[lang];
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [tab, setTab] = useState<"hot" | "new" | "leaderboard">("hot");
  const [likedIds, setLikedIds] = useState<string[]>([]);

  const username = getUsername() || "Anonymous";
  const myPoints = getUserPoints(username);

  useEffect(() => {
    setLikedIds(getLikedPosts());
    fetchPosts();
  }, []);

  async function fetchPosts() {
    // Use pins table with category "community" for user posts
    const { data } = await supabase
      .from("pins")
      .select("*")
      .eq("category", "community")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const mapped: CommunityPost[] = data.map((p: any) => {
        const parts = (p.note || "").split("||");
        return {
          id: p.id,
          username: parts[0] || "Anonymous",
          text: parts[1] || "",
          likes: p.helpful_count || 0,
          created_at: p.created_at,
          category: "opinion",
        };
      });
      setPosts(mapped);
    }
    setLoading(false);
  }

  const [postError, setPostError] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  // Load reported posts on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("voxmap_reported_pins");
      setReportedIds(raw ? JSON.parse(raw) : []);
    } catch {}
  }, []);

  async function handlePost() {
    if (!newPost.trim() || isPosting) return;
    setPostError("");
    setIsPosting(true);

    try {
      const clean = sanitizeText(newPost);

      // ── Content moderation ──
      const contentCheck = moderateContent(clean);
      if (!contentCheck.allowed) {
        setPostError(contentCheck.reason || "Message blocked.");
        setIsPosting(false);
        return;
      }

      // ── Spam detection ──
      const spamCheck = checkSpam(clean);
      if (!spamCheck.allowed) {
        setPostError(spamCheck.reason || "Slow down.");
        setIsPosting(false);
        return;
      }

      const encoded = `${sanitizeText(username)}||${clean}`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          console.error("Auth error:", authError);
          setIsPosting(false);
          return;
        }
      }

      const { error } = await supabase.from("pins").insert({
        device_id: username,
        category: "community",
        urgency: "low",
        note: encoded,
        lat: 0,
        lng: 0,
        location: `POINT(0 0)`,
        is_active: true,
      });

      if (error) {
        console.error("Community post error:", error);
      } else {
        recordPost(clean); // track for spam detection
        addPoints(username, 5);
        setNewPost("");
        setShowCompose(false);
        fetchPosts();
      }
    } catch (e) {
      console.error("Community post exception:", e);
    }
    setIsPosting(false);
  }

  async function handleReport(postId: string, reason: ReportReason) {
    reportPin(postId);
    setReportedIds((prev) => [...prev, postId]);
    setReportingId(null);

    // Also increment report count in Supabase (using helpful_count as negative signal when reported)
    try {
      await supabase.rpc("increment_report_count", { pin_id: postId });
    } catch {
      // Fallback: just mark locally, admin will see in reports
    }
  }

  async function handleLike(post: CommunityPost) {
    if (likedIds.includes(post.id)) return;

    // Update in Supabase
    await supabase
      .from("pins")
      .update({ helpful_count: post.likes + 1 })
      .eq("id", post.id);

    // Track locally
    markLiked(post.id);
    setLikedIds([...likedIds, post.id]);

    // Points: 2 for the post author
    addPoints(post.username, 2);

    // Update UI
    setPosts((prev) =>
      prev.map((p) => p.id === post.id ? { ...p, likes: p.likes + 1 } : p)
    );
  }

  function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  // Sort posts based on tab
  const sortedPosts = [...posts].sort((a, b) => {
    if (tab === "hot") return b.likes - a.likes;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Build leaderboard from posts
  const leaderboard = Object.entries(
    posts.reduce((acc, p) => {
      acc[p.username] = (acc[p.username] || 0) + p.likes;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Voice of the Week = top of leaderboard
  const voiceOfWeek = leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold gradient-text">Community</h2>
          <p className="text-xs text-slate-500">Share your voice. Earn your crown.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
            <span className="text-xs">⭐</span>
            <span className="text-orange-400 font-bold text-sm">{myPoints}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
      </div>

      {/* Voice of the Week Banner */}
      {voiceOfWeek && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/20 via-red-500/20 to-purple-500/20
          border border-orange-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500
              flex items-center justify-center text-lg">👑</div>
            <div>
              <p className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">Voice of the Week</p>
              <p className="text-white font-bold">@{voiceOfWeek[0]}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-lg font-black text-orange-400">{voiceOfWeek[1]}</p>
              <p className="text-[10px] text-slate-400">likes</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 mt-3">
        {(["hot", "new", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
              ${tab === t
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
          >
            {t === "hot" ? "🔥 Hot" : t === "new" ? "🆕 New" : "🏆 Top"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 mt-3 pb-20">
        {loading ? (
          <div className="text-center py-12">
            <p className="gradient-text font-bold animate-pulse">Loading...</p>
          </div>
        ) : tab === "leaderboard" ? (
          /* Leaderboard */
          <div className="space-y-2">
            {leaderboard.length === 0 && (
              <p className="text-center text-slate-500 py-8">No posts yet. Be the first!</p>
            )}
            {leaderboard.map(([name, likes], idx) => (
              <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${idx === 0 ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                    : idx === 1 ? "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900"
                    : idx === 2 ? "bg-gradient-to-r from-orange-700 to-orange-800 text-white"
                    : "bg-slate-800 text-slate-400"
                  }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">
                    {idx === 0 && "👑 "}@{name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold">{likes}</p>
                  <p className="text-[10px] text-slate-500">likes</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Posts Feed */
          <div className="space-y-3">
            {sortedPosts.length === 0 && (
              <p className="text-center text-slate-500 py-8">No posts yet. Be the first to share your voice!</p>
            )}
            {sortedPosts.map((post) => {
              const isLiked = likedIds.includes(post.id);
              return (
                <div key={post.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-400 font-bold text-sm">@{post.username}</span>
                    <span className="text-slate-600 text-xs">{getTimeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed mb-3">{post.text}</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post)}
                      disabled={isLiked}
                      className={`flex items-center gap-1.5 text-sm transition-all
                        ${isLiked
                          ? "text-red-400"
                          : "text-slate-500 hover:text-red-400 active:scale-110"
                        }`}
                    >
                      <span className="text-base">{isLiked ? "❤️" : "🤍"}</span>
                      <span className="font-semibold">{post.likes}</span>
                    </button>
                    <button
                      onClick={() => {
                        const text = encodeURIComponent(
                          `"${post.text}" — @${post.username} on VoxMap\n\nJoin the conversation:\nhttps://vox-map-app.vercel.app`
                        );
                        window.open(`https://wa.me/?text=${text}`, "_blank");
                      }}
                      className="text-slate-500 hover:text-green-400 text-sm transition-all"
                    >
                      📤 Share
                    </button>
                    {/* Report button */}
                    {reportedIds.includes(post.id) ? (
                      <span className="text-xs text-slate-600">Reported</span>
                    ) : (
                      <button
                        onClick={() => setReportingId(post.id)}
                        className="text-slate-600 hover:text-red-400 text-sm transition-all ml-auto"
                      >
                        🚩
                      </button>
                    )}
                  </div>

                  {/* Report modal for this post */}
                  {reportingId === post.id && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-800 border border-red-500/30">
                      <p className="text-xs text-slate-400 mb-2 font-semibold">Why are you reporting this?</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.entries(REPORT_LABELS) as [ReportReason, string][]).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => handleReport(post.id, key)}
                            className="text-xs text-left px-2.5 py-2 rounded-lg bg-slate-700/50
                              hover:bg-red-500/20 hover:text-red-300 text-slate-400 transition-all"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setReportingId(null)}
                        className="text-xs text-slate-600 hover:text-slate-400 mt-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Button */}
      {!showCompose && tab !== "leaderboard" && (
        <button
          onClick={() => setShowCompose(true)}
          className="fixed bottom-6 right-6 z-[3100] w-14 h-14 rounded-full
            bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
            flex items-center justify-center text-2xl text-white
            shadow-lg shadow-red-500/30 hover:scale-110 active:scale-95 transition-all"
        >
          ✍️
        </button>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed bottom-0 left-0 right-0 z-[3200] bg-slate-900 border-t border-slate-700 p-4 rounded-t-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-white">Share your voice</h3>
            <button onClick={() => setShowCompose(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind? Ask a question, share an opinion, start a debate..."
            maxLength={280}
            autoFocus
            className="w-full h-28 bg-slate-800 rounded-xl p-4 text-white text-sm
              border border-slate-700/50 focus:border-orange-500
              focus:outline-none resize-none placeholder-slate-600"
          />
          {postError && (
            <p className="text-red-400 text-xs mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {postError}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-600">{newPost.length}/280 · Earn 5 ⭐ for posting</p>
            <button
              onClick={handlePost}
              disabled={!newPost.trim() || isPosting}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all
                ${newPost.trim()
                  ? "bg-gradient-to-r from-orange-500 to-red-500 active:scale-95"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
            >
              {isPosting ? "..." : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
