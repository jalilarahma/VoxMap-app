-- ═══════════════════════════════════════════════════════
-- Fact-Check Overlay — Verified Partner Annotations
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── Verified Partners ──────────────────────────────
CREATE TABLE verified_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ngo', 'academic', 'journalist', 'government')),
  email TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partners_api_key ON verified_partners(api_key);
CREATE INDEX idx_partners_active ON verified_partners(is_active);

-- ─── Fact-Check Annotations ────────────────────────
CREATE TABLE fact_check_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES verified_partners(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION DEFAULT 50,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('context', 'correction', 'correlation', 'warning')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_url TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'notable', 'critical')),
  is_visible BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_partner ON fact_check_annotations(partner_id);
CREATE INDEX idx_annotations_question ON fact_check_annotations(question_id);
CREATE INDEX idx_annotations_visible ON fact_check_annotations(is_visible, is_approved);
CREATE INDEX idx_annotations_type ON fact_check_annotations(annotation_type);

-- ─── Row Level Security ─────────────────────────────
ALTER TABLE verified_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_check_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners viewable by everyone"
  ON verified_partners FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Annotations viewable when visible and approved"
  ON fact_check_annotations FOR SELECT TO anon, authenticated
  USING (is_visible = true AND is_approved = true);

CREATE POLICY "Authenticated can insert annotations"
  ON fact_check_annotations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update annotations"
  ON fact_check_annotations FOR UPDATE TO authenticated USING (true);

-- ─── Get Annotations for Map Display ────────────────
CREATE OR REPLACE FUNCTION get_map_annotations(q_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  partner_name TEXT,
  partner_type TEXT,
  partner_logo TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  annotation_type TEXT,
  title TEXT,
  body TEXT,
  source_url TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    p.name as partner_name,
    p.type as partner_type,
    p.logo_url as partner_logo,
    a.lat,
    a.lng,
    a.radius_km,
    a.annotation_type,
    a.title,
    a.body,
    a.source_url,
    a.severity,
    a.created_at
  FROM fact_check_annotations a
  JOIN verified_partners p ON a.partner_id = p.id
  WHERE a.is_visible = true
    AND a.is_approved = true
    AND p.is_active = true
    AND (q_id IS NULL OR a.question_id = q_id)
  ORDER BY
    CASE a.severity
      WHEN 'critical' THEN 1
      WHEN 'notable' THEN 2
      ELSE 3
    END,
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql;
