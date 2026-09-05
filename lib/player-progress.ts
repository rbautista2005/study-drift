export type PlayerProgress = {
  version: 1;
  tokens: number;
  racesCompleted: number;
  longestStreak: number;
  bestScore: number;
};

export type RaceReward = {
  tokensEarned: number;
  masteryBonus: number;
};

const storageKey = 'study-drift-player-progress-v1';

export const emptyPlayerProgress: PlayerProgress = {
  version: 1,
  tokens: 0,
  racesCompleted: 0,
  longestStreak: 0,
  bestScore: 0,
};

function safeCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function loadPlayerProgress(): PlayerProgress {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKey) ?? '',
    ) as Partial<Record<keyof PlayerProgress, unknown>>;
    return {
      version: 1,
      tokens: safeCount(parsed.tokens),
      racesCompleted: safeCount(parsed.racesCompleted),
      longestStreak: safeCount(parsed.longestStreak),
      bestScore: safeCount(parsed.bestScore),
    };
  } catch {
    return { ...emptyPlayerProgress };
  }
}

export function savePlayerProgress(progress: PlayerProgress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // A full or restricted storage area should never block a study session.
  }
}

export function finishSoloRace(
  progress: PlayerProgress,
  result: {
    correctCount: number;
    longestStreak: number;
    passed: boolean;
    score: number;
  },
): { progress: PlayerProgress; reward: RaceReward } {
  const masteryBonus = result.passed ? 25 : 0;
  const tokensEarned = result.correctCount * 15 + masteryBonus;
  return {
    reward: { tokensEarned, masteryBonus },
    progress: {
      version: 1,
      tokens: progress.tokens + tokensEarned,
      racesCompleted: progress.racesCompleted + 1,
      longestStreak: Math.max(progress.longestStreak, result.longestStreak),
      bestScore: Math.max(progress.bestScore, result.score),
    },
  };
}
