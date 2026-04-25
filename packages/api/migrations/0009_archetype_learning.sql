CREATE TABLE `runtime_kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE TABLE `archetype_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`archetype_key` text NOT NULL,
	`class_id` text NOT NULL,
	`archetype_json` text NOT NULL,
	`content_fingerprint` text NOT NULL,
	`session_id` text NOT NULL,
	`destiny_id` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`accept_count` integer DEFAULT 0 NOT NULL,
	`miss_count` integer DEFAULT 0 NOT NULL,
	`rating_sum` real DEFAULT 0 NOT NULL,
	`rating_n` integer DEFAULT 0 NOT NULL,
	`prompt_version_at_gen` text,
	`created_at` integer NOT NULL,
	`promoted_at` integer,
	`retired_at` integer
);

CREATE UNIQUE INDEX `archetype_candidates_archetype_key_unique` ON `archetype_candidates` (`archetype_key`);
CREATE UNIQUE INDEX `archetype_candidates_destiny_id_unique` ON `archetype_candidates` (`destiny_id`);
CREATE INDEX `archetype_candidates_status_idx` ON `archetype_candidates` (`status`);
CREATE INDEX `archetype_candidates_fingerprint_idx` ON `archetype_candidates` (`content_fingerprint`);
