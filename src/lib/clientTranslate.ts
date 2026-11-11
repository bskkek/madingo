// ============================================================================
// MADINGO — CLIENT-SIDE INSTANT TRANSLATOR (static hosting safe)
// The /api/ai/instant-translate route only exists on the Node server (Route B).
// On static hosting (GitHub Pages / Netlify / TWA) /api/* returns index.html,
// so response.json() throws "Unexpected token '<' ... is not valid JSON"
// (reported by the user 2026-11-11: the translator showed that exact error).
// This module translates directly in the browser via the MyMemory public API
// (CORS: Access-Control-Allow-Origin: *, no key required), mirroring the
// server's instantTranslate response shape, so Dictionary / Library /
// Teacher Dashboard all work with no server at all.
// MyMemory anonymous quota is limited (~5k chars/day); the in-memory cache
// below plus the callers' own caches keep repeat translations free.
// ============================================================================

import {
  applyRussianStressMarks,
  detectLanguageFromText,
  transliterateRussianSimple,
} from './russianText';

export type SupportedLang = 'ru' | 'en' | 'ar' | 'fr';
export type TranslateSourceLang = 'auto' | SupportedLang;

export interface InstantTranslationResult {
  sourceText: string;
  detectedSourceLang: SupportedLang;
  targetLang: SupportedLang;
  primaryTranslation: string;
  translations: {
    ru: string;
    ruStressed: string;
    ruTranslit: string;
    en: string;
    ar: string;
    fr: string;
  };
  pos: string;
  cefrLevel: string;
  grammarNote: Record<SupportedLang, string>;
  examples: { ruStressed: string; en: string; ar: string; fr: string }[];
  alternatives?: { pos: string; terms: string[] }[];
  latencyMs?: number;
  providerUsed: string;
}

const MM_TIMEOUT_MS = 8000;
const cache = new Map<string, InstantTranslationResult>();

const SERVICE_ERROR = new Error(
  'Translation service is unreachable right now. Please check your connection and press Retry.'
);

async function translateViaMyMemory(
  text: string,
  src: SupportedLang,
  tgt: SupportedLang,
  signal?: AbortSignal
): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${src}|${tgt}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MM_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw SERVICE_ERROR;
    const data = await res.json();
    const out = String(data?.responseData?.translatedText || '').trim();
    if (!out) throw SERVICE_ERROR;
    return out;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    throw SERVICE_ERROR;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export async function instantTranslateClient(params: {
  text: string;
  sourceLang: TranslateSourceLang;
  targetLang: SupportedLang;
  signal?: AbortSignal;
}): Promise<InstantTranslationResult> {
  const startMs = Date.now();
  const rawText = (params.text || '')
    .normalize('NFD')
    .replace(/\u0301/g, '')
    .normalize('NFC')
    .trim();
  if (!rawText) {
    throw new Error('Text to translate is required.');
  }

  const initialDetected: SupportedLang =
    params.sourceLang === 'auto' ? detectLanguageFromText(rawText) : params.sourceLang;

  // Smart auto-switch: if source and target are identical, switch target so
  // the user gets an immediate real translation (same rule as the server).
  let effectiveTargetLang: SupportedLang = params.targetLang;
  if (initialDetected === effectiveTargetLang) {
    effectiveTargetLang = initialDetected === 'ru' ? 'ar' : 'ru';
  }

  const cacheKey = `${params.sourceLang}:${effectiveTargetLang}:${rawText.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ...cached, latencyMs: 1 };
  }

  const wordCount = rawText.split(/\s+/).length;
  const defaultPos = wordCount === 1 ? 'word' : wordCount <= 4 ? 'phrase' : 'sentence';

  // Translate into all 4 languages in parallel; the source language reuses
  // the raw text. A failed non-target language falls back to the raw text so
  // one flaky request never blocks the translation the user asked for.
  const settled = await Promise.allSettled([
    initialDetected === 'ru'
      ? Promise.resolve(rawText)
      : translateViaMyMemory(rawText, initialDetected, 'ru', params.signal),
    initialDetected === 'ar'
      ? Promise.resolve(rawText)
      : translateViaMyMemory(rawText, initialDetected, 'ar', params.signal),
    initialDetected === 'en'
      ? Promise.resolve(rawText)
      : translateViaMyMemory(rawText, initialDetected, 'en', params.signal),
    initialDetected === 'fr'
      ? Promise.resolve(rawText)
      : translateViaMyMemory(rawText, initialDetected, 'fr', params.signal),
  ]);

  const pick = (index: number, lang: SupportedLang): string => {
    const s = settled[index];
    if (s.status === 'fulfilled' && s.value) return s.value;
    if (lang === effectiveTargetLang) throw SERVICE_ERROR;
    return rawText;
  };
  const ruText = pick(0, 'ru');
  const arText = pick(1, 'ar');
  const enText = pick(2, 'en');
  const frText = pick(3, 'fr');

  const detectedSourceLang: SupportedLang =
    params.sourceLang === 'auto' ? initialDetected : params.sourceLang;
  if (detectedSourceLang === effectiveTargetLang) {
    effectiveTargetLang = detectedSourceLang === 'ru' ? 'ar' : 'ru';
  }

  const ruClean = detectedSourceLang === 'ru' ? rawText : ruText;
  const arClean = detectedSourceLang === 'ar' ? rawText : arText;
  const enClean = detectedSourceLang === 'en' ? rawText : enText;
  const frClean = detectedSourceLang === 'fr' ? rawText : frText;

  const ruStressed = applyRussianStressMarks(ruClean);
  const ruTranslit = transliterateRussianSimple(ruClean);
  const latencyMs = Math.max(1, Date.now() - startMs);

  const translations = {
    ru: ruClean,
    ruStressed,
    ruTranslit,
    en: enClean,
    ar: arClean,
    fr: frClean,
  };

  const result: InstantTranslationResult = {
    sourceText: rawText,
    detectedSourceLang,
    targetLang: effectiveTargetLang,
    primaryTranslation:
      effectiveTargetLang === 'ru' ? ruStressed : translations[effectiveTargetLang],
    translations,
    pos: defaultPos,
    cefrLevel: wordCount <= 2 ? 'A1' : wordCount <= 8 ? 'A2' : 'B1',
    alternatives: [],
    grammarNote: {
      ru: `Быстрый перевод (${detectedSourceLang.toUpperCase()} → ${effectiveTargetLang.toUpperCase()}) за ${latencyMs} мс.`,
      en: `Fast translation (${detectedSourceLang.toUpperCase()} → ${effectiveTargetLang.toUpperCase()}) in ${latencyMs} ms.`,
      ar: `ترجمة فورية (${detectedSourceLang.toUpperCase()} ← ${effectiveTargetLang.toUpperCase()}) خلال ${latencyMs} مللي ثانية.`,
      fr: `Traduction rapide (${detectedSourceLang.toUpperCase()} → ${effectiveTargetLang.toUpperCase()}) en ${latencyMs} ms.`,
    },
    examples: [{ ruStressed, en: enClean, ar: arClean, fr: frClean }],
    latencyMs,
    providerUsed: 'mymemory',
  };

  cache.set(cacheKey, result);
  return result;
}
