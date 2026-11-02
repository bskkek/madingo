CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"author_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"title" text NOT NULL,
	"due_date" text NOT NULL,
	"created_by" text NOT NULL,
	"completed_student_ids_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clip_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"russian_subtitle" text NOT NULL,
	"translations_json" jsonb NOT NULL,
	"word_timings_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clip_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"status" text NOT NULL,
	"comments" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clips" (
	"id" text PRIMARY KEY NOT NULL,
	"title_json" jsonb NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"topic" text DEFAULT 'campus' NOT NULL,
	"grammar_point" text DEFAULT '' NOT NULL,
	"duration_seconds" integer DEFAULT 5 NOT NULL,
	"register" text DEFAULT 'formal' NOT NULL,
	"register_note_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scene_theme" text DEFAULT 'campus' NOT NULL,
	"character_speaker" text DEFAULT 'Misha' NOT NULL,
	"source_type" text NOT NULL,
	"license" text NOT NULL,
	"author" text NOT NULL,
	"consent_confirmed" boolean DEFAULT false NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_status" text DEFAULT 'needs_review' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "examples" (
	"id" text PRIMARY KEY NOT NULL,
	"word_id" text NOT NULL,
	"russian_stressed" text NOT NULL,
	"audio_slug" text NOT NULL,
	"translations_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuel_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text DEFAULT 'lesson' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"requested_by" text NOT NULL,
	"level" text NOT NULL,
	"topic" text NOT NULL,
	"grammar_point" text NOT NULL,
	"register" text DEFAULT 'formal' NOT NULL,
	"provider_used" text DEFAULT 'gemini-3.8-flash' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"validation_report_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"student_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"teacher_id" text NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"slug" text NOT NULL,
	"title_json" jsonb NOT NULL,
	"description_json" jsonb NOT NULL,
	"estimated_minutes" integer DEFAULT 5 NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title_json" jsonb NOT NULL,
	"author" text NOT NULL,
	"section" text NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"topic" text DEFAULT 'campus' NOT NULL,
	"explanation_lang" text DEFAULT 'all' NOT NULL,
	"license_type" text NOT NULL,
	"license_text" text NOT NULL,
	"permission_confirmed" boolean DEFAULT false NOT NULL,
	"permission_doc_url" text,
	"review_status" text DEFAULT 'needs_review' NOT NULL,
	"reviewed_by" text,
	"pages_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_item_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mistakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"step_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"prompt_preview" text DEFAULT '' NOT NULL,
	"correct_answer" text DEFAULT '' NOT NULL,
	"times" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"display_name" text DEFAULT 'Student' NOT NULL,
	"ui_lang" text DEFAULT 'en' NOT NULL,
	"goal_minutes" integer DEFAULT 10 NOT NULL,
	"learning_reason" text DEFAULT 'university' NOT NULL,
	"avatar_id" text DEFAULT 'misha-cap' NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"consent_accepted" boolean DEFAULT true NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"accuracy" integer DEFAULT 100 NOT NULL,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"clip_id" text NOT NULL,
	"consent_stored" boolean DEFAULT false NOT NULL,
	"audio_data_url" text,
	"duration_seconds" integer DEFAULT 4 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"target_title" text NOT NULL,
	"reported_by" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_type" text DEFAULT 'word' NOT NULL,
	"item_ref" text NOT NULL,
	"prompt_preview" text DEFAULT '' NOT NULL,
	"correct_answer" text DEFAULT '' NOT NULL,
	"category_tag" text DEFAULT 'general' NOT NULL,
	"box" integer DEFAULT 1 NOT NULL,
	"due_at" timestamp DEFAULT now() NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"mastered_showroom" boolean DEFAULT false NOT NULL,
	"last_result" text DEFAULT 'wrong' NOT NULL,
	"fail_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"title" text NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"topic" text DEFAULT 'campus' NOT NULL,
	"grammar_point" text DEFAULT '' NOT NULL,
	"register" text DEFAULT 'formal' NOT NULL,
	"status" text DEFAULT 'needs_review' NOT NULL,
	"created_by" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"reviewer_comments" text DEFAULT '' NOT NULL,
	"consent_confirmed" boolean DEFAULT true NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scenario_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"node_key" text NOT NULL,
	"npc_speaker" text NOT NULL,
	"npc_line" text NOT NULL,
	"npc_translations_json" jsonb NOT NULL,
	"hints_json" jsonb NOT NULL,
	"options_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"title_json" jsonb NOT NULL,
	"subtitle_json" jsonb NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"topic" text DEFAULT 'campus' NOT NULL,
	"scene_theme" text DEFAULT 'cafe' NOT NULL,
	"npc_role_json" jsonb NOT NULL,
	"student_role_json" jsonb NOT NULL,
	"useful_phrases_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "speech_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"clip_id" text NOT NULL,
	"transcript" text NOT NULL,
	"accuracy_score" integer NOT NULL,
	"stress_estimate_score" integer NOT NULL,
	"fluency_score" integer NOT NULL,
	"completeness_score" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"stars" integer DEFAULT 1 NOT NULL,
	"mispronounced_words_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"type" text NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"best" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"spare_tire_available" boolean DEFAULT true NOT NULL,
	"spare_tire_used_date" text,
	CONSTRAINT "streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "typing_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"text_id" text NOT NULL,
	"mode" text DEFAULT 'copy' NOT NULL,
	"accuracy" integer DEFAULT 100 NOT NULL,
	"cpm" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"heatmap_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fuel_earned" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "typing_texts" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"topic" text DEFAULT 'campus' NOT NULL,
	"title_json" jsonb NOT NULL,
	"text_stressed" text NOT NULL,
	"text_clean" text NOT NULL,
	"error_spotting_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fill_in_blank_words_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audio_slug" text NOT NULL,
	CONSTRAINT "typing_texts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"order_index" integer NOT NULL,
	"slug" text NOT NULL,
	"landmark_key" text NOT NULL,
	"level_code" text DEFAULT 'A1' NOT NULL,
	"is_locked_by_default" boolean DEFAULT false NOT NULL,
	"title_json" jsonb NOT NULL,
	"subtitle_json" jsonb NOT NULL,
	CONSTRAINT "units_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"word_id" text NOT NULL,
	"status" text DEFAULT 'favorite' NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "word_forms" (
	"word_id" text PRIMARY KEY NOT NULL,
	"forms_json" jsonb NOT NULL,
	"irregular_override_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" text NOT NULL,
	"topic" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" text NOT NULL,
	"lang" text NOT NULL,
	"translation" text NOT NULL,
	"usage_note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" text PRIMARY KEY NOT NULL,
	"russian" text NOT NULL,
	"stressed" text NOT NULL,
	"translit" text NOT NULL,
	"pos" text DEFAULT 'noun' NOT NULL,
	"gender" text,
	"animacy" text,
	"level" text DEFAULT 'A1' NOT NULL,
	"is_madi_term" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"icon_key" text DEFAULT 'book' NOT NULL,
	"audio_slug" text NOT NULL,
	"synonyms_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"antonyms_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_words_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lesson_ids_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_lines" ADD CONSTRAINT "clip_lines_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_reviews" ADD CONSTRAINT "clip_reviews_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_reviews" ADD CONSTRAINT "clip_reviews_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examples" ADD CONSTRAINT "examples_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_log" ADD CONSTRAINT "fuel_log_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_reviews" ADD CONSTRAINT "library_reviews_library_item_id_library_items_id_fk" FOREIGN KEY ("library_item_id") REFERENCES "public"."library_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_reviews" ADD CONSTRAINT "library_reviews_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_nodes" ADD CONSTRAINT "scenario_nodes_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_attempts" ADD CONSTRAINT "speech_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_results" ADD CONSTRAINT "typing_results_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_forms" ADD CONSTRAINT "word_forms_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_topics" ADD CONSTRAINT "word_topics_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_translations" ADD CONSTRAINT "word_translations_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_student_idx" ON "group_members" USING btree ("group_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mistakes_user_step_idx" ON "mistakes" USING btree ("user_id","step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_lesson_idx" ON "progress" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_items_user_ref_idx" ON "review_items" USING btree ("user_id","item_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "user_words_user_word_idx" ON "user_words" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE UNIQUE INDEX "word_topics_word_topic_idx" ON "word_topics" USING btree ("word_id","topic");--> statement-breakpoint
CREATE UNIQUE INDEX "word_translations_word_lang_idx" ON "word_translations" USING btree ("word_id","lang");