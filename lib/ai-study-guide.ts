import type { Difficulty, StudyQuestion, StudySet } from '@/lib/study-data';

export type GeneratedStudyGuide = {
  title: string;
  course: string;
  description: string;
  concepts: GeneratedConcept[];
};

type GeneratedConcept = {
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  correctAnswer: string;
  distractors: [string, string, string];
  explanation: string;
  alternatePrompt: string;
  alternateCorrectAnswer: string;
  alternateDistractors: [string, string, string];
  alternateExplanation: string;
};

export class GeneratedStudyGuideError extends Error {}

export const generatedStudyGuideSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 2, maxLength: 60 },
    course: { type: 'string', minLength: 2, maxLength: 30 },
    description: { type: 'string', minLength: 8, maxLength: 140 },
    concepts: {
      type: 'array',
      minItems: 4,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          topic: { type: 'string', minLength: 2, maxLength: 48 },
          difficulty: { type: 'integer', enum: [1, 2, 3] },
          prompt: { type: 'string', minLength: 8, maxLength: 220 },
          correctAnswer: { type: 'string', minLength: 1, maxLength: 140 },
          distractors: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: { type: 'string', minLength: 1, maxLength: 140 },
          },
          explanation: { type: 'string', minLength: 8, maxLength: 280 },
          alternatePrompt: { type: 'string', minLength: 8, maxLength: 220 },
          alternateCorrectAnswer: {
            type: 'string',
            minLength: 1,
            maxLength: 140,
          },
          alternateDistractors: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: { type: 'string', minLength: 1, maxLength: 140 },
          },
          alternateExplanation: {
            type: 'string',
            minLength: 8,
            maxLength: 280,
          },
        },
        required: [
          'topic',
          'difficulty',
          'prompt',
          'correctAnswer',
          'distractors',
          'explanation',
          'alternatePrompt',
          'alternateCorrectAnswer',
          'alternateDistractors',
          'alternateExplanation',
        ],
      },
    },
  },
  required: ['title', 'course', 'description', 'concepts'],
} as const;

function cleanText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') {
    throw new GeneratedStudyGuideError(`${label} is missing.`);
  }
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new GeneratedStudyGuideError(`${label} is not usable.`);
  }
  return cleaned;
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'concept'
  );
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildChoices(
  correctValue: unknown,
  distractorValues: unknown,
  answerIndex: number,
) {
  const correct = cleanText(correctValue, 'A correct answer', 140);
  if (!Array.isArray(distractorValues) || distractorValues.length !== 3) {
    throw new GeneratedStudyGuideError(
      'Every generated question needs three distractors.',
    );
  }
  const distractors = distractorValues.map((value) =>
    cleanText(value, 'A distractor', 140),
  );
  const uniqueAnswers = new Set(
    [correct, ...distractors].map((answer) => answer.toLocaleLowerCase()),
  );
  if (uniqueAnswers.size !== 4) {
    throw new GeneratedStudyGuideError(
      'A generated question contained duplicate answers.',
    );
  }

  const choices = [...distractors];
  choices.splice(answerIndex, 0, correct);
  return choices as [string, string, string, string];
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3;
}

export function createStudySetFromGenerated(
  value: unknown,
  fallbackTitle: string,
  fallbackCourse: string,
): StudySet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeneratedStudyGuideError('The AI response was not a study set.');
  }

  const generated = value as Partial<GeneratedStudyGuide>;
  if (
    !Array.isArray(generated.concepts) ||
    generated.concepts.length < 4 ||
    generated.concepts.length > 12
  ) {
    throw new GeneratedStudyGuideError(
      'The guide needs enough clear material for 4–12 concepts.',
    );
  }

  const title = cleanText(generated.title || fallbackTitle, 'The title', 60);
  const course = cleanText(generated.course || fallbackCourse, 'The course', 30);
  const description = cleanText(
    generated.description,
    'The description',
    140,
  );
  const questions: StudyQuestion[] = [];

  generated.concepts.forEach((rawConcept, conceptIndex) => {
    if (!rawConcept || typeof rawConcept !== 'object') {
      throw new GeneratedStudyGuideError('A generated concept is not usable.');
    }
    const concept = rawConcept as Partial<GeneratedConcept>;
    const topic = cleanText(concept.topic, 'A topic', 48);
    if (!isDifficulty(concept.difficulty)) {
      throw new GeneratedStudyGuideError('A question has invalid difficulty.');
    }

    const conceptId = `ai-${slug(topic)}-${conceptIndex}`;
    const primaryAnswerIndex = conceptIndex % 4;
    const alternateAnswerIndex = (conceptIndex * 3 + 1) % 4;
    questions.push(
      {
        id: `${conceptId}-primary`,
        conceptId,
        topic,
        difficulty: concept.difficulty,
        prompt: cleanText(concept.prompt, 'A question', 220),
        choices: buildChoices(
          concept.correctAnswer,
          concept.distractors,
          primaryAnswerIndex,
        ),
        answerIndex: primaryAnswerIndex,
        explanation: cleanText(concept.explanation, 'An explanation', 280),
        variant: 0,
      },
      {
        id: `${conceptId}-alternate`,
        conceptId,
        topic,
        difficulty: concept.difficulty,
        prompt: cleanText(concept.alternatePrompt, 'An alternate question', 220),
        choices: buildChoices(
          concept.alternateCorrectAnswer,
          concept.alternateDistractors,
          alternateAnswerIndex,
        ),
        answerIndex: alternateAnswerIndex,
        explanation: cleanText(
          concept.alternateExplanation,
          'An alternate explanation',
          280,
        ),
        variant: 1,
      },
    );
  });

  const fingerprint = stableHash(JSON.stringify({ title, course, questions }));
  return {
    id: `ai-${slug(title)}-${fingerprint}`,
    version: `ai-${fingerprint}`,
    title,
    course,
    description,
    questions,
  };
}
