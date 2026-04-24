CREATE TABLE `build_runs_draft` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`entry_path` text NOT NULL,
	`vector` text,
	`depth` text,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`signals_json` text DEFAULT '{}' NOT NULL,
	`question_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `build_commits` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`session_id` text NOT NULL,
	`destiny_id` text NOT NULL,
	`build_plan_id` text,
	`commit_name` text,
	`payload_json` text NOT NULL,
	`card_json` text,
	`source_type` text DEFAULT 'hybrid' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `build_commits_slug_unique` ON `build_commits` (`slug`);
--> statement-breakpoint
CREATE TABLE `build_commit_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`build_commit_id` text NOT NULL,
	`session_id` text,
	`rating` text,
	`note` text,
	`action` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memorial_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`build_commit_id` text NOT NULL,
	`session_id` text NOT NULL,
	`level` integer,
	`zone` text NOT NULL,
	`cause` text NOT NULL,
	`killer` text,
	`note` text,
	`rating` text,
	`memorial_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `name_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`signature` text NOT NULL,
	`name` text NOT NULL,
	`lane` text NOT NULL,
	`source` text DEFAULT 'ai' NOT NULL,
	`quality_score` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
