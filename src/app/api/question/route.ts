import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// CORS headers for widget embeds
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300", // Cache for 5 minutes
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    // Calculate today's question
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const questionDay = ((dayOfYear - 1) % 30) + 1;

    const { data, error } = await supabase
      .from("questions")
      .select("id, text_en, text_ar, category, day_of_year")
      .eq("day_of_year", questionDay)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "No question available today" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get vote counts for this question
    const { data: votes } = await supabase
      .from("votes")
      .select("option_index")
      .eq("question_id", data.id);

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
      id: data.id,
      question: data.text_en,
      question_ar: data.text_ar,
      category: data.category,
      day: data.day_of_year,
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
