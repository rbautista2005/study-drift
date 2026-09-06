'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  LoaderCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { StudyGuideImporter } from '@/components/study-guide-importer';
import { Button } from '@/components/ui/button';
import {
  createMultiplayerRoom,
  joinMultiplayerRoom,
  saveMultiplayerSession,
} from '@/lib/multiplayer-client';
import type {
  MultiplayerRoom,
  MultiplayerSession,
} from '@/lib/multiplayer-types';
import type { StudySet } from '@/lib/study-data';

type MultiplayerGarageProps = {
  onConnected: (session: MultiplayerSession, room: MultiplayerRoom) => void;
  onImport: (studySet: StudySet) => void;
  studySet: StudySet;
};

export function MultiplayerGarage({
  onConnected,
  onImport,
  studySet,
}: MultiplayerGarageProps) {
  const [intent, setIntent] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const questionCount = new Set(
    studySet.questions.map((question) => question.conceptId),
  ).size;

  const submit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setError('');
    setPending(true);

    try {
      const response =
        intent === 'create'
          ? await createMultiplayerRoom(displayName, studySet)
          : await joinMultiplayerRoom(code, displayName);
      if (!response.session)
        throw new Error('The lobby session was not created.');
      saveMultiplayerSession(response.session);
      onConnected(response.session, response.room);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not reach the lobby.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="multiplayer-setup">
      <div className="multiplayer-setup__copy">
        <span className="telemetry-label">Live lobby · Same frozen deck</span>
        <h2>Line up with your crew.</h2>
        <p>
          The host chooses the study set. Everyone then races the same concepts,
          difficulty mix, and question order. Correct answers move your car; the
          first racer to complete the set takes the flag.
        </p>
        <div className="fairness-strip">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            <strong>Fair by design</strong> · Scores only compare inside this
            room.
          </span>
        </div>
      </div>

      <form className="lobby-form" onSubmit={submit}>
        <div className="lobby-intent" role="tablist" aria-label="Lobby action">
          <button
            className={intent === 'create' ? 'is-selected' : ''}
            onClick={() => setIntent('create')}
            role="tab"
            aria-selected={intent === 'create'}
            type="button"
          >
            <Users size={16} aria-hidden="true" /> Host
          </button>
          <button
            className={intent === 'join' ? 'is-selected' : ''}
            onClick={() => setIntent('join')}
            role="tab"
            aria-selected={intent === 'join'}
            type="button"
          >
            <Copy size={16} aria-hidden="true" /> Join code
          </button>
        </div>

        {intent === 'create' && (
          <section
            aria-labelledby="shared-race-set-heading"
            className="shared-set-picker"
          >
            <div className="shared-set-picker__header">
              <span
                className="telemetry-label"
                id="shared-race-set-heading"
              >
                Shared race set
              </span>
              <span className="shared-set-picker__lock">
                <ShieldCheck size={13} aria-hidden="true" /> Frozen deck
              </span>
            </div>
            <div className="shared-set-picker__selection">
              <span className="shared-set-picker__icon">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>{studySet.title}</strong>
                <small>
                  {studySet.course} · {questionCount} questions
                </small>
              </span>
            </div>
            <StudyGuideImporter
              onImport={onImport}
              readyMessage="This set will be locked for everyone when you create the lobby."
              triggerLabel="Upload study set"
            />
            <p>Every racer receives this exact ordered question deck.</p>
          </section>
        )}

        <label>
          <span>Your racer name</span>
          <input
            autoComplete="name"
            maxLength={20}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. Raymond"
            required
            value={displayName}
          />
        </label>

        {intent === 'join' && (
          <label>
            <span>Six-character room code</span>
            <input
              autoCapitalize="characters"
              className="code-input"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              pattern="[A-Za-z2-9]{6}"
              placeholder="DR1FT5"
              required
              value={code}
            />
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <Button
          className="start-button lobby-submit"
          disabled={pending}
          size="lg"
          type="submit"
        >
          {pending ? (
            <LoaderCircle className="spin" size={17} aria-hidden="true" />
          ) : (
            <Check size={17} aria-hidden="true" />
          )}
          {intent === 'create' ? 'Create lobby' : 'Join lobby'}
          {!pending && <ArrowRight size={17} aria-hidden="true" />}
        </Button>
      </form>
    </article>
  );
}
