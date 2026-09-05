import { CarFront, Flag } from 'lucide-react';
import type { MultiplayerRoom } from '@/lib/multiplayer-types';

export function MultiplayerTrack({ room }: { room: MultiplayerRoom }) {
  return (
    <section className="multiplayer-track" aria-label="Live race standings">
      <div className="multiplayer-track__header">
        <div>
          <span className="telemetry-label">Live positions</span>
          <strong>
            {room.players.length} racers · first to {room.masteryTarget} correct
          </strong>
        </div>
        <span className="track-version">{room.deckVersion}</span>
      </div>
      <div className="multiplayer-lanes">
        {room.players.map((player, index) => {
          const progress = Math.min(
            96,
            (player.answeredCount / room.questionIds.length) * 100,
          );
          const winner = room.winnerPlayerId === player.id;

          return (
            <div className="multiplayer-lane" key={player.id}>
              <span className="multiplayer-lane__name">
                {player.displayName}
                {player.id === room.me.id ? ' · you' : ''}
              </span>
              <div className="multiplayer-lane__road" aria-hidden="true">
                <div className="multiplayer-lane__finish">
                  <Flag size={14} />
                </div>
                <div
                  className={`multiplayer-car multiplayer-car--${(index % 4) + 1}${winner ? ' is-winner' : ''}`}
                  style={{ left: `calc(${Math.max(2, progress)}% - 16px)` }}
                >
                  <CarFront size={18} strokeWidth={2.5} />
                </div>
              </div>
              <strong className="multiplayer-lane__score">
                {player.correctCount}/{room.masteryTarget}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
