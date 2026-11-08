/**
 * Seed the `words` table from the bundled dictionary JSON.
 *
 * Why this exists: the 628-word dictionary lives in `content/dictionary.json`
 * and is browsed client-side, but the server-side "Save to Garage" flow writes
 * `user_words.word_id`, which has a foreign key to `words(id)`. With an empty
 * `words` table every save failed with an FK violation (HTTP 500, silently
 * swallowed client-side), so garage saves were local-only and never persisted
 * server-side. The TS seed `DICTIONARY_WORDS` is intentionally empty (static
 * vocabulary was removed in favour of the AI translator), so the JSON file is
 * the only source of truth.
 *
 * Idempotent: skips entirely when the table already has rows, and uses
 * onConflictDoNothing for safety. Non-fatal by design — a seed failure must
 * never block server startup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from './index.ts';
import { words } from './schema.ts';

interface DictionaryJsonWord {
  id: string;
  russian: string;
  stressed: string;
  translit: string;
  pos?: string;
  gender?: string | null;
  animacy?: string | null;
  level?: string;
  isMadiTerm?: boolean;
  verified?: boolean;
  iconKey?: string;
  audioSlug?: string;
  synonyms?: unknown[];
  antonyms?: unknown[];
  relatedWords?: unknown[];
  lessonIds?: unknown[];
}

export async function ensureWordsSeeded(): Promise<{ seeded: number; skipped: boolean }> {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(words);
    if (Number(count) > 0) return { seeded: 0, skipped: true };
    const file = path.join(process.cwd(), 'content', 'dictionary.json');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as DictionaryJsonWord[];
    const rows = parsed
      .filter((w) => w && typeof w.id === 'string' && w.id && w.russian && w.stressed)
      .map((w) => ({
        id: w.id,
        russian: w.russian,
        stressed: w.stressed,
        translit: w.translit || '',
        pos: w.pos || 'noun',
        gender: w.gender ?? null,
        animacy: w.animacy ?? null,
        level: w.level || 'A1',
        isMadiTerm: w.isMadiTerm ?? false,
        verified: w.verified ?? false,
        iconKey: w.iconKey || 'book',
        audioSlug: w.audioSlug || w.id,
        synonymsJson: w.synonyms ?? [],
        antonymsJson: w.antonyms ?? [],
        relatedWordsJson: w.relatedWords ?? [],
        lessonIdsJson: w.lessonIds ?? [],
      }));
    if (rows.length === 0) return { seeded: 0, skipped: true };
    await db.insert(words).values(rows).onConflictDoNothing();
    console.log(`[seed] words table seeded with ${rows.length} dictionary words`);
    return { seeded: rows.length, skipped: false };
  } catch (error) {
    console.warn('[seed] words seeding skipped (non-fatal):', (error as Error)?.message || error);
    return { seeded: 0, skipped: true };
  }
}
