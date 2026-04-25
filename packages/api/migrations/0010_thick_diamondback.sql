CREATE TABLE `candidate_events` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`archetype_key` text NOT NULL,
	`destiny_id` text,
	`session_id` text,
	`event_type` text NOT NULL,
	`payload_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `race_suggestion` text;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `faction_suggestion` text;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `gender_lean` text;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `display_status` text DEFAULT 'experimental_live' NOT NULL;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `exposure_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `commit_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `reroll_close_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `reroll_off_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `freeform_signal_json` text;--> statement-breakpoint
ALTER TABLE `archetype_candidates` ADD `promotion_score` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `destiny_feedback` ADD `reroll_verdict` text;--> statement-breakpoint
ALTER TABLE `destiny_feedback` ADD `parsed_signal_json` text;