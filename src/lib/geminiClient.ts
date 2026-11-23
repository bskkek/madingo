// ============================================================================
// MADINGO — GEMINI EXTRACTION (static hosting)
// Two paths, in order:
//   1. SHARED PROXY (preferred): the app calls our tiny proxy server, which
//      holds the Gemini key as a server-side secret. Every app user gets AI
//      extraction with NO key of their own. Proxy URL is baked in at build
//      time via VITE_GEMINI_PROXY_URL (see ~/workspace/madingo/proxy/).
//   2. DIRECT (fallback): if the proxy is not configured or is unreachable,
//      the browser calls the Gemini REST API directly with a free API key
//      the user pastes once in the app. The key is stored ONLY in this
//      browser's localStorage — it is never sent to us, never baked into
//      the code, and never leaves the device except to Google's API.
// Free key: https://aistudio.google.com/apikey
// Models: gemini-3-flash-preview (primary) with gemini-3.8-flash fallback.
// NOTE (2026-11-09): gemini-2.0-flash was retired by Google (404) and
// gemini-2.5-flash is no longer available to new users. gemini-3.8-flash
// was the free-tier replacement but is heavily overloaded at peak
// times (hangs / HTTP 503) — gemini-3-flash-preview answers the same
// extraction prompts fast, so it is now tried FIRST and gemini-3.8-flash
// is only the fallback.
// ============================================================================

import {
  ArenaQuestion,
  parseExerciseFromAIText,
  shuffleQuestionOptions,
} from './arenaEngine';

const GEMINI_KEY_STORAGE_KEY = 'madingo_gemini_api_key_v1';
// Primary model first, then the verified-working fallback.
const GEMINI_MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash'];
// Set at build time, e.g. VITE_GEMINI_PROXY_URL=https://<proxy-host>/extract
// Empty = no proxy configured (direct-with-key path only).
// DEFAULT (2026-11-18): the shared proxy URL is the fallback, so EVERY
// build works with no key of its own — the user must never be asked to
// paste a Gemini key. The proxy URL is public (see ~/workspace/madingo/
// proxy/README.md); the secret key lives only on the proxy server.
const DEFAULT_GEMINI_PROXY_URL =
  'https://madingo-gemini-proxy--billelaniss1.replit.app/extract';
const GEMINI_PROXY_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_GEMINI_PROXY_URL) ||
  DEFAULT_GEMINI_PROXY_URL;
// One Gemini attempt may hang while the model is overloaded — fail fast so
// the fallback model (or the proxy) gets its turn instead of hanging the UI.
const GEMINI_REQUEST_TIMEOUT_MS = 45_000;

export type GeminiExtractErrorCode =
  | 'invalid_key'
  | 'quota'
  | 'timeout'
  | 'no_questions'
  | 'network'
  | 'unknown';

export class GeminiExtractError extends Error {
  code: GeminiExtractErrorCode;
  /** True only for a fast 503 (model overloaded right now) — worth one retry. */
  retryable: boolean;
  constructor(code: GeminiExtractErrorCode, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function getGeminiApiKey(): string | null {
  try {
    const key = window.localStorage.getItem(GEMINI_KEY_STORAGE_KEY);
    return key && key.trim().length >= 8 ? key.trim() : null;
  } catch {
    return null;
  }
}

export function saveGeminiApiKey(key: string): void {
  try {
    window.localStorage.setItem(GEMINI_KEY_STORAGE_KEY, key.trim());
  } catch {
    // ignore quota errors
  }
}

export function clearGeminiApiKey(): void {
  try {
    window.localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getGeminiProxyUrl(): string {
  return GEMINI_PROXY_URL ? GEMINI_PROXY_URL.trim() : '';
}

export function isGeminiProxyConfigured(): boolean {
  return getGeminiProxyUrl().length > 0;
}

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() =>
    clearTimeout(timer)
  );
}

function parseQuestionsFromRawText(
  rawText: string,
  count: number
): ArenaQuestion[] {
  const parsed = parseExerciseFromAIText(rawText);
  if (parsed.length === 0) {
    throw new GeminiExtractError(
      'no_questions',
      'Gemini returned no questions from this page.'
    );
  }
  return parsed.slice(0, count).map((q) => shuffleQuestionOptions(q));
}

function errorFromGeminiStatus(
  status: number,
  detail: string
): GeminiExtractError {
  if (status === 400 || status === 401 || status === 403) {
    return new GeminiExtractError(
      'invalid_key',
      detail || 'Gemini rejected the API key.'
    );
  }
  if (status === 429) {
    return new GeminiExtractError(
      'quota',
      detail || 'Gemini quota / rate limit reached.'
    );
  }
  if (status === 503) {
    return new GeminiExtractError(
      'timeout',
      detail ||
        'Gemini is temporarily overloaded (HTTP 503) — please try again in a minute.',
      true
    );
  }
  return new GeminiExtractError(
    'unknown',
    detail || `Gemini request failed (HTTP ${status}).`
  );
}

/** One direct Gemini attempt for one model. Throws GeminiExtractError. */
async function callGeminiDirect(
  model: string,
  parts: any[],
  apiKey: string
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let resp: Response;
  try {
    resp = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
      GEMINI_REQUEST_TIMEOUT_MS
    );
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      // A hung request means this model is overloaded — do NOT retry the
      // same model, move straight to the fallback model instead.
      // Report it as a timeout, never as 'quota': the quota was not hit.
      throw new GeminiExtractError(
        'timeout',
        `Gemini model ${model} timed out (overloaded).`
      );
    }
    throw new GeminiExtractError('network', 'Network error while calling Gemini.');
  }
  if (!resp.ok) {
    let detail = '';
    try {
      const errBody: any = await resp.json();
      detail = errBody?.error?.message || '';
    } catch {
      // ignore
    }
    throw errorFromGeminiStatus(resp.status, detail);
  }
  const data: any = await resp.json().catch(() => null);
  const textParts: string[] = [];
  for (const cand of data?.candidates || []) {
    for (const part of cand?.content?.parts || []) {
      if (typeof part?.text === 'string') textParts.push(part.text);
    }
  }
  return textParts.join('\n');
}

