import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeVotes } from "@/lib/insightEngine";
import type { VoteData } from "@/lib/insightEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=600", // Cache for 10 minutes
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    // Get today's question
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const questionDay = ((dayOfYear - 1) % 30) + 1;

    const { data: question } = await supabase
      .from("questions")
      .select("id, text_en")
      .eq("day_of_year", questionDay)
      .single();

    if (!question) {
      return NextResponse.json(
        { error: "No question found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch all votes for this question with country data
    const { data: votes } = await supabase
      .from("votes")
      .select("option_index, country_code, region")
      .eq("question_id", question.id);

    if (!votes || votes.length === 0) {
      return NextResponse.json({
        question: question.text_en,
        insights: [{
          type: "global_summary",
          emoji: "🌐",
          headline: "Waiting for voices",
          body: `"${question.text_en}" — Be among the first to vote and shape today's insight.`,
          strength: 0.5,
        }],
        vote_count: 0,
      }, { headers: corsHeaders });
    }

    // Run the pattern analysis engine
    const voteData: VoteData[] = votes.map((v) => ({
      country_code: v.country_code || "",
      region: v.region || null,
      option_index: v.option_index,
    }));

    const insights = analyzeVotes(voteData, question.text_en);

    return NextResponse.json({
      question: question.text_en,
      question_id: question.id,
      insights,
      vote_count: votes.length,
      generated_at: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (err) {
    console.error("Insight generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500, headers: corsHeaders }
    );
  }
}
