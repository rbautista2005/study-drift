'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  LoaderCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
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

type MultiplayerGarageProps = {
  onConnected: (session: MultiplayerSession, room: MultiplayerRoom) => void;
};

export function MultiplayerGarage({ onConnected }: MultiplayerGarageProps) {
  const [intent, setIntent] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    setError('');
    setPending(true);

    try {
      const response =
        intent === 'create'
          ? await createMultiplayerRoom(displayName)
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
          Everyone races the same concepts, difficulty mix, and question order.
          The first racer to master 4 of 5 concepts takes the flag.
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
