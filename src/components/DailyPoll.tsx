"use client";

import { useState, useEffect } from "react";
import { Lang, t } from "@/i18n/translations";
import { supabase, getDeviceId } from "@/lib/supabase";
import { canVote, recordVote } from "@/lib/rateLimit";
import { fuzzGPS } from "@/lib/security";
import { getTodaysQuestion, getCategoryIcon, getCategoryColor } from "@/lib/questionScheduler";

interface DailyPollProps {
  lang: Lang;
  onComplete: () => void;
}

interface Question {
  id: string;
  text_en: string;
  text_ar: string | null;
  text_ru: string | null;
  text_zh: string | null;
  text_he: string | null;
  text_fa: string | null;
}

function getQuestionText(q: Question, lang: Lang): string {
  const key = `text_${lang}` as keyof Question;
  return (q[key] as string) || q.text_en;
}

// ── Streak logic (stored in cookie-like approach via date keys) ──
function getStreakData(): { count: number; lastDate: string } {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage?.getItem("voxmap_streak") : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lastDate: "" };
}

function updateStreak(): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const data = getStreakData();

  if (data.lastDate === today) return data.count; // Already voted today

  let newCount = 1;
  if (data.lastDate === yesterday) {
    newCount = data.count + 1; // Consecutive day
  }

  const updated = { count: newCount, lastDate: today };
  try {
    window.localStorage?.setItem("voxmap_streak", JSON.stringify(updated));
  } catch {}
  return newCount;
}

function getCurrentStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const data = getStreakData();
  if (data.lastDate === today || data.lastDate === yesterday) return data.count;
  return 0;
}

// ── City detection via reverse geocoding ──
async function detectLocation(lat: number, lng: number): Promise<{
  city: string | null;
  countryCode: string | null;
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const city = data?.address?.city || data?.address?.town || data?.address?.state || null;
    const countryCode = data?.address?.country_code?.toUpperCase() || null;
    return { city, countryCode };
  } catch {
    return { city: null, countryCode: null };
  }
}

