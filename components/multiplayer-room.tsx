'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Crown,
  LoaderCircle,
  Radio,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
  X,
  Zap,
} from 'lucide-react';
import { MultiplayerTrack } from '@/components/multiplayer-track';
import { Button } from '@/components/ui/button';
import {
  answerMultiplayerQuestion,
  readMultiplayerRoom,
  readyMultiplayerRoom,
  startMultiplayerRoom,
} from '@/lib/multiplayer-client';
import type {
  AnswerOutcome,
  MultiplayerRoom as MultiplayerRoomState,
  MultiplayerSession,
} from '@/lib/multiplayer-types';
import { difficultyLabel } from '@/lib/race-engine';

const choiceKeys = ['1', '2', '3', '4'];

type MultiplayerRoomProps = {
  initialRoom: MultiplayerRoomState;
  session: MultiplayerSession;
  onExit: () => void;
};

export function MultiplayerRoom({
  initialRoom,
  session,
  onExit,
}: MultiplayerRoomProps) {
  const [room, setRoom] = useState(initialRoom);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const response = await readMultiplayerRoom(session);
        if (!cancelled) {
          setRoom(response.room);
          setError('');
        }
      } catch {
        if (!cancelled) setError('Connection interrupted. Retrying…');
      }

      if (!cancelled && room.status !== 'finished') {
        timer = setTimeout(
          poll,
          document.hidden ? 3500 : room.status === 'lobby' ? 1400 : 750,
        );
      }
    };

    timer = setTimeout(poll, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [room.status, session]);

  if (room.status === 'lobby') {
    return (
      <Lobby
        error={error}
        onExit={onExit}
        pending={pending}
        room={room}
        onReady={async () => {
          setPending(true);
          setError('');
          try {
            setRoom((await readyMultiplayerRoom(session)).room);
          } catch (requestError) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : 'Could not mark you ready.',
            );
          } finally {
            setPending(false);
          }
        }}
        onStart={async () => {
          setPending(true);
          setError('');
          try {
            setRoom((await startMultiplayerRoom(session)).room);
          } catch (requestError) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : 'Could not start the race.',
            );
          } finally {
            setPending(false);
          }
        }}
      />
    );
  }

  if (room.status === 'finished')
    return <MultiplayerResults room={room} onExit={onExit} />;
  return (
    <LiveMultiplayerRace
      error={error}
      room={room}
      session={session}
      onRoom={setRoom}
    />
  );
}

