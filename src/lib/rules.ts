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

// ==========================================================================
// MASTERY GATE — a road stage counts as completed ONLY when the student has
// answered ALL of its questions correctly. A wrong answer never advances
// the lesson: the student retries THE SAME question until it is correct.
// Teach cards (letter_card / phrase_card) are not questions and never
// block. NOTE: `accuracy` is FIRST-TRY accuracy, so a student who retried
// can finish with accuracy < 100 — mastery is therefore proven by the
// explicit `allCorrect` flag, never by accuracy alone.
// ==========================================================================

export type LessonFeedbackState = 'none' | 'correct' | 'wrong';

/**
 * Whether the feedback bar's primary button may advance to the next step.
 * Under mastery, a wrong answer blocks advance (the button retries the
 * same question instead); without mastery the old behaviour applies and
 * any shown feedback advances.
 */
export function canAdvanceFromFeedback(
  feedbackState: LessonFeedbackState,
  requireMastery: boolean
): boolean {
  if (feedbackState === 'correct') return true;
  if (feedbackState === 'wrong') return !requireMastery;
  return false;
}

/**
 * Whether every question step of a lesson was answered correctly.
 * `correctStepsCount` is incremented once per question step answered
 * correctly (the player gate only lets a question be passed after a
 * correct answer, so under mastery this equals the question count by the
 * time the summary screen is reached). A lesson with no question steps
 * (teach cards only) counts as mastered.
 */
export function hasMasteredAllQuestions(args: {
  correctStepsCount: number;
  totalExercises: number;
}): boolean {
  return args.correctStepsCount >= args.totalExercises;
}

/**
 * Defense in depth for lesson completion: accept only a payload that
 * proves mastery. `allCorrect` (set by the player gate) is authoritative;
 * accuracy 100 is accepted as a fallback for payloads recorded before
 * the flag existed. Anything else is rejected entirely — no completion,
 * no fuel, no streak, no server call.
 */
export function shouldAcceptLessonCompletion(payload: {
  allCorrect?: boolean;
  accuracy: number;
}): boolean {
  return payload.allCorrect === true || payload.accuracy >= 100;
}

/**
 * Migration for pre-gate progress: drop every completed lesson whose
 * stored accuracy is below 100 — it was completable with wrong answers
 * under the old rules, so it must be redone correctly to unlock the next
 * stage. Its accuracy entry is cleared as well. Lessons with no stored
 * accuracy entry are kept (they predate accuracy tracking, or the server
 * reported them without one).
 *
 * `masteredLessonIds` is the mastery proof recorded for post-gate
 * completions: a lesson in this set was completed with ALL questions
 * correct, even when its first-try accuracy is < 100 (the student
 * retried). Such lessons are ALWAYS kept — dropping them is the bug that
 * wiped a student's finished stages on every app reopen. The returned
 * mastered set is pruned to the lessons that are still completed.
 */
export function applyMasteryMigration(
  completedLessonIds: string[],
  accuracyByLesson: Record<string, number>,
  masteredLessonIds: string[] = []
): {
  completedLessonIds: string[];
  accuracyByLesson: Record<string, number>;
  masteredLessonIds: string[];
} {
  const mastered = new Set(masteredLessonIds);
  const keptAccuracy: Record<string, number> = {};
  const keptIds = completedLessonIds.filter((id) => {
    const acc = accuracyByLesson[id];
    // Mastery proof beats accuracy: a mastered lesson stays completed
    // however many first-try mistakes it took to master it.
    if (mastered.has(id)) {
      if (typeof acc === 'number') keptAccuracy[id] = acc;
      return true;
    }
    if (typeof acc === 'number' && acc < 100) return false;
    if (typeof acc === 'number') keptAccuracy[id] = acc;
    return true;
  });
  return {
    completedLessonIds: keptIds,
    accuracyByLesson: keptAccuracy,
    masteredLessonIds: masteredLessonIds.filter((id) => keptIds.includes(id)),
  };
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
