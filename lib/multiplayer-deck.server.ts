import type { Difficulty } from '@/lib/study-data';
import type { MultiplayerQuestion } from '@/lib/multiplayer-types';

type ServerQuestion = MultiplayerQuestion & {
  answerIndex: number;
  explanation: string;
};

type ServerDeck = {
  id: string;
  version: string;
  title: string;
  questions: ServerQuestion[];
};

const earthSystemsV1: ServerDeck = {
  id: 'earth-systems',
  version: 'earth-systems-v1',
  title: 'Earth Systems Sprint',
  questions: [
    {
      id: 'earth-water-phase-v1',
      topic: 'Water cycle',
      difficulty: 1,
      prompt: 'Water vapor cools into liquid droplets. What process occurred?',
      choices: ['Condensation', 'Evaporation', 'Sublimation', 'Infiltration'],
      answerIndex: 0,
      explanation:
        'Condensation occurs when water vapor loses energy and becomes liquid water.',
    },
    {
      id: 'earth-atmosphere-v1',
      topic: 'Atmosphere',
      difficulty: 1,
      prompt: 'Which gas makes up the largest share of Earth’s dry atmosphere?',
      choices: ['Oxygen', 'Argon', 'Nitrogen', 'Carbon dioxide'],
      answerIndex: 2,
      explanation:
        'Nitrogen makes up about 78% of Earth’s dry atmosphere, more than any other gas.',
    },
    {
      id: 'earth-convection-v1',
      topic: 'Plate tectonics',
      difficulty: 2,
      prompt:
        'Slow convection in which layer helps drive tectonic plate motion?',
      choices: ['Outer core', 'Mantle', 'Crust', 'Inner core'],
      answerIndex: 1,
      explanation:
        'Heat-driven convection in the mantle contributes to the movement of tectonic plates.',
    },
    {
      id: 'earth-subduction-v1',
      topic: 'Plate tectonics',
      difficulty: 2,
      prompt:
        'At an oceanic–continental convergent boundary, what usually happens to the denser oceanic plate?',
      choices: [
        'It rises above the continent',
        'It stops moving',
        'It splits at a ridge',
        'It subducts beneath the continent',
      ],
      answerIndex: 3,
      explanation:
        'The denser oceanic lithosphere usually sinks beneath the continental plate in a subduction zone.',
    },
    {
      id: 'earth-ocean-ph-v1',
      topic: 'Ocean chemistry',
      difficulty: 3,
      prompt: 'If seawater pH falls from 8.2 to 8.0, what has changed?',
      choices: [
        'It became more basic',
        'Its salinity doubled',
        'It became more acidic',
        'It became neutral',
      ],
      answerIndex: 2,
      explanation:
        'A lower pH indicates greater acidity, even when the solution remains above pH 7.',
    },
  ],
};

const deckRegistry = new Map<string, ServerDeck>([
  [earthSystemsV1.version, earthSystemsV1],
]);

export function getDefaultMultiplayerDeck() {
  return earthSystemsV1;
}

export function getMultiplayerDeck(version: string) {
  return deckRegistry.get(version);
}

export function publicQuestion(question: ServerQuestion): MultiplayerQuestion {
  const { id, topic, difficulty, prompt, choices } = question;
  return { id, topic, difficulty, prompt, choices };
}

export type { Difficulty, ServerDeck, ServerQuestion };
