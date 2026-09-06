export type MultiplayerRoomStatus = 'lobby' | 'racing' | 'finished';

export type MultiplayerQuestion = {
  id: string;
  topic: string;
  difficulty: 1 | 2 | 3;
  prompt: string;
  choices: [string, string, string, string];
};

export type MultiplayerPlayer = {
  id: string;
  displayName: string;
  isHost: boolean;
  ready: boolean;
  correctCount: number;
  answeredCount: number;
  streak: number;
  finished: boolean;
  finishedAtMs: number | null;
};

export type MultiplayerRoom = {
  id: string;
  code: string;
  status: MultiplayerRoomStatus;
  studySetId: string;
  studySetTitle: string;
  deckVersion: string;
  questionIds: string[];
  questions: MultiplayerQuestion[];
  masteryTarget: number;
  maxPlayers: number;
  winnerPlayerId: string | null;
  version: number;
  startsAtMs: number | null;
  serverNow: number;
  players: MultiplayerPlayer[];
  me: MultiplayerPlayer;
};

export type MultiplayerSession = {
  code: string;
  playerId: string;
  token: string;
};

export type AnswerOutcome = {
  duplicate: boolean;
  correct: boolean;
  correctIndex: number;
  explanation: string;
};

export type MultiplayerResponse = {
  room: MultiplayerRoom;
  session?: MultiplayerSession;
  outcome?: AnswerOutcome;
};

export type MultiplayerLeaveResponse = {
  left: true;
};