export default function DailyPoll({ lang, onComplete }: DailyPollProps) {
  const tr = t[lang];
  const [voted, setVoted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCounts, setVoteCounts] = useState<number[]>([0, 0]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [cityRanking, setCityRanking] = useState<{ city: string; topOption: number; topPct: number; globalPct: number } | null>(null);

  useEffect(() => {
    setStreak(getCurrentStreak());
  }, []);

  useEffect(() => {
    async function fetchQuestion() {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      const { data: q, error } = await supabase
        .from("questions")
        .select("*")
        .eq("day_of_year", ((dayOfYear - 1) % 30) + 1)
        .single();

      if (error || !q) {
        // Use the smart question scheduler as fallback
        const scheduled = getTodaysQuestion();
        setQuestion({
          id: "fallback",
          text_en: scheduled.text_en,
          text_ar: scheduled.text_ar,
          text_ru: null,
          text_zh: null,
          text_he: null,
          text_fa: null,
        });
        setLoading(false);
        return;
      }

      setQuestion(q);

      try {
        const deviceId = await getDeviceId();
        const { data: existingVote } = await supabase
          .from("votes")
          .select("option_index")
          .eq("question_id", q.id)
          .eq("device_id", deviceId)
          .single();

        if (existingVote) {
          setAlreadyVoted(true);
          setSelectedOption(existingVote.option_index);
          await fetchVoteCounts(q.id);
        }
      } catch (e) {
        // continue
      }

      setLoading(false);
    }

    fetchQuestion();
  }, []);

  async function fetchVoteCounts(questionId: string) {
    const { data: votes } = await supabase
      .from("votes")
      .select("option_index, country_code")
      .eq("question_id", questionId);

    if (votes) {
      const counts = [0, 0];
      votes.forEach((v) => {
        if (v.option_index >= 0 && v.option_index <= 1) counts[v.option_index]++;
      });
      setVoteCounts(counts);
      setTotalVotes(votes.length);

      // Compute local ranking if we know the user's city
      const city = userCity;
      if (city) {
        const cityVotes = votes.filter((v) => v.country_code === city);
        if (cityVotes.length >= 2) {
          const cityCounts = [0, 0];
          cityVotes.forEach((v) => {
            if (v.option_index >= 0 && v.option_index <= 1) cityCounts[v.option_index]++;
          });
          const topIdx = cityCounts.indexOf(Math.max(...cityCounts));
          const topPct = Math.round((cityCounts[topIdx] / cityVotes.length) * 100);
          const globalPct = votes.length > 0 ? Math.round((counts[topIdx] / votes.length) * 100) : 0;
          setCityRanking({ city, topOption: topIdx, topPct, globalPct });
        }
      }
    }
  }

  const handleVote = async (index: number) => {
    if (voted || alreadyVoted) return;
    if (!canVote()) return; // Anti-spam cooldown
    setSelectedOption(index);

    try {
      const deviceId = await getDeviceId();

      let location = null;
      let cityName: string | null = null;
      let countryCode: string | null = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          const fuzzed = fuzzGPS(pos.coords.latitude, pos.coords.longitude);
          location = `POINT(${fuzzed.lng} ${fuzzed.lat})`;
          const locData = await detectLocation(pos.coords.latitude, pos.coords.longitude);
          cityName = locData.city;
          countryCode = locData.countryCode;
          if (cityName) setUserCity(cityName);
        } catch {}
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      if (question && question.id !== "fallback") {
        const { error } = await supabase.from("votes").insert({
          question_id: question.id,
          device_id: deviceId,
          option_index: index,
          location: location,
          country_code: countryCode || null,
          region: cityName || null,
        });

        if (error) {
          console.error("Vote error:", error);
        } else {
          await fetchVoteCounts(question.id);
        }
      }
    } catch (e) {
      console.error("Vote submission error:", e);
    }

    // Record vote for rate limiting
    recordVote();

    // Update streak
    const newStreak = updateStreak();
    setStreak(newStreak);

    setTimeout(() => setVoted(true), 300);
  };

  // Share vote to social media / WhatsApp
  const handleShare = async () => {
    const optionLabels = ["Agree", "Disagree"];
    const myVote = selectedOption !== null ? optionLabels[selectedOption] : "";
    const questionText = question ? getQuestionText(question, "en") : "";

    const shareText = `I voted "${myVote}" on VoxMap!\n\n"${questionText}"\n\nWhat do YOU think? Have your voice heard:\nhttps://vox-map-app.vercel.app`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "VoxMap - My Vote", text: shareText });
        return;
      } catch {}
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch {}
  };

  // Build share text
  const getShareText = () => {
    const optionLabels = ["Agree", "Disagree"];
    const myVote = selectedOption !== null ? optionLabels[selectedOption] : "";
    const questionText = question ? getQuestionText(question, "en") : "";
    return { myVote, questionText };
  };

  const shareUrl = "https://vox-map-app.vercel.app";

  const handleSocialShare = (platform: string) => {
    const { myVote, questionText } = getShareText();
    const text = `I voted "${myVote}" on VoxMap!\n\n"${questionText}"\n\nWhat do YOU think?`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + "\n" + shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      instagram: "", // Instagram doesn't support URL sharing — copy to clipboard
      tiktok: "", // TikTok doesn't support URL sharing — copy to clipboard
      snapchat: `https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`,
    };

    if (platform === "instagram" || platform === "tiktok") {
      navigator.clipboard.writeText(text + "\n" + shareUrl).then(() => {
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      });
      return;
    }

    window.open(urls[platform], "_blank");
  };

  const options = [
    tr.agree,
    tr.disagree,
  ];

  const optionColors = [
    "from-green-500 to-emerald-600",
    "from-red-500 to-rose-600",
  ];

  const barColors = ["bg-green-500", "bg-red-500"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vox-dark">
        <div className="text-xl gradient-text font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  // ── Results screen (after voting) ──
  if (voted || alreadyVoted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-vox-dark px-4">
        <div className="text-center space-y-6 w-full max-w-lg">
          <div className="text-6xl">{alreadyVoted && !voted ? "\ud83d\udcca" : "\u2713"}</div>
          <h2 className="text-3xl font-bold gradient-text">
            {alreadyVoted && !voted ? tr.analytics : tr.thank_you}
          </h2>

          {/* Streak display */}
          {streak > 0 && (
            <div className="inline-flex items-center gap-2 bg-slate-800/80 rounded-2xl px-5 py-2.5 border border-orange-500/30">
              <span className="text-2xl">{streak >= 7 ? "\ud83d\udd25" : streak >= 3 ? "\u2b50" : "\u26a1"}</span>
              <span className="text-orange-400 font-bold text-lg">{streak} day streak!</span>
            </div>
          )}

          {/* Local ranking card */}
          {cityRanking && (
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">📍 Local vs Global</p>
              <p className="text-white text-sm leading-relaxed">
                <span className="text-orange-400 font-bold">{cityRanking.city}</span> voted{" "}
                <span className="text-white font-bold">{cityRanking.topPct}%</span>{" "}
                {["Agree", "Disagree"][cityRanking.topOption]}
                {" vs "}
                <span className="text-slate-300">{cityRanking.globalPct}%</span> globally
              </p>
            </div>
          )}

          {!alreadyVoted && (
            <p className="text-2xl text-yellow-400 font-bold">{tr.points}</p>
          )}

          {/* Vote results */}
          {totalVotes > 0 && (
            <div className="mt-6 space-y-3 text-left">
              {options.map((option, idx) => {
                const pct = totalVotes > 0 ? Math.round((voteCounts[idx] / totalVotes) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={selectedOption === idx ? "text-white font-bold" : "text-slate-400"}>
                        {option} {selectedOption === idx && "\u2190 You"}
                      </span>
                      <span className="text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColors[idx]} rounded-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-sm text-slate-500 mt-2">
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </p>
            </div>
          )}

          {/* Share buttons */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-4 mb-2">Share your vote</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {/* WhatsApp */}
            <button
              onClick={() => handleSocialShare("whatsapp")}
              className="w-11 h-11 rounded-full flex items-center justify-center
                bg-[#25D366] hover:brightness-110 active:scale-90 transition-all"
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
            {/* Twitter / X */}
            <button
              onClick={() => handleSocialShare("twitter")}
              className="w-11 h-11 rounded-full flex items-center justify-center
                bg-black border border-slate-700 hover:brightness-110 active:scale-90 transition-all"
              title="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            {/* Facebook */}
            <button
              onClick={() => handleSocialShare("facebook")}
              className="w-11 h-11 rounded-full flex items-center justify-center
                bg-[#1877F2] hover:brightness-110 active:scale-90 transition-all"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            {/* Instagram */}
            <button
              onClick={() => handleSocialShare("instagram")}
              className="w-11 h-11 rounded-full flex items-center justify-center
                bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]
                hover:brightness-110 active:scale-90 transition-all"
              title="Instagram (copies to clipboard)"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </button>
            {/* TikTok */}
            <button
              onClick={() => handleSocialShare("tiktok")}
              className="w-11 h-11 rounded-full flex items-center justify-center
                bg-black border border-slate-700 hover:brightness-110 active:scale-90 transition-all"
              title="TikTok (copies to clipboard)"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </button>
            {/* Snapchat */}
            <button
              onClick={() => handleSocialShare("snapchat")}
              className="w-11 h-11 rounded-full flex items-center justify-center
                bg-[#FFFC00] hover:brightness-110 active:scale-90 transition-all"
              title="Snapchat"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="black">
                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.959-.289.089-.05.19-.078.292-.078a.68.68 0 01.311.073c.35.178.394.462.401.548.014.153-.042.325-.174.474-.18.2-.533.39-1.107.597-.042.015-.09.032-.156.056-.12.045-.27.098-.398.158-.255.118-.39.267-.424.44-.018.095-.003.2.04.31l.004.01c.016.034.037.08.04.1.17.394.395.767.664 1.104.504.63 1.174 1.135 1.993 1.504.265.12.559.21.904.317l.076.025c.053.016.113.047.157.088.229.223.038.527-.064.64-.169.186-.48.371-.883.5-.33.104-.69.174-1.005.221-.14.02-.234.057-.284.114-.064.072-.082.173-.096.26a.94.94 0 01-.044.148c-.053.132-.14.236-.374.309-.3.093-.69.095-1.099.095-.3 0-.614-.006-.88.07-.156.044-.327.123-.558.261-.623.371-1.213.89-2.016 1.181-.372.13-.766.18-1.147.18-.38 0-.77-.052-1.147-.18-.804-.29-1.392-.81-2.016-1.181-.23-.138-.402-.217-.558-.261-.266-.076-.58-.07-.88-.07-.41 0-.8-.002-1.099-.095-.234-.073-.321-.177-.374-.31a.939.939 0 01-.044-.147c-.014-.087-.032-.188-.096-.26-.05-.057-.144-.093-.284-.114a5.35 5.35 0 01-1.005-.22c-.403-.13-.714-.315-.883-.501-.102-.113-.293-.418-.064-.64.044-.042.104-.072.157-.088l.076-.025c.345-.107.639-.197.904-.317.82-.369 1.49-.875 1.993-1.504.269-.337.494-.71.664-1.104.003-.02.024-.066.04-.1l.004-.01a.476.476 0 00.04-.31c-.033-.173-.168-.322-.424-.44a3.992 3.992 0 00-.398-.158c-.066-.024-.114-.041-.156-.056-.574-.207-.927-.397-1.107-.597a.649.649 0 01-.174-.474c.007-.086.051-.37.401-.548a.68.68 0 01.311-.073c.103 0 .203.028.292.078.3.169.659.273.96.289.197 0 .325-.045.4-.09a21.791 21.791 0 01-.032-.57c-.104-1.628-.23-3.654.3-4.847C7.86 1.069 11.216.793 12.206.793z"/>
              </svg>
            </button>
          </div>

          {/* Copied toast */}
          {showShareToast && (
            <p className="text-green-400 text-sm animate-pulse mt-2">Copied to clipboard! Paste it on Instagram or TikTok</p>
          )}

          <button
            onClick={onComplete}
            className="mt-4 px-8 py-4 rounded-2xl text-lg font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-105 active:scale-95 transition-all duration-300"
          >
            {tr.view_map}
          </button>
        </div>
      </div>
    );
  }

  // ── Voting screen ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-vox-dark">
      <div className="w-full max-w-lg">
        {/* Streak badge at top */}
        {streak > 0 && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-slate-800/60 rounded-full px-4 py-1.5 border border-slate-700/50">
              <span>{streak >= 7 ? "\ud83d\udd25" : streak >= 3 ? "\u2b50" : "\u26a1"}</span>
              <span className="text-orange-400 font-bold text-sm">{streak} day streak</span>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2 text-center">
          {tr.todays_question}
        </p>

        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 leading-relaxed">
          {question ? getQuestionText(question, lang) : ""}
        </h2>

        <div className="space-y-4">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              className={`w-full py-4 px-6 rounded-xl text-lg font-semibold text-white
                bg-gradient-to-r ${optionColors[idx]}
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                border border-white/10 hover:border-white/20
                ${selectedOption === idx ? "ring-2 ring-white scale-[1.02]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
