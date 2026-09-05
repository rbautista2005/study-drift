import type { Difficulty, StudyQuestion } from '@/lib/study-data';

export type AnswerRecord = {
  question: StudyQuestion;
  selectedIndex: number;
  correct: boolean;
  earnedPoints: number;
  streakAfter: number;
};

export const difficultyLabel: Record<Difficulty, string> = {
  1: 'Warm-up',
  2: 'Technical',
  3: 'Apex',
};

export const difficultyMultiplier: Record<Difficulty, number> = {
  1: 1,
  2: 1.35,
  3: 1.7,
};

export function pointsForAnswer(difficulty: Difficulty, nextStreak: number) {
  const base = 100 * difficultyMultiplier[difficulty];
  const streakBonus = Math.min(Math.max(nextStreak - 1, 0), 4) * 15;
  return Math.round(base + streakBonus);
}

export function speedForAnswer(difficulty: Difficulty, nextStreak: number) {
  return Math.round(62 + difficulty * 18 + Math.min(nextStreak, 5) * 4);
}

export function masteryTarget(questionCount: number) {
  return Math.max(1, Math.ceil(questionCount * 0.8));
}

export function topicSummary(records: AnswerRecord[]) {
  const summary = new Map<string, { correct: number; total: number }>();

  for (const record of records) {
    const current = summary.get(record.question.topic) ?? {
      correct: 0,
      total: 0,
    };
    current.total += 1;
    current.correct += record.correct ? 1 : 0;
    summary.set(record.question.topic, current);
  }

  return Array.from(summary.entries())
    .map(([topic, result]) => ({
      topic,
      ...result,
      accuracy: Math.round((result.correct / result.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy || a.topic.localeCompare(b.topic));
}
