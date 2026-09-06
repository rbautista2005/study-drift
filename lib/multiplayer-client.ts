import type {
  MultiplayerLeaveResponse,
  MultiplayerResponse,
  MultiplayerSession,
} from '@/lib/multiplayer-types';
import type { StudySet } from '@/lib/study-data';

const endpoint = '/api/rooms';
const sessionKey = 'study-drift-multiplayer-session';

async function parseResponse<T extends object>(response: Response) {
  const data = (await response.json()) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(data.error ?? 'Multiplayer request failed.');
  return data;
}

async function mutate<T extends object = MultiplayerResponse>(
  body: Record<string, unknown>,
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

function sessionBody(session: MultiplayerSession) {
  return {
    code: session.code,
    playerId: session.playerId,
    token: session.token,
  };
}

export function createMultiplayerRoom(displayName: string, studySet: StudySet) {
  return mutate({ action: 'create', displayName, studySet });
}

export function joinMultiplayerRoom(code: string, displayName: string) {
  return mutate({ action: 'join', code, displayName });
}

export function readyMultiplayerRoom(session: MultiplayerSession) {
  return mutate({ action: 'ready', ...sessionBody(session) });
}

export function startMultiplayerRoom(session: MultiplayerSession) {
  return mutate({ action: 'start', ...sessionBody(session) });
}

export function answerMultiplayerQuestion(
  session: MultiplayerSession,
  answerIndex: number,
) {
  return mutate({
    action: 'answer',
    answerIndex,
    requestId: crypto.randomUUID(),
    ...sessionBody(session),
  });
}

export async function readMultiplayerRoom(session: MultiplayerSession) {
  return mutate({ action: 'read', ...sessionBody(session) });
}

export function leaveMultiplayerRoom(session: MultiplayerSession) {
  return mutate<MultiplayerLeaveResponse>({
    action: 'leave',
    ...sessionBody(session),
  });
}

export function saveMultiplayerSession(session: MultiplayerSession) {
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function restoreMultiplayerSession(): MultiplayerSession | null {
  try {
    const saved = sessionStorage.getItem(sessionKey);
    return saved ? (JSON.parse(saved) as MultiplayerSession) : null;
  } catch {
    return null;
  }
}

export function clearMultiplayerSession() {
  sessionStorage.removeItem(sessionKey);
}
