CREATE TABLE `destiny_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`destiny_id` text NOT NULL,
	`choice` text NOT NULL,
	`note` text,
	`reroll_from_class_id` text,
	`reroll_to_class_id` text,
	`created_at` integer NOT NULL
);
