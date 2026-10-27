import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Matches users.uid
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull().default('Student'),
  uiLang: text('ui_lang').notNull().default('en'),
  goalMinutes: integer('goal_minutes').notNull().default(10),
  learningReason: text('learning_reason').notNull().default('university'),
  avatarId: text('avatar_id').notNull().default('misha-cap'),
  soundEnabled: boolean('sound_enabled').notNull().default(true),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  theme: text('theme').notNull().default('light'),
  consentAccepted: boolean('consent_accepted').notNull().default(true),
  role: text('role').notNull().default('student'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  orderIndex: integer('order_index').notNull(),
  slug: text('slug').notNull().unique(),
  landmarkKey: text('landmark_key').notNull(),
  levelCode: text('level_code').notNull().default('A1'),
  isLockedByDefault: boolean('is_locked_by_default').notNull().default(false),
  titleJson: jsonb('title_json').notNull(),
  subtitleJson: jsonb('subtitle_json').notNull(),
});

export const lessons = pgTable('lessons', {
  id: text('id').primaryKey(),
  unitId: text('unit_id')
    .references(() => units.id)
    .notNull(),
  orderIndex: integer('order_index').notNull(),
  slug: text('slug').notNull().unique(),
  titleJson: jsonb('title_json').notNull(),
  descriptionJson: jsonb('description_json').notNull(),
  estimatedMinutes: integer('estimated_minutes').notNull().default(5),
});

export const steps = pgTable('steps', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id')
    .references(() => lessons.id)
    .notNull(),
  orderIndex: integer('order_index').notNull(),
  type: text('type').notNull(),
  content: jsonb('content').notNull(),
});

export const progress = pgTable(
  'progress',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => profiles.id)
      .notNull(),
    lessonId: text('lesson_id')
      .references(() => lessons.id)
      .notNull(),
    status: text('status').notNull().default('completed'),
    accuracy: integer('accuracy').notNull().default(100),
    completedAt: timestamp('completed_at').defaultNow(),
  },
  (table) => [uniqueIndex('progress_user_lesson_idx').on(table.userId, table.lessonId)]
);

export const streaks = pgTable('streaks', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull()
    .unique(),
  current: integer('current').notNull().default(0),
  best: integer('best').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  spareTireAvailable: boolean('spare_tire_available').notNull().default(true),
  spareTireUsedDate: text('spare_tire_used_date'),
});

export const fuelLog = pgTable('fuel_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull().default('lesson'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mistakes = pgTable(
  'mistakes',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => profiles.id)
      .notNull(),
    stepId: text('step_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    promptPreview: text('prompt_preview').notNull().default(''),
    correctAnswer: text('correct_answer').notNull().default(''),
    times: integer('times').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [uniqueIndex('mistakes_user_step_idx').on(table.userId, table.stepId)]
);

// ==========================================
// PHASE 2 TABLES: Dictionary, Garage SRS, Typing Lab & Analytics
// ==========================================

export const words = pgTable('words', {
  id: text('id').primaryKey(),
  russian: text('russian').notNull(),
  stressed: text('stressed').notNull(),
  translit: text('translit').notNull(),
  pos: text('pos').notNull().default('noun'), // 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'numeral'
  gender: text('gender'), // 'm' | 'f' | 'n' | 'pl' | null
  animacy: text('animacy'), // 'animate' | 'inanimate' | null
  level: text('level').notNull().default('A1'), // 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  isMadiTerm: boolean('is_madi_term').notNull().default(false),
  verified: boolean('verified').notNull().default(false), // Marked false so teacher can review stress & translations
  iconKey: text('icon_key').notNull().default('book'),
  audioSlug: text('audio_slug').notNull(),
  synonymsJson: jsonb('synonyms_json').notNull().default([]),
  antonymsJson: jsonb('antonyms_json').notNull().default([]),
  relatedWordsJson: jsonb('related_words_json').notNull().default([]),
  lessonIdsJson: jsonb('lesson_ids_json').notNull().default([]),
});

