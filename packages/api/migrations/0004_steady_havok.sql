CREATE TABLE `share_runs` (
	`run_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`destiny_id` text NOT NULL,
	`memorial_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`r2_key` text,
	`public_image_url` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
