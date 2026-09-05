CREATE TABLE `race_answers` (
	`request_id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_index` integer NOT NULL,
	`correct` integer NOT NULL,
	`points_awarded` integer NOT NULL,
	`received_at_ms` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `race_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `race_players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_answers_player_question_unique` ON `race_answers` (`room_id`,`player_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `race_answers_room_idx` ON `race_answers` (`room_id`);--> statement-breakpoint
CREATE TABLE `race_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`ready` integer DEFAULT false NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`answered_count` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`joined_at_ms` integer NOT NULL,
	`finished_at_ms` integer,
	FOREIGN KEY (`room_id`) REFERENCES `race_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_players_token_unique` ON `race_players` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `race_players_room_name_unique` ON `race_players` (`room_id`,`display_name`);--> statement-breakpoint
CREATE INDEX `race_players_room_idx` ON `race_players` (`room_id`);--> statement-breakpoint
CREATE TABLE `race_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`study_set_id` text NOT NULL,
	`deck_version` text NOT NULL,
	`question_ids_json` text NOT NULL,
	`mastery_target` integer NOT NULL,
	`max_players` integer DEFAULT 4 NOT NULL,
	`host_player_id` text NOT NULL,
	`winner_player_id` text,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at_ms` integer NOT NULL,
	`starts_at_ms` integer,
	`expires_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_rooms_code_unique` ON `race_rooms` (`code`);--> statement-breakpoint
CREATE INDEX `race_rooms_expiry_idx` ON `race_rooms` (`expires_at_ms`);