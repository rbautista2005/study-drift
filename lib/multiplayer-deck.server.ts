import type { Difficulty, StudySet } from '@/lib/study-data';
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

type StoredRoomDeck = {
  format: 'study-drift-room-deck-v1';
  deck: ServerDeck;
  questionIds: string[];
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

function cleanText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') throw new Error(`${label} is missing.`);
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length > maxLength)
    throw new Error(`${label} is not usable.`);
  return cleaned;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3;
}

function freezeQuestion(value: unknown, index: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('A study-set question is not usable.');
  const question = value as Record<string, unknown>;
  const choices = question.choices;
  if (!Array.isArray(choices) || choices.length !== 4)
    throw new Error('Every multiplayer question needs four choices.');
  const cleanedChoices = choices.map((choice) =>
    cleanText(choice, 'An answer choice', 140),
  );
  if (
    new Set(cleanedChoices.map((choice) => choice.toLocaleLowerCase())).size !==
    4
  ) {
    throw new Error('A multiplayer question has duplicate choices.');
  }
  if (!isDifficulty(question.difficulty))
    throw new Error('A multiplayer question has invalid difficulty.');
  if (
    !Number.isInteger(question.answerIndex) ||
    Number(question.answerIndex) < 0 ||
    Number(question.answerIndex) > 3
  ) {
    throw new Error('A multiplayer question has an invalid answer.');
  }

  const variant = Number(question.variant);
  return {
    conceptId: cleanText(question.conceptId, 'A concept id', 100),
    variant: Number.isInteger(variant) && variant >= 0 ? variant : index,
    question: {
      id: cleanText(question.id, 'A question id', 120),
      topic: cleanText(question.topic, 'A question topic', 48),
      difficulty: question.difficulty,
      prompt: cleanText(question.prompt, 'A question prompt', 220),
      choices: cleanedChoices as [string, string, string, string],
      answerIndex: Number(question.answerIndex),
      explanation: cleanText(
        question.explanation,
        'A question explanation',
        280,
      ),
    } satisfies ServerQuestion,
  };
}

export function freezeMultiplayerStudySet(value: unknown): ServerDeck {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Choose a valid study set for the room.');
  const studySet = value as Partial<StudySet>;
  if (
    !Array.isArray(studySet.questions) ||
    studySet.questions.length < 4 ||
    studySet.questions.length > 48
  ) {
    throw new Error('A multiplayer study set needs 4–48 clear concepts.');
  }

  const questionsByConcept = new Map<
    string,
    ReturnType<typeof freezeQuestion>
  >();
  studySet.questions.forEach((question, index) => {
    const frozen = freezeQuestion(question, index);
    const current = questionsByConcept.get(frozen.conceptId);
    if (!current || frozen.variant < current.variant)
      questionsByConcept.set(frozen.conceptId, frozen);
  });

  if (questionsByConcept.size < 4 || questionsByConcept.size > 48)
    throw new Error('A multiplayer study set needs 4–48 clear concepts.');
  const questions = Array.from(questionsByConcept.values(), ({ question }) =>
    question,
  );
  if (new Set(questions.map((question) => question.id)).size !== questions.length)
    throw new Error('Every multiplayer question needs a unique id.');

  const title = cleanText(studySet.title, 'The study-set title', 60);
  const fingerprint = stableHash(JSON.stringify({ title, questions }));
  return {
    id: `uploaded-${fingerprint}`,
    version: `uploaded-${fingerprint}`,
    title,
    questions,
  };
}

export function serializeRoomDeck(deck: ServerDeck) {
  const payload: StoredRoomDeck = {
    format: 'study-drift-room-deck-v1',
    deck,
    questionIds: deck.questions.map((question) => question.id),
  };
  return JSON.stringify(payload);
}

export function resolveRoomDeck(value: string, legacyVersion: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }

  if (Array.isArray(parsed)) {
    const deck = getMultiplayerDeck(legacyVersion);
    if (!deck || !parsed.every((id) => typeof id === 'string')) return undefined;
    return { deck, questionIds: parsed as string[] };
  }

  if (!parsed || typeof parsed !== 'object') return undefined;
  const stored = parsed as Partial<StoredRoomDeck>;
  if (
    stored.format !== 'study-drift-room-deck-v1' ||
    !stored.deck ||
    !Array.isArray(stored.deck.questions) ||
    !Array.isArray(stored.questionIds) ||
    !stored.questionIds.every((id) => typeof id === 'string')
  ) {
    return undefined;
  }
  return { deck: stored.deck, questionIds: stored.questionIds };
}

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
