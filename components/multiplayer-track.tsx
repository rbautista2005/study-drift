import { Check, Flag } from 'lucide-react';
import { RaceCarModel } from '@/components/race-car-model';
import { carCatalog, type CarSpec } from '@/lib/car-locker';
import type { MultiplayerRoom } from '@/lib/multiplayer-types';

function ordinal(position: number) {
  if (position % 10 === 1 && position % 100 !== 11) return `${position}st`;
  if (position % 10 === 2 && position % 100 !== 12) return `${position}nd`;
  if (position % 10 === 3 && position % 100 !== 13) return `${position}rd`;
  return `${position}th`;
}

export function MultiplayerTrack({
  room,
  selectedCar,
}: {
  room: MultiplayerRoom;
  selectedCar: CarSpec;
}) {
  const finishOrder = [...room.players]
    .filter((player) => player.finishedAtMs !== null)
    .sort(
      (a, b) =>
        Number(b.id === room.winnerPlayerId) -
          Number(a.id === room.winnerPlayerId) ||
        a.finishedAtMs! - b.finishedAtMs! ||
        a.id.localeCompare(b.id),
    );
  const finishPositionById = new Map(
    finishOrder.map((player, index) => [player.id, index + 1]),
  );

  return (
    <section
      className="multiplayer-track"
      aria-label={
        room.status === 'finished'
          ? 'Final race standings'
          : 'Live race standings'
      }
    >
      <div className="multiplayer-track__header">
        <div>
          <span className="telemetry-label">
            {room.status === 'finished' ? 'Final positions' : 'Live positions'}
          </span>
          <strong>
            Correct answers move your car · first to {room.masteryTarget} wins
          </strong>
        </div>
        <span className="track-version">{room.deckVersion}</span>
      </div>
      <div className="multiplayer-lanes">
        {room.players.map((player, index) => {
          const progress = Math.min(
            100,
            (player.correctCount / room.masteryTarget) * 100,
          );
          const trackPosition = player.finished
            ? 101
            : Math.max(2, progress * 0.92);
          const winner = room.winnerPlayerId === player.id;
          const finishPosition = finishPositionById.get(player.id);
          const isBoosting = player.streak > 0;
          const displayCar =
            player.id === room.me.id
              ? selectedCar
              : carCatalog[index % carCatalog.length];

          return (
            <div
              className={`multiplayer-lane${player.finished ? ' has-finished' : ''}`}
              key={player.id}
            >
              <span className="multiplayer-lane__name">
                {player.displayName}
                {player.id === room.me.id ? ' · you' : ''}
              </span>
              <div
                className={`multiplayer-lane__road${isBoosting ? ' is-boosting' : ''}`}
                aria-hidden="true"
              >
                {Array.from({ length: room.masteryTarget - 1 }, (_, marker) => (
                  <span
                    className="multiplayer-lane__checkpoint"
                    key={marker}
                    style={{
                      left: `${((marker + 1) / room.masteryTarget) * 92}%`,
                    }}
                  />
                ))}
                <div className="multiplayer-lane__finish">
                  <Flag size={14} />
                </div>
                <div
                  className={`multiplayer-car multiplayer-car--${(index % 4) + 1}${player.finished ? ' is-finished' : ''}${winner ? ' is-winner' : ''}`}
                  style={{ left: `calc(${trackPosition}% - 27px)` }}
                >
                  <RaceCarModel car={displayCar} number={index + 1} />
                </div>
              </div>
              <strong className="multiplayer-lane__progress">
                {finishPosition ? (
                  <>
                    <Check size={12} /> {ordinal(finishPosition)}
                  </>
                ) : (
                  `${player.correctCount}/${room.masteryTarget}`
                )}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