export const wordTranslations = pgTable(
  'word_translations',
  {
    id: serial('id').primaryKey(),
    wordId: text('word_id')
      .references(() => words.id)
      .notNull(),
    lang: text('lang').notNull(), // 'ru' | 'en' | 'ar' | 'fr'
    translation: text('translation').notNull(),
    usageNote: text('usage_note').notNull().default(''),
  },
  (table) => [uniqueIndex('word_translations_word_lang_idx').on(table.wordId, table.lang)]
);

export const wordForms = pgTable('word_forms', {
  wordId: text('word_id')
    .references(() => words.id)
    .primaryKey(),
  formsJson: jsonb('forms_json').notNull(),
  irregularOverrideJson: jsonb('irregular_override_json').notNull().default({}),
});

export const examples = pgTable('examples', {
  id: text('id').primaryKey(),
  wordId: text('word_id')
    .references(() => words.id)
    .notNull(),
  russianStressed: text('russian_stressed').notNull(),
  audioSlug: text('audio_slug').notNull(),
  translationsJson: jsonb('translations_json').notNull(),
});

export const wordTopics = pgTable(
  'word_topics',
  {
    id: serial('id').primaryKey(),
    wordId: text('word_id')
      .references(() => words.id)
      .notNull(),
    topic: text('topic').notNull(), // 'madi_auto' | 'campus' | 'greetings' | 'city_metro' | 'numbers_time' | 'daily'
  },
  (table) => [uniqueIndex('word_topics_word_topic_idx').on(table.wordId, table.topic)]
);

export const userWords = pgTable(
  'user_words',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => profiles.id)
      .notNull(),
    wordId: text('word_id')
      .references(() => words.id)
      .notNull(),
    status: text('status').notNull().default('favorite'), // 'favorite' | 'known' | 'garage'
    addedAt: timestamp('added_at').defaultNow(),
  },
  (table) => [uniqueIndex('user_words_user_word_idx').on(table.userId, table.wordId)]
);

export const reviewItems = pgTable(
  'review_items',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => profiles.id)
      .notNull(),
    itemType: text('item_type').notNull().default('word'), // 'word' | 'step' | 'case' | 'letter'
    itemRef: text('item_ref').notNull(),
    promptPreview: text('prompt_preview').notNull().default(''),
    correctAnswer: text('correct_answer').notNull().default(''),
    categoryTag: text('category_tag').notNull().default('general'),
    box: integer('box').notNull().default(1), // Leitner boxes 1..5
    dueAt: timestamp('due_at').defaultNow().notNull(),
    streak: integer('streak').notNull().default(0),
    masteredShowroom: boolean('mastered_showroom').notNull().default(false),
    lastResult: text('last_result').notNull().default('wrong'), // 'correct' | 'wrong'
    failCount: integer('fail_count').notNull().default(1),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [uniqueIndex('review_items_user_ref_idx').on(table.userId, table.itemRef)]
);

export const typingTexts = pgTable('typing_texts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  level: text('level').notNull().default('A1'),
  topic: text('topic').notNull().default('campus'),
  titleJson: jsonb('title_json').notNull(),
  textStressed: text('text_stressed').notNull(),
  textClean: text('text_clean').notNull(),
  errorSpottingJson: jsonb('error_spotting_json').notNull().default({}),
  fillInBlankWordsJson: jsonb('fill_in_blank_words_json').notNull().default([]),
  audioSlug: text('audio_slug').notNull(),
});

export const typingResults = pgTable('typing_results', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull(),
  textId: text('text_id').notNull(),
  mode: text('mode').notNull().default('copy'), // 'copy' | 'dictation' | 'error_spot' | 'fill_in'
  accuracy: integer('accuracy').notNull().default(100),
  cpm: integer('cpm').notNull().default(0),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  heatmapJson: jsonb('heatmap_json').notNull().default({}),
  fuelEarned: integer('fuel_earned').notNull().default(10),
  createdAt: timestamp('created_at').defaultNow(),
});

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull(),
  eventType: text('event_type').notNull(), // 'lesson_completed' | 'exercise_failed' | 'garage_session' | 'typing_completed'
  payloadJson: jsonb('payload_json').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const unitsRelations = relations(units, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  steps: many(steps),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  lesson: one(lessons, {
    fields: [steps.lessonId],
    references: [lessons.id],
  }),
}));

