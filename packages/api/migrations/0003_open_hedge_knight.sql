ALTER TABLE `destiny_feedback` ADD `stage` text DEFAULT 'reroll_gate' NOT NULL;--> statement-breakpoint
ALTER TABLE `destiny_feedback` ADD `reroll_reason` text;--> statement-breakpoint
ALTER TABLE `destiny_feedback` ADD `post_accept_rating` text;