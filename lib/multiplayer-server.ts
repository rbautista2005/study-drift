import { getDatabase } from '@/db';
import {
  getDefaultMultiplayerDeck,
  getMultiplayerDeck,
  publicQuestion,
} from '@/lib/multiplayer-deck.server';
import { pointsForAnswer } from '@/lib/race-engine';
import type {
  AnswerOutcome,
  MultiplayerLeaveResponse,
  MultiplayerPlayer,
  MultiplayerResponse,
  MultiplayerRoom,
  MultiplayerRoomStatus,
  MultiplayerSession,
} from '@/lib/multiplayer-types';

type RoomRow = {
  id: string;
  code: string;
  status: MultiplayerRoomStatus;
  study_set_id: string;
  deck_version: string;
  question_ids_json: string;
  mastery_target: number;
  max_players: number;
  host_player_id: string;
  winner_player_id: string | null;
  version: number;
  created_at_ms: number;
  starts_at_ms: number | null;
  expires_at_ms: number;
};

type PlayerRow = {
  id: string;
  room_id: string;
  token_hash: string;
  display_name: string;
  is_host: number;
  ready: number;
  score: number;
  correct_count: number;
  answered_count: number;
  streak: number;
  joined_at_ms: number;
  finished_at_ms: number | null;
};

type AnswerRow = {
  selected_index: number;
  correct: number;
  points_awarded: number;
};

type SessionInput = {
  code: string;
  playerId: string;
  token: string;
};

export class MultiplayerError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const joinAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(
    bytes,
    (byte) => joinAlphabet[byte % joinAlphabet.length],
  ).join('');
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function cleanCode(value: unknown) {
  if (typeof value !== 'string')
    throw new MultiplayerError('Enter a valid room code.');
  const code = value.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code))
    throw new MultiplayerError('Room codes are six characters.');
  return code;
}

function cleanName(value: unknown) {
  if (typeof value !== 'string')
    throw new MultiplayerError('Enter a display name.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) {
    throw new MultiplayerError('Display names must be 2–20 characters.');
  }
  return name;
}

function cleanSession(value: Record<string, unknown>): SessionInput {
  const code = cleanCode(value.code);
  const playerId = typeof value.playerId === 'string' ? value.playerId : '';
  const token = typeof value.token === 'string' ? value.token : '';
  if (!playerId || token.length < 24)
    throw new MultiplayerError('Your lobby session is missing.', 401);
  return { code, playerId, token };
}

function publicPlayer(row: PlayerRow): MultiplayerPlayer {
  return {
    id: row.id,
    displayName: row.display_name,
    isHost: Boolean(row.is_host),
    ready: Boolean(row.ready),
    score: row.score,
    correctCount: row.correct_count,
    answeredCount: row.answered_count,
    streak: row.streak,
    finished: row.finished_at_ms !== null,
    finishedAtMs: row.finished_at_ms,
  };
}

async function findRoom(code: string) {
  const room = await getDatabase()
    .prepare('SELECT * FROM race_rooms WHERE code = ? LIMIT 1')
    .bind(code)
    .first<RoomRow>();

  if (!room || room.expires_at_ms < Date.now()) {
    throw new MultiplayerError('That lobby is missing or expired.', 404);
  }
  return room;
}

async function authenticate(input: SessionInput) {
  const room = await findRoom(input.code);
  const player = await getDatabase()
    .prepare('SELECT * FROM race_players WHERE id = ? AND room_id = ? LIMIT 1')
    .bind(input.playerId, room.id)
    .first<PlayerRow>();

  if (!player || player.token_hash !== (await hashToken(input.token))) {
    throw new MultiplayerError('Your lobby session is no longer valid.', 401);
  }
  return { room, player };
}

