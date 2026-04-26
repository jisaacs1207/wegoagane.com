-- Public build artifacts: every roll auto-creates a build_commits row, votes promote drafts to published.
ALTER TABLE `build_commits` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `build_commits` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `build_commits` ADD `thumbs_up` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `build_commits` ADD `thumbs_down` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `build_commits` ADD `rating_score` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `build_commits` ADD `class_id` text;--> statement-breakpoint
ALTER TABLE `build_commits` ADD `archetype_key` text;--> statement-breakpoint
CREATE INDEX `idx_build_commits_status_created_at` ON `build_commits` (`status`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_build_commits_status_rating` ON `build_commits` (`status`, `rating_score`);--> statement-breakpoint
CREATE INDEX `idx_build_commit_feedback_commit_session` ON `build_commit_feedback` (`build_commit_id`, `session_id`);--> statement-breakpoint
-- Reusable AI fragments (destiny enrichment, build plans, name packs) keyed by canonical signals hash.
CREATE TABLE `ai_fragment_cache` (
  `key` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,
  `class_id` text,
  `archetype_key` text,
  `signals_hash` text NOT NULL,
  `payload_json` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `hit_count` integer DEFAULT 0 NOT NULL,
  `last_used_at` integer NOT NULL,
  `created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `idx_ai_fragment_cache_kind_class_arch` ON `ai_fragment_cache` (`kind`, `class_id`, `archetype_key`);--> statement-breakpoint
CREATE INDEX `idx_ai_fragment_cache_last_used` ON `ai_fragment_cache` (`last_used_at`);
