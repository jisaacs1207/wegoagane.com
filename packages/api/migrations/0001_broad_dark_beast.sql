CREATE TABLE `memorials` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`destiny_id` text,
	`created_at` integer NOT NULL,
	`character_name` text NOT NULL,
	`level` integer,
	`location` text NOT NULL,
	`cause` text NOT NULL,
	`faction` text NOT NULL,
	`epitaph` text NOT NULL,
	`source_type` text NOT NULL,
	`content_json` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `source_type` text DEFAULT 'template' NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `fallback_used` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `ai_model_id` text;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `ai_latency_ms` integer;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `ai_retries` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `ai_input_tokens` integer;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `ai_output_tokens` integer;--> statement-breakpoint
ALTER TABLE `recommendation_logs` ADD `ai_error_type` text;