// ==========================================
// PHASE 3 TABLES: Speaking Clips, Role-Play Scenarios, AI Content Pipeline,
// Teacher Groups & Assignments, Library & Moderation, Audit Log
// ==========================================

export const clips = pgTable('clips', {
  id: text('id').primaryKey(),
  titleJson: jsonb('title_json').notNull(),
  level: text('level').notNull().default('A1'),
  topic: text('topic').notNull().default('campus'),
  grammarPoint: text('grammar_point').notNull().default(''),
  durationSeconds: integer('duration_seconds').notNull().default(5),
  register: text('register').notNull().default('formal'), // 'formal' | 'colloquial'
  registerNoteJson: jsonb('register_note_json').notNull().default({}),
  sceneTheme: text('scene_theme').notNull().default('campus'),
  characterSpeaker: text('character_speaker').notNull().default('Misha'),
  sourceType: text('source_type').notNull(), // 'madi_creator' | 'ai_original' | 'open_license'
  license: text('license').notNull(),
  author: text('author').notNull(),
  consentConfirmed: boolean('consent_confirmed').notNull().default(false),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  reviewStatus: text('review_status').notNull().default('needs_review'), // 'draft' | 'needs_review' | 'approved' | 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

export const clipLines = pgTable('clip_lines', {
  id: serial('id').primaryKey(),
  clipId: text('clip_id')
    .references(() => clips.id)
    .notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  russianSubtitle: text('russian_subtitle').notNull(),
  translationsJson: jsonb('translations_json').notNull(),
  wordTimingsJson: jsonb('word_timings_json').notNull().default([]),
});

export const clipReviews = pgTable('clip_reviews', {
  id: serial('id').primaryKey(),
  clipId: text('clip_id')
    .references(() => clips.id)
    .notNull(),
  reviewerId: text('reviewer_id')
    .references(() => profiles.id)
    .notNull(),
  status: text('status').notNull(), // 'approved' | 'rejected'
  comments: text('comments').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recordings = pgTable('recordings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull(),
  clipId: text('clip_id').notNull(),
  consentStored: boolean('consent_stored').notNull().default(false),
  audioDataUrl: text('audio_data_url'), // Null unless consentStored = true
  durationSeconds: integer('duration_seconds').notNull().default(4),
  createdAt: timestamp('created_at').defaultNow(),
});

export const speechAttempts = pgTable('speech_attempts', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id)
    .notNull(),
  clipId: text('clip_id').notNull(),
  transcript: text('transcript').notNull(),
  accuracyScore: integer('accuracy_score').notNull(),
  stressEstimateScore: integer('stress_estimate_score').notNull(),
  fluencyScore: integer('fluency_score').notNull(),
  completenessScore: integer('completeness_score').notNull(),
  overallScore: integer('overall_score').notNull(),
  stars: integer('stars').notNull().default(1),
  mispronouncedWordsJson: jsonb('mispronounced_words_json').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scenarios = pgTable('scenarios', {
  id: text('id').primaryKey(),
  titleJson: jsonb('title_json').notNull(),
  subtitleJson: jsonb('subtitle_json').notNull(),
  level: text('level').notNull().default('A1'),
  topic: text('topic').notNull().default('campus'),
  sceneTheme: text('scene_theme').notNull().default('cafe'),
  npcRoleJson: jsonb('npc_role_json').notNull(),
  studentRoleJson: jsonb('student_role_json').notNull(),
  usefulPhrasesJson: jsonb('useful_phrases_json').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scenarioNodes = pgTable('scenario_nodes', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id')
    .references(() => scenarios.id)
    .notNull(),
  nodeKey: text('node_key').notNull(),
  npcSpeaker: text('npc_speaker').notNull(),
  npcLine: text('npc_line').notNull(),
  npcTranslationsJson: jsonb('npc_translations_json').notNull(),
  hintsJson: jsonb('hints_json').notNull(),
  optionsJson: jsonb('options_json').notNull(),
});

export const generationJobs = pgTable('generation_jobs', {
  id: text('id').primaryKey(),
  requestedBy: text('requested_by')
    .references(() => profiles.id)
    .notNull(),
  level: text('level').notNull(),
  topic: text('topic').notNull(),
  grammarPoint: text('grammar_point').notNull(),
  register: text('register').notNull().default('formal'),
  providerUsed: text('provider_used').notNull().default('gemini-3.8-flash'),
  status: text('status').notNull().default('completed'),
  validationReportJson: jsonb('validation_report_json').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviewQueue = pgTable('review_queue', {
  id: text('id').primaryKey(),
  itemType: text('item_type').notNull(), // 'ai_dialogue' | 'speaking_clip' | 'custom_lesson' | 'library_upload'
  title: text('title').notNull(),
  level: text('level').notNull().default('A1'),
  topic: text('topic').notNull().default('campus'),
  grammarPoint: text('grammar_point').notNull().default(''),
  register: text('register').notNull().default('formal'),
  status: text('status').notNull().default('needs_review'), // 'draft' | 'needs_review' | 'approved' | 'rejected'
  createdBy: text('created_by').notNull(),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  reviewerComments: text('reviewer_comments').notNull().default(''),
  consentConfirmed: boolean('consent_confirmed').notNull().default(true),
  payloadJson: jsonb('payload_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  teacherId: text('teacher_id')
    .references(() => profiles.id)
    .notNull(),
  level: text('level').notNull().default('A1'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const groupMembers = pgTable(
  'group_members',
  {
    id: serial('id').primaryKey(),
    groupId: text('group_id')
      .references(() => groups.id)
      .notNull(),
    studentId: text('student_id')
      .references(() => profiles.id)
      .notNull(),
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  (table) => [uniqueIndex('group_members_group_student_idx').on(table.groupId, table.studentId)]
);

export const assignments = pgTable('assignments', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .references(() => groups.id)
    .notNull(),
  targetType: text('target_type').notNull(), // 'lesson' | 'speaking_clip' | 'scenario' | 'typing_lab'
  targetId: text('target_id').notNull(),
  title: text('title').notNull(),
  dueDate: text('due_date').notNull(),
  createdBy: text('created_by').notNull(),
  completedStudentIdsJson: jsonb('completed_student_ids_json').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .references(() => groups.id)
    .notNull(),
  authorName: text('author_name').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const libraryItems = pgTable('library_items', {
  id: text('id').primaryKey(),
  titleJson: jsonb('title_json').notNull(),
  author: text('author').notNull(),
  section: text('section').notNull(), // 'textbooks' | 'reading' | 'grammar_ref' | 'exam_prep' | 'teacher_materials'
  level: text('level').notNull().default('A1'),
  topic: text('topic').notNull().default('campus'),
  explanationLang: text('explanation_lang').notNull().default('all'),
  licenseType: text('license_type').notNull(),
  licenseText: text('license_text').notNull(),
  permissionConfirmed: boolean('permission_confirmed').notNull().default(false),
  permissionDocUrl: text('permission_doc_url'),
  reviewStatus: text('review_status').notNull().default('needs_review'), // 'needs_review' | 'approved' | 'rejected'
  reviewedBy: text('reviewed_by'),
  pagesJson: jsonb('pages_json').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const libraryReviews = pgTable('library_reviews', {
  id: serial('id').primaryKey(),
  libraryItemId: text('library_item_id')
    .references(() => libraryItems.id)
    .notNull(),
  reviewerId: text('reviewer_id')
    .references(() => profiles.id)
    .notNull(),
  status: text('status').notNull(),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  targetType: text('target_type').notNull(), // 'library_item' | 'speaking_clip'
  targetId: text('target_id').notNull(),
  targetTitle: text('target_title').notNull(),
  reportedBy: text('reported_by').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'unpublished_resolved' | 'dismissed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: text('details').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

