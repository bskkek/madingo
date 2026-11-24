// ============================================================================
// MADINGO — PERSISTENT TTS AUDIO CACHE (IndexedDB)
// The proxy /speak endpoint has NO server-side cache and Gemini TTS free
// quota is ~10 fresh syntheses/day (shared by every app user), so a word
// fetched once must NEVER hit the network again — on this device, across
// sessions, in the web app and in the native Capacitor app (same WebView
// IndexedDB). Keyed exactly like the in-memory cache in lib/audio.ts:
//   `${lang}:${slow|normal}:${cleanText}`
// Cap: 200 entries, oldest-first eviction (a word is ~10-60 KB of WAV).
// Every function degrades gracefully when IndexedDB is unavailable
// (unit tests, old browsers): get -> null, put/count/clear -> no-op.
// Never throws.
// ============================================================================

const DB_NAME = 'madingo-tts-cache-v1';
const STORE_NAME = 'audio';
const MAX_ENTRIES = 200;

export interface TtsCacheEntry {
  key: string;
  dataUrl: string;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function runTx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    } catch (e) {
      reject(e);
    }
  });
}

/** Read one cached audio data URL, or null on a miss / no IndexedDB. */
export async function ttsCacheGet(key: string): Promise<string | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    try {
      const entry = await runTx<TtsCacheEntry | undefined>(
        db,
        'readonly',
        (store) => store.get(key)
      );
      return entry && typeof entry.dataUrl === 'string' ? entry.dataUrl : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Store one audio data URL (write-through). Evicts oldest entries over the cap. */
export async function ttsCachePut(key: string, dataUrl: string): Promise<void> {
  try {
    if (!key || !dataUrl) return;
    const db = await openDb();
    if (!db) return;
    try {
      await runTx(db, 'readwrite', (store) =>
        store.put({ key, dataUrl, savedAt: Date.now() } as TtsCacheEntry)
      );
      // Enforce the cap: delete oldest entries beyond MAX_ENTRIES.
      const keys = await runTx<IDBValidKey[]>(db, 'readonly', (store) => store.getAllKeys());
      if (keys.length > MAX_ENTRIES) {
        const entries = await runTx<TtsCacheEntry[]>(db, 'readonly', (store) =>
          store.getAll()
        );
        entries.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
        const excess = entries.slice(0, entries.length - MAX_ENTRIES);
        for (const e of excess) {
          await runTx(db, 'readwrite', (store) => store.delete(e.key));
        }
      }
    } finally {
      db.close();
    }
  } catch {
    // Cache failure must never break playback.
  }
}

/** Number of persisted entries (0 when IndexedDB is unavailable). */
export async function ttsCacheCount(): Promise<number> {
  try {
    const db = await openDb();
    if (!db) return 0;
    try {
      return await runTx<number>(db, 'readonly', (store) => store.count());
    } finally {
      db.close();
    }
  } catch {
    return 0;
  }
}

/** Wipe the whole persistent cache. */
export async function ttsCacheClear(): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    try {
      await runTx(db, 'readwrite', (store) => store.clear());
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
}
