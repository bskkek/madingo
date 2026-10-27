-- ==========================================
-- MADINGO PHASE 2: SQL MIGRATION, RLS & MISTAKES -> REVIEW_ITEMS MIGRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS public.words (
  id text PRIMARY KEY,
  russian text NOT NULL,
  stressed text NOT NULL,
  translit text NOT NULL,
  pos text NOT NULL DEFAULT 'noun',
  gender text,
  animacy text,
  level text NOT NULL DEFAULT 'A1',
  is_madi_term boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  icon_key text NOT NULL DEFAULT 'book',
  audio_slug text NOT NULL,
  synonyms_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  antonyms_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_words_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  lesson_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.word_translations (
  id serial PRIMARY KEY,
  word_id text NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  lang text NOT NULL,
  translation text NOT NULL,
  usage_note text NOT NULL DEFAULT '',
  UNIQUE(word_id, lang)
);

CREATE TABLE IF NOT EXISTS public.word_forms (
  word_id text PRIMARY KEY REFERENCES public.words(id) ON DELETE CASCADE,
  forms_json jsonb NOT NULL,
  irregular_override_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.examples (
  id text PRIMARY KEY,
  word_id text NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  russian_stressed text NOT NULL,
  audio_slug text NOT NULL,
  translations_json jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.word_topics (
  id serial PRIMARY KEY,
  word_id text NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  topic text NOT NULL,
  UNIQUE(word_id, topic)
);

CREATE TABLE IF NOT EXISTS public.user_words (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id text NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'favorite', -- 'favorite' | 'known' | 'garage'
  added_at timestamp DEFAULT now(),
  UNIQUE(user_id, word_id)
);

CREATE TABLE IF NOT EXISTS public.review_items (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'word', -- 'word' | 'step' | 'case' | 'letter'
  item_ref text NOT NULL,
  prompt_preview text NOT NULL DEFAULT '',
  correct_answer text NOT NULL DEFAULT '',
  category_tag text NOT NULL DEFAULT 'general',
  box integer NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  due_at timestamp NOT NULL DEFAULT now(),
  streak integer NOT NULL DEFAULT 0,
  mastered_showroom boolean NOT NULL DEFAULT false,
  last_result text NOT NULL DEFAULT 'wrong',
  fail_count integer NOT NULL DEFAULT 1,
  updated_at timestamp DEFAULT now(),
  UNIQUE(user_id, item_ref)
);

CREATE TABLE IF NOT EXISTS public.typing_texts (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  level text NOT NULL DEFAULT 'A1',
  topic text NOT NULL DEFAULT 'campus',
  title_json jsonb NOT NULL,
  text_stressed text NOT NULL,
  text_clean text NOT NULL,
  error_spotting_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  fill_in_blank_words_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_slug text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.typing_results (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_id text NOT NULL,
  mode text NOT NULL DEFAULT 'copy',
  accuracy integer NOT NULL DEFAULT 100,
  cpm integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  heatmap_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  fuel_earned integer NOT NULL DEFAULT 10,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

-- Migrate existing Phase 1 mistakes into Phase 2 Leitner Box 1 review_items
INSERT INTO public.review_items (
  user_id, item_type, item_ref, prompt_preview, correct_answer, category_tag, box, due_at, streak, mastered_showroom, last_result, fail_count
)
SELECT
  m.user_id,
  'step',
  m.step_id,
  m.prompt_preview,
  m.correct_answer,
  m.lesson_id,
  1,
  now(),
  0,
  false,
  'wrong',
  m.times
FROM public.mistakes m
ON CONFLICT (user_id, item_ref) DO UPDATE
SET fail_count = EXCLUDED.fail_count,
    updated_at = now();

-- Enable RLS for Supabase deployments
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Public read access for dictionary & typing content
CREATE POLICY "Public select words" ON public.words FOR SELECT USING (true);
CREATE POLICY "Public select word_translations" ON public.word_translations FOR SELECT USING (true);
CREATE POLICY "Public select word_forms" ON public.word_forms FOR SELECT USING (true);
CREATE POLICY "Public select examples" ON public.examples FOR SELECT USING (true);
CREATE POLICY "Public select word_topics" ON public.word_topics FOR SELECT USING (true);
CREATE POLICY "Public select typing_texts" ON public.typing_texts FOR SELECT USING (true);

-- User-isolated policies for user_words, review_items, typing_results, analytics_events
CREATE POLICY "Users manage own user_words" ON public.user_words
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own review_items" ON public.review_items
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own typing_results" ON public.typing_results
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users insert own analytics_events" ON public.analytics_events
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
