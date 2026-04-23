import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Simple in-memory rate limiter (per IP, 10 votes per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { question_id, device_id, option_index } = body;

    // Validate input
    if (!question_id || !device_id || option_index === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: question_id, device_id, option_index" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (option_index !== 0 && option_index !== 1) {
      return NextResponse.json(
        { error: "option_index must be 0 (agree) or 1 (disagree)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize device_id
    const cleanDeviceId = String(device_id).slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");

    // Sign in anonymously for RLS
    await supabase.auth.signInAnonymously();

    // Insert vote
    const { error } = await supabase.from("votes").insert({
      question_id,
      device_id: `widget_${cleanDeviceId}`,
      option_index,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already voted on this question", code: "DUPLICATE" },
          { status: 409, headers: corsHeaders }
        );
      }
      console.error("Vote insert error:", error);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Return updated results
    const { data: votes } = await supabase
      .from("votes")
      .select("option_index")
      .eq("question_id", question_id);

    let agreeCount = 0;
    let disagreeCount = 0;
    if (votes) {
      votes.forEach((v: { option_index: number }) => {
        if (v.option_index === 0) agreeCount++;
        else disagreeCount++;
      });
    }

    const total = agreeCount + disagreeCount;

    return NextResponse.json({
      success: true,
      results: {
        agree: agreeCount,
        disagree: disagreeCount,
        total,
        agree_pct: total > 0 ? Math.round((agreeCount / total) * 100) : 50,
        disagree_pct: total > 0 ? Math.round((disagreeCount / total) * 100) : 50,
      },
    }, { headers: corsHeaders });

  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
