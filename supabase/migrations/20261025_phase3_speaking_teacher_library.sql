-- ============================================================================
-- MADINGO PHASE 3 SQL MIGRATION & ROW-LEVEL SECURITY (RLS) POLICIES
-- Tables: clips, clip_lines, clip_reviews, recordings, speech_attempts,
--         scenarios, scenario_nodes, generation_jobs, review_queue,
--         groups, group_members, assignments, announcements,
--         library_items, library_reviews, reports, audit_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  title_json JSONB NOT NULL,
  level TEXT NOT NULL DEFAULT 'A1',
  topic TEXT NOT NULL DEFAULT 'campus',
  grammar_point TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 5 CHECK (duration_seconds <= 15),
  register TEXT NOT NULL DEFAULT 'formal',
  register_note_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  scene_theme TEXT NOT NULL DEFAULT 'campus',
  character_speaker TEXT NOT NULL DEFAULT 'Misha',
  source_type TEXT NOT NULL CHECK (source_type IN ('madi_creator', 'ai_original', 'open_license')),
  license TEXT NOT NULL,
  author TEXT NOT NULL,
  consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (review_status IN ('draft', 'needs_review', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent publication unless consent_confirmed = true and reviewed_by is present
  CONSTRAINT clips_publish_consent_check CHECK (
    review_status <> 'approved' OR (consent_confirmed = TRUE AND reviewed_by IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS clip_lines (
  id SERIAL PRIMARY KEY,
  clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  russian_subtitle TEXT NOT NULL,
  translations_json JSONB NOT NULL,
  word_timings_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS clip_reviews (
  id SERIAL PRIMARY KEY,
  clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  comments TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clip_id TEXT NOT NULL,
  consent_stored BOOLEAN NOT NULL DEFAULT FALSE,
  audio_data_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 4 CHECK (duration_seconds <= 20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS speech_attempts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clip_id TEXT NOT NULL,
  transcript TEXT NOT NULL,
  accuracy_score INTEGER NOT NULL,
  stress_estimate_score INTEGER NOT NULL,
  fluency_score INTEGER NOT NULL,
  completeness_score INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 1,
  mispronounced_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  title_json JSONB NOT NULL,
  subtitle_json JSONB NOT NULL,
  level TEXT NOT NULL DEFAULT 'A1',
  topic TEXT NOT NULL DEFAULT 'campus',
  scene_theme TEXT NOT NULL DEFAULT 'cafe',
  npc_role_json JSONB NOT NULL,
  student_role_json JSONB NOT NULL,
  useful_phrases_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_nodes (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  npc_speaker TEXT NOT NULL,
  npc_line TEXT NOT NULL,
  npc_translations_json JSONB NOT NULL,
  hints_json JSONB NOT NULL,
  options_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL REFERENCES profiles(id),
  level TEXT NOT NULL,
  topic TEXT NOT NULL,
  grammar_point TEXT NOT NULL,
  register TEXT NOT NULL DEFAULT 'formal',
  provider_used TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
  status TEXT NOT NULL DEFAULT 'completed',
  validation_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'A1',
  topic TEXT NOT NULL DEFAULT 'campus',
  grammar_point TEXT NOT NULL DEFAULT '',
  register TEXT NOT NULL DEFAULT 'formal',
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('draft', 'needs_review', 'approved', 'rejected')),
  created_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_comments TEXT NOT NULL DEFAULT '',
  consent_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  teacher_id TEXT NOT NULL REFERENCES profiles(id),
  level TEXT NOT NULL DEFAULT 'A1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  completed_student_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY,
  title_json JSONB NOT NULL,
  author TEXT NOT NULL,
  section TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'A1',
  topic TEXT NOT NULL DEFAULT 'campus',
  explanation_lang TEXT NOT NULL DEFAULT 'all',
  license_type TEXT NOT NULL,
  license_text TEXT NOT NULL,
  permission_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  permission_doc_url TEXT,
  review_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (review_status IN ('needs_review', 'approved', 'rejected')),
  reviewed_by TEXT,
  pages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT library_publish_permission_check CHECK (
    review_status <> 'approved' OR (permission_confirmed = TRUE AND reviewed_by IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS library_reviews (
  id SERIAL PRIMARY KEY,
  library_item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE speech_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

-- 1. Students can only read approved clips with consent_confirmed = true; reviewers/teachers/admins can read all
CREATE POLICY clips_select_policy ON clips
  FOR SELECT USING (
    (review_status = 'approved' AND consent_confirmed = TRUE)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = current_setting('app.current_user_id', true)
      AND p.role IN ('teacher', 'content_reviewer', 'admin')
    )
  );

-- 2. Recordings & Speech Attempts: Student reads own; Teacher reads students in own groups; Admin reads all
CREATE POLICY recordings_access_policy ON recordings
  FOR ALL USING (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE g.teacher_id = current_setting('app.current_user_id', true)
      AND gm.student_id = recordings.user_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = current_setting('app.current_user_id', true)
      AND p.role = 'admin'
    )
  );

CREATE POLICY speech_attempts_access_policy ON speech_attempts
  FOR ALL USING (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE g.teacher_id = current_setting('app.current_user_id', true)
      AND gm.student_id = speech_attempts.user_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = current_setting('app.current_user_id', true)
      AND p.role = 'admin'
    )
  );

-- 3. Library items: Only approved & permission_confirmed items are visible to students
CREATE POLICY library_items_select_policy ON library_items
  FOR SELECT USING (
    (review_status = 'approved' AND permission_confirmed = TRUE)
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = current_setting('app.current_user_id', true)
      AND p.role IN ('content_reviewer', 'admin')
    )
  );
