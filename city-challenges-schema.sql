-- ═══════════════════════════════════════════════════════
-- Inter-City Challenges — Leaderboard System
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── Weekly City Badge Winners ──────────────────────
CREATE TABLE city_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  country_code TEXT,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('active_city', 'most_engaged', 'fastest_growing', 'most_diverse')),
  week_start DATE NOT NULL,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  vote_count INT DEFAULT 0,
  pin_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  unique_voters INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city, badge_type, week_start)
);

CREATE INDEX idx_city_badges_week ON city_badges(week_start);
CREATE INDEX idx_city_badges_city ON city_badges(city);

ALTER TABLE city_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "City badges are viewable by everyone"
  ON city_badges FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated can insert city badges"
  ON city_badges FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- City Stats Aggregation Function
-- Scores cities by weighted combination of:
--   Votes (40%) + Pins (25%) + Posts (20%) + Unique Voters (15%)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_city_leaderboard(
  days_back INT DEFAULT 7
)
RETURNS TABLE(
  city TEXT,
  country_code TEXT,
  vote_count BIGINT,
  pin_count BIGINT,
  post_count BIGINT,
  unique_voters BIGINT,
  engagement_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH vote_stats AS (
    SELECT
      v.region as city,
      v.country_code,
      COUNT(*) as votes,
      COUNT(DISTINCT v.device_id) as voters
    FROM votes v
    WHERE v.created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND v.region IS NOT NULL
      AND v.region != ''
    GROUP BY v.region, v.country_code
  ),
  pin_stats AS (
    SELECT
      p.city,
      COUNT(*) as pins
    FROM pins p
    WHERE p.created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND p.city IS NOT NULL
      AND p.city != ''
      AND p.category != 'community'
    GROUP BY p.city
  ),
  post_stats AS (
    SELECT
      'Global' as city,
      COUNT(*) as posts
    FROM pins p
    WHERE p.created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND p.category = 'community'
  )
  SELECT
    COALESCE(vs.city, ps.city) as city,
    vs.country_code,
    COALESCE(vs.votes, 0) as vote_count,
    COALESCE(ps.pins, 0) as pin_count,
    0::BIGINT as post_count,
    COALESCE(vs.voters, 0) as unique_voters,
    (
      COALESCE(vs.votes, 0) * 0.4 +
      COALESCE(ps.pins, 0) * 10 * 0.25 +
      COALESCE(vs.voters, 0) * 5 * 0.15
    ) as engagement_score
  FROM vote_stats vs
  FULL OUTER JOIN pin_stats ps ON LOWER(vs.city) = LOWER(ps.city)
  WHERE COALESCE(vs.city, ps.city) IS NOT NULL
  ORDER BY engagement_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════
-- Get Current Active City (highest score this week)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_active_city()
RETURNS TABLE(
  city TEXT,
  country_code TEXT,
  engagement_score DOUBLE PRECISION,
  vote_count BIGINT,
  unique_voters BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.city,
    cl.country_code,
    cl.engagement_score,
    cl.vote_count,
    cl.unique_voters
  FROM get_city_leaderboard(7) cl
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
