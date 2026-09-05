DROP INDEX `race_players_room_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `race_players_room_name_ci_unique` ON `race_players` (`room_id`,lower("display_name"));