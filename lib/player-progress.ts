import {
  isCarId,
  starterCarId,
  type CarId,
} from '@/lib/car-locker';

export type PlayerProgress = {
  version: 4;
  tokens: number;
  racesCompleted: number;
  longestStreak: number;
  unlockedCarIds: CarId[];
  selectedCarId: CarId;
  unlockedGuideIds: string[];
};

export type RaceReward = {
  tokensEarned: number;
};

const storageKey = 'study-drift-player-progress-v1';

export const emptyPlayerProgress: PlayerProgress = {
  version: 4,
  tokens: 0,
  racesCompleted: 0,
  longestStreak: 0,
  unlockedCarIds: [starterCarId],
  selectedCarId: starterCarId,
  unlockedGuideIds: [],
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
    const storedCarIds = Array.isArray(parsed.unlockedCarIds)
      ? parsed.unlockedCarIds.filter(isCarId)
      : [];
    const unlockedCarIds = Array.from(
      new Set<CarId>([starterCarId, ...storedCarIds]),
    );
    const selectedCarId =
      isCarId(parsed.selectedCarId) &&
      unlockedCarIds.includes(parsed.selectedCarId)
        ? parsed.selectedCarId
        : starterCarId;
    const unlockedGuideIds = Array.isArray(parsed.unlockedGuideIds)
      ? Array.from(
          new Set(
            parsed.unlockedGuideIds.filter(
              (value): value is string =>
                typeof value === 'string' && value.length > 0 && value.length <= 120,
            ),
          ),
        )
      : [];

    return {
      version: 4,
      tokens: safeCount(parsed.tokens),
      racesCompleted: safeCount(parsed.racesCompleted),
      longestStreak: safeCount(parsed.longestStreak),
      unlockedCarIds,
      selectedCarId,
      unlockedGuideIds,
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

export function redeemCar(
  progress: PlayerProgress,
  carId: CarId,
  cost: number,
): PlayerProgress | null {
  if (progress.unlockedCarIds.includes(carId)) {
    return { ...progress, selectedCarId: carId };
  }
  if (cost < 0 || progress.tokens < cost) return null;

  return {
    ...progress,
    tokens: progress.tokens - cost,
    unlockedCarIds: [...progress.unlockedCarIds, carId],
    selectedCarId: carId,
  };
}

export function redeemGuideReview(
  progress: PlayerProgress,
  guideId: string,
  cost: number,
): PlayerProgress | null {
  if (progress.unlockedGuideIds.includes(guideId)) return progress;
  if (cost < 0 || progress.tokens < cost) return null;

  return {
    ...progress,
    tokens: progress.tokens - cost,
    unlockedGuideIds: [...progress.unlockedGuideIds, guideId],
  };
}

export function selectCar(
  progress: PlayerProgress,
  carId: CarId,
): PlayerProgress {
  if (!progress.unlockedCarIds.includes(carId)) return progress;
  return { ...progress, selectedCarId: carId };
}

export function finishSoloRace(
  progress: PlayerProgress,
  result: {
    correctCount: number;
    longestStreak: number;
  },
): { progress: PlayerProgress; reward: RaceReward } {
  const tokensEarned = result.correctCount * 15;
  return {
    reward: { tokensEarned },
    progress: {
      version: 4,
      tokens: progress.tokens + tokensEarned,
      racesCompleted: progress.racesCompleted + 1,
      longestStreak: Math.max(progress.longestStreak, result.longestStreak),
      unlockedCarIds: progress.unlockedCarIds,
      selectedCarId: progress.selectedCarId,
      unlockedGuideIds: progress.unlockedGuideIds,
    },
  };
}
