import type { CSSProperties } from 'react';
import type { CarSpec, CarVariant } from '@/lib/car-locker';

type RaceCarModelProps = {
  car?: Pick<CarSpec, 'color' | 'accent' | 'window' | 'variant'>;
  className?: string;
  number?: number | string;
};

const silhouettes: Record<
  CarVariant,
  { body: string; highlight: string; intake: string; spoiler: string; window: string }
> = {
  sprint: {
    body: 'M6 29c0-5 4-9 10-10l18-3 11-10h24l13 11 13 3c5 1 7 4 7 9v3H6v-3Z',
    highlight: 'M18 20h19L48 9h18l11 10 15 3-4 3H20l-2-5Z',
    intake: 'M41 23h25l-5 5H43l-2-5Z',
    spoiler: 'M11 13h17l4 4H15l-4-4Z',
    window: 'M45 16 51 9h14l9 8-29-1Z',
  },
  rally: {
    body: 'M5 28c1-6 5-10 12-11l18-2L46 4h27l12 12 11 4c4 1 6 5 6 10v3H5v-5Z',
    highlight: 'M18 18h20L49 7h21l11 11 12 4-6 3H19l-1-7Z',
    intake: 'M45 23h23l-4 5H42l3-5Z',
    spoiler: 'M8 10h22l4 5H12l-4-5Z',
    window: 'M45 15 52 7h17l9 9-33-1Z',
  },
  prototype: {
    body: 'M4 30c1-6 7-9 17-10l20-2 10-8h24l9 8 14 5c3 1 4 4 4 8v2H4v-3Z',
    highlight: 'M16 22h27l11-9h19l8 7 14 5-7 2H17l-1-5Z',
    intake: 'M39 25h31l-7 4H43l-4-4Z',
    spoiler: 'M10 15h24l3 4H13l-3-4Z',
    window: 'M48 18 56 12h16l7 7-31-1Z',
  },
  classic: {
    body: 'M5 29c1-6 6-9 14-10l13-2C38 8 46 5 60 5c13 0 20 5 25 13l11 3c4 1 6 5 6 9v3H5v-4Z',
    highlight: 'M17 20h18C42 10 48 8 59 8c11 0 17 4 22 11l12 4-6 3H18l-1-6Z',
    intake: 'M44 24h21l-3 4H46l-2-4Z',
    spoiler: 'M10 15h18l3 3H12l-2-3Z',
    window: 'M38 17c6-7 11-9 21-9 8 0 14 3 19 10l-40-1Z',
  },
  hyper: {
    body: 'M3 30c1-7 8-10 20-11l20-2L55 7h23l8 10 12 5c3 1 4 4 4 8v3H3v-3Z',
    highlight: 'M14 22h31L58 10h17l7 10 13 4-8 3H15l-1-5Z',
    intake: 'M38 24h37l-8 5H44l-6-5Z',
    spoiler: 'M7 12h29l4 5H10l-3-5Z',
    window: 'M48 17 59 10h15l6 9-32-2Z',
  },
  pickup: {
    body: 'M4 29c1-7 6-10 15-10h22V8h25l10 11h15c7 0 11 4 11 10v4H4v-4Z',
    highlight: 'M13 22h29V11h21l9 11h19l-5 4H14l-1-4Z',
    intake: 'M69 24h25l-5 5H70l-1-5Z',
    spoiler: 'M7 14h26v4H8l-1-4Z',
    window: 'M45 17V11h16l9 8-25-2Z',
  },
  bus: {
    body: 'M4 28c0-7 4-11 12-12V7h64c9 0 15 7 15 16v10H4v-5Z',
    highlight: 'M10 22h80v5H10v-5Z',
    intake: 'M78 27h15v3H78v-3Z',
    spoiler: 'M8 12h82v4H8v-4Z',
    window: 'M19 11h12v9H19v-9Zm16 0h12v9H35v-9Zm16 0h12v9H51v-9Zm16 0h12v9H67v-9Z',
  },
  motorcycle: {
    body: 'M17 29h14l12-13h18l8 9h17l8 5v3H16l1-4Z',
    highlight: 'M31 27 45 18h13l7 9H31Z',
    intake: 'M63 25h18l-5 4H64l-1-4Z',
    spoiler: 'M40 13h16l3 3H42l-2-3Z',
    window: 'M47 17l6-8h10l-2 8H47Z',
  },
  scooter: {
    body: 'M14 29h31l7-17h9l-2 13h22c8 0 13 3 15 8H14v-4Z',
    highlight: 'M24 26h29l4-10h3l-2 10H24Z',
    intake: 'M64 27h20l-4 3H64v-3Z',
    spoiler: 'M50 8h12v4H50V8Z',
    window: 'M54 14 57 7h7l-1 7h-9Z',
  },
  quirky: {
    body: 'M9 29c0-7 5-11 13-11V8h48c8 0 13 5 13 12v1h11c5 0 8 4 8 9v3H9v-4Z',
    highlight: 'M26 12h40v15H26V12Z',
    intake: 'M77 25h18l-4 4H77v-4Z',
    spoiler: 'M28 5h11l3 8H30l-2-8Zm28 0h11l-1 8H54l2-8Z',
    window: 'M31 15h30v9H31v-9Z',
  },
};

export function RaceCarModel({
  car,
  className = '',
  number = 1,
}: RaceCarModelProps) {
  const variant = car?.variant ?? 'sprint';
  const silhouette = silhouettes[variant];
  const style = car
    ? ({
        '--race-car-color': car.color,
        '--race-car-accent': car.accent,
        '--race-car-window': car.window,
      } as CSSProperties)
    : undefined;

  return (
    <svg
      aria-hidden="true"
      className={`race-car-model${className ? ` ${className}` : ''}`}
      focusable="false"
      style={style}
      viewBox="0 0 104 44"
    >
      <ellipse className="race-car-model__shadow" cx="52" cy="38" rx="45" ry="4" />
      <g className="race-car-model__vehicle">
        <path
          className="race-car-model__spoiler"
          d={silhouette.spoiler}
        />
        <path
          className="race-car-model__body"
          d={silhouette.body}
        />
        <path
          className="race-car-model__highlight"
          d={silhouette.highlight}
        />
        <path
          className="race-car-model__window"
          d={silhouette.window}
        />
        <path className="race-car-model__split" d="m63 9 2 8" />
        <path className="race-car-model__intake" d={silhouette.intake} />
        <circle className="race-car-model__number" cx="73" cy="24" r="6" />
        <text className="race-car-model__number-text" x="73" y="27">
          {number}
        </text>
        <path className="race-car-model__light" d="m94 22 7 3v3h-8l1-6Z" />
        <path className="race-car-model__bumper" d="M5 29h11v4H4l1-4Z" />
        <g className="race-car-model__wheel race-car-model__wheel--rear">
          <circle cx="27" cy="32" r="9" />
          <circle cx="27" cy="32" r="4" />
          <path d="M27 28v8M23 32h8" />
        </g>
        <g className="race-car-model__wheel race-car-model__wheel--front">
          <circle cx="82" cy="32" r="9" />
          <circle cx="82" cy="32" r="4" />
          <path d="M82 28v8M78 32h8" />
        </g>
      </g>
    </svg>
  );
}
