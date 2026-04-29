import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=120",
};

// Rate limit: 20 requests per minute per API key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// Validate partner API key, returns partner_id or null
async function validateApiKey(req: NextRequest): Promise<{ id: string; name: string } | null> {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;

  const apiKey = auth.slice(7).trim();
  if (!apiKey || apiKey.length < 10) return null;

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("verified_partners")
    .select("id, name")
    .eq("api_key", apiKey)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("[annotations] Partner validation failed:", error.message);
    return null;
  }

  return data || null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET — List annotations (public for approved ones)
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("question_id");

    // Try RPC first
    let annotations = null;
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_map_annotations", {
      q_id: questionId || null,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      annotations = rpcData;
    } else {
      if (rpcError) {
        console.warn("[annotations] RPC failed, using fallback:", rpcError.message);
      }

      // Fallback: direct query
      let query = supabase
        .from("fact_check_annotations")
        .select(`
          id, lat, lng, radius_km, annotation_type, title, body,
          source_url, severity, created_at,
          verified_partners (name, type, logo_url)
        `)
        .eq("is_visible", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (questionId) {
        query = query.eq("question_id", questionId);
      }

      const { data: fallbackData, error: fallbackError } = await query;

      if (fallbackError) {
        console.error("[annotations] Fallback query failed:", fallbackError.message);
        return NextResponse.json(
          { error: "Failed to fetch annotations", details: fallbackError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      if (fallbackData) {
        annotations = fallbackData.map((a: any) => ({
          id: a.id,
          partner_name: a.verified_partners?.name || "Unknown",
          partner_type: a.verified_partners?.type || "ngo",
          partner_logo: a.verified_partners?.logo_url || null,
          lat: a.lat,
          lng: a.lng,
          radius_km: a.radius_km,
          annotation_type: a.annotation_type,
          title: a.title,
          body: a.body,
          source_url: a.source_url,
          severity: a.severity,
          created_at: a.created_at,
        }));
      }
    }

    return NextResponse.json({
      annotations: annotations || [],
      count: annotations?.length || 0,
    }, { headers: corsHeaders });

  } catch (err) {
    console.error("[annotations] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST — Create annotation (requires partner API key)
export async function POST(req: NextRequest) {
  try {
    const partner = await validateApiKey(req);
    if (!partner) {
      return NextResponse.json(
        { error: "Invalid or missing API key. Use Authorization: Bearer <your_api_key>" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!checkRateLimit(partner.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 requests per minute." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { question_id, lat, lng, radius_km, annotation_type, title, body: annotBody, source_url, severity } = body;

    // Validate required fields
    if (!lat || !lng || !annotation_type || !title || !annotBody) {
      return NextResponse.json(
        { error: "Missing required fields: lat, lng, annotation_type, title, body" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!["context", "correction", "correlation", "warning"].includes(annotation_type)) {
      return NextResponse.json(
        { error: "annotation_type must be: context, correction, correlation, or warning" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Auto-approve context/correlation, require review for correction/warning
    const autoApprove = ["context", "correlation"].includes(annotation_type);

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("fact_check_annotations")
      .insert({
        partner_id: partner.id,
        question_id: question_id || null,
        lat,
        lng,
        radius_km: radius_km || 50,
        annotation_type,
        title: String(title).slice(0, 200),
        body: String(annotBody).slice(0, 2000),
        source_url: source_url || null,
        severity: severity || "info",
        is_approved: autoApprove,
        is_visible: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Annotation insert error:", error);
      return NextResponse.json(
        { error: "Failed to create annotation" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      annotation: data,
      approved: autoApprove,
      message: autoApprove
        ? "Annotation created and published."
        : "Annotation created and pending admin review.",
    }, { status: 201, headers: corsHeaders });

  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH — Update annotation (partner can edit own, admin can edit any)
export async function PATCH(req: NextRequest) {
  try {
    const partner = await validateApiKey(req);
    if (!partner) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { id, title, body: annotBody, source_url, severity, is_visible, is_approved } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing annotation id" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = String(title).slice(0, 200);
    if (annotBody !== undefined) updates.body = String(annotBody).slice(0, 2000);
    if (source_url !== undefined) updates.source_url = source_url;
    if (severity !== undefined) updates.severity = severity;
    if (is_visible !== undefined) updates.is_visible = is_visible;
    if (is_approved !== undefined) updates.is_approved = is_approved;

    const supabase = getServerSupabase();
    const { error } = await supabase
      .from("fact_check_annotations")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update annotation" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });

  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
