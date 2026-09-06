import { Flag } from 'lucide-react';
import { RaceCarModel } from '@/components/race-car-model';
import type { CarSpec } from '@/lib/car-locker';

type RaceTrackProps = {
  progress: number;
  speed: number;
  boost: boolean;
  car: CarSpec;
  label?: string;
};

export function RaceTrack({
  progress,
  speed,
  boost,
  car,
  label = 'You',
}: RaceTrackProps) {
  const safeProgress = Math.min(98, Math.max(6, progress));

  return (
    <section
      className="race-track"
      aria-label={`Race progress: ${Math.round(progress)} percent`}
    >
      <div className="race-track__skyline" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="race-track__meta">
        <div>
          <span className="telemetry-label">Course progress</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <div className="race-track__speed">
          <span className="telemetry-label">Live speed</span>
          <strong>{speed}</strong>
          <small>km/h</small>
        </div>
      </div>
      <div
        className={`race-track__lane${boost ? ' is-boosting' : ''}`}
        aria-hidden="true"
      >
        <div className="race-track__grid" />
        <div className="race-track__finish">
          <Flag size={19} strokeWidth={2.25} />
        </div>
        <div
          className={`race-car${boost ? ' race-car--boost' : ''}`}
          style={{ left: `calc(${safeProgress}% - 38px)` }}
        >
          <span className="race-car__name">{label}</span>
          <span className="race-car__model">
            <RaceCarModel car={car} />
          </span>
        </div>
      </div>
      <div className="race-track__sectors" aria-hidden="true">
        <span>Sector 01</span>
        <span>Sector 02</span>
        <span>Finish</span>
      </div>
    </section>
  );
}
