import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7");
    const validDays = Math.min(Math.max(days, 1), 30);
    const debug = searchParams.get("debug") === "true";

    // Debug mode: show raw vote data with region info
    if (debug) {
      const { data: allVotes, error: dbErr } = await supabase
        .from("votes")
        .select("id, region, country_code, device_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      return NextResponse.json({
        debug: true,
        total_votes: allVotes?.length || 0,
        votes_with_region: allVotes?.filter((v: { region: string | null }) => v.region)?.length || 0,
        recent_votes: allVotes,
        db_error: dbErr,
      }, { headers: corsHeaders });
    }

    // Try RPC function first, then fallback to direct query
    let cities = null;

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_city_leaderboard", {
      days_back: validDays,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      cities = rpcData;
    } else {
      // Fallback: direct query aggregation from votes table
      const since = new Date(Date.now() - validDays * 86400000).toISOString();

      const { data: votes, error: votesError } = await supabase
        .from("votes")
        .select("region, country_code, device_id")
        .gte("created_at", since)
        .not("region", "is", null);

      console.log("City fallback query:", { votesCount: votes?.length, votesError });

      if (votes && votes.length > 0) {
        const cityMap: Record<string, {
          country_code: string;
          votes: number;
          voters: Set<string>;
        }> = {};

        votes.forEach((v: { region: string; country_code: string; device_id: string }) => {
          if (!v.region) return;
          if (!cityMap[v.region]) {
            cityMap[v.region] = { country_code: v.country_code || "", votes: 0, voters: new Set() };
          }
          cityMap[v.region].votes++;
          cityMap[v.region].voters.add(v.device_id);
        });

        cities = Object.entries(cityMap)
          .map(([city, stats]) => ({
            city,
            country_code: stats.country_code,
            vote_count: stats.votes,
            pin_count: 0,
            post_count: 0,
            unique_voters: stats.voters.size,
            engagement_score: stats.votes * 0.4 + stats.voters.size * 5 * 0.15,
          }))
          .sort((a, b) => b.engagement_score - a.engagement_score)
          .slice(0, 50);
      }
    }

    // Get the Active City (top of leaderboard)
    const activeCity = cities && cities.length > 0 ? cities[0] : null;

    return NextResponse.json({
      leaderboard: cities || [],
      active_city: activeCity,
      period_days: validDays,
      generated_at: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (err) {
    console.error("City leaderboard error:", err);
    return NextResponse.json(
      { error: "Failed to load city leaderboard" },
      { status: 500, headers: corsHeaders }
    );
  }
}
