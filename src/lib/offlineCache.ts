import { CurriculumLesson, CurriculumUnit } from '../data/curriculum';
import { LeitnerReviewItem } from './phase2Engine';

const OFFLINE_LESSONS_KEY = 'madingo_offline_completed_lessons_v1';
const OFFLINE_CURRENT_UNIT_KEY = 'madingo_offline_current_unit_v2';
const OFFLINE_GARAGE_ITEMS_KEY = 'madingo_offline_garage_items_v2';
const OFFLINE_GARAGE_QUEUE_KEY = 'madingo_offline_garage_sync_queue_v2';
const RECENT_DICT_SEARCHES_KEY = 'madingo_recent_dict_searches_v2';

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
