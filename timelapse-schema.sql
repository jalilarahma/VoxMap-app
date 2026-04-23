-- ═══════════════════════════════════════════════════════
-- Sentiment Time-Lapse — Temporal Vote Query
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Returns votes for a question ordered by time, with parsed lat/lng
-- Used to animate votes appearing chronologically on the map
CREATE OR REPLACE FUNCTION get_vote_timelapse(q_id UUID)
RETURNS TABLE(
  vote_option INT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  voted_at TIMESTAMPTZ,
  country TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.option_index as vote_option,
    ST_Y(v.location::geometry) as lat,
    ST_X(v.location::geometry) as lng,
    v.created_at as voted_at,
    v.country_code as country
  FROM votes v
  WHERE v.question_id = q_id
    AND v.location IS NOT NULL
  ORDER BY v.created_at ASC;
END;
$$ LANGUAGE plpgsql;
