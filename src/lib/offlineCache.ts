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
  /**
   * Lessons completed WITH mastery proof (every question answered
   * correctly). A mastered lesson stays completed even when its stored
   * first-try accuracy is < 100 — without this record the boot migration
   * cannot tell a mastered-with-retries lesson from a pre-gate lesson
   * that was completed with wrong answers, and it drops both. Optional
   * so snapshots written before this field existed still load.
   */
  masteredLessonIds?: string[];
  totalFuel: number;
  streak: StreakState;
  todayMinutesCompleted: number;
  /** Local calendar day (YYYY-MM-DD) the minutes above belong to. */
  todayDate?: string;
  savedAt: string;
}

/** Local calendar day (YYYY-MM-DD) — the daily goal is a local-day goal. */
export function localTodayString(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Minutes to restore from a snapshot on boot.
 *
 * Two defects made the daily goal show minutes before any lesson:
 * 1. The snapshot's minutes were restored verbatim on every boot, even
 *    on a later day — a new day must start at 0/goal.
 * 2. The boot mastery migration can drop a lesson completion (accuracy
 *    < 100, not mastered) while its minutes and fuel survived — the
 *    road then showed "5/10 min" with "0 stops done". Minutes only ever
 *    come from completing a lesson, so when no kept completion remains
 *    the minutes cannot belong to anything and must be 0.
 * Snapshots written before todayDate existed fall back to savedAt.
 */
export function resolveRestoredTodayMinutes(
  snapshot: DashboardSnapshot,
  keptCompletedCount: number
): number {
  const snapshotDay =
    snapshot.todayDate ||
    (snapshot.savedAt ? localTodayString(new Date(snapshot.savedAt)) : '');
  if (snapshotDay && snapshotDay !== localTodayString()) return 0;
  if (keptCompletedCount <= 0) return 0;
  return snapshot.todayMinutesCompleted || 0;
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

/**
 * Parse a fetch response as JSON, but return null instead of throwing when
 * the server is absent. On static hosting (GitHub Pages) every /api/* URL
 * returns the app's HTML fallback with HTTP 200, so a bare res.json()
 * throws "Unexpected token '<', "<html>..." — that error must never reach
 * the user. Callers treat null as "no server" and fall back to local mode.
 */
export async function readJsonSafe(res: Response): Promise<any | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
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
