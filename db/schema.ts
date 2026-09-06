import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const raceRooms = sqliteTable(
  'race_rooms',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    status: text('status').notNull().default('lobby'),
    studySetId: text('study_set_id').notNull(),
    deckVersion: text('deck_version').notNull(),
    questionIdsJson: text('question_ids_json').notNull(),
    masteryTarget: integer('mastery_target').notNull(),
    questionTimeLimitSeconds: integer('question_time_limit_seconds'),
    maxPlayers: integer('max_players').notNull().default(4),
    hostPlayerId: text('host_player_id').notNull(),
    winnerPlayerId: text('winner_player_id'),
    version: integer('version').notNull().default(0),
    createdAtMs: integer('created_at_ms').notNull(),
    startsAtMs: integer('starts_at_ms'),
    expiresAtMs: integer('expires_at_ms').notNull(),
  },
  (table) => [
    uniqueIndex('race_rooms_code_unique').on(table.code),
    index('race_rooms_expiry_idx').on(table.expiresAtMs),
  ],
);

export const racePlayers = sqliteTable(
  'race_players',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => raceRooms.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    displayName: text('display_name').notNull(),
    isHost: integer('is_host', { mode: 'boolean' }).notNull().default(false),
    ready: integer('ready', { mode: 'boolean' }).notNull().default(false),
    correctCount: integer('correct_count').notNull().default(0),
    answeredCount: integer('answered_count').notNull().default(0),
    streak: integer('streak').notNull().default(0),
    joinedAtMs: integer('joined_at_ms').notNull(),
    finishedAtMs: integer('finished_at_ms'),
  },
  (table) => [
    uniqueIndex('race_players_token_unique').on(table.tokenHash),
    uniqueIndex('race_players_room_name_ci_unique').on(
      table.roomId,
      sql`lower(${table.displayName})`,
    ),
    index('race_players_room_idx').on(table.roomId),
  ],
);

export const raceAnswers = sqliteTable(
  'race_answers',
  {
    requestId: text('request_id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => raceRooms.id, { onDelete: 'cascade' }),
    playerId: text('player_id')
      .notNull()
      .references(() => racePlayers.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull(),
    selectedIndex: integer('selected_index').notNull(),
    correct: integer('correct', { mode: 'boolean' }).notNull(),
    receivedAtMs: integer('received_at_ms').notNull(),
  },
  (table) => [
    uniqueIndex('race_answers_player_question_unique').on(
      table.roomId,
      table.playerId,
      table.questionId,
    ),
    index('race_answers_room_idx').on(table.roomId),
  ],
);