async function roomView(room: RoomRow, meId: string): Promise<MultiplayerRoom> {
  const playerResult = await getDatabase()
    .prepare(
      `SELECT * FROM race_players
       WHERE room_id = ?
       ORDER BY joined_at_ms ASC`,
    )
    .bind(room.id)
    .all<PlayerRow>();
  const players = playerResult.results.map(publicPlayer);
  const me = players.find((player) => player.id === meId);
  if (!me) throw new MultiplayerError('You are no longer in this lobby.', 401);

  const deck = getMultiplayerDeck(room.deck_version);
  if (!deck)
    throw new MultiplayerError('This race deck version is unavailable.', 409);
  const questionIds = JSON.parse(room.question_ids_json) as string[];
  const questionById = new Map(
    deck.questions.map((question) => [question.id, question]),
  );
  const questions = questionIds.map((id) => questionById.get(id));
  if (questions.some((question) => !question)) {
    throw new MultiplayerError('This race blueprint is incomplete.', 409);
  }

  return {
    id: room.id,
    code: room.code,
    status: room.status,
    studySetId: room.study_set_id,
    studySetTitle: deck.title,
    deckVersion: room.deck_version,
    questionIds,
    questions: questions.map((question) => publicQuestion(question!)),
    masteryTarget: room.mastery_target,
    maxPlayers: room.max_players,
    winnerPlayerId: room.winner_player_id,
    version: room.version,
    startsAtMs: room.starts_at_ms,
    serverNow: Date.now(),
    players,
    me,
  };
}

