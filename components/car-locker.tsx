'use client';

import { ArrowLeft, Check, Coins, LockKeyhole } from 'lucide-react';
import { RaceCarModel } from '@/components/race-car-model';
import { Button } from '@/components/ui/button';
import { carCatalog, type CarId, type CarSpec } from '@/lib/car-locker';
import type { PlayerProgress } from '@/lib/player-progress';

type CarLockerProps = {
  playerProgress: PlayerProgress;
  onBack: () => void;
  onRedeem: (car: CarSpec) => boolean;
  onSelect: (carId: CarId) => void;
};

export function CarLocker({
  playerProgress,
  onBack,
  onRedeem,
  onSelect,
}: CarLockerProps) {
  const selectedCar = carCatalog.find(
    (car) => car.id === playerProgress.selectedCarId,
  );

  return (
    <div className="locker-layout">
      <section className="locker-intro">
        <button className="text-button" onClick={onBack} type="button">
          <ArrowLeft size={15} aria-hidden="true" /> Back to garage
        </button>
        <span className="eyebrow">
          <span /> Cosmetic car collection
        </span>
        <h1>Build your grid.</h1>
        <p>
          Redeem drift tokens for new body styles and paint. Every car is
          cosmetic, so your answers—not your ride—still decide the race.
        </p>

        <div className="locker-balance" aria-label={`${playerProgress.tokens} drift tokens available`}>
          <span className="locker-balance__coin" aria-hidden="true">
            <Coins size={22} />
          </span>
          <div>
            <span>Available balance</span>
            <strong>{playerProgress.tokens}</strong>
          </div>
          <small>Drift tokens</small>
        </div>

        <div className="equipped-build">
          <span className="telemetry-label">Currently equipped</span>
          <strong>{selectedCar?.name ?? 'Apex Orange'}</strong>
          <span>{playerProgress.unlockedCarIds.length} of {carCatalog.length} cars unlocked</span>
        </div>
      </section>

      <section className="locker-catalog" aria-labelledby="locker-catalog-heading">
        <div className="locker-catalog__header">
          <div>
            <span className="telemetry-label">Paddock inventory</span>
            <h2 id="locker-catalog-heading">Choose your race car</h2>
          </div>
          <span>{carCatalog.length} builds</span>
        </div>

        <div className="car-bays">
          {carCatalog.map((car, index) => {
            const unlocked = playerProgress.unlockedCarIds.includes(car.id);
            const selected = playerProgress.selectedCarId === car.id;
            const shortfall = Math.max(0, car.cost - playerProgress.tokens);

            return (
              <article
                className={`car-bay${selected ? ' is-equipped' : ''}${unlocked ? ' is-unlocked' : ''}`}
                key={car.id}
              >
                <div className="car-bay__preview" aria-hidden="true">
                  <span className="car-bay__number">{String(index + 1).padStart(2, '0')}</span>
                  <div className="car-bay__road">
                    <RaceCarModel car={car} number={index + 1} />
                  </div>
                </div>
                <div className="car-bay__details">
                  <div className="car-bay__heading">
                    <div>
                      <span>{car.series}</span>
                      <h3>{car.name}</h3>
                    </div>
                    {selected ? (
                      <span className="car-status car-status--equipped">
                        <Check size={13} aria-hidden="true" /> Equipped
                      </span>
                    ) : unlocked ? (
                      <span className="car-status">Owned</span>
                    ) : (
                      <span className="car-status car-status--locked">
                        <LockKeyhole size={12} aria-hidden="true" /> Locked
                      </span>
                    )}
                  </div>
                  <p>{car.description}</p>
                  <div className="car-bay__action">
                    <span className="car-price">
                      {car.cost === 0 ? (
                        'Included'
                      ) : (
                        <>
                          <Coins size={15} aria-hidden="true" /> {car.cost}
                        </>
                      )}
                    </span>
                    {selected ? (
                      <Button disabled className="locker-action locker-action--equipped">
                        <Check size={16} aria-hidden="true" /> On the grid
                      </Button>
                    ) : unlocked ? (
                      <Button className="locker-action" onClick={() => onSelect(car.id)}>
                        Equip car
                      </Button>
                    ) : (
                      <Button
                        className="locker-action"
                        disabled={shortfall > 0}
                        onClick={() => onRedeem(car)}
                      >
                        {shortfall > 0 ? `Need ${shortfall} more` : 'Unlock & equip'}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
