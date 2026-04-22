"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "voxmap2026";

interface Question {
  id: string;
  day_of_year: number;
  text_en: string;
  text_ar: string | null;
  category: string;
  created_at: string;
}

interface Pin {
  id: string;
  device_id: string;
  category: string;
  urgency: string;
  note: string;
  lat: number;
  lng: number;
  is_active: boolean;
  helpful_count: number;
  created_at: string;
}

interface VoteStat {
  question_id: string;
  text_en: string;
  total_votes: number;
  agree: number;
  disagree: number;
}

type Tab = "dashboard" | "questions" | "community" | "pins" | "votes";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");

  // Dashboard stats
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalPins, setTotalPins] = useState(0);
  const [totalCommunity, setTotalCommunity] = useState(0);
  const [todayVotes, setTodayVotes] = useState(0);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [newQuestion, setNewQuestion] = useState({ day_of_year: 1, text_en: "", text_ar: "", category: "general" });
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Community posts
  const [communityPosts, setCommunityPosts] = useState<Pin[]>([]);

  // Emergency pins
  const [pins, setPins] = useState<Pin[]>([]);

  // Vote stats
  const [voteStats, setVoteStats] = useState<VoteStat[]>([]);

  const [loading, setLoading] = useState(false);

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Wrong password");
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchDashboard();
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    if (tab === "questions") fetchQuestions();
    if (tab === "community") fetchCommunity();
    if (tab === "pins") fetchPins();
    if (tab === "votes") fetchVoteStats();
  }, [tab, authenticated]);

  async function fetchDashboard() {
    const { count: voteCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true });
    setTotalVotes(voteCount || 0);

    const { count: pinCount } = await supabase
      .from("pins")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("category", "community");
    setTotalPins(pinCount || 0);

    const { count: commCount } = await supabase
      .from("pins")
      .select("*", { count: "exact", head: true })
      .eq("category", "community")
      .eq("is_active", true);
    setTotalCommunity(commCount || 0);

    // Today's votes
    const today = new Date().toISOString().slice(0, 10);
    const { count: todayCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);
    setTodayVotes(todayCount || 0);
  }

  async function fetchQuestions() {
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .order("day_of_year", { ascending: true });
    if (data) setQuestions(data);
    setLoading(false);
  }

  async function fetchCommunity() {
    setLoading(true);
    const { data } = await supabase
      .from("pins")
      .select("*")
      .eq("category", "community")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setCommunityPosts(data);
    setLoading(false);
  }

  async function fetchPins() {
    setLoading(true);
    const { data } = await supabase
      .from("pins")
      .select("*")
      .neq("category", "community")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setPins(data);
    setLoading(false);
  }

  async function fetchVoteStats() {
    setLoading(true);
    const { data: allQuestions } = await supabase
      .from("questions")
      .select("id, text_en, day_of_year")
      .order("day_of_year", { ascending: true });

    if (!allQuestions) { setLoading(false); return; }

    const stats: VoteStat[] = [];
    for (const q of allQuestions) {
      const { data: votes } = await supabase
        .from("votes")
        .select("option_index")
        .eq("question_id", q.id);

      if (votes) {
        const agree = votes.filter((v) => v.option_index === 0).length;
        const disagree = votes.filter((v) => v.option_index === 1).length;
        stats.push({
          question_id: q.id,
          text_en: q.text_en,
          total_votes: votes.length,
          agree,
          disagree,
        });
      }
    }
    setVoteStats(stats);
    setLoading(false);
  }

  // ── Question CRUD ──
  async function saveQuestion() {
    if (editQuestion) {
      await supabase
        .from("questions")
        .update({
          text_en: editQuestion.text_en,
          text_ar: editQuestion.text_ar,
          category: editQuestion.category,
        })
        .eq("id", editQuestion.id);
      setEditQuestion(null);
      fetchQuestions();
    }
  }

  async function addQuestion() {
    if (!newQuestion.text_en.trim()) return;
    const { error } = await supabase.from("questions").insert({
      day_of_year: newQuestion.day_of_year,
      text_en: newQuestion.text_en,
      text_ar: newQuestion.text_ar || null,
      category: newQuestion.category,
    });
    if (!error) {
      setNewQuestion({ day_of_year: 1, text_en: "", text_ar: "", category: "general" });
      setShowAddQuestion(false);
      fetchQuestions();
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    fetchQuestions();
  }

  // ── Moderate community / pins ──
  async function deactivatePost(id: string) {
    await supabase.from("pins").update({ is_active: false }).eq("id", id);
    if (tab === "community") fetchCommunity();
    else fetchPins();
  }

  async function deletePost(id: string) {
    if (!confirm("Permanently delete this post?")) return;
    await supabase.from("pins").delete().eq("id", id);
    if (tab === "community") fetchCommunity();
    else fetchPins();
  }

  function parseCommunityNote(note: string): { username: string; text: string } {
    const parts = (note || "").split("||");
    return { username: parts[0] || "Anonymous", text: parts[1] || note || "" };
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  // ── Login Screen ──
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4">
        <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700/50 p-8">
          <h1 className="text-2xl font-bold text-center mb-2" style={{
            background: "linear-gradient(to right, #f97316, #ef4444, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>VoxMap Admin</h1>
          <p className="text-slate-500 text-center text-sm mb-6">Enter admin password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="w-full px-4 py-3 bg-slate-800 rounded-xl text-white border border-slate-700
              focus:border-orange-500 focus:outline-none mb-4"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-[1.02] active:scale-95 transition-all"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ──
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "questions", label: "Questions", icon: "❓" },
    { key: "community", label: "Community", icon: "💬" },
    { key: "pins", label: "Pins", icon: "📍" },
    { key: "votes", label: "Votes", icon: "🗳️" },
  ];

  const categories = [
    "general", "governance", "economy", "safety", "health", "democracy",
    "rights", "basic_needs", "media", "education", "environment",
    "infrastructure", "digital_rights", "peace", "society", "technology",
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{
          background: "linear-gradient(to right, #f97316, #ef4444, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>VoxMap Admin</h1>
        <button
          onClick={() => setAuthenticated(false)}
          className="text-slate-500 hover:text-white text-sm"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-slate-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${tab === t.key
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* ── Dashboard Tab ── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-300">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Votes", value: totalVotes, icon: "🗳️", color: "from-green-500 to-emerald-600" },
                { label: "Today's Votes", value: todayVotes, icon: "📈", color: "from-blue-500 to-cyan-600" },
                { label: "Active Pins", value: totalPins, icon: "📍", color: "from-orange-500 to-red-500" },
                { label: "Community Posts", value: totalCommunity, icon: "💬", color: "from-purple-500 to-pink-500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <p className="text-3xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setTab("questions")} className="px-4 py-2 bg-slate-800 rounded-xl text-sm hover:bg-slate-700 transition-all">
                  ➕ Add Question
                </button>
                <button onClick={() => setTab("community")} className="px-4 py-2 bg-slate-800 rounded-xl text-sm hover:bg-slate-700 transition-all">
                  🛡️ Moderate Posts
                </button>
                <button onClick={() => setTab("votes")} className="px-4 py-2 bg-slate-800 rounded-xl text-sm hover:bg-slate-700 transition-all">
                  📊 View Vote Stats
                </button>
                <button onClick={() => { fetchDashboard(); }} className="px-4 py-2 bg-slate-800 rounded-xl text-sm hover:bg-slate-700 transition-all">
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Questions Tab ── */}
        {tab === "questions" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-300">Daily Questions ({questions.length})</h2>
              <button
                onClick={() => setShowAddQuestion(!showAddQuestion)}
                className="px-4 py-2 rounded-xl text-sm font-semibold
                  bg-gradient-to-r from-orange-500 to-red-500 text-white
                  hover:scale-[1.02] active:scale-95 transition-all"
              >
                {showAddQuestion ? "Cancel" : "➕ Add Question"}
              </button>
            </div>

            {/* Add question form */}
            {showAddQuestion && (
              <div className="bg-slate-900 rounded-2xl border border-orange-500/30 p-5 space-y-3">
                <h3 className="text-sm font-bold text-orange-400">New Question</h3>
                <div className="flex gap-3">
                  <div className="w-24">
                    <label className="text-xs text-slate-500">Day #</label>
                    <input
                      type="number"
                      min={1} max={366}
                      value={newQuestion.day_of_year}
                      onChange={(e) => setNewQuestion({ ...newQuestion, day_of_year: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-orange-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Category</label>
                    <select
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-orange-500 focus:outline-none text-sm"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">English</label>
                  <input
                    value={newQuestion.text_en}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text_en: e.target.value })}
                    placeholder="Question in English..."
                    className="w-full px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Arabic (optional)</label>
                  <input
                    value={newQuestion.text_ar}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text_ar: e.target.value })}
                    placeholder="السؤال بالعربية..."
                    dir="rtl"
                    className="w-full px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-orange-500 focus:outline-none text-sm"
                  />
                </div>
                <button
                  onClick={addQuestion}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-white
                    bg-gradient-to-r from-green-500 to-emerald-600
                    hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Question
                </button>
              </div>
            )}

            {/* Questions list */}
            {loading ? (
              <p className="text-slate-500 text-center py-8 animate-pulse">Loading...</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    {editQuestion?.id === q.id ? (
                      <div className="space-y-2">
                        <input
                          value={editQuestion.text_en}
                          onChange={(e) => setEditQuestion({ ...editQuestion, text_en: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-orange-500 focus:outline-none text-sm"
                        />
                        <input
                          value={editQuestion.text_ar || ""}
                          onChange={(e) => setEditQuestion({ ...editQuestion, text_ar: e.target.value })}
                          dir="rtl"
                          placeholder="Arabic translation..."
                          className="w-full px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 focus:border-orange-500 focus:outline-none text-sm"
                        />
                        <select
                          value={editQuestion.category}
                          onChange={(e) => setEditQuestion({ ...editQuestion, category: e.target.value })}
                          className="px-3 py-2 bg-slate-800 rounded-lg text-white border border-slate-700 text-sm"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={saveQuestion} className="px-4 py-1.5 bg-green-600 rounded-lg text-sm font-semibold">Save</button>
                          <button onClick={() => setEditQuestion(null)} className="px-4 py-1.5 bg-slate-700 rounded-lg text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                              Day {q.day_of_year}
                            </span>
                            <span className="text-xs text-slate-600">{q.category}</span>
                          </div>
                          <p className="text-white text-sm">{q.text_en}</p>
                          {q.text_ar && (
                            <p className="text-slate-400 text-sm mt-1" dir="rtl">{q.text_ar}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditQuestion(q)}
                            className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 hover:text-white transition-all"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 hover:text-red-400 transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Community Tab ── */}
        {tab === "community" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-300">Community Posts ({communityPosts.length})</h2>
            {loading ? (
              <p className="text-slate-500 text-center py-8 animate-pulse">Loading...</p>
            ) : communityPosts.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No community posts yet</p>
            ) : (
              <div className="space-y-2">
                {communityPosts.map((post) => {
                  const { username, text } = parseCommunityNote(post.note);
                  return (
                    <div key={post.id} className={`bg-slate-900 rounded-xl border p-4 ${post.is_active ? "border-slate-800" : "border-red-900/50 opacity-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-orange-400 font-bold text-sm">@{username}</span>
                            <span className="text-slate-600 text-xs">{timeAgo(post.created_at)}</span>
                            {!post.is_active && <span className="text-red-400 text-xs">(hidden)</span>}
                          </div>
                          <p className="text-white text-sm">{text}</p>
                          <p className="text-slate-600 text-xs mt-1">❤️ {post.helpful_count || 0} likes</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {post.is_active ? (
                            <button
                              onClick={() => deactivatePost(post.id)}
                              className="px-3 py-1.5 bg-yellow-600/20 rounded-lg text-xs text-yellow-400 hover:bg-yellow-600/40 transition-all"
                              title="Hide post"
                            >
                              🚫 Hide
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                await supabase.from("pins").update({ is_active: true }).eq("id", post.id);
                                fetchCommunity();
                              }}
                              className="px-3 py-1.5 bg-green-600/20 rounded-lg text-xs text-green-400 hover:bg-green-600/40 transition-all"
                            >
                              ✅ Restore
                            </button>
                          )}
                          <button
                            onClick={() => deletePost(post.id)}
                            className="px-3 py-1.5 bg-red-600/20 rounded-lg text-xs text-red-400 hover:bg-red-600/40 transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Pins Tab ── */}
        {tab === "pins" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-300">Emergency Pins ({pins.length})</h2>
            {loading ? (
              <p className="text-slate-500 text-center py-8 animate-pulse">Loading...</p>
            ) : pins.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No pins</p>
            ) : (
              <div className="space-y-2">
                {pins.map((pin) => {
                  const parts = (pin.note || "").split("||");
                  const username = parts[0] || "Anonymous";
                  const comment = parts[1] || "";
                  return (
                    <div key={pin.id} className={`bg-slate-900 rounded-xl border p-4 ${pin.is_active ? "border-slate-800" : "border-red-900/50 opacity-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">{pin.category}</span>
                            <span className="text-xs text-yellow-400">{pin.urgency}</span>
                            <span className="text-slate-600 text-xs">{timeAgo(pin.created_at)}</span>
                          </div>
                          <p className="text-white text-sm">@{username}{comment ? `: ${comment}` : ""}</p>
                          <p className="text-slate-600 text-xs mt-1">📍 {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => deactivatePost(pin.id)}
                            className="px-3 py-1.5 bg-yellow-600/20 rounded-lg text-xs text-yellow-400 hover:bg-yellow-600/40 transition-all"
                          >
                            🚫
                          </button>
                          <button
                            onClick={() => deletePost(pin.id)}
                            className="px-3 py-1.5 bg-red-600/20 rounded-lg text-xs text-red-400 hover:bg-red-600/40 transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Votes Tab ── */}
        {tab === "votes" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-300">Vote Statistics</h2>
            {loading ? (
              <p className="text-slate-500 text-center py-8 animate-pulse">Loading...</p>
            ) : voteStats.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No vote data</p>
            ) : (
              <div className="space-y-3">
                {voteStats.filter((s) => s.total_votes > 0).map((stat) => {
                  const agreePct = stat.total_votes > 0 ? Math.round((stat.agree / stat.total_votes) * 100) : 0;
                  const disagreePct = 100 - agreePct;
                  return (
                    <div key={stat.question_id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                      <p className="text-white text-sm mb-3">{stat.text_en}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="h-full bg-green-500 transition-all" style={{ width: `${agreePct}%` }} />
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${disagreePct}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">
                          <span className="text-green-400">{agreePct}%</span> / <span className="text-red-400">{disagreePct}%</span>
                          <span className="text-slate-600 ml-2">({stat.total_votes})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