export async function createRoom(
  nameValue: unknown,
): Promise<MultiplayerResponse> {
  const db = getDatabase();
  const displayName = cleanName(nameValue);
  const now = Date.now();
  const roomId = crypto.randomUUID();
  const playerId = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const deck = getDefaultMultiplayerDeck();
  const questionIds = deck.questions.map((question) => question.id);

  await db
    .prepare('DELETE FROM race_rooms WHERE expires_at_ms < ?')
    .bind(now)
    .run();

  let code = randomCode();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const exists = await db
      .prepare('SELECT id FROM race_rooms WHERE code = ?')
      .bind(code)
      .first();
    if (!exists) break;
    code = randomCode();
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO race_rooms (
          id, code, status, study_set_id, deck_version, question_ids_json,
          mastery_target, max_players, host_player_id, version, created_at_ms, expires_at_ms
        ) VALUES (?, ?, 'lobby', ?, ?, ?, ?, 4, ?, 1, ?, ?)`,
      )
      .bind(
        roomId,
        code,
        deck.id,
        deck.version,
        JSON.stringify(questionIds),
        questionIds.length,
        playerId,
        now,
        now + 30 * 60 * 1000,
      ),
    db
      .prepare(
        `INSERT INTO race_players (
          id, room_id, token_hash, display_name, is_host, ready, joined_at_ms
        ) VALUES (?, ?, ?, ?, 1, 1, ?)`,
      )
      .bind(playerId, roomId, tokenHash, displayName, now),
  ]);

  const session: MultiplayerSession = { code, playerId, token };
  const room = await findRoom(code);
  return { session, room: await roomView(room, playerId) };
}

export async function joinRoom(
  codeValue: unknown,
  nameValue: unknown,
): Promise<MultiplayerResponse> {
  const db = getDatabase();
  const code = cleanCode(codeValue);
  const displayName = cleanName(nameValue);
  const room = await findRoom(code);

  if (room.status !== 'lobby')
    throw new MultiplayerError('That race has already started.', 409);

  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM race_players WHERE room_id = ?')
    .bind(room.id)
    .first<{ count: number }>();
  if ((count?.count ?? 0) >= room.max_players)
    throw new MultiplayerError('That lobby is full.', 409);

  const duplicateName = await db
    .prepare(
      'SELECT id FROM race_players WHERE room_id = ? AND lower(display_name) = lower(?)',
    )
    .bind(room.id, displayName)
    .first();
  if (duplicateName)
    throw new MultiplayerError('That name is already in the lobby.', 409);

  const playerId = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const [playerWrite] = await db.batch([
    db
      .prepare(
        `INSERT INTO race_players (
          id, room_id, token_hash, display_name, is_host, ready, joined_at_ms
        )
        SELECT ?, ?, ?, ?, 0, 0, ?
        WHERE EXISTS (
          SELECT 1 FROM race_rooms
          WHERE id = ? AND status = 'lobby'
            AND (SELECT COUNT(*) FROM race_players WHERE room_id = ?) < max_players
        )
          AND NOT EXISTS (
            SELECT 1 FROM race_players
            WHERE room_id = ? AND lower(display_name) = lower(?)
          )`,
      )
      .bind(
        playerId,
        room.id,
        tokenHash,
        displayName,
        Date.now(),
        room.id,
        room.id,
        room.id,
        displayName,
      ),
    db
      .prepare(
        `UPDATE race_rooms SET version = version + 1
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM race_players WHERE id = ? AND room_id = ?
         )`,
      )
      .bind(room.id, playerId, room.id),
  ]);

  if ((playerWrite.meta.changes ?? 0) === 0) {
    const currentRoom = await findRoom(code);
    if (currentRoom.status !== 'lobby')
      throw new MultiplayerError('That race has already started.', 409);
    const currentCount = await db
      .prepare('SELECT COUNT(*) AS count FROM race_players WHERE room_id = ?')
      .bind(room.id)
      .first<{ count: number }>();
    if ((currentCount?.count ?? 0) >= currentRoom.max_players)
      throw new MultiplayerError('That lobby is full.', 409);
    throw new MultiplayerError('That name is already in the lobby.', 409);
  }

  const session: MultiplayerSession = { code, playerId, token };
  return { session, room: await roomView(await findRoom(code), playerId) };
}

export async function setReady(
  values: Record<string, unknown>,
): Promise<MultiplayerResponse> {
  const session = cleanSession(values);
  const { room, player } = await authenticate(session);
  if (room.status !== 'lobby')
    throw new MultiplayerError(
      'The lobby is no longer accepting ready changes.',
      409,
    );

  await getDatabase().batch([
    getDatabase()
      .prepare('UPDATE race_players SET ready = 1 WHERE id = ?')
      .bind(player.id),
    getDatabase()
      .prepare('UPDATE race_rooms SET version = version + 1 WHERE id = ?')
      .bind(room.id),
  ]);
  return { room: await roomView(await findRoom(room.code), player.id) };
}

export async function startRoom(
  values: Record<string, unknown>,
): Promise<MultiplayerResponse> {
  const session = cleanSession(values);
  const { room, player } = await authenticate(session);
  if (!player.is_host)
    throw new MultiplayerError('Only the host can start the race.', 403);
  if (room.status !== 'lobby')
    throw new MultiplayerError('This race has already started.', 409);

  const startsAtMs = Date.now() + 3000;
  const startWrite = await getDatabase()
    .prepare(
      `UPDATE race_rooms
       SET status = 'racing', starts_at_ms = ?, version = version + 1
       WHERE id = ? AND status = 'lobby'
         AND (SELECT COUNT(*) FROM race_players WHERE room_id = ?) >= 2
         AND NOT EXISTS (
           SELECT 1 FROM race_players WHERE room_id = ? AND ready = 0
         )`,
    )
    .bind(startsAtMs, room.id, room.id, room.id)
    .run();

  if ((startWrite.meta.changes ?? 0) === 0) {
    const currentRoom = await findRoom(room.code);
    if (currentRoom.status !== 'lobby')
      throw new MultiplayerError('This race has already started.', 409);
    const readiness = await getDatabase()
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN ready = 1 THEN 1 ELSE 0 END) AS ready_count
         FROM race_players WHERE room_id = ?`,
      )
      .bind(room.id)
      .first<{ total: number; ready_count: number }>();
    if (!readiness || readiness.total < 2)
      throw new MultiplayerError('Invite at least one other racer first.', 409);
    throw new MultiplayerError('Every racer must be ready.', 409);
  }

  return { room: await roomView(await findRoom(room.code), player.id) };
}

