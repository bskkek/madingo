import { CurriculumLesson, CurriculumUnit } from '../data/curriculum';
import { LeitnerReviewItem } from './phase2Engine';
import { StreakState } from './rules';

const OFFLINE_LESSONS_KEY = 'madingo_offline_completed_lessons_v1';
const OFFLINE_CURRENT_UNIT_KEY = 'madingo_offline_current_unit_v2';
const OFFLINE_GARAGE_ITEMS_KEY = 'madingo_offline_garage_items_v2';
const OFFLINE_GARAGE_QUEUE_KEY = 'madingo_offline_garage_sync_queue_v2';
const RECENT_DICT_SEARCHES_KEY = 'madingo_recent_dict_searches_v2';
const DASHBOARD_SNAPSHOT_KEY = 'madingo_dashboard_snapshot_v1';

/**
 * Full local snapshot of the learner's progress. Written on every progress
 * change and read on app start so progress is visible instantly — even
 * before the server responds, and even if the server is unreachable.
 * The server dashboard (via /api/me) always wins over this snapshot when
 * it loads successfully.
 */
export interface DashboardSnapshot {
  profile: {
    displayName: string;
    uiLang: string;
    goalMinutes: number;
  };
  completedLessonIds: string[];
  accuracyByLesson: Record<string, number>;
  totalFuel: number;
  streak: StreakState;
  todayMinutesCompleted: number;
  savedAt: string;
}

export function saveDashboardSnapshot(snapshot: DashboardSnapshot): void {
  try {
    window.localStorage.setItem(
      DASHBOARD_SNAPSHOT_KEY,
      JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() })
    );
  } catch {
    // ignore quota errors
  }
}

export function loadDashboardSnapshot(): DashboardSnapshot | null {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardSnapshot;
    if (
      !parsed ||
      !Array.isArray(parsed.completedLessonIds) ||
      typeof parsed.totalFuel !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDashboardSnapshot(): void {
  try {
    window.localStorage.removeItem(DASHBOARD_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

export function cacheCompletedLessonOffline(lesson: CurriculumLesson) {
  try {
    const raw = window.localStorage.getItem(OFFLINE_LESSONS_KEY);
    const map: Record<string, CurriculumLesson> = raw ? JSON.parse(raw) : {};
    map[lesson.id] = lesson;
    window.localStorage.setItem(OFFLINE_LESSONS_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

export function getOfflineCachedLessons(): Record<string, CurriculumLesson> {
  try {
    const raw = window.localStorage.getItem(OFFLINE_LESSONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isLessonCachedOffline(lessonId: string): boolean {
  const map = getOfflineCachedLessons();
  return Boolean(map[lessonId]);
}

export function cacheCurrentUnitOffline(unit: CurriculumUnit) {
  try {
    window.localStorage.setItem(OFFLINE_CURRENT_UNIT_KEY, JSON.stringify(unit));
    for (const lesson of unit.lessons) {
      cacheCompletedLessonOffline(lesson);
    }
  } catch {
    // ignore quota errors
  }
}

export function cacheGarageItemsOffline(items: LeitnerReviewItem[]) {
  try {
    window.localStorage.setItem(OFFLINE_GARAGE_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function getCachedGarageItemsOffline(): LeitnerReviewItem[] {
  try {
    const raw = window.localStorage.getItem(OFFLINE_GARAGE_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineGarageReview(reviews: Array<{ itemId: string; isCorrect: boolean }>) {
  try {
    const raw = window.localStorage.getItem(OFFLINE_GARAGE_QUEUE_KEY);
    const existing: Array<{ itemId: string; isCorrect: boolean }> = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(
      OFFLINE_GARAGE_QUEUE_KEY,
      JSON.stringify([...existing, ...reviews])
    );
  } catch {
    // ignore
  }
}

export function consumeOfflineGarageQueue(): Array<{ itemId: string; isCorrect: boolean }> {
  try {
    const raw = window.localStorage.getItem(OFFLINE_GARAGE_QUEUE_KEY);
    if (!raw) return [];
    window.localStorage.removeItem(OFFLINE_GARAGE_QUEUE_KEY);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getRecentDictionarySearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_DICT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentDictionarySearch(term: string): string[] {
  try {
    const clean = term.trim();
    if (!clean) return getRecentDictionarySearches();
    const prev = getRecentDictionarySearches().filter(
      (s) => s.toLowerCase() !== clean.toLowerCase()
    );
    const next = [clean, ...prev].slice(0, 8);
    window.localStorage.setItem(RECENT_DICT_SEARCHES_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
