export type CarId =
  | 'apex-orange'
  | 'tide-runner'
  | 'solar-flare'
  | 'midnight-rs'
  | 'aurora-gt'
  | 'trail-hauler'
  | 'pop-quiz-express'
  | 'neon-comet'
  | 'campus-cruiser'
  | 'toaster-turbo';

export type CarVariant =
  | 'sprint'
  | 'rally'
  | 'prototype'
  | 'classic'
  | 'hyper'
  | 'pickup'
  | 'bus'
  | 'motorcycle'
  | 'scooter'
  | 'quirky';

export type CarSpec = {
  id: CarId;
  name: string;
  series: string;
  description: string;
  cost: number;
  color: string;
  accent: string;
  window: string;
  variant: CarVariant;
};

export const starterCarId: CarId = 'apex-orange';

export const carCatalog: readonly CarSpec[] = [
  {
    id: starterCarId,
    name: 'Apex Orange',
    series: 'Starter build',
    description: 'The original Study Drift sprint car. Light, loud, and ready.',
    cost: 0,
    color: '#ff5b35',
    accent: '#ffd166',
    window: '#9dd2df',
    variant: 'sprint',
  },
  {
    id: 'tide-runner',
    name: 'Tide Runner',
    series: 'Coastal rally',
    description: 'A raised rally silhouette in pool blue with white details.',
    cost: 60,
    color: '#2ec4b6',
    accent: '#e9fffb',
    window: '#c8f3ee',
    variant: 'rally',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    series: 'Prototype class',
    description: 'Low-slung prototype bodywork built around a bright yellow flash.',
    cost: 150,
    color: '#f6bd25',
    accent: '#ff5b35',
    window: '#283f55',
    variant: 'prototype',
  },
  {
    id: 'midnight-rs',
    name: 'Midnight RS',
    series: 'Heritage series',
    description: 'Deep navy curves, polished silver trim, and an old-school stance.',
    cost: 300,
    color: '#19384e',
    accent: '#b8c8cd',
    window: '#79b7ca',
    variant: 'classic',
  },
  {
    id: 'aurora-gt',
    name: 'Aurora GT',
    series: 'Mastery edition',
    description: 'The top-shelf hypercar with violet paint and an electric-teal edge.',
    cost: 500,
    color: '#7357c8',
    accent: '#62eadc',
    window: '#c8f5ef',
    variant: 'hyper',
  },
  {
    id: 'trail-hauler',
    name: 'Trail Hauler',
    series: 'All-terrain truck',
    description: 'A lifted pickup with knobby tires and enough torque for any study climb.',
    cost: 90,
    color: '#527a3e',
    accent: '#f4c95d',
    window: '#c8e2e1',
    variant: 'pickup',
  },
  {
    id: 'pop-quiz-express',
    name: 'Pop Quiz Express',
    series: 'Campus transit',
    description: 'A yellow school bus that proves the whole class can make the podium.',
    cost: 210,
    color: '#f2b632',
    accent: '#263f5b',
    window: '#b7e3e7',
    variant: 'bus',
  },
  {
    id: 'neon-comet',
    name: 'Neon Comet',
    series: 'Sport motorcycle',
    description: 'A tucked-in street bike with electric pink panels and a comet tail.',
    cost: 360,
    color: '#ed4d9b',
    accent: '#bff7e8',
    window: '#24364f',
    variant: 'motorcycle',
  },
  {
    id: 'campus-cruiser',
    name: 'Campus Cruiser',
    series: 'Classic scooter',
    description: 'A mint commuter scooter with a book-basket silhouette and breezy style.',
    cost: 460,
    color: '#58bfae',
    accent: '#fff3c4',
    window: '#324d66',
    variant: 'scooter',
  },
  {
    id: 'toaster-turbo',
    name: 'Toaster Turbo',
    series: 'Secret breakfast build',
    description: 'A chrome toaster on wheels. Two slices of toast provide questionable downforce.',
    cost: 700,
    color: '#bfc7c9',
    accent: '#ff8d4a',
    window: '#5b7087',
    variant: 'quirky',
  },
] as const;

const carIds = new Set<CarId>(carCatalog.map((car) => car.id));

export function isCarId(value: unknown): value is CarId {
  return typeof value === 'string' && carIds.has(value as CarId);
}

export function getCar(carId: CarId): CarSpec {
  return carCatalog.find((car) => car.id === carId) ?? carCatalog[0];
}