export async function answerQuestion(
  values: Record<string, unknown>,
): Promise<MultiplayerResponse> {
  const session = cleanSession(values);
  const { room, player } = await authenticate(session);
  if (room.status !== 'racing')
    throw new MultiplayerError('This race is not accepting answers.', 409);
  if (room.starts_at_ms && Date.now() < room.starts_at_ms)
    throw new MultiplayerError('Wait for the lights to go out.', 409);
  if (player.finished_at_ms !== null)
    throw new MultiplayerError('You have already finished this race.', 409);

  const answerIndex = values.answerIndex;
  const requestId =
    typeof values.requestId === 'string' ? values.requestId : '';
  if (
    !Number.isInteger(answerIndex) ||
    Number(answerIndex) < 0 ||
    Number(answerIndex) > 3
  ) {
    throw new MultiplayerError('Choose one of the four answers.');
  }
  if (!/^[0-9a-f-]{20,}$/i.test(requestId))
    throw new MultiplayerError('The answer request is missing an id.');

  const deck = getMultiplayerDeck(room.deck_version);
  if (!deck)
    throw new MultiplayerError('This race deck version is unavailable.', 409);
  const questionIds = JSON.parse(room.question_ids_json) as string[];
  const questionId = questionIds[player.answered_count % questionIds.length];
  const question = deck.questions.find(
    (candidate) => candidate.id === questionId,
  );
  if (!question)
    throw new MultiplayerError('The next race question is unavailable.', 409);
  const attemptQuestionId = `${question.id}:${player.answered_count + 1}`;

  const existing = await getDatabase()
    .prepare(
      `SELECT selected_index, correct, points_awarded FROM race_answers
       WHERE room_id = ? AND player_id = ? AND question_id = ? LIMIT 1`,
    )
    .bind(room.id, player.id, attemptQuestionId)
    .first<AnswerRow>();
  if (existing) {
    const outcome: AnswerOutcome = {
      duplicate: true,
      correct: Boolean(existing.correct),
      pointsAwarded: existing.points_awarded,
      correctIndex: question.answerIndex,
      explanation: question.explanation,
    };
    return { outcome, room: await roomView(room, player.id) };
  }

  const correct = Number(answerIndex) === question.answerIndex;
  const nextStreak = correct ? player.streak + 1 : 0;
  const pointsAwarded = correct
    ? pointsForAnswer(question.difficulty, nextStreak)
    : 0;
  const nextAnsweredCount = player.answered_count + 1;
  const nextCorrectCount = player.correct_count + (correct ? 1 : 0);
  const nextScore = player.score + pointsAwarded;
  const passed = nextCorrectCount >= room.mastery_target;
  const finishedAtMs = passed ? Date.now() : null;

  const db = getDatabase();
  const statements = [
    db
      .prepare(
        `INSERT INTO race_answers (
          request_id, room_id, player_id, question_id, selected_index,
          correct, points_awarded, received_at_ms
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM race_rooms
          WHERE id = ? AND status = 'racing'
        ) AND EXISTS (
          SELECT 1 FROM race_players
          WHERE id = ? AND room_id = ? AND finished_at_ms IS NULL
            AND answered_count = ?
        )`,
      )
      .bind(
        requestId,
        room.id,
        player.id,
        attemptQuestionId,
        answerIndex,
        correct ? 1 : 0,
        pointsAwarded,
        Date.now(),
        room.id,
        player.id,
        room.id,
        player.answered_count,
      ),
    db
      .prepare(
        `UPDATE race_players
         SET score = ?, correct_count = ?, answered_count = ?, streak = ?, finished_at_ms = ?
         WHERE id = ? AND answered_count = ?
           AND EXISTS (SELECT 1 FROM race_answers WHERE request_id = ?)`,
      )
      .bind(
        nextScore,
        nextCorrectCount,
        nextAnsweredCount,
        nextStreak,
        finishedAtMs,
        player.id,
        player.answered_count,
        requestId,
      ),
  ];

  if (passed) {
    statements.push(
      db
        .prepare(
          `UPDATE race_rooms
           SET winner_player_id = ?, version = version + 1
           WHERE id = ? AND status = 'racing' AND winner_player_id IS NULL
             AND EXISTS (SELECT 1 FROM race_answers WHERE request_id = ?)`,
        )
        .bind(player.id, room.id, requestId),
    );
  }

  statements.push(
    db
      .prepare(
        `UPDATE race_rooms
         SET status = 'finished', version = version + 1
         WHERE id = ? AND status = 'racing'
           AND EXISTS (SELECT 1 FROM race_answers WHERE request_id = ?)
           AND NOT EXISTS (
             SELECT 1 FROM race_players
             WHERE room_id = ? AND finished_at_ms IS NULL
           )`,
      )
      .bind(room.id, requestId, room.id),
    db
      .prepare(
        `UPDATE race_rooms SET version = version + 1
         WHERE id = ? AND status = 'racing'
           AND EXISTS (SELECT 1 FROM race_answers WHERE request_id = ?)`,
      )
      .bind(room.id, requestId),
  );

  try {
    const [answerWrite] = await db.batch(statements);
    if ((answerWrite.meta.changes ?? 0) === 0) {
      throw new MultiplayerError('The race finished before that answer.', 409);
    }
  } catch (error) {
    if (error instanceof MultiplayerError) throw error;
    throw new MultiplayerError('That answer was already submitted.', 409);
  }

  const outcome: AnswerOutcome = {
    duplicate: false,
    correct,
    pointsAwarded,
    correctIndex: question.answerIndex,
    explanation: question.explanation,
  };
  return {
    outcome,
    room: await roomView(await findRoom(room.code), player.id),
  };
}