function Lobby({
  error,
  onExit,
  onReady,
  onStart,
  pending,
  room,
}: {
  error: string;
  onExit: () => void;
  onReady: () => void;
  onStart: () => void;
  pending: boolean;
  room: MultiplayerRoomState;
}) {
  const [copied, setCopied] = useState(false);
  const everyoneReady =
    room.players.length >= 2 && room.players.every((player) => player.ready);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="lobby-layout">
      <section className="lobby-stage">
        <button className="text-button" onClick={onExit} type="button">
          <ArrowLeft size={15} aria-hidden="true" /> Leave lobby
        </button>
        <span className="eyebrow">
          <span /> Multiplayer paddock
        </span>
        <h1>Waiting on the grid.</h1>
        <p>
          Share the room code, have every racer ready up, then launch the same
          five-question track together.
        </p>

        <button
          className="join-code"
          onClick={copyCode}
          type="button"
          aria-label="Copy room code"
        >
          <span className="telemetry-label">Room code</span>
          <strong>{room.code}</strong>
          <span>
            {copied ? (
              <>
                <Check size={15} /> Copied
              </>
            ) : (
              <>
                <Clipboard size={15} /> Copy
              </>
            )}
          </span>
        </button>

        <div className="lobby-rules">
          <ShieldCheck size={19} aria-hidden="true" />
          <p>
            <strong>Locked race blueprint.</strong> {room.questionIds.length}{' '}
            questions from {room.studySetTitle} · {room.masteryTarget} correct
            to win · {room.deckVersion}
          </p>
        </div>
      </section>

      <aside className="roster-card">
        <div className="roster-card__header">
          <div>
            <span className="telemetry-label">Grid positions</span>
            <h2>
              {room.players.length} / {room.maxPlayers} racers
            </h2>
          </div>
          <Radio className="radio-pulse" size={20} aria-label="Lobby is live" />
        </div>
        <div className="roster-list">
          {room.players.map((player, index) => (
            <div className="roster-player" key={player.id}>
              <span
                className={`roster-player__number roster-player__number--${(index % 4) + 1}`}
              >
                0{index + 1}
              </span>
              <div>
                <strong>
                  {player.displayName}
                  {player.id === room.me.id ? ' · you' : ''}
                </strong>
                <span>{player.isHost ? 'Host' : 'Racer'}</span>
              </div>
              <span
                className={
                  player.ready ? 'ready-status is-ready' : 'ready-status'
                }
              >
                {player.ready ? (
                  <>
                    <UserRoundCheck size={14} /> Ready
                  </>
                ) : (
                  'Not ready'
                )}
              </span>
            </div>
          ))}
          {Array.from(
            { length: room.maxPlayers - room.players.length },
            (_, index) => (
              <div className="roster-player roster-player--empty" key={index}>
                <span className="roster-player__number">—</span>
                <span>Open grid position</span>
              </div>
            ),
          )}
        </div>

        {error && (
          <p className="form-error roster-error" role="alert">
            {error}
          </p>
        )}

        <div className="roster-actions">
          {!room.me.ready && (
            <Button
              className="start-button"
              disabled={pending}
              size="lg"
              onClick={onReady}
            >
              {pending ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <UserRoundCheck size={17} />
              )}{' '}
              Ready up
            </Button>
          )}
          {room.me.isHost && (
            <Button
              className="start-button"
              disabled={pending || !everyoneReady}
              size="lg"
              onClick={onStart}
            >
              Start race <ArrowRight size={17} />
            </Button>
          )}
          {!room.me.isHost && room.me.ready && (
            <p className="waiting-copy">
              <Radio size={15} /> Waiting for the host to start…
            </p>
          )}
          {room.me.isHost && room.players.length < 2 && (
            <p className="waiting-copy">
              Invite one more racer to unlock the start.
            </p>
          )}
          {room.me.isHost && room.players.length >= 2 && !everyoneReady && (
            <p className="waiting-copy">Waiting for every racer to ready up.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function LiveMultiplayerRace({
  error,
  room,
  session,
  onRoom,
}: {
  error: string;
  room: MultiplayerRoomState;
  session: MultiplayerSession;
  onRoom: (room: MultiplayerRoomState) => void;
}) {
  const [cursor, setCursor] = useState(room.me.answeredCount);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const [pending, setPending] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [serverOffset] = useState(() => room.serverNow - Date.now());
  const [clock, setClock] = useState(room.serverNow);

  useEffect(() => {
    if (!room.startsAtMs) return;
    const timer = setInterval(() => setClock(Date.now() + serverOffset), 100);
    return () => clearInterval(timer);
  }, [room.startsAtMs, serverOffset]);

  const countdown = room.startsAtMs
    ? Math.max(0, Math.ceil((room.startsAtMs - clock) / 1000))
    : 0;
  const question = room.questions[cursor];
  const waitingForOthers = !question && room.status === 'racing';

  const submit = useCallback(
    async (index: number) => {
      if (!question || outcome || pending || countdown > 0) return;
      setSelectedIndex(index);
      setPending(true);
      setAnswerError('');
      try {
        const response = await answerMultiplayerQuestion(session, index);
        if (!response.outcome)
          throw new Error('The answer result was missing.');
        setOutcome(response.outcome);
        onRoom(response.room);
      } catch (requestError) {
        setSelectedIndex(null);
        setAnswerError(
          requestError instanceof Error
            ? requestError.message
            : 'Your answer could not be submitted. Try again.',
        );
      } finally {
        setPending(false);
      }
    },
    [countdown, onRoom, outcome, pending, question, session],
  );

  const advance = useCallback(() => {
    if (!outcome) return;
    setCursor(room.me.answeredCount);
    setSelectedIndex(null);
    setOutcome(null);
  }, [outcome, room.me.answeredCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key >= '1' && event.key <= '4' && !outcome)
        void submit(Number(event.key) - 1);
      if (event.key === 'Enter' && outcome) advance();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, outcome, submit]);

  if (countdown > 0) {
    return (
      <div className="countdown-screen">
        <span className="telemetry-label">
          Room {room.code} · Syncing start
        </span>
        <strong key={countdown}>{countdown}</strong>
        <p>
          Same deck. Same difficulty. First to {room.masteryTarget} correct
          wins.
        </p>
      </div>
    );
  }

  return (
    <div className="race-layout multiplayer-race-layout">
      {error && <output className="connection-banner">{error}</output>}
      {answerError && (
        <p className="connection-banner connection-banner--error" role="alert">
          {answerError}
        </p>
      )}
      <div className="race-telemetry">
        <div>
          <span className="telemetry-label">Room</span>
          <strong>{room.code}</strong>
        </div>
        <div>
          <span className="telemetry-label">Question</span>
          <strong>
            {Math.min(cursor + 1, room.questionIds.length)} /{' '}
            {room.questionIds.length}
          </strong>
        </div>
        <div>
          <span className="telemetry-label">Correct</span>
          <strong>
            {room.me.correctCount} / {room.masteryTarget}
          </strong>
        </div>
        <div>
          <span className="telemetry-label">Streak</span>
          <strong className={room.me.streak > 1 ? 'hot' : ''}>
            {room.me.streak}×
          </strong>
        </div>
      </div>
      <MultiplayerTrack room={room} />

      {waitingForOthers ? (
        <section className="question-panel waiting-panel">
          <Radio className="radio-pulse" size={30} />
          <h1>Lap complete. Hold your line.</h1>
          <p>
            Your answers are locked. The final flag drops when another racer
            reaches mastery or every car completes the course.
          </p>
        </section>
      ) : question ? (
        <section
          className="question-panel"
          aria-labelledby="multiplayer-question-heading"
        >
          <div className="question-panel__meta">
            <span>Live question {cursor + 1}</span>
            <span className={`difficulty difficulty--${question.difficulty}`}>
              <Zap size={13} aria-hidden="true" />{' '}
              {difficultyLabel[question.difficulty]}
            </span>
            <span>{question.topic}</span>
          </div>
          <h1 id="multiplayer-question-heading">{question.prompt}</h1>
          <fieldset className="answer-grid">
            <legend className="sr-only">Answer choices</legend>
            {question.choices.map((choice, index) => {
              const isCorrect = outcome?.correctIndex === index;
              const isWrongSelection =
                outcome && selectedIndex === index && !outcome.correct;
              return (
                <button
                  className={`answer${isCorrect ? ' answer--correct' : ''}${isWrongSelection ? ' answer--wrong' : ''}`}
                  disabled={Boolean(outcome) || pending}
                  key={choice}
                  onClick={() => void submit(index)}
                  type="button"
                >
                  <span className="answer__key">{choiceKeys[index]}</span>
                  <span>{choice}</span>
                  {isCorrect && (
                    <Check
                      className="answer__state"
                      size={18}
                      aria-label="Correct answer"
                    />
                  )}
                  {isWrongSelection && (
                    <X
                      className="answer__state"
                      size={18}
                      aria-label="Your incorrect answer"
                    />
                  )}
                </button>
              );
            })}
          </fieldset>
          {outcome && (
            <div
              className={`feedback${outcome.correct ? ' feedback--correct' : ' feedback--wrong'}`}
              aria-live="polite"
            >
              <div>
                <span className="feedback__title">
                  {outcome.correct ? (
                    <>
                      <Check size={18} /> +{outcome.pointsAwarded} · Clean line
                    </>
                  ) : (
                    <>
                      <X size={18} /> No boost this turn
                    </>
                  )}
                </span>
                <p>{outcome.explanation}</p>
              </div>
              <Button className="continue-button" onClick={advance}>
                Next turn <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function MultiplayerResults({
  room,
  onExit,
}: {
  room: MultiplayerRoomState;
  onExit: () => void;
}) {
  const standings = useMemo(
    () =>
      [...room.players].sort(
        (a, b) =>
          Number(b.id === room.winnerPlayerId) -
            Number(a.id === room.winnerPlayerId) ||
          b.correctCount - a.correctCount ||
          b.score - a.score,
      ),
    [room.players, room.winnerPlayerId],
  );
  const winner =
    standings.find((player) => player.id === room.winnerPlayerId) ??
    standings[0];
  const didWin = winner?.id === room.me.id;

  return (
    <div className="multiplayer-results">
      <section className="multiplayer-results__hero">
        <div className="finish-emblem finish-emblem--passed">
          {didWin ? <Trophy size={32} /> : <Crown size={32} />}
        </div>
        <span className="eyebrow">
          <span /> Final classification · {room.code}
        </span>
        <h1>
          {didWin
            ? 'You took the flag.'
            : `${winner?.displayName ?? 'A racer'} takes the flag.`}
        </h1>
        <p>
          One frozen study set, one shared finish line. Your result reflects
          mastery inside this room—not a comparison to a different question mix.
        </p>
        <Button className="start-button" size="lg" onClick={onExit}>
          Back to garage <ArrowRight size={17} />
        </Button>
      </section>

      <aside className="standings-card">
        <div className="standings-card__header">
          <div>
            <span className="telemetry-label">Official result</span>
            <h2>Race standings</h2>
          </div>
          <ShieldCheck size={21} aria-label="Server-validated results" />
        </div>
        {standings.map((player, index) => (
          <div
            className={`standing-row${index === 0 ? ' standing-row--winner' : ''}`}
            key={player.id}
          >
            <strong className="standing-row__rank">
              {String(index + 1).padStart(2, '0')}
            </strong>
            <div>
              <strong>
                {player.displayName}
                {player.id === room.me.id ? ' · you' : ''}
              </strong>
              <span>
                {player.correctCount} correct · {player.score.toLocaleString()}{' '}
                pts
              </span>
            </div>
            {index === 0 && <Crown size={19} aria-label="Winner" />}
          </div>
        ))}
      </aside>
    </div>
  );
}