/**
 * Call the shared proxy (see ~/workspace/madingo/proxy/). The proxy holds
 * the key server-side, so the caller needs no key at all. `proxyUrl`
 * exists only so tests can point at a local proxy; the app uses the
 * build-time VITE_GEMINI_PROXY_URL.
 */
export async function extractQuestionsViaProxy(
  opts: {
    pageText?: string;
    pageImageBase64?: string;
    teacherInstructions?: string;
    topic?: string;
    questionCount?: number;
  },
  proxyUrl?: string
): Promise<{ questions: ArenaQuestion[]; extractedTopic: string }> {
  const url = (proxyUrl || getGeminiProxyUrl()).trim();
  if (!url) {
    throw new GeminiExtractError('unknown', 'AI proxy is not configured.');
  }
  const count = Math.max(2, Math.min(25, opts.questionCount || 5));
  const topic = opts.topic || 'ورقة التمرين المستخرجة';
  let resp: Response;
  try {
    resp = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageText: opts.pageText || '',
          pageImageBase64: opts.pageImageBase64 || '',
          teacherInstructions: opts.teacherInstructions || '',
          topic,
          questionCount: count,
        }),
      },
      90_000
    );
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      // A timeout is NOT a quota problem — report it as its own code so
      // the UI never tells the user the free quota was reached.
      throw new GeminiExtractError(
        'timeout',
        'The AI service timed out — please try again in a minute.'
      );
    }
    throw new GeminiExtractError('network', 'Network error while calling the AI service.');
  }
  const data: any = await resp.json().catch(() => null);
  if (!resp.ok || !data?.ok) {
    const code = (data?.error?.code as GeminiExtractErrorCode) || 'unknown';
    throw new GeminiExtractError(
      ['invalid_key', 'quota', 'timeout', 'no_questions', 'network', 'unknown'].includes(code)
        ? code
        : 'unknown',
      data?.error?.message || `AI service request failed (HTTP ${resp.status}).`
    );
  }
  return {
    questions: parseQuestionsFromRawText(String(data.text || ''), count),
    extractedTopic: topic,
  };
}

function splitDataUrl(
  dataUrl: string
): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

/**
 * Same prompt the server used (providers.ts extractArenaQuestionsFromPage),
 * so the questions come out in the same format the app already parses.
 */
