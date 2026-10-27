import { CYRILLIC_LETTERS, getAllLessons } from '../data/curriculum';

export type NodeStatus = 'completed' | 'current' | 'locked';

export interface LessonProgressRecord {
  lessonId: string;
  status: string;
  accuracy: number;
}

export interface StreakState {
  current: number;
  best: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  spareTireAvailable: boolean;
  spareTireUsedDate: string | null;
}

export interface AchievementBadge {
  id: 'first_lap' | 'alphabet_master' | 'three_day_trip';
  unlocked: boolean;
}

export const FUEL_PER_CORRECT_ANSWER = 10;

/**
 * Computes the status ('completed' | 'current' | 'locked') for every lesson in order.
 * The first uncompleted lesson is 'current'; subsequent uncompleted lessons are 'locked'.
 */
export function computeLessonNodeStatuses(
  lessonIdsInOrder: string[],
  completedLessonIds: string[]
): Record<string, NodeStatus> {
  const completedSet = new Set(completedLessonIds);
  const result: Record<string, NodeStatus> = {};
  let foundCurrent = false;

  for (const id of lessonIdsInOrder) {
    if (completedSet.has(id)) {
      result[id] = 'completed';
    } else if (!foundCurrent) {
      result[id] = 'current';
      foundCurrent = true;
    } else {
      result[id] = 'locked';
    }
  }

  return result;
}

/**
 * Calculates fuel earned (+10 per correct answer) and accuracy percentage.
 */
export function calculateLessonSummary(
  correctFirstTryCount: number,
  totalExerciseCount: number,
  totalCorrectSteps: number
): { fuelEarned: number; accuracy: number } {
  const fuelEarned = Math.max(0, totalCorrectSteps) * FUEL_PER_CORRECT_ANSWER;
  if (totalExerciseCount <= 0) {
    return { fuelEarned, accuracy: 100 };
  }
  const clamped = Math.min(Math.max(0, correctFirstTryCount), totalExerciseCount);
  const accuracy = Math.round((clamped / totalExerciseCount) * 100);
  return { fuelEarned, accuracy };
}

/**
 * Validates whether a tapped/typed Cyrillic letter is the valid next character
 * in the Word Builder exercise. Wrong letters are blocked and trigger a shake.
 */
export function validateWordBuilderNextChar(
  targetCleanWord: string,
  currentAssembled: string,
  candidateChar: string
): { accepted: boolean; nextAssembled: string; isComplete: boolean } {
  const normalizedTarget = targetCleanWord.replace(/\s+/g, '').toUpperCase();
  const normalizedCurrent = currentAssembled.replace(/\s+/g, '').toUpperCase();
  const normalizedCandidate = candidateChar.trim().toUpperCase();

  if (normalizedCurrent.length >= normalizedTarget.length) {
    return {
      accepted: false,
      nextAssembled: normalizedCurrent,
      isComplete: true,
    };
  }

  const expectedChar = normalizedTarget[normalizedCurrent.length];
  if (normalizedCandidate === expectedChar) {
    const nextAssembled = normalizedCurrent + normalizedCandidate;
    return {
      accepted: true,
      nextAssembled,
      isComplete: nextAssembled === normalizedTarget,
    };
  }

  return {
    accepted: false,
    nextAssembled: normalizedCurrent,
    isComplete: false,
  };
}

function diffDaysUTC(dateStrA: string, dateStrB: string): number {
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Updates the student's trip odometer (streak in km) when completing a lesson on `todayDate` (YYYY-MM-DD).
 * Includes the 1 free "Spare Tire" freeze per 7-day window if exactly 1 day was missed.
 */
export function updateStreakOdometer(
  prev: StreakState,
  todayDate: string
): StreakState {
  // Replenish spare tire if last used >= 7 days ago
  let spareTireAvailable = prev.spareTireAvailable;
  let spareTireUsedDate = prev.spareTireUsedDate;
  if (!spareTireAvailable && spareTireUsedDate) {
    if (diffDaysUTC(spareTireUsedDate, todayDate) >= 7) {
      spareTireAvailable = true;
      spareTireUsedDate = null;
    }
  }

  if (!prev.lastActiveDate) {
    return {
      current: 1,
      best: Math.max(prev.best, 1),
      lastActiveDate: todayDate,
      spareTireAvailable,
      spareTireUsedDate,
    };
  }

  const daysDiff = diffDaysUTC(prev.lastActiveDate, todayDate);

  if (daysDiff <= 0) {
    // Already active today
    const current = Math.max(1, prev.current);
    return {
      current,
      best: Math.max(prev.best, current),
      lastActiveDate: todayDate,
      spareTireAvailable,
      spareTireUsedDate,
    };
  }

  if (daysDiff === 1) {
    // Consecutive day
    const nextCurrent = prev.current + 1;
    return {
      current: nextCurrent,
      best: Math.max(prev.best, nextCurrent),
      lastActiveDate: todayDate,
      spareTireAvailable,
      spareTireUsedDate,
    };
  }

  if (daysDiff === 2 && spareTireAvailable) {
    // Missed 1 day, saved by Spare Tire freeze!
    const nextCurrent = prev.current + 1;
    return {
      current: nextCurrent,
      best: Math.max(prev.best, nextCurrent),
      lastActiveDate: todayDate,
      spareTireAvailable: false,
      spareTireUsedDate: todayDate,
    };
  }

  // Missed more than 1 day (or no spare tire available): reset odometer to 1 km
  return {
    current: 1,
    best: Math.max(prev.best, 1),
    lastActiveDate: todayDate,
    spareTireAvailable,
    spareTireUsedDate,
  };
}

/**
 * Evaluates the 3 Phase 1 driver badges:
 * - first_lap: Completed >= 1 lesson
 * - alphabet_master: Completed all 6 Unit 1 lessons (u1-l1 .. u1-l6)
 * - three_day_trip: Best or current streak >= 3 km
 */
export function evaluateBadges(
  completedLessonIds: string[],
  streak: Pick<StreakState, 'current' | 'best'>
): AchievementBadge[] {
  const set = new Set(completedLessonIds);
  const unit1Lessons = ['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4', 'u1-l5', 'u1-l6'];
  const allUnit1Completed = unit1Lessons.every((id) => set.has(id));

  return [
    {
      id: 'first_lap',
      unlocked: set.size >= 1,
    },
    {
      id: 'alphabet_master',
      unlocked: allUnit1Completed,
    },
    {
      id: 'three_day_trip',
      unlocked: Math.max(streak.current, streak.best) >= 3,
    },
  ];
}

/**
 * Helper to verify that all 33 Russian Cyrillic letters are present in curriculum.
 */
export function verifyAlphabetCompleteness(): { count: number; uniqueUpper: number } {
  const unique = new Set(CYRILLIC_LETTERS.map((l) => l.upper));
  return {
    count: CYRILLIC_LETTERS.length,
    uniqueUpper: unique.size,
  };
}

export function getOrderedLessonIds(): string[] {
  return getAllLessons().map((l) => l.id);
}
