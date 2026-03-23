-- ═══════════════════════════════════════════════════════
-- VoxMap Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Daily Polls / Questions ─────────────────────────
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_year INT NOT NULL UNIQUE CHECK (day_of_year BETWEEN 1 AND 366),
  text_en TEXT NOT NULL,
  text_ar TEXT,
  text_ru TEXT,
  text_zh TEXT,
  text_he TEXT,
  text_fa TEXT,
  options JSONB NOT NULL DEFAULT '["Strongly Agree","Agree","Disagree","Strongly Disagree"]',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Votes ───────────────────────────────────────────
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  option_index INT NOT NULL CHECK (option_index BETWEEN 0 AND 3),
  location GEOGRAPHY(POINT, 4326),
  country_code TEXT,
  region TEXT,
  age_group TEXT CHECK (age_group IN ('youth', 'adult', 'senior')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One vote per device per question
  UNIQUE(question_id, device_id)
);

-- Index for fast vote counting
CREATE INDEX idx_votes_question ON votes(question_id);
CREATE INDEX idx_votes_region ON votes(region);
CREATE INDEX idx_votes_created ON votes(created_at);

-- ─── Emergency Pins ──────────────────────────────────
CREATE TABLE pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'danger', 'robbery', 'assault', 'medical', 'fire', 'trapped',
    'flood', 'shooting', 'missing', 'safe', 'help', 'info'
  )),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  note TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country_code TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Geospatial index for nearby pin queries
CREATE INDEX idx_pins_location ON pins USING GIST(location);
CREATE INDEX idx_pins_active ON pins(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pins_category ON pins(category);
CREATE INDEX idx_pins_created ON pins(created_at);

-- ─── Pin Responses (people helping) ──────────────────
CREATE TABLE pin_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('on_way', 'helped', 'confirmed', 'false_alarm')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pin_id, device_id)
);

-- ─── Regions (for vote aggregation) ──────────────────
CREATE TABLE regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  country_code TEXT NOT NULL,
  boundary GEOGRAPHY(POLYGON, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ──────────────────────────────

-- Enable RLS on all tables
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Questions: everyone can read
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Votes: everyone can read, authenticated can insert own
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Pins: everyone can read active, authenticated can insert
CREATE POLICY "Active pins are viewable by everyone"
  ON pins FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create pins"
  ON pins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own pins"
  ON pins FOR UPDATE
  TO authenticated
  USING (true);

-- Pin responses: everyone can read, authenticated can insert
CREATE POLICY "Pin responses are viewable by everyone"
  ON pin_responses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can respond to pins"
  ON pin_responses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Regions: everyone can read
CREATE POLICY "Regions are viewable by everyone"
  ON regions FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─── Enable Realtime ─────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE pins;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- ─── Seed: First 30 Daily Questions ─────────────────
INSERT INTO questions (day_of_year, text_en, text_ar, category) VALUES
(1, 'Do you trust your government to act in the people''s best interest?', 'هل تثق بحكومتك لتعمل لمصلحة الشعب؟', 'governance'),
(2, 'Do you feel safe walking alone at night in your neighborhood?', 'هل تشعر بالأمان عند المشي وحدك ليلاً في حيك؟', 'safety'),
(3, 'Is the cost of living in your area affordable?', 'هل تكلفة المعيشة في منطقتك معقولة؟', 'economy'),
(4, 'Do you have access to quality healthcare?', 'هل لديك إمكانية الوصول إلى رعاية صحية جيدة؟', 'health'),
(5, 'Is your country heading in the right direction?', 'هل بلدك يسير في الاتجاه الصحيح؟', 'governance'),
(6, 'Do you feel your vote matters in elections?', 'هل تشعر أن صوتك مهم في الانتخابات؟', 'democracy'),
(7, 'Are human rights respected in your country?', 'هل حقوق الإنسان محترمة في بلدك؟', 'rights'),
(8, 'Do you have access to clean drinking water?', 'هل لديك إمكانية الوصول إلى مياه شرب نظيفة؟', 'basic_needs'),
(9, 'Is corruption a major problem where you live?', 'هل الفساد مشكلة كبيرة حيث تعيش؟', 'governance'),
(10, 'Do you feel the media in your country reports truthfully?', 'هل تشعر أن الإعلام في بلدك ينقل الحقيقة؟', 'media'),
(11, 'Can you afford to feed your family well?', 'هل تستطيع إطعام عائلتك بشكل جيد؟', 'economy'),
(12, 'Do children in your area have access to good education?', 'هل أطفال منطقتك يحصلون على تعليم جيد؟', 'education'),
(13, 'Do you trust your local police?', 'هل تثق بشرطتك المحلية؟', 'safety'),
(14, 'Is freedom of speech protected where you live?', 'هل حرية التعبير محمية حيث تعيش؟', 'rights'),
(15, 'Do you believe climate change is being taken seriously by your government?', 'هل تعتقد أن حكومتك تأخذ تغير المناخ بجدية؟', 'environment'),
(16, 'Are women treated equally in your society?', 'هل النساء يعاملن بالمساواة في مجتمعك؟', 'rights'),
(17, 'Do you have access to reliable internet?', 'هل لديك إمكانية الوصول إلى إنترنت موثوق؟', 'infrastructure'),
(18, 'Is unemployment a serious concern in your area?', 'هل البطالة مصدر قلق جدي في منطقتك؟', 'economy'),
(19, 'Do you feel represented by your political leaders?', 'هل تشعر أن قادتك السياسيين يمثلونك؟', 'democracy'),
(20, 'Is your neighborhood clean and well-maintained?', 'هل حيك نظيف ومُعتنى به؟', 'infrastructure'),
(21, 'Do you have hope for a better future?', 'هل لديك أمل بمستقبل أفضل؟', 'general'),
(22, 'Are minorities respected in your community?', 'هل الأقليات محترمة في مجتمعك؟', 'rights'),
(23, 'Can young people find decent jobs in your country?', 'هل يستطيع الشباب إيجاد وظائف جيدة في بلدك؟', 'economy'),
(24, 'Do you feel your personal data is protected online?', 'هل تشعر أن بياناتك الشخصية محمية على الإنترنت؟', 'digital_rights'),
(25, 'Is public transportation reliable where you live?', 'هل النقل العام موثوق حيث تعيش؟', 'infrastructure'),
(26, 'Do you feel the justice system in your country is fair?', 'هل تشعر أن نظام العدالة في بلدك عادل؟', 'governance'),
(27, 'Are you worried about a potential conflict or war?', 'هل أنت قلق بشأن نزاع أو حرب محتملة؟', 'peace'),
(28, 'Do you have enough food security?', 'هل لديك أمان غذائي كافٍ؟', 'basic_needs'),
(29, 'Is religious freedom respected where you live?', 'هل الحرية الدينية محترمة حيث تعيش؟', 'rights'),
(30, 'Would you recommend your country as a place to live?', 'هل تنصح ببلدك كمكان للعيش؟', 'general');
