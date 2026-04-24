CREATE TABLE `build_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`destiny_id` text NOT NULL,
	`session_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`publish_tier` text DEFAULT 'draft' NOT NULL,
	`ruleset_pin` text NOT NULL,
	`signals_json` text,
	`payload_json` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `build_plans_destiny_id_unique` ON `build_plans` (`destiny_id`);
CREATE INDEX `idx_build_plans_session` ON `build_plans` (`session_id`);

CREATE TABLE `character_name_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lane` text NOT NULL,
	`gender_lean` text,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`quality_score` real DEFAULT 0 NOT NULL,
	`moderated` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
CREATE INDEX `idx_name_candidates_lane` ON `character_name_candidates` (`lane`, `source`);

INSERT INTO `character_name_candidates` (`lane`, `gender_lean`, `name`, `source`, `quality_score`, `moderated`, `created_at`) VALUES
('lore_world', NULL, 'Thalren', 'seed', 1, 1, 1776970000000),
('lore_world', NULL, 'Morvaine', 'seed', 1, 1, 1776970000000),
('hc_practical', NULL, 'PullTwice', 'seed', 1, 1, 1776970000000),
('hc_practical', NULL, 'BandageMain', 'seed', 1, 1, 1776970000000),
('light_humor', NULL, 'LootGoesRight', 'seed', 1, 1, 1776970000000),
('grimdark', NULL, 'Ashveil', 'seed', 1, 1, 1776970000000),
('neutral', NULL, 'Riverhold', 'seed', 1, 1, 1776970000000),
('pop_culture', NULL, 'SixSlotHero', 'seed', 1, 1, 1776970000000);
