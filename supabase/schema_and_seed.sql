-- =============================================================================
-- madingo Phase 1 — PostgreSQL / Supabase SQL Schema + RLS Policies + Seed Data
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT 'Student',
  ui_lang text NOT NULL DEFAULT 'en' CHECK (ui_lang IN ('ru', 'en', 'ar', 'fr')),
  goal_minutes integer NOT NULL DEFAULT 10 CHECK (goal_minutes IN (5, 10, 20)),
  learning_reason text NOT NULL DEFAULT 'university',
  avatar_id text NOT NULL DEFAULT 'misha-cap',
  sound_enabled boolean NOT NULL DEFAULT true,
  notifications_enabled boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  consent_accepted boolean NOT NULL DEFAULT true,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.units (
  id text PRIMARY KEY,
  order_index integer NOT NULL,
  slug text NOT NULL UNIQUE,
  landmark_key text NOT NULL,
  level_code text NOT NULL DEFAULT 'A1',
  is_locked_by_default boolean NOT NULL DEFAULT false,
  title_json jsonb NOT NULL,
  subtitle_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  slug text NOT NULL UNIQUE,
  title_json jsonb NOT NULL,
  description_json jsonb NOT NULL,
  estimated_minutes integer NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS public.steps (
  id text PRIMARY KEY,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  type text NOT NULL,
  content jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.progress (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  accuracy integer NOT NULL DEFAULT 100,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.streaks (
  id serial PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  current integer NOT NULL DEFAULT 0,
  best integer NOT NULL DEFAULT 0,
  last_active_date text,
  spare_tire_available boolean NOT NULL DEFAULT true,
  spare_tire_used_date text
);

CREATE TABLE IF NOT EXISTS public.fuel_log (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL DEFAULT 'lesson',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mistakes (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  lesson_id text NOT NULL,
  prompt_preview text NOT NULL DEFAULT '',
  correct_answer text NOT NULL DEFAULT '',
  times integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;

-- Public read access for curriculum tables
CREATE POLICY "Public read units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public read steps" ON public.steps FOR SELECT USING (true);

-- User-scoped RLS policies
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users manage own progress" ON public.progress
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own streaks" ON public.streaks
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own fuel_log" ON public.fuel_log
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own mistakes" ON public.mistakes
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
