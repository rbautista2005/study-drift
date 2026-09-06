type RaceCarModelProps = {
  className?: string;
  number?: number | string;
};

export function RaceCarModel({
  className = '',
  number = 1,
}: RaceCarModelProps) {
  return (
    <svg
      aria-hidden="true"
      className={`race-car-model${className ? ` ${className}` : ''}`}
      focusable="false"
      viewBox="0 0 104 44"
    >
      <ellipse className="race-car-model__shadow" cx="52" cy="38" rx="45" ry="4" />
      <g className="race-car-model__vehicle">
        <path
          className="race-car-model__spoiler"
          d="M11 13h17l4 4H15l-4-4Z"
        />
        <path
          className="race-car-model__body"
          d="M6 29c0-5 4-9 10-10l18-3 11-10h24l13 11 13 3c5 1 7 4 7 9v3H6v-3Z"
        />
        <path
          className="race-car-model__highlight"
          d="M18 20h19L48 9h18l11 10 15 3-4 3H20l-2-5Z"
        />
        <path
          className="race-car-model__window"
          d="M45 16 51 9h14l9 8-29-1Z"
        />
        <path className="race-car-model__split" d="m63 9 2 8" />
        <path className="race-car-model__intake" d="M41 23h25l-5 5H43l-2-5Z" />
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
