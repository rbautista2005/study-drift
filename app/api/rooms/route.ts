import {
  answerQuestion,
  createRoom,
  joinRoom,
  leaveRoom,
  MultiplayerError,
  readRoom,
  setReady,
  startRoom,
} from '@/lib/multiplayer-server';

const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

function handleError(error: unknown) {
  if (error instanceof MultiplayerError)
    return json({ error: error.message }, error.status);
  return json({ error: 'Multiplayer is temporarily unavailable.' }, 503);
}

export async function POST(request: Request) {
  try {
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > 4096)
      throw new MultiplayerError('That request is too large.', 413);
    const body = (await request.json()) as Record<string, unknown>;

    switch (body.action) {
      case 'create':
        return json(await createRoom(body.displayName), 201);
      case 'join':
        return json(await joinRoom(body.code, body.displayName), 201);
      case 'ready':
        return json(await setReady(body));
      case 'start':
        return json(await startRoom(body));
      case 'answer':
        return json(await answerQuestion(body));
      case 'read':
        return json(await readRoom(body));
      case 'leave':
        return json(await leaveRoom(body));
      default:
        throw new MultiplayerError('Choose a valid multiplayer action.');
    }
  } catch (error) {
    return handleError(error);
  }
}