export async function readRoom(
  values: Record<string, unknown>,
): Promise<MultiplayerResponse> {
  const session = cleanSession(values);
  const { room, player } = await authenticate(session);
  return { room: await roomView(room, player.id) };
}

export async function leaveRoom(
  values: Record<string, unknown>,
): Promise<MultiplayerLeaveResponse> {
  const session = cleanSession(values);
  const { room, player } = await authenticate(session);

  if (room.status === 'finished') return { left: true };

  const db = getDatabase();
  const replacement = await db
    .prepare(
      `SELECT id FROM race_players
       WHERE room_id = ? AND id != ?
       ORDER BY joined_at_ms ASC LIMIT 1`,
    )
    .bind(room.id, player.id)
    .first<{ id: string }>();

  if (!replacement) {
    await db.prepare('DELETE FROM race_rooms WHERE id = ?').bind(room.id).run();
    return { left: true };
  }

  const statements = [
    db.prepare('DELETE FROM race_players WHERE id = ?').bind(player.id),
  ];

  if (player.is_host) {
    statements.push(
      db
        .prepare('UPDATE race_players SET is_host = 1 WHERE id = ?')
        .bind(replacement.id),
      db
        .prepare(
          `UPDATE race_rooms
           SET host_player_id = ?, version = version + 1 WHERE id = ?`,
        )
        .bind(replacement.id, room.id),
    );
  } else {
    statements.push(
      db
        .prepare('UPDATE race_rooms SET version = version + 1 WHERE id = ?')
        .bind(room.id),
    );
  }

  if (room.status === 'racing') {
    statements.push(
      db
        .prepare(
          `UPDATE race_rooms
           SET status = 'finished',
               winner_player_id = (
                 SELECT id FROM race_players WHERE room_id = ?
                 ORDER BY correct_count DESC, score DESC,
                          finished_at_ms ASC, joined_at_ms ASC LIMIT 1
               ),
               version = version + 1
           WHERE id = ? AND status = 'racing'
             AND NOT EXISTS (
               SELECT 1 FROM race_players
               WHERE room_id = ? AND finished_at_ms IS NULL
             )`,
        )
        .bind(room.id, room.id, room.id),
    );
  }

  await db.batch(statements);
  return { left: true };
}
