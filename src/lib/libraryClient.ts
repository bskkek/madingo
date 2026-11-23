// ============================================================================
// MADINGO — MADI LIBRARY SEARCH CLIENT
// Search order:
//   1. Proxy POST /library (Replit) — tries the LIVE MADI catalog /
//      full-text library server-side. The VM cannot resolve lib.madi.ru,
//      but Replit's network may; the endpoint is built to be verified
//      from Replit (see ~/workspace/madingo/proxy/server.mjs).
//   2. Curated offline index (src/data/madiFullTextIndex.ts) — real
//      verified MADI full-text books only, searched locally.
// Every result carries its source, and the UI always offers the deep
// links to lib.madi.ru, lib.madi.ru/fel/ and the catalog page.
// ============================================================================

import { getProxyBaseUrl } from './assistantClient';
import {
  MADI_FULL_TEXT_INDEX,
  MADI_LIBRARY_CATALOG,
  MADI_LIBRARY_FULL_TEXT,
  MADI_LIBRARY_HOME,
  searchOfflineIndex,
  type MadiBook,
  type MadiBookSource,
} from '../data/madiFullTextIndex';

export type { MadiBook, MadiBookSource };

export interface LibrarySearchResult {
  results: MadiBook[];
  /** 'live' = proxy reached the real MADI catalog; 'offline' = curated index. */
  source: 'live' | 'offline';
  /** Human note from the proxy (e.g. live search unavailable). */
  note?: string;
  links: {
    home: string;
    fullText: string;
    catalog: string;
  };
}

export const MADI_LIBRARY_LINKS = {
  home: MADI_LIBRARY_HOME,
  fullText: MADI_LIBRARY_FULL_TEXT,
  catalog: MADI_LIBRARY_CATALOG,
};

/** The /library URL derived from the baked-in proxy URL. */
export function getLibraryUrl(): string {
  const base = getProxyBaseUrl();
  return base ? `${base}/library` : '';
}

function normalizeBook(raw: any, fallbackSource: MadiBookSource): MadiBook | null {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;
  return {
    id: String(raw.id || raw.url || raw.title),
    title: raw.title.trim(),
    author: typeof raw.author === 'string' ? raw.author : '',
    year: typeof raw.year === 'number' ? raw.year : undefined,
    pages: typeof raw.pages === 'number' ? raw.pages : undefined,
    url: typeof raw.url === 'string' ? raw.url : MADI_LIBRARY_FULL_TEXT,
    source:
      raw.source === 'live-catalog' || raw.source === 'live-fulltext'
        ? raw.source
        : fallbackSource,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
  };
}

async function searchViaProxy(
  query: string,
  lang: string
): Promise<LibrarySearchResult | null> {
  const url = getLibraryUrl();
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, lang }),
      signal: ctrl.signal,
    });
    const data: any = await resp.json().catch(() => null);
    if (!resp.ok || !data?.ok || !Array.isArray(data.results)) return null;
    const results = data.results
      .map((r: any) => normalizeBook(r, 'offline-index'))
      .filter((b: MadiBook | null): b is MadiBook => b !== null);
    return {
      results,
      source: data.source === 'live' ? 'live' : 'offline',
      note: typeof data.note === 'string' ? data.note : undefined,
      links: MADI_LIBRARY_LINKS,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search the MADI library for a book by name (any language).
 * Live proxy first; the curated offline index is the day-one fallback.
 * Returns at most 8 books, each with its source, plus the deep links.
 */
export async function searchLibrary(
  query: string,
  lang = 'ru'
): Promise<LibrarySearchResult> {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { results: [], source: 'offline', links: MADI_LIBRARY_LINKS };
  }
  const live = await searchViaProxy(trimmed, lang);
  if (live && live.results.length > 0) return live;
  if (live && live.source === 'live') {
    // Live search worked but found nothing — say so, don't pad with
    // offline results that don't match.
    return { ...live, links: MADI_LIBRARY_LINKS };
  }
  const offline = searchOfflineIndex(trimmed);
  return {
    results: offline,
    source: 'offline',
    note: live?.note,
    links: MADI_LIBRARY_LINKS,
  };
}

/** All books in the offline index (browse-all fallback). */
export function listOfflineIndex(): MadiBook[] {
  return [...MADI_FULL_TEXT_INDEX];
}
