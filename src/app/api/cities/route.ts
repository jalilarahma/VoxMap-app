import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

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
    const supabase = getServerSupabase();
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7");
    const validDays = Math.min(Math.max(days, 1), 30);
    const debug = searchParams.get("debug") === "true";

    // Debug mode
    if (debug) {
      const { data: allVotes, error: dbErr } = await supabase
        .from("votes")
        .select("id, region, country_code, device_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (dbErr) {
        return NextResponse.json({ error: "Debug query failed", details: dbErr.message }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({
        debug: true,
        total_votes: allVotes?.length || 0,
        votes_with_region: allVotes?.filter((v: { region: string | null }) => v.region)?.length || 0,
        recent_votes: allVotes,
      }, { headers: corsHeaders });
    }

    // Try RPC function first
    let cities = null;
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_city_leaderboard", {
      days_back: validDays,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      cities = rpcData;
    } else {
      if (rpcError) {
        console.warn("[cities] RPC failed, using fallback:", rpcError.message);
      }

      // Fallback: direct query aggregation
      const since = new Date(Date.now() - validDays * 86400000).toISOString();

      const { data: votes, error: votesError } = await supabase
        .from("votes")
        .select("region, country_code, device_id")
        .gte("created_at", since)
        .not("region", "is", null);

      if (votesError) {
        return NextResponse.json(
          { error: "Failed to query votes", details: votesError.message },
          { status: 500, headers: corsHeaders }
        );
      }

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

    const activeCity = cities && cities.length > 0 ? cities[0] : null;

    return NextResponse.json({
      leaderboard: cities || [],
      active_city: activeCity,
      period_days: validDays,
      generated_at: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (err) {
    console.error("[cities] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to load city leaderboard" },
      { status: 500, headers: corsHeaders }
    );
  }
}