function buildExtractionPrompt(opts: {
  topic: string;
  instructions: string;
  pageText: string;
}): string {
  return `Вы — эксперт-преподаватель. Проанализируйте эту прикрепленную преподавателем страницу/воркшит (worksheet) и извлеките **ВСЕ** упражнения и вопросы, которые присутствуют на этой странице (если на странице 2 упражнения, извлеките оба; если 3 или больше, извлеките все).
Тема: "${opts.topic}"
Указания преподавателя: "${opts.instructions}"
${opts.pageText ? `Текст со страницы:\n${opts.pageText.slice(0, 4000)}` : ''}

ТРЕБОВАНИЯ К ВОПРОСАМ:
1. Вопрос на русском языке (promptRu) с правильными знаками ударения (акут) для ключевых слов или ё.
2. Ровно 4 варианта ответа (options), один из которых строго правильный (correctIndex от 0 до 3).
3. Понятная краткая инструкция (instructionRu, instructionAr, instructionEn).
4. Чёткое грамматическое объяснение (explanationRu, explanationAr, explanationEn).
5. Назначьте 10 баллов за каждый вопрос (points: 10).

Верните результат ТОЛЬКО в формате JSON-массива:
[
  {
    "id": "q-1",
    "promptRu": "Студе́нты е́дут на заня́тия в ...",
    "promptTranslit": "Studenty yedut na zanyatiya v ...",
    "hintAr": "حالة النصب بعد حرف الجر В (الاتجاه نحو الجامعة)",
    "hintEn": "Accusative case after preposition В indicating direction",
    "instructionRu": "Выберите правильную форму существительного",
    "instructionAr": "اختر الصيغة الصحيحة للاسم",
    "instructionEn": "Choose the correct noun form",
    "options": ["университе́т", "университе́те", "университе́та", "университе́ту"],
    "correctIndex": 0,
    "explanationRu": "Винительный падеж неодушевлённого существительного мужского рода (Куда? В университет).",
    "explanationAr": "حالة النصب لاسم غير عاقل مذكر للإشارة إلى الوجهة (إلى أين؟ إلى الجامعة).",
    "explanationEn": "Inanimate masculine noun in Accusative case answering 'Where to?'.",
    "points": 10
  }
]`;
}

/**
 * Extract questions from a lesson page.
 * Order: shared proxy first (no key needed for the user) → direct Gemini
 * with the user's own key (primary model, then the fallback model).
 * `apiKey` is optional: required only when no proxy is configured.
 */
export async function extractQuestionsViaGemini(opts: {
  apiKey?: string;
  pageText?: string;
  pageImageBase64?: string;
  teacherInstructions?: string;
  topic?: string;
  questionCount?: number;
}): Promise<{ questions: ArenaQuestion[]; extractedTopic: string }> {
  const count = Math.max(2, Math.min(25, opts.questionCount || 5));
  const topic = opts.topic || 'ورقة التمرين المستخرجة';
  const instructions =
    opts.teacherInstructions || 'استخرج جميع التمارين والأسئلة الموجودة في هذه الورقة بالكامل';

  // Path 1 — shared proxy: works for every user, no key needed.
  if (isGeminiProxyConfigured()) {
    try {
      return await extractQuestionsViaProxy({
        pageText: opts.pageText,
        pageImageBase64: opts.pageImageBase64,
        teacherInstructions: instructions,
        topic,
        questionCount: count,
      });
    } catch (proxyErr: any) {
      // No own key to fall back to — surface the proxy error as-is.
      if (!opts.apiKey) throw proxyErr;
      // Otherwise fall through to the direct path below.
    }
  }

  // Path 2 — direct Gemini with the user's own key.
  const apiKey = (opts.apiKey || '').trim();
  if (!apiKey) {
    throw new GeminiExtractError(
      'invalid_key',
      'AI extraction needs a free Gemini key — paste it once in the app.'
    );
  }

  const parts: any[] = [];
  const image = (opts.pageImageBase64 || '').trim();
  if (image.length > 50) {
    const split = splitDataUrl(image);
    parts.push({
      inlineData: {
        mimeType: split ? split.mimeType : 'image/jpeg',
        data: split ? split.data : image,
      },
    });
  }
  parts.push({
    text: buildExtractionPrompt({ topic, instructions, pageText: opts.pageText || '' }),
  });

  // Try each model; retry a 503/timeout once per model before moving on.
  let lastErr: GeminiExtractError | null = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rawText = await callGeminiDirect(model, parts, apiKey);
        return {
          questions: parseQuestionsFromRawText(rawText, count),
          extractedTopic: topic,
        };
      } catch (e: any) {
        const err = e instanceof GeminiExtractError ? e : new GeminiExtractError('unknown', String(e?.message || e));
        // A bad key fails on every model — stop immediately.
        if (err.code === 'invalid_key') throw err;
        lastErr = err;
        // 'no_questions' is a real answer from this model — do not retry it.
        if (err.code === 'no_questions') throw err;
        // One quick retry only for a fast 503; a timeout moves straight to
        // the next model (retrying a hung model just wastes a minute).
        if (attempt === 0 && err.retryable) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        break;
      }
    }
  }
  throw (
    lastErr ||
    new GeminiExtractError('unknown', 'Gemini request failed.')
  );
}
