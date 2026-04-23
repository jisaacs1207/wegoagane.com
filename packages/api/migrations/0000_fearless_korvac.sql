CREATE TABLE `destinies` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`generated_at` integer NOT NULL,
	`class_id` text NOT NULL,
	`archetype_key` text NOT NULL,
	`tier_prose` text NOT NULL,
	`content_json` text NOT NULL,
	`source_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `question_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`question_key` text NOT NULL,
	`answer_value` text,
	`skipped` integer DEFAULT false NOT NULL,
	`freeform_text` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendation_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`destiny_id` text NOT NULL,
	`selected_archetype` text NOT NULL,
	`ranking_score` real NOT NULL,
	`confidence_score` real NOT NULL,
	`reasons_json` text NOT NULL,
	`validation_failures` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`entry_path` text NOT NULL
);
