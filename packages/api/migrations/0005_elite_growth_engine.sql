ALTER TABLE `recommendation_logs` ADD `growth_variant_id` text;

CREATE TABLE `growth_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`surface` text NOT NULL,
	`variant_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`prompt_version` text,
	`prompt_text` text,
	`payload_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`novelty_score` real DEFAULT 0 NOT NULL,
	`guardrail_status` text DEFAULT 'pending' NOT NULL,
	`guardrail_notes` text,
	`sample_size` integer DEFAULT 0 NOT NULL,
	`accept_rate` real DEFAULT 0 NOT NULL,
	`rerolls_per_session` real DEFAULT 0 NOT NULL,
	`post_accept_rating_avg` real DEFAULT 0 NOT NULL,
	`share_completion_rate` real DEFAULT 0 NOT NULL,
	`validation_failure_rate` real DEFAULT 0 NOT NULL,
	`promoted_at` integer,
	`retired_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE TABLE `growth_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`surface` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`holdout_percent` integer DEFAULT 10 NOT NULL,
	`traffic_percent` integer DEFAULT 25 NOT NULL,
	`min_sample_size` integer DEFAULT 40 NOT NULL,
	`baseline_variant_id` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE TABLE `growth_experiment_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`experiment_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);

CREATE TABLE `growth_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text,
	`variant_id` text,
	`surface` text NOT NULL,
	`session_id` text NOT NULL,
	`entry_path` text,
	`assigned_at` integer NOT NULL,
	`seen_at` integer,
	`converted_at` integer,
	`outcome_json` text,
	`created_at` integer NOT NULL
);

CREATE TABLE `growth_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`metrics_json` text NOT NULL,
	`threshold_json` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE TABLE `growth_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_type` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`input_json` text,
	`output_json` text,
	`error` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`created_at` integer NOT NULL
);
