-- ============================================================================
-- MADINGO PHASE 4 MIGRATION:
-- Certificates, Weekly Leagues, Friends & Nudges, 40 Badges & Free Cosmetics,
-- Quests, Placement & CEFR Level Exams, Notifications, Analytics & Cost Usage
-- ============================================================================

-- 1. Certificates & Revocations
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY, -- e.g. MDG-A1-2026-8F4B2C
  user_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  student_name_latin TEXT NOT NULL,
  student_name_cyrillic TEXT NOT NULL,
  score_pct INTEGER NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  score_band TEXT NOT NULL CHECK (score_band IN ('Pass', 'Merit', 'Distinction')),
  verify_url TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL,
  signature_teacher TEXT NOT NULL DEFAULT 'Проф. Е. П. Соколова',
  signature_department TEXT NOT NULL DEFAULT 'Кафедра русского языка МАДИ',
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificate_revocations (
  id SERIAL PRIMARY KEY,
  certificate_id TEXT NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  revoked_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Exams & Attempts (Level Exams + Adaptive Placement)
CREATE TABLE IF NOT EXISTS public.exams (
  id TEXT PRIMARY KEY, -- e.g. exam-A1
  level TEXT NOT NULL UNIQUE CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  pass_score_pct INTEGER NOT NULL DEFAULT 75,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  retake_cooldown_hours INTEGER NOT NULL DEFAULT 24,
  exam_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  overall_score_pct INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  score_band TEXT,
  skill_scores_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  teacher_graded_status TEXT DEFAULT 'not_required', -- 'not_required' | 'pending_teacher' | 'graded'
  teacher_rubric_json JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.placement_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recommended_level TEXT NOT NULL,
  recommended_unit_id TEXT NOT NULL,
  chosen_override_unit_id TEXT,
  accuracy_pct INTEGER NOT NULL,
  skill_breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Weekly Leagues, League Members & Weekly Scores
CREATE TABLE IF NOT EXISTS public.leagues (
  id TEXT PRIMARY KEY,
  tier_id TEXT NOT NULL CHECK (tier_id IN (
    'garage_lane',
    'campus_street',
    'city_avenue',
    'ring_road',
    'express_highway',
    'magistral_premier'
  )),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.league_members (
  id SERIAL PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_id TEXT NOT NULL DEFAULT 'misha-cap',
  faculty_code TEXT NOT NULL DEFAULT 'PODFAK',
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.weekly_scores (
  id SERIAL PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  weekly_fuel INTEGER NOT NULL DEFAULT 0,
  km_traveled INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  best_speaking_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, user_id)
);

-- 4. Friendships & Rate-Limited Friendly Nudges
CREATE TABLE IF NOT EXISTS public.friendships (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_user_id TEXT NOT NULL,
  friend_code TEXT NOT NULL,
  shared_streak_days INTEGER NOT NULL DEFAULT 1,
  allow_nudges BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, friend_user_id)
);

CREATE TABLE IF NOT EXISTS public.nudges (
  id SERIAL PRIMARY KEY,
  sender_user_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT 'Misha flashed the headlights! Ready for a 5-minute Russian stop today?',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Badges, Cosmetics & Quests
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  svg_key TEXT NOT NULL,
  unlock_rule_json JSONB NOT NULL,
  reward_cosmetic_id TEXT,
  title_json JSONB NOT NULL,
  description_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.quests (
  id TEXT PRIMARY KEY,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  target_type TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  reward_fuel INTEGER NOT NULL DEFAULT 20,
  title_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_quests (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS public.cosmetics (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('car_skin', 'mascot_outfit', 'map_theme')),
  unlocked_by_default BOOLEAN NOT NULL DEFAULT FALSE,
  title_json JSONB NOT NULL,
  description_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  cosmetic_id TEXT NOT NULL REFERENCES public.cosmetics(id) ON DELETE CASCADE,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, cosmetic_id)
);

-- 6. Notifications & Preferences
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'streak_reminder',
    'garage_due',
    'assignment_due',
    'league_result',
    'certificate_issued',
    'teacher_announcement'
  )),
  title_json JSONB NOT NULL,
  body_json JSONB NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id TEXT PRIMARY KEY,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  web_push_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  email_digest_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start INTEGER NOT NULL DEFAULT 22,
  quiet_hours_end INTEGER NOT NULL DEFAULT 8,
  max_daily_notifications INTEGER NOT NULL DEFAULT 3,
  types_enabled_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Analytics Events & Provider Cost Usage
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  event_name TEXT NOT NULL,
  faculty_code TEXT DEFAULT 'PODFAK',
  ui_lang TEXT DEFAULT 'en',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_usage (
  id SERIAL PRIMARY KEY,
  service TEXT NOT NULL CHECK (service IN ('stt', 'tts', 'llm')),
  requests_count INTEGER NOT NULL DEFAULT 1,
  estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0020,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_usage ENABLE ROW LEVEL SECURITY;

-- Public certificate verification: anyone can verify a certificate by ID (exposes only name, level, date, validity)
CREATE POLICY "Public certificate verification read" ON public.certificates
  FOR SELECT USING (true);

-- Only admins can revoke certificates
CREATE POLICY "Admins manage certificate revocations" ON public.certificate_revocations
  FOR ALL USING (current_setting('app.current_user_role', true) = 'admin');

-- Students read/write own exam attempts, badges, quests, cosmetics, notifications
CREATE POLICY "Users read own exam attempts" ON public.exam_attempts
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true) OR current_setting('app.current_user_role', true) IN ('teacher', 'admin'));

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Admins read provider cost usage" ON public.cost_usage
  FOR SELECT USING (current_setting('app.current_user_role', true) = 'admin');
