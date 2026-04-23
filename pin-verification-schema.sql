-- ═══════════════════════════════════════════════════════
-- Pin Verification System — Community Consensus
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── Pin Verifications Table ────────────────────────
CREATE TABLE pin_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('verify', 'deny')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One verification per device per pin
  UNIQUE(pin_id, device_id)
);

-- Indexes
CREATE INDEX idx_pin_verifications_pin ON pin_verifications(pin_id);
CREATE INDEX idx_pin_verifications_device ON pin_verifications(device_id);

-- ─── Row Level Security ─────────────────────────────
ALTER TABLE pin_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pin verifications are viewable by everyone"
  ON pin_verifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert verifications"
  ON pin_verifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- Trust Score RPC Function
-- Calculates weighted trust score for a pin based on
-- proximity-weighted community verification.
--
-- Formula: weight = 1 / (1 + distance_km)
--   - User 100m away  → weight ≈ 0.91
--   - User 1km away   → weight = 0.50
--   - User 5km away   → weight ≈ 0.17
--   - User 10km away  → weight ≈ 0.09
--
-- Returns: trust_score between -1.0 (denied) and 1.0 (verified)
--          verify_count, deny_count, total_count
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_pin_trust_score(target_pin_id UUID)
RETURNS TABLE(
  trust_score DOUBLE PRECISION,
  verify_count BIGINT,
  deny_count BIGINT,
  total_count BIGINT,
  weighted_verify DOUBLE PRECISION,
  weighted_deny DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN SUM(1.0 / (1.0 + pv.distance_km)) = 0 THEN 0.0
      ELSE (
        SUM(CASE WHEN pv.vote = 'verify' THEN 1.0 / (1.0 + pv.distance_km) ELSE 0 END) -
        SUM(CASE WHEN pv.vote = 'deny' THEN 1.0 / (1.0 + pv.distance_km) ELSE 0 END)
      ) / SUM(1.0 / (1.0 + pv.distance_km))
    END as trust_score,
    COUNT(*) FILTER (WHERE pv.vote = 'verify') as verify_count,
    COUNT(*) FILTER (WHERE pv.vote = 'deny') as deny_count,
    COUNT(*) as total_count,
    COALESCE(SUM(CASE WHEN pv.vote = 'verify' THEN 1.0 / (1.0 + pv.distance_km) ELSE 0 END), 0) as weighted_verify,
    COALESCE(SUM(CASE WHEN pv.vote = 'deny' THEN 1.0 / (1.0 + pv.distance_km) ELSE 0 END), 0) as weighted_deny
  FROM pin_verifications pv
  WHERE pv.pin_id = target_pin_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════
-- Batch Trust Scores — get scores for all active pins
-- More efficient than calling get_pin_trust_score per pin
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_all_pin_trust_scores()
RETURNS TABLE(
  pin_id UUID,
  trust_score DOUBLE PRECISION,
  verify_count BIGINT,
  deny_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.pin_id,
    CASE
      WHEN SUM(1.0 / (1.0 + pv.distance_km)) = 0 THEN 0.0
      ELSE (
        SUM(CASE WHEN pv.vote = 'verify' THEN 1.0 / (1.0 + pv.distance_km) ELSE 0 END) -
        SUM(CASE WHEN pv.vote = 'deny' THEN 1.0 / (1.0 + pv.distance_km) ELSE 0 END)
      ) / SUM(1.0 / (1.0 + pv.distance_km))
    END as trust_score,
    COUNT(*) FILTER (WHERE pv.vote = 'verify') as verify_count,
    COUNT(*) FILTER (WHERE pv.vote = 'deny') as deny_count,
    COUNT(*) as total_count
  FROM pin_verifications pv
  GROUP BY pv.pin_id;
END;
$$ LANGUAGE plpgsql;
