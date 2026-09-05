import type { StudyQuestion, StudySet } from '@/lib/study-data';

export class StudyGuideImportError extends Error {}

type ImportOptions = {
  title: string;
  course: string;
  sourceText: string;
};

type ImportedFact = {
  term: string;
  definition: string;
  topic: string;
};

const bulletPattern = /^(?:[-*+]\s+|\d+[.)]\s+)/;
const markdownPattern = /[*_`]/g;

function cleanInline(value: string) {
  return value.replace(markdownPattern, '').replace(/\s+/g, ' ').trim();
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

function parseFacts(sourceText: string): ImportedFact[] {
  const facts: ImportedFact[] = [];

  for (const [lineIndex, rawLine] of sourceText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .entries()) {
    const line = rawLine.trim().replace(bulletPattern, '');
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf(':');
    if (separator < 0) {
      throw new StudyGuideImportError(
        `Line ${lineIndex + 1}: add “:” between the term and definition.`,
      );
    }

    const label = cleanInline(line.slice(0, separator));
    const definition = cleanInline(line.slice(separator + 1));
    const topicSeparator = label.indexOf('|');
    const topic =
      topicSeparator >= 0
        ? cleanInline(label.slice(0, topicSeparator))
        : 'Imported notes';
    const term = cleanInline(
      topicSeparator >= 0 ? label.slice(topicSeparator + 1) : label,
    );

    if (!term) {
      throw new StudyGuideImportError(
        `Line ${lineIndex + 1}: add a term before “:”.`,
      );
    }
    if (!definition) {
      throw new StudyGuideImportError(
        `Line ${lineIndex + 1}: add a definition after “:”.`,
      );
    }
    facts.push({ term, definition, topic: topic || 'Imported notes' });
  }

  return facts;
}

function validateFacts(facts: ImportedFact[]) {
  if (facts.length < 4) {
    throw new StudyGuideImportError(
      'Add at least four facts written as “Term: definition”.',
    );
  }
  if (facts.length > 12) {
    throw new StudyGuideImportError(
      'Keep this sprint to 12 facts or fewer. Split longer notes into another set.',
    );
  }

  const terms = new Set<string>();
  const definitions = new Set<string>();
  for (const fact of facts) {
    if (fact.term.length < 2 || fact.term.length > 60) {
      throw new StudyGuideImportError(
        `“${fact.term.slice(0, 28)}” needs a term between 2 and 60 characters.`,
      );
    }
    if (fact.definition.length < 3 || fact.definition.length > 240) {
      throw new StudyGuideImportError(
        `The definition for “${fact.term}” must be 3–240 characters.`,
      );
    }

    const termKey = fact.term.toLocaleLowerCase();
    const definitionKey = fact.definition.toLocaleLowerCase();
    if (terms.has(termKey)) {
      throw new StudyGuideImportError(`“${fact.term}” appears more than once.`);
    }
    if (definitions.has(definitionKey)) {
      throw new StudyGuideImportError(
        'Each fact needs a different definition so the answer choices stay clear.',
      );
    }
    terms.add(termKey);
    definitions.add(definitionKey);
  }
}

function choiceSet(
  correct: string,
  pool: string[],
  factIndex: number,
  variant: number,
): { choices: [string, string, string, string]; answerIndex: number } {
  const distractors: string[] = [];
  for (let offset = 1; distractors.length < 3; offset += 1) {
    const direction = variant === 0 ? 1 : -1;
    const candidate =
      pool[(factIndex + direction * offset + pool.length) % pool.length];
    if (candidate !== correct && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }

  const answerIndex = (factIndex * 3 + variant) % 4;
  const choices = [...distractors];
  choices.splice(answerIndex, 0, correct);
  return {
    choices: choices as [string, string, string, string],
    answerIndex,
  };
}

export function importStudyGuide({
  title,
  course,
  sourceText,
}: ImportOptions): StudySet {
  const cleanTitle = cleanInline(title);
  const cleanCourse = cleanInline(course);
  if (cleanTitle.length < 2 || cleanTitle.length > 60) {
    throw new StudyGuideImportError(
      'Give the study set a 2–60 character title.',
    );
  }
  if (cleanCourse.length < 2 || cleanCourse.length > 30) {
    throw new StudyGuideImportError('Give the course a 2–30 character label.');
  }

  const facts = parseFacts(sourceText);
  validateFacts(facts);
  const terms = facts.map((fact) => fact.term);
  const definitions = facts.map((fact) => fact.definition);
  const questions: StudyQuestion[] = [];

  facts.forEach((fact, factIndex) => {
    const conceptId = `import-${slug(fact.term)}-${factIndex}`;
    const descriptionChoices = choiceSet(
      fact.definition,
      definitions,
      factIndex,
      0,
    );
    const termChoices = choiceSet(fact.term, terms, factIndex, 1);
    questions.push(
      {
        id: `${conceptId}-description`,
        conceptId,
        topic: fact.topic,
        difficulty: 1,
        prompt: `Which description best matches “${fact.term}”?`,
        ...descriptionChoices,
        explanation: `${fact.term}: ${fact.definition}`,
        variant: 0,
      },
      {
        id: `${conceptId}-term`,
        conceptId,
        topic: fact.topic,
        difficulty: 1,
        prompt: `Which term matches this description: ${fact.definition}`,
        ...termChoices,
        explanation: `${fact.term}: ${fact.definition}`,
        variant: 1,
      },
    );
  });

  const normalized = facts
    .map((fact) => `${fact.topic}|${fact.term}:${fact.definition}`)
    .join('\n');
  const fingerprint = stableHash(
    `${cleanTitle}\n${cleanCourse}\n${normalized}`,
  );

  return {
    id: `imported-${slug(cleanTitle)}-${fingerprint}`,
    version: `local-${fingerprint}`,
    title: cleanTitle,
    course: cleanCourse,
    description: `${facts.length} concepts imported from your notes.`,
    questions,
  };
}

export function countImportableFacts(sourceText: string) {
  return sourceText.split(/\r?\n/).filter((rawLine) => {
    const line = rawLine.trim().replace(bulletPattern, '');
    const separator = line.indexOf(':');
    return (
      separator > 0 &&
      Boolean(line.slice(0, separator).trim()) &&
      Boolean(line.slice(separator + 1).trim())
    );
  }).length;
}
