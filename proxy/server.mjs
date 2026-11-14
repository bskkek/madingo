// ============================================================================
// MADINGO — GEMINI PROXY (server-side)
// Tiny zero-dependency Node server. It holds the Gemini API key ONLY as a
// server-side secret (env var GEMINI_API_KEY) and exposes ONE endpoint the
// public app calls, so every app user gets AI extraction WITHOUT entering
// any key — and the key itself never appears in the app code, the repo,
// the GitHub Pages bundle, or any log.
//
// SECURITY — read this before touching this file:
//   * NEVER put a real API key in this repo, in any file, or in a log.
//     The key lives only in the hosting platform's secret store
//     (Replit Secrets / Cloudflare `wrangler secret put` / env var).
//   * The proxy never returns the key, never logs request bodies, and
//     only answers /extract + /chat + /library + /speak + /transcribe +
//     /api/push/* (Web Push subscriptions + due scheduler) +
//     /health + /api/generate-content + /api/arena/* (live classroom
//     challenge rooms: create / join / answer / start / finish, polling
//     first — no WebSocket server, the app polls room state every 3.5s).
//     Madingo storybook app (bskkek/Madingo-bio, UNCHANGED) expects from
//     its own server: POST {model, contents, config} -> the raw Gemini
//     response {candidates, promptFeedback, usageMetadata, ...}.
//     The book's built frontend is also served from here (GET / and
//     /assets/* from ./book/dist) so the book runs same-origin with its
//     API, exactly as its own server would serve it — no book code is
//     changed, only this proxy gains the two things the book needs.
//   * Abuse protection: per-IP hourly limit + a global daily cap, so one
//     person cannot burn the whole free quota. /speak, /library and
//     /transcribe have their own smaller caps so they never eat the
//     /extract + /chat quota.
//     /api/generate-content has its own counters + a server-side TTS
//     cache, so replaying the book's lines does not re-spend quota.
//
// Run locally:  GEMINI_API_KEY=... node server.mjs   (port 8787)
// Run on Replit: import this folder as a Repl, set the GEMINI_API_KEY
//                 secret, press Run. See README.md.
// ============================================================================

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const DAILY_CAP = Number(process.env.DAILY_CAP || 500);
const HOURLY_PER_IP = Number(process.env.HOURLY_PER_IP || 20);
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PAGE_TEXT = 20000;
const REQUEST_TIMEOUT_MS = 45_000;
// Extract timeout (2026-11-13): gemini-3.8-flash HANGS at peak times, so a
// 45s per-call timeout burned the client's whole 90s budget before the
// fallback model was ever tried. Extract calls (/extract + arena
// extract-page) get a tighter timeout so a hang fails fast: worst
// case is 35s + 35s (two models, no same-model retry) ≈ 70s + ~4s
// overhead ≈ 74s, still inside the client's 90s budget. The global 45s
// timeout is UNCHANGED — /speak (TTS audio generation) legitimately
// needs the longer budget, so it keeps REQUEST_TIMEOUT_MS.
const EXTRACT_TIMEOUT_MS = 35_000;
// Extract image guard (2026-11-13): the client downscales phone photos
// to ~100–200 KB before sending; anything far above that is a bug (a
// full-size 2–5 MB photo forwarded to Gemini = slow + wasteful). Base64
// payload length, data-URL prefix excluded; 2,000,000 chars ≈ 1.5 MB
// of image bytes.
const MAX_EXTRACT_IMAGE_CHARS = 2_000_000;

// Voice (Gemini TTS) — clear professional Russian voices:
// Masha = female 'Aoede', Aniss = male 'Charon'.
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_VOICES = { masha: 'Aoede', aniss: 'Charon' };
const SPEAK_DAILY_CAP = Number(process.env.SPEAK_DAILY_CAP || 100);
const SPEAK_HOURLY_PER_IP = Number(process.env.SPEAK_HOURLY_PER_IP || 10);
// Voice transcription (voice-call bot demo) — its own caps so it never
// eats the /extract + /chat quota. One clip is a short voice message
// (MediaRecorder, max ~30 s), so 100/day and 20/hour per IP is plenty.
const TRANSCRIBE_DAILY_CAP = Number(process.env.TRANSCRIBE_DAILY_CAP || 100);
const TRANSCRIBE_HOURLY_PER_IP = Number(process.env.TRANSCRIBE_HOURLY_PER_IP || 20);
const TRANSCRIBE_MAX_AUDIO_CHARS = 2_000_000; // ~1.5 MB base64 ≈ 60 s of Opus
const transcribeState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };
// Book search — its own light cap (does not touch the AI quota).
const LIBRARY_DAILY_CAP = Number(process.env.LIBRARY_DAILY_CAP || 500);
const LIBRARY_HOURLY_PER_IP = Number(process.env.LIBRARY_HOURLY_PER_IP || 60);

// POST /api/generate-content (Madingo storybook app) — its own counters
// + a server-side TTS cache, so replaying the book's lines is free.
// Model allowlist mirrors the book's own server (bskkek/Madingo-bio).
// NOTE (2026-11-11): the book has 52 spoken turns; one full listen is
// ~52 TTS requests, so the hourly per-IP cap must leave headroom above
// that. The global daily cap (500) still bounds total Gemini usage.
const GEN_DAILY_CAP = Number(process.env.GEN_DAILY_CAP || 500);
const GEN_HOURLY_PER_IP = Number(process.env.GEN_HOURLY_PER_IP || 200);
const genContentState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };
const GEN_TTS_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];
// Persistent TTS cache (2026-11-11): the in-memory cache was wiped every
// time the Repl slept/restarted, so every re-listen re-burned the tiny
// Gemini free-tier TTS quota (10 req/day/model) and characters went
// silent mid-story. Cached audio is now ALSO written to ./tts-cache/
// (one JSON file per turn, keyed by sha256 of voice::contents) and
// reloaded at startup, so a turn generated once stays free forever.
// The Repl workspace filesystem persists across sleeps/restarts.
const TTS_CACHE_DIR = path.resolve(process.env.TTS_CACHE_DIR || 'tts-cache');
const TTS_CACHE_MAX = 200;
function ttsCacheFileForKey(key) {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return path.join(TTS_CACHE_DIR, `${hash}.json`);
}
function ttsCacheLoadFromDisk() {
  try {
    fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
    let loaded = 0;
    for (const name of fs.readdirSync(TTS_CACHE_DIR)) {
      if (!name.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(TTS_CACHE_DIR, name), 'utf8'));
        if (parsed && typeof parsed.key === 'string' && parsed.payload) {
          genTtsCache.set(parsed.key, parsed.payload);
          loaded += 1;
        }
      } catch { /* corrupt entry — skip */ }
    }
    if (loaded > 0) console.log(`[proxy] loaded ${loaded} cached TTS turns from disk`);
  } catch (e) {
    console.log('[proxy] disk TTS cache unavailable:', e?.message || e);
  }
}
function ttsCacheSaveToDisk(key, payload) {
  try {
    fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
    fs.writeFileSync(ttsCacheFileForKey(key), JSON.stringify({ key, payload }), 'utf8');
  } catch { /* disk cache is best-effort */ }
}
function ttsCacheDeleteFromDisk(key) {
  try { fs.unlinkSync(ttsCacheFileForKey(key)); } catch { /* already gone */ }
}
const GENERATE_CONTENT_MODELS = new Set([
  'gemini-4-argon',
  'gemini-3.1-pro-preview',
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-image',
  'gemini-2.5-flash-image',
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
]);
const genTtsCache = new Map(); // voice::contents -> full Gemini payload, capped at TTS_CACHE_MAX entries
ttsCacheLoadFromDisk();

function checkGenContentLimits(ip) {
  return checkCounter(ip, genContentState, GEN_DAILY_CAP, GEN_HOURLY_PER_IP);
}

if (!API_KEY) {
  console.error('[proxy] FATAL: GEMINI_API_KEY env var is not set. Refusing to start.');
  process.exit(1);
}

// Primary model first, then the fallback that answers fast when the
// primary is overloaded (verified 2026-11-09: gemini-3.8-flash hangs /
// 503s at peak times, gemini-3-flash-preview answers in ~11s).
// Order flipped 2026-11-13: preview FIRST (it answers), 3.8-flash only
// as fallback — the old order burned 45s on a hanging primary before
// the fallback was ever tried.
const MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash'];

// Extraction-only models (2026-11-13): gemini-3-flash-preview thinks HIGH
// by default (80–356s on image inputs) and gemini-3.8-flash is the most
// congested model (repeated 503s) — both are dropped from extraction.
// gemini-3.5-flash-lite (Stable, free tier, designed for extraction /
// document processing, thinking default MINIMAL) is the primary;
// gemini-3.6-flash (Stable, free tier, Google's official replacement
// for gemini-3-flash-preview) is the fallback. Used ONLY by
// extractViaGemini — /chat, /transcribe and /speak keep MODELS above.
// Thinking is set per model in extractViaGemini via
// generationConfig.thinkingConfig.thinkingLevel (v1beta REST form).
const EXTRACT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
const EXTRACT_THINKING_LEVEL = {
  'gemini-3.5-flash-lite': 'minimal',
  'gemini-3.6-flash': 'low',
};

// CORS allowlist: the live Pages site + local dev + the proxy's OWN
// published origin (the storybook runs same-origin from this server, so
// its browser fetches carry this Origin). Extra origins via env,
// comma-separated, e.g. ALLOWED_ORIGINS=https://example.com
const ALLOWED_ORIGINS = new Set([
  'https://bskkek.github.io',
  'https://madingo-gemini-proxy--billelaniss1.replit.app',
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / curl / server-to-server
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {
    // ignore
  }
  return false;
}

// --- Rate limiting (in-memory; fine for one small Replit instance) --------
const ipHits = new Map(); // ip -> { windowStart, count }
let dailyCount = 0;
let dailyDate = new Date().toISOString().slice(0, 10);

// Separate counters for /speak and /library so they never eat the
// /extract + /chat quota.
const speakState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };
const libraryState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };

function checkCounter(ip, state, dailyCap, hourlyCap) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== state.dailyDate) {
    state.dailyDate = today;
    state.dailyCount = 0;
  }
  if (state.dailyCount >= dailyCap) return 'daily';
  const now = Date.now();
  const rec = state.ipHits.get(ip) || { windowStart: now, count: 0 };
  if (now - rec.windowStart > 60 * 60 * 1000) {
    rec.windowStart = now;
    rec.count = 0;
  }
  rec.count += 1;
  state.ipHits.set(ip, rec);
  if (rec.count > hourlyCap) return 'hourly';
  return null;
}

function checkSpeakLimits(ip) {
  return checkCounter(ip, speakState, SPEAK_DAILY_CAP, SPEAK_HOURLY_PER_IP);
}

function checkTranscribeLimits(ip) {
  return checkCounter(ip, transcribeState, TRANSCRIBE_DAILY_CAP, TRANSCRIBE_HOURLY_PER_IP);
}

function checkLibraryLimits(ip) {
  return checkCounter(ip, libraryState, LIBRARY_DAILY_CAP, LIBRARY_HOURLY_PER_IP);
}

function checkLimits(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyDate) {
    dailyDate = today;
    dailyCount = 0;
  }
  if (dailyCount >= DAILY_CAP) return 'daily';
  const now = Date.now();
  const rec = ipHits.get(ip) || { windowStart: now, count: 0 };
  if (now - rec.windowStart > 60 * 60 * 1000) {
    rec.windowStart = now;
    rec.count = 0;
  }
  rec.count += 1;
  ipHits.set(ip, rec);
  if (rec.count > HOURLY_PER_IP) return 'hourly';
  return null;
}

// --- Gemini ---------------------------------------------------------------
// Same prompt the app used (src/lib/geminiClient.ts buildExtractionPrompt),
// so questions come out in the same format the app already parses.
function buildExtractionPrompt({ topic, instructions, pageText }) {
  return `Вы — эксперт-преподаватель. Проанализируйте эту прикрепленную преподавателем страницу/воркшит (worksheet) и извлеките **ВСЕ** упражнения и вопросы, которые присутствуют на этой странице (если на странице 2 упражнения, извлеките оба; если 3 или больше, извлеките все).
Тема: "${topic}"
Указания преподавателя: "${instructions}"
${pageText ? `Текст со страницы:\n${pageText.slice(0, 4000)}` : ''}

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

function splitDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

// True when an extract image payload is absurdly large (see
// MAX_EXTRACT_IMAGE_CHARS). The data-URL prefix, if any, is excluded
// from the measurement; raw base64 is measured as-is.
function extractImageTooLarge(pageImageBase64) {
  const raw = String(pageImageBase64 || '').trim();
  if (raw.length <= 50) return false;
  const split = splitDataUrl(raw);
  const payload = split ? split.data : raw;
  return payload.length > MAX_EXTRACT_IMAGE_CHARS;
}

async function callGemini(model, requestBody, timeoutMs = REQUEST_TIMEOUT_MS) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      let detail = '';
      try {
        const errBody = await resp.json();
        detail = errBody?.error?.message || '';
      } catch {
        // ignore
      }
      return { ok: false, status: resp.status, detail };
    }
    const data = await resp.json().catch(() => null);
    const textParts = [];
    for (const cand of data?.candidates || []) {
      for (const part of cand?.content?.parts || []) {
        if (typeof part?.text === 'string') textParts.push(part.text);
      }
    }
    return { ok: true, text: textParts.join('\n') };
  } catch (e) {
    return { ok: false, status: 0, detail: e?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// Raw variant of callGemini: returns the FULL parsed Gemini response
// (candidates with inlineData audio included) instead of just the text.
// Used ONLY by POST /api/generate-content, the contract the Madingo
// storybook app expects (its TTS playback reads inlineData audio from
// candidates[0].content.parts[0].inlineData.data).
async function callGeminiRaw(model, requestBody) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return { ok: false, status: resp.status, detail: data?.error?.message || '' };
    }
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: 0, detail: e?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

async function extractViaGemini({ pageText, pageImageBase64, topic, instructions }) {
  const parts = [];
  const image = String(pageImageBase64 || '').trim();
  if (image.length > 50) {
    const split = splitDataUrl(image);
    parts.push({
      inlineData: {
        mimeType: split ? split.mimeType : 'image/jpeg',
        data: split ? split.data : image,
      },
    });
  }
  parts.push({ text: buildExtractionPrompt({ topic, instructions, pageText }) });

  let lastDetail = '';
  for (const model of EXTRACT_MODELS) {
    // Thinking is set explicitly per model: 'minimal' keeps the lite
    // model fast (it does not think by default), 'low' stops the
    // 3.6-flash default-medium thinking from burning the timeout on a
    // big JSON (5 questions x explanations in 3 languages).
    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: EXTRACT_THINKING_LEVEL[model] || 'low' },
      },
    };
    // One attempt per model, no same-model retry: on 503 the model is
    // overloaded — retrying it just wastes the client's 90s budget,
    // move to the next model immediately. Worst case 35s + 35s ≈ 74s.
    const attemptStarted = Date.now();
    const res = await callGemini(model, requestBody, EXTRACT_TIMEOUT_MS);
    const attemptMs = Date.now() - attemptStarted;
    const statusLabel = res.ok ? 200 : (res.status || res.detail || 'error');
    const shortDetail = String(res.detail || '').replace(/\s+/g, ' ').slice(0, 120);
    console.log(`[extract] attempt model=${model} status=${statusLabel} ms=${attemptMs}${shortDetail ? ` detail=${shortDetail}` : ''}`);
    if (res.ok) return { ok: true, text: res.text, model };
    lastDetail = res.detail || '';
    // Bad key / bad request: retrying another model will not help.
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { ok: false, code: 'invalid_key', message: lastDetail || 'Gemini rejected the API key.' };
    }
    if (res.status === 429) {
      return { ok: false, code: 'quota', message: lastDetail || 'Gemini quota / rate limit reached.' };
    }
    // 503 / timeout / network: fall through to the next model.
  }
  // Total failure: 'quota' ONLY on a real 429 (returned above).
  // A timeout is a timeout — never report it as quota.
  if (lastDetail === 'timeout') {
    return {
      ok: false,
      code: 'timeout',
      message: 'AI extraction timed out — Gemini took too long to answer. Please try again with a clearer page or shorter text.',
    };
  }
  return {
    ok: false,
    code: 'unknown',
    message: lastDetail || 'Gemini is temporarily overloaded — please try again in a minute.',
  };
}

// --- Masha chat (free-form roleplay, plain text — NOT JSON mode) -----------
// Used by "Ты — учитель": Masha, a first-year MADI student, answers the
// learner in Russian. Same models, limits and CORS as /extract. The client
// sends a system prompt (Masha's character + lesson topic) and the
// conversation so far; Gemini replies as Masha in plain Russian text.
async function chatViaGemini({ systemPrompt, messages }) {
  const contents = (messages || []).slice(-20).map((m) => ({
    role: m && m.role === 'model' ? 'model' : 'user',
    parts: [{ text: String((m && m.text) || '').slice(0, 2000) }],
  }));
  if (contents.length === 0) {
    return { ok: false, code: 'unknown', message: 'No messages to answer.' };
  }
  const requestBody = {
    systemInstruction: { parts: [{ text: String(systemPrompt || '').slice(0, 2000) }] },
    contents,
    generationConfig: { temperature: 0.8, maxOutputTokens: 700 },
  };

  let lastDetail = '';
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await callGemini(model, requestBody);
      if (res.ok) return { ok: true, text: res.text, model };
      lastDetail = res.detail || '';
      // Bad key / bad request: retrying another model will not help.
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, code: 'invalid_key', message: lastDetail || 'Gemini rejected the API key.' };
      }
      if (res.status === 429) {
        return { ok: false, code: 'quota', message: lastDetail || 'Gemini quota / rate limit reached.' };
      }
      // 503: one quick retry of the same model. Timeout / network: the model
      // is hung — retrying it just wastes a minute, move to the next model.
      if (res.status === 503 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      break;
    }
  }
  return {
    ok: false,
    code: 'quota',
    message: lastDetail || 'Gemini is temporarily overloaded — please try again in a minute.',
  };
}

// --- MADI library search -------------------------------------------------
// The MADI scientific-technical library (НТБ МАДИ): home http://lib.madi.ru/
// full-text library http://lib.madi.ru/fel/ (alphabetical index, sections
// by discipline, real PDFs under /fel/fel1/), electronic catalog
// https://lib.madi.ru/ec_in_internet ("Электронный каталог НТБ МАДИ–ГТУ
// в интернете").
//
// TODO (LIVE SEARCH — UNVERIFIED, 2026-11-10): the exact catalog search
// form/parameters were NEVER observed — lib.madi.ru does not resolve from
// the research VM or its browser (DNS REFUSED, the same .ru block that
// killed profi.ru and od.globaluni.ru), so no page loaded and no test
// search was possible. The live attempt below is a BEST EFFORT: fetch the
// catalog page + the full-text index server-side (Replit's network may
// resolve .ru fine), extract <a href> links to /fel/...pdf files with
// their link text, and match query tokens against them. If the fetch
// fails or finds nothing, the curated offline index answers instead.
// DO NOT claim live search works until a real Replit fetch returns real
// results. Replace this whole function when the real catalog search
// URL/parameters are confirmed.
const MADI_LIBRARY_LINKS = {
  home: 'http://lib.madi.ru/',
  fullText: 'http://lib.madi.ru/fel/',
  catalog: 'https://lib.madi.ru/ec_in_internet',
};

// Curated offline index — ONLY real titles verified by web search
// (title + author + year + PDF URL all seen in indexed MADI / university
// programme documents). NEVER add a title here without verifying its
// real PDF URL first.
const MADI_OFFLINE_INDEX = [
  {
    id: 'fel14E166',
    title: 'Химия. Теория, справочные материалы, лабораторные работы, контрольные задания и примеры решения задач',
    author: 'Остаева Г.Ю., Панасенко А.А., Полякова Е.В.',
    year: 2013,
    pages: 260,
    url: 'http://lib.madi.ru/fel/fel1/fel14E166.pdf',
    source: 'offline-index',
    keywords: ['химия', 'chemistry', 'كيمياء', 'chimie', 'теория', 'лабораторные', 'задачи', 'остаева', 'паписов'],
  },
  {
    id: 'fel16E361',
    title: 'Повышение безопасности дорожных условий',
    author: 'Новизенцев В.В.',
    year: 2012,
    pages: 139,
    url: 'https://lib.madi.ru/fel/fel1/fel16E361.pdf',
    source: 'offline-index',
    keywords: ['безопасность', 'дорожных условий', 'дороги', 'safety', 'roads', 'سلامة', 'طرق', 'sécurité', 'routes', 'новизенцев', 'дорожные'],
  },
  {
    id: 'fel15E327',
    title: 'Методика преподавания русского языка как иностранного',
    author: 'Чеснокова М.П.',
    year: 2015,
    pages: 132,
    url: 'https://lib.madi.ru/fel/fel1/fel15E327.pdf',
    source: 'offline-index',
    keywords: ['русский язык', 'russian', 'الروسية', 'russe', 'методика', 'преподавание', 'рки', 'чеснокова', 'иностранного'],
  },
  {
    id: 'fel23E643',
    title: 'Инвентаризация выбросов загрязняющих веществ передвижными источниками дорожного транспорта',
    author: 'Трофименко Ю.В., Комков В.И.',
    year: 2023,
    url: 'https://lib.madi.ru/fel/fel1/fel23E643.pdf',
    source: 'offline-index',
    keywords: ['экология', 'выбросы', 'загрязняющих', 'ecology', 'emissions', 'بيئة', 'انبعاثات', 'écologie', 'трофименко', 'комков', 'транспорт'],
  },
  {
    id: 'fel18E481',
    title: 'Проектирование городских улиц и дорог',
    author: 'Мартяхин Д.С., Косцов А.В., Мордовин С.С.',
    year: 2018,
    pages: 68,
    url: 'https://lib.madi.ru/fel/fel1/fel18E481.pdf',
    source: 'offline-index',
    keywords: ['проектирование', 'городских улиц', 'дорог', 'roads', 'streets', 'تصميم', 'شوارع', 'طرق', 'conception', 'rues', 'мартяхин', 'косцов', 'улиц'],
  },
];

function normalizeSearch(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ё/g, 'е')
    .trim();
}

function searchOfflineIndex(query, limit = 8) {
  const q = normalizeSearch(query);
  if (!q) return [];
  const tokens = q.split(/[^a-zа-я0-9\u0600-\u06ff]+/u).filter((t) => t.length > 1);
  if (tokens.length === 0) return [];
  return MADI_OFFLINE_INDEX.map((book) => {
    const hay = normalizeSearch([book.title, book.author, ...book.keywords].join(' '));
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += 2;
      else if (token.length >= 4 && hay.includes(token.slice(0, 4))) score += 1;
    }
    return { book, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => {
      const { keywords, ...rest } = s.book;
      return rest;
    });
}

async function fetchWithTimeoutText(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'madingo-library-proxy/1.0 (+https://bskkek.github.io/madingo/)' },
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Best-effort live scrape of the MADI full-text index + catalog page. */
async function searchLiveMadiLibrary(query) {
  const tokens = normalizeSearch(query)
    .split(/[^a-zа-я0-9\u0600-\u06ff]+/u)
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return [];
  const pages = await Promise.all([
    fetchWithTimeoutText(MADI_LIBRARY_LINKS.fullText, 5000),
    fetchWithTimeoutText(MADI_LIBRARY_LINKS.catalog, 5000),
  ]);
  const found = new Map();
  for (const html of pages) {
    if (!html) continue;
    // <a href="...pdf">Title</a> — capture href + link text.
    const re = /<a[^>]+href=["']([^"']+\.pdf)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      let href = m[1].trim();
      if (!href) continue;
      if (href.startsWith('/')) href = 'http://lib.madi.ru' + href;
      else if (!/^https?:\/\//i.test(href)) href = MADI_LIBRARY_LINKS.fullText + href.replace(/^\.\//, '');
      const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!title || found.has(href)) continue;
      const hay = normalizeSearch(title + ' ' + href);
      let score = 0;
      for (const token of tokens) {
        if (hay.includes(token)) score += 2;
      }
      if (score > 0) {
        found.set(href, {
          id: href,
          title,
          author: '',
          url: href,
          source: href.includes('/fel/') ? 'live-fulltext' : 'live-catalog',
        });
      }
    }
  }
  return [...found.values()].slice(0, 8);
}

async function searchMadiLibrary(query) {
  // OFFLINE-ONLY (2026-11-10): the live scrape below has NEVER returned a
  // real result from anywhere, and on the published Autoscale deployment it
  // HANGS the request (two external /library POSTs from the VM never
  // completed in 60s/90s, while /health on the same deployment answers
  // instantly). The app would wait up to its 30s timeout before falling
  // back. So /library answers from the curated offline index immediately.
  // Re-enable the live attempt only after a verified fast live fetch from
  // the published deployment (see searchLiveMadiLibrary, kept for that).
  return {
    results: searchOfflineIndex(query),
    source: 'offline',
    note: 'Live MADI catalog unreachable from this server — results from the curated offline index. Browse the full library at lib.madi.ru/fel/.',
  };
}

// --- Gemini TTS (clear professional Russian voices) -----------------------
// POST /speak { text, voice: 'masha' | 'aniss' } →
//   { ok, audioBase64, mimeType, voice, model }.
// Masha = female 'Aoede', Aniss = male 'Charon' (prebuilt Gemini voices).
// The app plays the base64 audio; on any failure it falls back to the
// device's speechSynthesis ru-RU voice.
async function speakViaGemini({ text, voice }) {
  const voiceName = TTS_VOICES[voice] || TTS_VOICES.masha;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: String(text).slice(0, 1000) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      }),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      let detail = '';
      try {
        const errBody = await resp.json();
        detail = errBody?.error?.message || '';
      } catch {
        // ignore
      }
      if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
        return { ok: false, code: 'invalid_key', message: detail || 'Gemini rejected the API key.' };
      }
      if (resp.status === 404) {
        return { ok: false, code: 'tts_unavailable', message: detail || `TTS model ${TTS_MODEL} is not available.` };
      }
      if (resp.status === 429) {
        return { ok: false, code: 'quota', message: detail || 'Gemini quota / rate limit reached.' };
      }
      return { ok: false, code: 'unknown', message: detail || `TTS failed (HTTP ${resp.status}).` };
    }
    const data = await resp.json().catch(() => null);
    for (const cand of data?.candidates || []) {
      for (const part of cand?.content?.parts || []) {
        const inline = part?.inlineData;
        if (inline && typeof inline.data === 'string' && inline.data.length > 0) {
          return {
            ok: true,
            audioBase64: inline.data,
            mimeType: inline.mimeType || 'audio/wav',
            voice: voiceName,
            model: TTS_MODEL,
          };
        }
      }
    }
    return { ok: false, code: 'unknown', message: 'Gemini TTS returned no audio.' };
  } catch (e) {
    return { ok: false, code: 'unknown', message: e?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// --- Gemini transcription (voice-call bot demo) --------------------------
// POST /transcribe { audioBase64, mimeType } ->
//   { ok, text, model }.
// The caller (MediaRecorder in the browser) sends one short voice clip;
// Gemini listens and returns the Arabic transcription as plain text.
// Tries gemini-3-flash-preview first, then gemini-3.8-flash; a 429 on
// one model falls through to the next (free-tier quota is per-model).
const TRANSCRIBE_MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash'];
async function transcribeViaGemini({ audioBase64, mimeType }) {
  const prompt =
    'Transcribe this speech to text exactly as spoken, in Arabic (Algerian dialect if present). ' +
    'Return ONLY the transcription, no explanation, no added punctuation beyond what was said. ' +
    'If there is no intelligible speech, return an empty string.';
  let sawQuota = false;
  for (const model of TRANSCRIBE_MODELS) {
    const result = await callGemini(model, {
      contents: [{
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0 },
    });
    if (result.ok) return { ok: true, text: (result.text || '').trim(), model };
    if (result.status === 400 || result.status === 401 || result.status === 403) {
      return { ok: false, code: 'invalid_key', message: result.detail || 'Gemini rejected the API key.' };
    }
    if (result.status === 429) {
      sawQuota = true;
      continue;
    }
  }
  if (sawQuota) return { ok: false, code: 'quota', message: 'Gemini quota / rate limit reached.' };
  return { ok: false, code: 'unknown', message: 'Transcription failed.' };
}

// --- AI Classroom Challenge Arena (live rooms) ---------------------------
// In-memory only: rooms are live sessions. If this proxy restarts, live
// rooms disappear (acceptable — a class re-creates its room). The app
// client (src/components/AIClassroomArenaView.tsx) polls
// GET /api/arena/rooms/:id every 3.5s when the WebSocket is unavailable,
// so there is NO `ws` package and no real-time push here — polling is the
// design. A WS upgrade attempt is destroyed fast (see the 'upgrade'
// handler below) so the client falls back to polling immediately.
// NEVER seed or return simulated classmates (ids "stud-demo-*", e.g.
// Yassine B. / Amina K.): only real participants who joined via
// join/answer/start ever exist in this store. Rankings are computed from
// real participants only (realRankingsForRoom, mirrored from
// src/lib/arenaEngine.ts), and a "stud-demo-*" id is rejected on join.
// Room shape mirrors src/lib/localArena.ts newLocalRoom, except the room
// code here is a SHORT 6-character code (unambiguous chars only) while
// the client's local rooms use a 4-digit code (arenaEngine
// generateRoomCode). Participants is a Record keyed by participant id,
// exactly like ArenaRoom in arenaEngine — NOT an array.
const ARENA_MAX_ROOMS = Number(process.env.ARENA_MAX_ROOMS || 100);
const ARENA_READ_DAILY_CAP = Number(process.env.ARENA_READ_DAILY_CAP || 100000);
const ARENA_READ_HOURLY_PER_IP = Number(process.env.ARENA_READ_HOURLY_PER_IP || 600);
const ARENA_WRITE_DAILY_CAP = Number(process.env.ARENA_WRITE_DAILY_CAP || 20000);
const ARENA_WRITE_HOURLY_PER_IP = Number(process.env.ARENA_WRITE_HOURLY_PER_IP || 120);
// Arena page extraction shares the /extract Gemini counters (checkLimits)
// so it can never eat the whole daily quota on its own, plus this separate
// daily cap for arena extracts specifically (raised 50 → 200 on
// 2026-11-13: the shared 500/day Gemini cap is the real guard; 50 was
// hit during normal classroom use). Still env-overridable.
const ARENA_EXTRACT_DAILY_CAP = Number(process.env.ARENA_EXTRACT_DAILY_CAP || 200);
const arenaRooms = new Map(); // id -> ArenaRoom
const arenaReadState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };
const arenaWriteState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };
const arenaExtractState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };

function checkArenaReadLimits(ip) {
  const limited = checkCounter(ip, arenaReadState, ARENA_READ_DAILY_CAP, ARENA_READ_HOURLY_PER_IP);
  if (!limited) arenaReadState.dailyCount += 1;
  return limited;
}

function checkArenaWriteLimits(ip) {
  const limited = checkCounter(ip, arenaWriteState, ARENA_WRITE_DAILY_CAP, ARENA_WRITE_HOURLY_PER_IP);
  if (!limited) arenaWriteState.dailyCount += 1;
  return limited;
}

// Unambiguous chars only: no 0/O, no 1/I/L.
const ARENA_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateArenaCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => ARENA_CODE_CHARS[crypto.randomInt(ARENA_CODE_CHARS.length)]).join('');
  } while ([...arenaRooms.values()].some((r) => r.code === code));
  return code;
}

function findArenaRoom(idOrCode) {
  const clean = String(idOrCode || '').trim();
  if (!clean) return null;
  if (arenaRooms.has(clean)) return arenaRooms.get(clean);
  const upper = clean.toUpperCase();
  for (const room of arenaRooms.values()) {
    if (room.code.toUpperCase() === upper) return room;
  }
  return null;
}

function clampArenaTimeLimit(value, fallback = 30) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(10, Math.min(60, n));
}

function isSimulatedParticipantId(participantId) {
  return String(participantId || '').startsWith('stud-demo-');
}

// --- Scoring + rankings: EXACT ports of arenaEngine.ts -------------------
// calculateAnswerScore: base 10 (or question.points) + speed bonus
// (up to +5 for answering in the first half of the timer) + streak bonus
// (+2 per streak item after 2 in a row, capped at +6). Wrong = 0.
function calculateAnswerScore({ isCorrect, timeSpentSeconds, timeLimitSeconds, streak, basePoints }) {
  if (!isCorrect) return 0;
  const base = basePoints || 10;
  const limit = Math.max(5, timeLimitSeconds);
  const spent = Math.max(0.5, Math.min(timeSpentSeconds, limit));
  const timeRatio = Math.max(0, 1 - spent / limit);
  const speedBonus = Math.round(timeRatio * 5);
  const streakBonus = streak >= 2 ? Math.min(6, (streak - 1) * 2) : 0;
  return base + speedBonus + streakBonus;
}

const ARENA_TIER_LABELS = {
  gold: {
    ru: 'Отличный результат (Лидер)',
    ar: 'متميز جداً (قوي)',
    en: 'Outstanding (Top Driver)',
    fr: 'Remarquable (Meneur)',
  },
  silver: {
    ru: 'Хороший уровень (Уверенно)',
    ar: 'مستوى جيد (قوي)',
    en: 'Solid Performance',
    fr: 'Bon niveau',
  },
  bronze: {
    ru: 'Средний уровень (Нужна практика)',
    ar: 'متوسط (يحتاج متابعة)',
    en: 'Developing Skills',
    fr: 'En progression',
  },
  needs_review: {
    ru: 'Требуется повторение материала',
    ar: 'يحتاج دعم ومراجعة القواعد',
    en: 'Needs Review & Support',
    fr: 'Nécessite une révision',
  },
};

function computeArenaRankings(participants, totalQuestionsCount = 0) {
  const studentList = Object.values(participants).filter(
    (p) => p.role === 'student' || p.totalAnswered > 0
  );
  studentList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aAcc = a.totalAnswered > 0 ? a.correctCount / a.totalAnswered : 0;
    const bAcc = b.totalAnswered > 0 ? b.correctCount / b.totalAnswered : 0;
    if (bAcc !== aAcc) return bAcc - aAcc;
    return a.name.localeCompare(b.name);
  });
  return studentList.map((st, idx) => {
    const questionsTotal = totalQuestionsCount || Math.max(1, st.totalAnswered);
    const accuracyPct =
      questionsTotal > 0 ? Math.round((st.correctCount / questionsTotal) * 100) : 0;
    let tier = 'needs_review';
    if (accuracyPct >= 85) tier = 'gold';
    else if (accuracyPct >= 70) tier = 'silver';
    else if (accuracyPct >= 50) tier = 'bronze';
    else tier = 'needs_review';
    // Special promotion: rank 1 student with at least 60% gets gold.
    if (idx === 0 && accuracyPct >= 60) tier = 'gold';
    return {
      rank: idx + 1,
      id: st.id,
      name: st.name,
      avatar: st.avatar,
      score: st.score,
      accuracyPct,
      correctCount: st.correctCount,
      totalAnswered: st.totalAnswered,
      bestStreak: st.bestStreak,
      tier,
      tierLabel: ARENA_TIER_LABELS[tier],
    };
  });
}

/** Rankings from real participants only (re-ranked 1..n). */
function realRankingsForRoom(room) {
  const real = Object.fromEntries(
    Object.entries(room.participants).filter(([id]) => !isSimulatedParticipantId(id))
  );
  return computeArenaRankings(real, room.questions.length);
}

// List view: the full room plus the two counts the lobby renders.
function publicArenaRoom(room) {
  const realStudents = Object.values(room.participants).filter(
    (p) => !isSimulatedParticipantId(p.id) && p.role === 'student'
  ).length;
  return { ...room, participantsCount: realStudents, questionsCount: room.questions.length };
}

// Add the participant if not already present (re-join never duplicates —
// participants is a Record keyed by id); refresh name/avatar/online flag
// and keep the score. Returns null for a simulated id (never stored).
function ensureArenaParticipant(room, { id, name, avatar, role }) {
  const pid = String(id || '').trim();
  if (!pid || isSimulatedParticipantId(pid)) return null;
  let p = room.participants[pid];
  if (!p) {
    p = {
      id: pid,
      name: String(name || 'Student').slice(0, 100),
      avatar: String(avatar || ''),
      role: role === 'teacher' ? 'teacher' : 'student',
      score: 0,
      correctCount: 0,
      totalAnswered: 0,
      currentStreak: 0,
      bestStreak: 0,
      answers: {},
      isOnline: true,
      joinedAt: new Date().toISOString(),
    };
    room.participants[pid] = p;
  } else {
    if (name) p.name = String(name).slice(0, 100);
    if (avatar !== undefined) p.avatar = String(avatar);
    p.isOnline = true;
  }
  return p;
}

// Mirror of localArena.ts recordLocalAnswer, including its re-answer
// behaviour: a second answer to the same question OVERWRITES the stored
// answers[questionId] entry, but score/correctCount/totalAnswered are
// still incremented again (the client normally prevents this with its
// hasAnsweredCurrent guard — one submit per question per player).
function recordArenaAnswer(room, participant, question, optionIndex, timeSpentSeconds) {
  const isCorrect = optionIndex === question.correctIndex;
  const pointsEarned = calculateAnswerScore({
    isCorrect,
    timeSpentSeconds,
    timeLimitSeconds: room.questionTimeLimitSeconds || 30,
    streak: participant.currentStreak,
    basePoints: question.points || 10,
  });
  const nextStreak = isCorrect ? participant.currentStreak + 1 : 0;
  participant.score += pointsEarned;
  participant.correctCount += isCorrect ? 1 : 0;
  participant.totalAnswered += 1;
  participant.currentStreak = nextStreak;
  participant.bestStreak = Math.max(participant.bestStreak, nextStreak);
  participant.answers[question.id] = {
    optionIndex,
    isCorrect,
    timeSeconds: timeSpentSeconds,
    pointsEarned,
    answeredAt: new Date().toISOString(),
  };
  return { isCorrect, pointsEarned };
}

// --- Question normalisation + AI-text parsing: ports of arenaEngine.ts ---
// parseExerciseFromAIText + normalize defaults (same fallbacks the client
// uses), plus the Fisher-Yates option shuffle from geminiClient.ts
// parseQuestionsFromRawText (extractQuestionsViaGemini shuffles options
// after parsing, so the server does the same for extract-page).
function normalizeArenaQuestion(item, idx) {
  const options =
    Array.isArray(item.options) && item.options.length >= 2
      ? item.options.slice(0, 4).map(String)
      : ['Ответ A', 'Ответ B', 'Ответ C', 'Ответ D'];
  const correctIndex =
    typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < options.length
      ? item.correctIndex
      : 0;
  return {
    id: item.id || `q-${idx + 1}`,
    promptRu: item.promptRu || item.question || item.text || `Вопрос ${idx + 1}`,
    promptTranslit: item.promptTranslit,
    hintAr: item.hintAr || item.hint,
    hintEn: item.hintEn,
    instructionRu: item.instructionRu || 'Выберите правильный ответ',
    instructionAr: item.instructionAr || 'اختر الإجابة الصحيحة',
    instructionEn: item.instructionEn || 'Choose the correct answer',
    options,
    correctIndex,
    explanationRu: item.explanationRu || 'Правильное грамматическое употребление.',
    explanationAr: item.explanationAr || 'الاستخدام النحوي الصحيح وفقاً لقواعد اللغة الروسية.',
    explanationEn: item.explanationEn || 'Correct grammatical usage in Russian.',
    points: typeof item.points === 'number' ? item.points : 10,
  };
}

function shuffleArenaQuestionOptions(question) {
  const opts = [...question.options];
  if (opts.length < 2) return question;
  const currentCorrect = Math.max(0, Math.min(opts.length - 1, question.correctIndex));
  const correctValue = opts[currentCorrect];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const newCorrectIndex = opts.indexOf(correctValue);
  return { ...question, options: opts, correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0 };
}

function parseArenaQuestionsFromAIText(aiText) {
  if (!aiText || typeof aiText !== 'string') return [];
  const cleanJson = aiText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleanJson);
    const list = Array.isArray(parsed) ? parsed : parsed.questions || parsed.exercises;
    if (Array.isArray(list) && list.length > 0) {
      return list.map((item, idx) => normalizeArenaQuestion(item, idx));
    }
  } catch {
    // Continue to regex fallback
  }
  const objMatches = aiText.match(/\{[\s\S]*?\}/g);
  if (objMatches && objMatches.length > 0) {
    const recovered = [];
    for (let i = 0; i < objMatches.length; i++) {
      try {
        const item = JSON.parse(objMatches[i]);
        if (item.promptRu && Array.isArray(item.options)) {
          recovered.push(normalizeArenaQuestion(item, i));
        }
      } catch {
        // skip malformed block
      }
    }
    if (recovered.length > 0) return recovered;
  }
  return [];
}

// Strict validation for PUT /questions: every question must carry
// id/promptRu/options/correctIndex. Returns { ok, questions } or { ok:false, error }.
function validateArenaQuestions(input) {
  if (!Array.isArray(input)) return { ok: false, error: 'Send a questions array.' };
  const questions = [];
  for (let i = 0; i < input.length; i++) {
    const q = input[i] || {};
    if (typeof q.id !== 'string' || !q.id.trim()) {
      return { ok: false, error: `Question ${i + 1} is missing an id.` };
    }
    if (typeof q.promptRu !== 'string' || !q.promptRu.trim()) {
      return { ok: false, error: `Question ${i + 1} is missing promptRu.` };
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { ok: false, error: `Question ${i + 1} needs at least 2 options.` };
    }
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return { ok: false, error: `Question ${i + 1} has an invalid correctIndex.` };
    }
    questions.push(normalizeArenaQuestion(q, i));
  }
  return { ok: true, questions };
}

async function readArenaJsonBody(req) {
  const raw = await readBody(req);
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

// --- Madingo storybook hosting ------------------------------------------
// The book's built frontend (bskkek/Madingo-bio, UNCHANGED — built from
// its own repo) lives in ./book/dist next to this file on the host.
// Served same-origin so the book's relative /api/* calls reach this
// server. Only real files are served; anything else falls through to the
// normal 404 JSON below. No SPA catch-all: the book has no router.
const BOOK_DIST = process.env.BOOK_DIST || path.join(process.cwd(), 'book', 'dist');
const BOOK_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

// Returns true when the request was served as a book file.
function serveBookFile(req, res, log) {
  if (req.method !== 'GET') return false;
  const url = new URL(req.url || '/', 'http://localhost');
  let rel = '/';
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }
  if (rel === '/') rel = '/index.html';
  const distRoot = path.resolve(BOOK_DIST);
  const filePath = path.resolve(distRoot, '.' + rel);
  if (filePath !== distRoot && !filePath.startsWith(distRoot + path.sep)) return false;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': BOOK_MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    fs.createReadStream(filePath).pipe(res);
    log(200);
    return true;
  } catch {
    return false;
  }
}

// --- HTTP -----------------------------------------------------------------
function sendJson(res, status, obj, origin) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ============================================================================
// WEB PUSH NOTIFICATIONS (2026-11-15) — real push to installed-app users.
// User order 2026-11-15: every morning a notification (verb of the day +
// level reminder) + 5 minutes after the user closes the app a "come back
// and continue your level" notification. Content in the user's language
// (ar/fr/en/ru). This REVERSES the old "no reminders" note — the user now
// explicitly wants them.
//
// Design notes (read before touching):
//   * Zero-dependency, like the rest of this file: VAPID signing (ES256
//     JWT) + RFC 8291 aes128gcm payload encryption are implemented with
//     node:crypto only — no web-push library (Replit runs `node server.mjs`
//     with no npm install step, so a dependency would not be installed).
//   * Secrets live ONLY as env vars (Replit Secrets): VAPID_PUBLIC_KEY +
//     VAPID_PRIVATE_KEY (base64url, P-256), VAPID_SUBJECT (mailto),
//     PUSH_DUE_TOKEN (optional; when set, /api/push/due requires it).
//     NEVER put a key in this file, in a log, or in the app bundle.
//     The public key reaches the client via GET /api/push/vapid-public-key.
//   * Storage is a JSON file on disk (push-store.json) — subscriptions
//     MUST survive proxy restarts/sleeps (unlike arena rooms, which are
//     in-memory by design). Writes are serialised through a promise chain
//     and done atomically (tmp file + rename).
//   * The Replit Autoscale deployment SLEEPS when idle, so in-process
//     timers are unreliable. Nothing here schedules itself: an EXTERNAL
//     trigger (cron-job.org, every 5 min) calls GET /api/push/due, which
//     sends whatever is due (5-min close reminders + the 09:00 MSK morning
//     send, once per day per subscription). /due is idempotent: calling it
//     extra times sends nothing extra.
//   * Moscow time is UTC+3 year-round (no DST) — computed with a fixed
//     +3h offset, never the server's local timezone.
//   * Push services delete dead subscriptions with 410/404 — /due prunes
//     them from the store on sight.
// ============================================================================
const PUSH_VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || '').trim();
const PUSH_VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();
const PUSH_VAPID_SUBJECT = (process.env.VAPID_SUBJECT || 'mailto:billelaniss1@gmail.com').trim();
const PUSH_DUE_TOKEN = (process.env.PUSH_DUE_TOKEN || '').trim();
const PUSH_APP_URL = (process.env.PUSH_APP_URL || 'https://bskkek.github.io/madingo').replace(/\/$/, '');
const PUSH_MORNING_HOUR_MS = Number(process.env.PUSH_MORNING_HOUR_MS || 9); // 09:00 Moscow
const PUSH_CLOSE_DELAY_MS = Number(process.env.PUSH_CLOSE_DELAY_MS || 5 * 60 * 1000); // 5 min
const PUSH_STORE_FILE = path.resolve(process.env.PUSH_STORE_FILE || 'push-store.json');
const PUSH_DAILY_CAP = Number(process.env.PUSH_DAILY_CAP || 1000);
const PUSH_HOURLY_PER_IP = Number(process.env.PUSH_HOURLY_PER_IP || 60);
const PUSH_DUE_MIN_INTERVAL_MS = Number(process.env.PUSH_DUE_MIN_INTERVAL_MS || 30_000);
const pushState = { ipHits: new Map(), dailyCount: 0, dailyDate: new Date().toISOString().slice(0, 10) };
function checkPushLimits(ip) {
  const limited = checkCounter(ip, pushState, PUSH_DAILY_CAP, PUSH_HOURLY_PER_IP);
  if (!limited) pushState.dailyCount += 1;
  return limited;
}

// --- Push store (disk JSON, survives restarts) ------------------------------
const pushStore = { version: 1, subscriptions: {} };
function pushStoreLoadFromDisk() {
  try {
    if (!fs.existsSync(PUSH_STORE_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(PUSH_STORE_FILE, 'utf8'));
    if (parsed && parsed.version === 1 && parsed.subscriptions && typeof parsed.subscriptions === 'object') {
      pushStore.subscriptions = parsed.subscriptions;
      console.log(`[push] loaded ${Object.keys(pushStore.subscriptions).length} subscriptions from disk`);
    }
  } catch (e) {
    console.error('[push] corrupt store file, starting empty:', e.message);
  }
}
let pushSaveQueue = Promise.resolve();
function pushStoreSaveToDisk() {
  pushSaveQueue = pushSaveQueue.then(() => {
    const tmp = PUSH_STORE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(pushStore), 'utf8');
    fs.renameSync(tmp, PUSH_STORE_FILE);
  }).catch((e) => console.error('[push] save failed:', e.message));
}
pushStoreLoadFromDisk();

function pushNormLang(x) {
  return ['ar', 'fr', 'en', 'ru'].includes(x) ? x : 'ar';
}
function pushNormSnapshot(b) {
  return {
    language: pushNormLang(b.language),
    level: typeof b.level === 'string' ? b.level.slice(0, 100) : '',
    completedCount: Number.isFinite(Number(b.completedCount)) ? Math.max(0, Math.floor(Number(b.completedCount))) : 0,
    currentStage: Number.isFinite(Number(b.currentStage)) ? Math.max(0, Math.floor(Number(b.currentStage))) : 0,
  };
}
function pushValidSubscription(sub) {
  try {
    if (!sub || typeof sub.endpoint !== 'string') return false;
    new URL(sub.endpoint);
    if (!sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return false;
    if (Buffer.from(sub.keys.p256dh, 'base64url').length !== 65) return false;
    if (Buffer.from(sub.keys.auth, 'base64url').length !== 16) return false;
    return true;
  } catch { return false; }
}

// --- Web Push crypto (node:crypto only) -------------------------------------
function pushB64urlEncode(buf) { return Buffer.from(buf).toString('base64url'); }
function pushB64urlDecode(str) { return Buffer.from(str, 'base64url'); }
function pushDerToRawSignature(der) {
  let o = 0;
  if (der[o++] !== 0x30) throw new Error('bad der');
  let len = der[o++];
  if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = (len << 8) | der[o++]; }
  if (der[o++] !== 0x02) throw new Error('bad der');
  const rLen = der[o++];
  let r = der.subarray(o, o + rLen); o += rLen;
  if (der[o++] !== 0x02) throw new Error('bad der');
  const sLen = der[o++];
  let s = der.subarray(o, o + sLen);
  const strip = (b) => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; return b.subarray(i); };
  r = strip(r); s = strip(s);
  const out = Buffer.alloc(64);
  r.copy(out, 32 - r.length);
  s.copy(out, 64 - s.length);
  return out;
}
function pushVapidHeaders(endpoint) {
  if (!PUSH_VAPID_PUBLIC_KEY || !PUSH_VAPID_PRIVATE_KEY) return null;
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = pushB64urlEncode(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = pushB64urlEncode(Buffer.from(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: PUSH_VAPID_SUBJECT })));
  const unsigned = header + '.' + payload;
  const pubPoint = pushB64urlDecode(PUSH_VAPID_PUBLIC_KEY);
  const key = crypto.createPrivateKey({ key: {
    kty: 'EC', crv: 'P-256',
    x: pushB64urlEncode(pubPoint.subarray(1, 33)),
    y: pushB64urlEncode(pubPoint.subarray(33, 65)),
    d: PUSH_VAPID_PRIVATE_KEY,
  }, format: 'jwk' });
  const sigDer = crypto.sign('sha256', Buffer.from(unsigned), key);
  const jwt = unsigned + '.' + pushB64urlEncode(pushDerToRawSignature(sigDer));
  return {
    Authorization: `vapid t=${jwt},k=${PUSH_VAPID_PUBLIC_KEY}`,
    'Crypto-Key': `p256ecdsa=${PUSH_VAPID_PUBLIC_KEY}`,
  };
}
function pushEncrypt(sub, plaintext) {
  const clientPub = pushB64urlDecode(sub.keys.p256dh);
  const auth = pushB64urlDecode(sub.keys.auth);
  const eph = crypto.createECDH('prime256v1');
  const ephPub = eph.generateKeys();
  const shared = eph.computeSecret(clientPub);
  const salt = crypto.randomBytes(16);
  const info = Buffer.concat([Buffer.from('WebPush: info\0', 'latin1'), clientPub, ephPub]);
  // NOTE: hkdfSync returns an ArrayBuffer — wrap in Buffer.from() because
  // createCipheriv needs a Buffer/TypedArray key and IV.
  const prk = Buffer.from(crypto.hkdfSync('sha256', shared, auth, info, 32));
  const cekInfo = Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0', 'latin1'), Buffer.from([1])]);
  const nonceInfo = Buffer.concat([Buffer.from('Content-Encoding: nonce\0', 'latin1'), Buffer.from([1])]);
  const cek = Buffer.from(crypto.hkdfSync('sha256', Buffer.alloc(0), prk, cekInfo, 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', Buffer.alloc(0), prk, nonceInfo, 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  return { body: Buffer.concat([salt, rs, ephPub, ct]), salt, ephPub };
}
async function pushSend(sub, payloadObj) {
  const vapid = pushVapidHeaders(sub.endpoint);
  if (!vapid) return { ok: false, status: 0, error: 'vapid_not_configured' };
  let enc;
  try {
    enc = pushEncrypt(sub, Buffer.from(JSON.stringify(payloadObj), 'utf8'));
  } catch (e) {
    return { ok: false, status: 0, error: 'encrypt_failed' };
  }
  const u = new URL(sub.endpoint);
  const lib = u.protocol === 'http:' ? http : https;
  const headers = {
    ...vapid,
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    'Encryption': `salt=${pushB64urlEncode(enc.salt)}`,
    'Crypto-Key': `dh=${pushB64urlEncode(enc.ephPub)};p256ecdsa=${PUSH_VAPID_PUBLIC_KEY}`,
    'TTL': '86400',
  };
  return new Promise((resolve) => {
    const req = lib.request(u, { method: 'POST', headers, timeout: 10000 }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', () => resolve({ ok: false, status: 0, error: 'network' }));
    req.end(enc.body);
  });
}

// --- Verbs of the day (embedded from the app's verbs data, 225 verbs) ------
const PUSH_VERBS = [["v001","идти","يمشي","to go on foot (once)","aller à pied (une fois)","двигаться пешком"],["v002","ходить","يتجول","to go on foot (regularly)","aller à pied (souvent)","передвигаться пешком часто"],["v003","бежать","يجري","to run (once)","courir (une fois)","мчаться вперёд"],["v004","бегать","يركض","to run (regularly)","courir (souvent)","двигаться бегом часто"],["v005","ехать","يذهب بالمواصلات","to go by transport (once)","aller en transport (une fois)","двигаться на транспорте"],["v006","ездить","يتنقل","to go by transport (regularly)","aller en transport (souvent)","передвигаться на транспорте часто"],["v007","летать","يطير","to fly (regularly)","voler (souvent)","передвигаться по воздуху часто"],["v008","лететь","يسافر جوا","to fly (once)","voler (une fois)","двигаться по воздуху прямо"],["v009","плавать","يسبح","to swim (regularly)","nager (souvent)","передвигаться в воде часто"],["v010","плыть","يعوم","to swim (once)","nager (une fois)","двигаться в воде"],["v011","прыгать","يقفز","to jump","sauter","делать прыжки"],["v012","толкать","يدفع","to push","pousser","сдвигать силой"],["v013","тянуть","يسحب","to pull","tirer","тащить к себе"],["v014","нести","يحمل","to carry (once)","porter (une fois)","переносить груз"],["v015","носить","ينقل","to carry (regularly)","porter (souvent)","переносить груз часто"],["v016","падать","يسقط","to fall","tomber","опускаться вниз"],["v017","вставать","ينهض","to get up","se lever","подниматься на ноги"],["v018","садиться","يجلس","to sit down","s'asseoir","опускаться на сиденье"],["v019","стоять","يقف","to stand","se tenir debout","находиться стоя"],["v020","сидеть","يكون جالسا","to be sitting","être assis","находиться сидя"],["v021","ложиться","يستلقي","to lie down","s'allonger","принимать лежачее положение"],["v022","подниматься","يصعد","to go up","monter","двигаться вверх"],["v023","спускаться","ينزل","to go down","descendre","двигаться вниз"],["v024","поворачивать","يستدير","to turn","tourner","менять направление"],["v025","возвращаться","يعود","to return","revenir","приходить обратно"],["v026","просыпаться","يستيقظ","to wake up","se réveiller","выходить из сна"],["v027","умываться","يغسل وجهه","to wash one's face","se laver le visage","мыть лицо"],["v028","чистить","ينظف","to clean","nettoyer","делать чистым"],["v029","одеваться","يرتدي ملابسه","to get dressed","s'habiller","надевать одежду"],["v030","раздеваться","يخلع ملابسه","to get undressed","se déshabiller","снимать одежду"],["v031","завтракать","يفطر","to have breakfast","prendre le petit-déjeuner","есть утром"],["v032","обедать","يتغدى","to have lunch","déjeuner","есть днём"],["v033","ужинать","يتعشى","to have dinner","dîner","есть вечером"],["v034","гулять","يتنزه","to go for a walk","se promener","ходить на прогулке"],["v035","спать","ينام","to sleep","dormir","находиться во сне"],["v036","мыться","يغتسل","to wash oneself","se laver","мыть тело"],["v037","бриться","يحلق","to shave","se raser","сбривать бороду"],["v038","расчёсываться","يمشط شعره","to comb one's hair","se peigner","причёсывать волосы"],["v039","смотреть","يشاهد","to watch","regarder","направлять взгляд"],["v040","слушать","يستمع","to listen","écouter","воспринимать слухом"],["v041","покупать","يشتري","to buy","acheter","приобретать за деньги"],["v042","платить","يدفع المال","to pay","payer","отдавать деньги"],["v043","продавать","يبيع","to sell","vendre","отдавать за деньги"],["v044","играть","يلعب","to play","jouer","развлекаться игрой"],["v045","заниматься","يمارس","to practise","pratiquer","делать регулярно"],["v046","встречаться","يلتقي","to meet","se rencontrer","видеться с кем-то"],["v047","надевать","يلبس","to put on","mettre","натягивать одежду"],["v048","снимать","يخلع","to take off","enlever","убирать с себя"],["v049","завязывать","يربط","to tie","nouer","делать узел"],["v050","засыпать","يغفو","to fall asleep","s'endormir","погружаться в сон"],["v051","говорить","يتكلم","to speak","parler","произносить слова"],["v052","разговаривать","يتحدث","to talk","converser","вести беседу"],["v053","рассказывать","يحكي","to tell","raconter","излагать историю"],["v054","спрашивать","يسأل","to ask","demander","задавать вопрос"],["v055","отвечать","يجيب","to answer","répondre","давать ответ"],["v056","кричать","يصرخ","to shout","crier","громко говорить"],["v057","шептать","يهمس","to whisper","chuchoter","говорить тихо"],["v058","молчать","يصمت","to be silent","se taire","ничего не говорить"],["v059","объяснять","يشرح","to explain","expliquer","делать понятным"],["v060","обсуждать","يناقش","to discuss","discuter","вести обсуждение"],["v061","спорить","يجادل","to argue","argumenter","отстаивать своё мнение"],["v062","обещать","يعد","to promise","promettre","давать обещание"],["v063","благодарить","يشكر","to thank","remercier","выражать благодарность"],["v064","извиняться","يعتذر","to apologize","s'excuser","просить прощения"],["v065","здороваться","يحيي","to greet","saluer","приветствовать при встрече"],["v066","прощаться","يودع","to say goodbye","dire au revoir","говорить до свидания"],["v067","называть","يسمي","to name","nommer","давать имя"],["v068","звонить","يتصل","to call","appeler","делать телефонный звонок"],["v069","слышать","يسمع","to hear","entendre","воспринимать слухом"],["v070","понимать","يفهم","to understand","comprendre","улавливать смысл"],["v071","переводить","يترجم","to translate","traduire","передавать на другом языке"],["v072","повторять","يكرر","to repeat","répéter","говорить ещё раз"],["v073","смеяться","يضحك","to laugh","rire","издавать смех"],["v074","договариваться","يتفق","to agree","se mettre d'accord","приходить к согласию"],["v075","жаловаться","يشتكي","to complain","se plaindre","выражать недовольство"],["v076","учиться","يدرس","to study","étudier","получать знания"],["v077","учить","يتعلم","to learn","apprendre","усваивать знания"],["v078","читать","يقرأ","to read","lire","воспринимать текст"],["v079","писать","يكتب","to write","écrire","создавать текст"],["v080","считать","يحسب","to calculate","calculer","производить вычисления"],["v081","решать","يحل","to solve","résoudre","находить решение"],["v082","запоминать","يحفظ","to memorize","mémoriser","удерживать в памяти"],["v083","вспоминать","يتذكر","to recall","se souvenir","вызывать в памяти"],["v084","забывать","ينسى","to forget","oublier","терять из памяти"],["v085","знать","يعرف","to know","savoir","обладать знаниями"],["v086","изучать","يدرس بعمق","to study in depth","approfondir","углублённо познавать"],["v087","преподавать","يعلم","to teach","enseigner","передавать знания"],["v088","работать","يعمل","to work","travailler","выполнять работу"],["v089","помогать","يساعد","to help","aider","оказывать помощь"],["v090","проверять","يفحص","to check","vérifier","контролировать правильность"],["v091","исправлять","يصحح","to correct","corriger","устранять ошибки"],["v092","сдавать","يجتاز الامتحان","to pass an exam","passer un examen","проходить экзамен"],["v093","готовиться","يستعد","to prepare","se préparer","подготавливаться к делу"],["v094","начинать","يبدأ","to begin","commencer","приступать к делу"],["v095","заканчивать","ينهي","to finish","terminer","доводить до конца"],["v096","рисовать","يرسم","to draw","dessiner","создавать изображение"],["v097","чертить","يرسم مخططا","to draft","dessiner un plan","создавать чертёж"],["v098","искать","يبحث","to look for","chercher","разыскивать нужное"],["v099","находить","يجد","to find","trouver","обнаруживать искомое"],["v100","думать","يفكر","to think","penser","мыслить, размышлять"],["v101","любить","يحب","to love","aimer","испытывать любовь"],["v102","нравиться","يعجب","to be liked","plaire","вызывать симпатию"],["v103","ненавидеть","يكره","to hate","haïr","испытывать ненависть"],["v104","радоваться","يفرح","to rejoice","se réjouir","испытывать радость"],["v105","грустить","يحزن","to be sad","être triste","испытывать грусть"],["v106","плакать","يبكي","to cry","pleurer","лить слёзы"],["v107","бояться","يخاف","to be afraid","avoir peur","испытывать страх"],["v108","волноваться","يقلق","to worry","s'inquiéter","испытывать тревогу"],["v109","успокаиваться","يهدأ","to calm down","se calmer","становиться спокойным"],["v110","надеяться","يأمل","to hope","espérer","верить в лучшее"],["v111","хотеть","يريد","to want","vouloir","иметь желание"],["v112","мечтать","يحلم","to dream","rêver","представлять желаемое"],["v113","верить","يؤمن","to believe","croire","быть уверенным"],["v114","удивляться","يتعجب","to be surprised","s'étonner","испытывать удивление"],["v115","улыбаться","يبتسم","to smile","sourire","выражать радость улыбкой"],["v116","скучать","يشتاق","to miss someone","se languir de","тосковать по кому-то"],["v117","гордиться","يفتخر","to be proud","être fier","испытывать гордость"],["v118","злиться","يغضب","to be angry","se fâcher","испытывать злость"],["v119","уставать","يتعب","to get tired","se fatiguer","терять силы"],["v120","чувствовать","يشعر","to feel","sentir","воспринимать ощущения"],["v121","прощать","يسامح","to forgive","pardonner","отпускать обиду"],["v122","обнимать","يعانق","to hug","prendre dans ses bras","прижимать к себе"],["v123","дружить","يصادق","to be friends","être ami","поддерживать дружбу"],["v124","влюбляться","يقع في الحب","to fall in love","tomber amoureux","испытывать влюблённость"],["v125","целовать","يقبل","to kiss","embrasser","касаться губами"],["v126","пинать","يركل","to kick","frapper du pied","бить ногой"],["v127","бить","يضرب","to hit","frapper","наносить удары"],["v128","ловить","يلتقط","to catch","attraper","поймать в руки"],["v129","бросать","يرمي","to throw","jeter","кидать предмет"],["v130","держать","يمسك","to hold","tenir","не отпускать"],["v131","брать","يأخذ","to take","prendre","взять в руки"],["v132","давать","يعطي","to give","donner","передавать другому"],["v133","поднимать","يرفع","to lift","soulever","перемещать вверх"],["v134","опускать","يخفض","to lower","baisser","перемещать вниз"],["v135","танцевать","يرقص","to dance","danser","двигаться под музыку"],["v136","петь","يغني","to sing","chanter","издавать мелодию голосом"],["v137","дышать","يتنفس","to breathe","respirer","вдыхать воздух"],["v138","кашлять","يسعل","to cough","tousser","резко выдыхать воздух"],["v139","чихать","يعطس","to sneeze","éternuer","резко выдыхать носом"],["v140","курить","يدخن","to smoke","fumer","вдыхать дым"],["v141","хлопать","يصفق","to clap","applaudir","ударять ладонями"],["v142","махать","يلوح","to wave","agiter la main","двигать рукой"],["v143","кивать","يومئ برأسه","to nod","hocher la tête","двигать головой"],["v144","моргать","يرمش","to blink","cligner des yeux","закрывать глаза быстро"],["v145","жевать","يمضغ","to chew","mâcher","перемалывать пищу зубами"],["v146","глотать","يبلع","to swallow","avaler","пропускать пищу внутрь"],["v147","ползать","يزحف","to crawl","ramper","двигаться на четвереньках"],["v148","нырять","يغوص","to dive","plonger","погружаться под воду"],["v149","шевелиться","يتحرك","to move","bouger","слегка двигаться"],["v150","тренироваться","يتدرب","to train","s'entraîner","заниматься спортом"],["v151","есть","يأكل","to eat","manger","принимать пищу"],["v152","пить","يشرب","to drink","boire","принимать жидкость"],["v153","готовить","يطبخ","to cook","cuisiner","приготавливать пищу"],["v154","варить","يسلق","to boil","bouillir","готовить в воде"],["v155","жарить","يقلي","to fry","frire","готовить на сковороде"],["v156","печь","يخبز","to bake","cuire au four","готовить в духовке"],["v157","резать","يقطع","to cut","couper","делить на части"],["v158","пробовать","يتذوق","to taste","goûter","оценивать на вкус"],["v159","кушать","يتناول الطعام","to eat","manger","принимать пищу вежливо"],["v160","добавлять","يضيف","to add","ajouter","класть дополнительно"],["v161","мешать","يحرك","to stir","remuer","помешивать ложкой"],["v162","солить","يملح","to salt","saler","добавлять соль"],["v163","заказывать","يطلب","to order","commander","делать заказ"],["v164","подавать","يقدم","to serve","servir","ставить на стол"],["v165","наливать","يصب","to pour","verser","лить в посуду"],["v166","нюхать","يشم","to smell","renifler","вдыхать запах"],["v167","мыть","يغسل","to wash","laver","очищать водой"],["v168","угощать","يقدم الطعام","to offer food","offrir à manger","предлагать еду гостям"],["v169","перекусывать","يأكل وجبة خفيفة","to snack","grignoter","есть на ходу"],["v170","выбирать","يختار","to choose","choisir","отдавать предпочтение"],["v171","приносить","يحضر","to bring","apporter","доставлять сюда"],["v172","кипятить","يغلي","to bring to a boil","faire bouillir","доводить до кипения"],["v173","разогревать","يسخن","to reheat","réchauffer","греть повторно"],["v174","запекать","يشوي","to roast","rôtir","готовить до корочки"],["v175","смешивать","يخلط","to mix","mélanger","соединять вместе"],["v176","жить","يعيش","to live","vivre","существовать, проживать"],["v177","убирать","ينظف البيت","to clean up","faire le ménage","наводить порядок"],["v178","стирать","يغسل الملابس","to do the laundry","faire la lessive","мыть одежду"],["v179","гладить","يكوي","to iron","repasser","разглаживать утюгом"],["v180","открывать","يفتح","to open","ouvrir","делать открытым"],["v181","закрывать","يغلق","to close","fermer","делать закрытым"],["v182","включать","يشغل","to switch on","mettre en marche","запускать устройство"],["v183","выключать","يطفئ","to switch off","éteindre","отключать питание"],["v184","чинить","يصلح","to repair","réparer","исправлять поломку"],["v185","строить","يبني","to build","construire","возводить здание"],["v186","красить","يدهن","to paint","peindre","наносить краску"],["v187","вешать","يعلق","to hang up","accrocher","подвешивать на крюк"],["v188","ставить","يضع واقفا","to put upright","mettre debout","помещать вертикально"],["v189","класть","يضع","to put down","poser","помещать горизонтально"],["v190","сажать","يزرع","to plant","planter","высаживать в землю"],["v191","поливать","يسقي","to water","arroser","смачивать водой"],["v192","подметать","يكنس","to sweep","balayer","мести веником"],["v193","пылесосить","ينظف بالمكنسة","to vacuum","passer l'aspirateur","чистить пылесосом"],["v194","отдыхать","يستريح","to rest","se reposer","восстанавливать силы"],["v195","входить","يدخل","to enter","entrer","заходить внутрь"],["v196","выходить","يخرج","to go out","sortir","покидать помещение"],["v197","запирать","يقفل","to lock","verrouiller","закрывать на замок"],["v198","зажигать","يشعل","to light","allumer","давать огонь"],["v199","вытирать","يمسح","to wipe","essuyer","протирать тряпкой"],["v200","переезжать","ينتقل","to move house","déménager","менять место жительства"],["v201","путешествовать","يسافر","to travel","voyager","ездить по странам"],["v202","приезжать","يصل","to arrive","arriver","прибывать на транспорте"],["v203","уезжать","يغادر","to leave by transport","partir (en transport)","покидать место на транспорте"],["v204","приходить","يأتي","to come","venir","прибывать пешком"],["v205","уходить","يذهب","to leave on foot","partir (à pied)","покидать место пешком"],["v206","прилетать","يصل بالطائرة","to arrive by plane","arriver en avion","прибывать на самолёте"],["v207","улетать","يغادر بالطائرة","to leave by plane","partir en avion","отлетать на самолёте"],["v208","водить","يقود","to drive","conduire","управлять машиной"],["v209","кататься","يركب","to ride","faire un tour","ездить для удовольствия"],["v210","переходить","يعبر","to cross","traverser","идти через дорогу"],["v211","останавливаться","يتوقف","to stop","s'arrêter","делать остановку"],["v212","ждать","ينتظر","to wait","attendre","находиться в ожидании"],["v213","опаздывать","يتأخر","to be late","être en retard","приходить позже времени"],["v214","фотографировать","يصور","to take photos","photographier","снимать на камеру"],["v215","заходить","يزور","to drop in","passer voir","заглядывать в гости"],["v216","пересаживаться","يغير المواصلات","to change transport","changer de transport","менять транспорт"],["v217","теряться","يضيع","to get lost","se perdre","не знать дороги"],["v218","бронировать","يحجز","to book","réserver","заказывать заранее"],["v219","регистрироваться","يسجل","to check in","s'enregistrer","проходить регистрацию"],["v220","проходить","يمر","to pass through","passer","идти мимо"],["v221","добираться","يصل إلى","to get to","se rendre","доезжать до места"],["v222","отправляться","ينطلق","to set off","se mettre en route","начинать путь"],["v223","встречать","يستقبل","to meet","accueillir","принимать прибывшего"],["v224","провожать","يرافق","to see off","raccompagner","сопровождать до отъезда"],["v225","торопиться","يتعجل","to hurry","se dépêcher","спешить куда-то"]];
function pushVerbOfTheDay(nowMs) {
  const mskDay = Math.floor(((nowMs || Date.now()) + 3 * 3600 * 1000) / 86400000);
  return PUSH_VERBS[mskDay % PUSH_VERBS.length];
}
function pushMskParts(nowMs) {
  const msk = new Date((nowMs || Date.now()) + 3 * 3600 * 1000);
  return { date: msk.toISOString().slice(0, 10), hour: msk.getUTCHours() };
}

// --- Notification content (4 languages) ------------------------------------
const PUSH_TEXT = {
  ar: {
    morningTitle: (v) => `فعل اليوم: ${v}`,
    morningBody: (m, level, stage) => {
      if (level && stage) return `${m} — أنت في المستوى ${level}، المحطة ${stage} تستناك اليوم!`;
      if (stage) return `${m} — المحطة ${stage} تستناك اليوم، ادخل وكمّلها!`;
      if (level) return `${m} — أنت في المستوى ${level}، ادخل وتعلّم اليوم!`;
      return `${m} — ادخل اليوم وتعلّم فعلاً جديداً!`;
    },
    closeTitle: 'واصل من حيث توقفت',
    closeBody: (stage) => (stage ? `توقفت في المحطة ${stage} — ارجع الآن وكمّل مستواك!` : 'توقفت في منتصف الطريق — ارجع وكمّل مستواك!'),
  },
  fr: {
    morningTitle: (v) => `Verbe du jour : ${v}`,
    morningBody: (m, level, stage) => {
      if (level && stage) return `${m} — vous êtes au niveau ${level}, l'étape ${stage} vous attend aujourd'hui !`;
      if (stage) return `${m} — l'étape ${stage} vous attend aujourd'hui, entrez et terminez-la !`;
      if (level) return `${m} — vous êtes au niveau ${level}, entrez apprendre aujourd'hui !`;
      return `${m} — entrez apprendre un nouveau verbe aujourd'hui !`;
    },
    closeTitle: 'Reprenez où vous vous étiez arrêté',
    closeBody: (stage) => (stage ? `Vous vous êtes arrêté à l'étape ${stage} — revenez terminer votre niveau !` : 'Vous vous êtes arrêté en chemin — revenez terminer votre niveau !'),
  },
  en: {
    morningTitle: (v) => `Verb of the day: ${v}`,
    morningBody: (m, level, stage) => {
      if (level && stage) return `${m} — you're at level ${level}, stage ${stage} is waiting for you today!`;
      if (stage) return `${m} — stage ${stage} is waiting for you today, open the app and finish it!`;
      if (level) return `${m} — you're at level ${level}, open the app and learn today!`;
      return `${m} — open the app and learn a new verb today!`;
    },
    closeTitle: 'Pick up where you left off',
    closeBody: (stage) => (stage ? `You stopped at stage ${stage} — come back and finish your level!` : 'You stopped mid-road — come back and finish your level!'),
  },
  ru: {
    morningTitle: (v) => `Глагол дня: ${v}`,
    morningBody: (m, level, stage) => {
      if (level && stage) return `${m} — вы на уровне ${level}, этап ${stage} ждёт вас сегодня!`;
      if (stage) return `${m} — этап ${stage} ждёт вас сегодня, откройте приложение и пройдите его!`;
      if (level) return `${m} — вы на уровне ${level}, откройте приложение и учитесь сегодня!`;
      return `${m} — откройте приложение и выучите новый глагол сегодня!`;
    },
    closeTitle: 'Продолжите с того места, где остановились',
    closeBody: (stage) => (stage ? `Вы остановились на этапе ${stage} — вернитесь и завершите свой уровень!` : 'Вы остановились на полпути — вернитесь и завершите свой уровень!'),
  },
};
function pushMeaning(verb, lang) {
  // verb = [id, ru, ar, en, fr, ruDef]
  if (lang === 'fr') return verb[4];
  if (lang === 'en') return verb[3];
  if (lang === 'ru') return verb[5];
  return verb[2];
}
function pushMorningPayload(sub, verb) {
  const lang = pushNormLang(sub.language);
  const t = PUSH_TEXT[lang];
  const meaning = pushMeaning(verb, lang);
  return {
    title: t.morningTitle(verb[1]),
    body: t.morningBody(meaning, sub.level || '', sub.currentStage || 0),
    url: `${PUSH_APP_URL}/?autostart=1&push=verbs&verb=${verb[0]}`,
    tag: `madingo-morning-${pushMskParts().date}`,
    icon: `${PUSH_APP_URL}/pwa-192x192.png`,
    kind: 'morning',
    verbId: verb[0],
  };
}
function pushClosePayload(sub) {
  const lang = pushNormLang(sub.language);
  const t = PUSH_TEXT[lang];
  return {
    title: t.closeTitle,
    body: t.closeBody(sub.currentStage || 0),
    url: `${PUSH_APP_URL}/?autostart=1`,
    tag: 'madingo-close',
    icon: `${PUSH_APP_URL}/pwa-192x192.png`,
    kind: 'close',
  };
}

// --- Due run (called by the external trigger) -------------------------------
let pushDueRunning = false;
let pushDueLastAt = 0;
async function pushRunDue(nowMs) {
  const now = nowMs || Date.now();
  const { date, hour } = pushMskParts(now);
  const result = { sentMorning: 0, sentClose: 0, failed: 0, pruned: 0, morning: false };
  const subs = Object.values(pushStore.subscriptions);
  if (hour >= PUSH_MORNING_HOUR_MS) {
    const verb = pushVerbOfTheDay(now);
    for (const sub of subs) {
      if (sub.lastMorningDate === date) continue;
      const r = await pushSend(sub, pushMorningPayload(sub, verb));
      if (r.ok) { result.sentMorning++; sub.lastMorningDate = date; }
      else {
        result.failed++;
        if (r.status === 410 || r.status === 404) { delete pushStore.subscriptions[sub.endpoint]; result.pruned++; }
      }
    }
    result.morning = true;
  }
  for (const sub of Object.values(pushStore.subscriptions)) {
    if (sub.closedAt && !sub.closeReminderSent && now >= sub.closedAt + PUSH_CLOSE_DELAY_MS) {
      const r = await pushSend(sub, pushClosePayload(sub));
      if (r.ok) { result.sentClose++; sub.closeReminderSent = true; }
      else {
        result.failed++;
        if (r.status === 410 || r.status === 404) { delete pushStore.subscriptions[sub.endpoint]; result.pruned++; }
      }
    }
  }
  pushStoreSaveToDisk();
  return result;
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url || '/', 'http://localhost');
  const origin = req.headers.origin || '';
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

  // Minimal log: method/path/status/ms only — never bodies, never the key.
  const log = (status) =>
    console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} -> ${status} ${Date.now() - started}ms`);

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin)) {
      res.writeHead(403);
      res.end();
      log(403);
      return;
    }
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    log(204);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'madingo-gemini-proxy',
      models: MODELS,
      ttsModel: TTS_MODEL,
      endpoints: ['/extract', '/chat', '/library', '/speak', '/transcribe', '/api/generate-content', '/api/arena/rooms', '/api/arena/rooms/:id', '/api/arena/rooms/:id/join', '/api/arena/rooms/:id/answer', '/api/arena/rooms/:id/questions', '/api/arena/rooms/:id/settings', '/api/arena/rooms/:id/extract-page', '/api/arena/rooms/:id/start', '/api/arena/rooms/:id/next-question', '/api/arena/rooms/:id/finish', '/api/push/subscribe', '/api/push/unsubscribe', '/api/push/open', '/api/push/close', '/api/push/due', '/api/push/vapid-public-key', '/ (madingo storybook)'],
      arenaRooms: arenaRooms.size,
      arenaExtractDailyUsed: arenaExtractState.dailyCount,
      arenaExtractDailyCap: ARENA_EXTRACT_DAILY_CAP,
      dailyUsed: dailyCount,
      dailyCap: DAILY_CAP,
      speakDailyUsed: speakState.dailyCount,
      speakDailyCap: SPEAK_DAILY_CAP,
      transcribeDailyUsed: transcribeState.dailyCount,
      transcribeDailyCap: TRANSCRIBE_DAILY_CAP,
      libraryDailyUsed: libraryState.dailyCount,
      libraryDailyCap: LIBRARY_DAILY_CAP,
      pushConfigured: Boolean(PUSH_VAPID_PUBLIC_KEY && PUSH_VAPID_PRIVATE_KEY),
      pushSubscriptions: Object.keys(pushStore.subscriptions).length,
      pushMorningHourMs: PUSH_MORNING_HOUR_MS,
      pushCloseDelayMs: PUSH_CLOSE_DELAY_MS,
    }, origin);
    log(200);
    return;
  }

  // --- Web Push: subscriptions + scheduler entry (2026-11-15) ---------------
  if (req.method === 'GET' && url.pathname === '/api/push/vapid-public-key') {
    if (!PUSH_VAPID_PUBLIC_KEY) {
      sendJson(res, 503, { ok: false, error: { code: 'push_not_configured', message: 'VAPID keys are not set on the server.' } }, origin);
      log(503);
      return;
    }
    sendJson(res, 200, { ok: true, publicKey: PUSH_VAPID_PUBLIC_KEY }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/push/subscribe') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    const limited = checkPushLimits(ip);
    if (limited) {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: limited === 'daily' ? 'Daily push limit reached.' : 'Hourly push limit reached.' } }, origin);
      log(429);
      return;
    }
    let b;
    try { b = await readArenaJsonBody(req); } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    if (!pushValidSubscription(b.subscription)) {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid push subscription.' } }, origin);
      log(400);
      return;
    }
    const snap = pushNormSnapshot(b);
    const now = Date.now();
    const prev = pushStore.subscriptions[b.subscription.endpoint];
    pushStore.subscriptions[b.subscription.endpoint] = {
      endpoint: b.subscription.endpoint,
      keys: { p256dh: b.subscription.keys.p256dh, auth: b.subscription.keys.auth },
      ...snap,
      createdAt: prev ? prev.createdAt : now,
      updatedAt: now,
      closedAt: prev ? prev.closedAt : null,
      closeReminderSent: prev ? !!prev.closeReminderSent : false,
      lastMorningDate: prev ? prev.lastMorningDate || null : null,
    };
    pushStoreSaveToDisk();
    sendJson(res, 200, { ok: true, subscriptions: Object.keys(pushStore.subscriptions).length }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/push/unsubscribe') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    let b;
    try { b = await readArenaJsonBody(req); } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    if (typeof b.endpoint === 'string') delete pushStore.subscriptions[b.endpoint];
    pushStoreSaveToDisk();
    sendJson(res, 200, { ok: true, subscriptions: Object.keys(pushStore.subscriptions).length }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/push/open') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    let b;
    try { b = await readArenaJsonBody(req); } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    let known = false;
    if (typeof b.endpoint === 'string' && pushStore.subscriptions[b.endpoint]) {
      const sub = pushStore.subscriptions[b.endpoint];
      const snap = pushNormSnapshot(b);
      sub.language = snap.language;
      sub.level = snap.level;
      sub.completedCount = snap.completedCount;
      sub.currentStage = snap.currentStage;
      sub.updatedAt = Date.now();
      sub.closedAt = null;
      sub.closeReminderSent = false;
      known = true;
      pushStoreSaveToDisk();
    }
    sendJson(res, 200, { ok: true, known }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/push/close') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    let b;
    try { b = await readArenaJsonBody(req); } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    let known = false;
    if (typeof b.endpoint === 'string' && pushStore.subscriptions[b.endpoint]) {
      const sub = pushStore.subscriptions[b.endpoint];
      // The client sends its LATEST snapshot with /close, so the reminder
      // names the stage the user actually stopped at (not the one from
      // when the app was opened).
      const snap = pushNormSnapshot(b);
      sub.language = snap.language;
      sub.level = snap.level;
      sub.completedCount = snap.completedCount;
      sub.currentStage = snap.currentStage;
      sub.closedAt = Date.now();
      sub.closeReminderSent = false;
      sub.updatedAt = Date.now();
      known = true;
      pushStoreSaveToDisk();
    }
    sendJson(res, 200, { ok: true, known }, origin);
    log(200);
    return;
  }

  if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/push/due') {
    // Scheduler entry point — called by the EXTERNAL trigger (cron-job.org)
    // every 5 minutes. Idempotent: extra calls send nothing extra.
    if (PUSH_DUE_TOKEN) {
      const tok = url.searchParams.get('token') || req.headers['x-push-due-token'] || '';
      if (tok !== PUSH_DUE_TOKEN) {
        sendJson(res, 401, { ok: false, error: { code: 'unauthorized', message: 'Bad or missing push due token.' } }, origin);
        log(401);
        return;
      }
    }
    if (pushDueRunning) {
      sendJson(res, 409, { ok: false, error: { code: 'busy', message: 'A due run is already in progress.' } }, origin);
      log(409);
      return;
    }
    if (Date.now() - pushDueLastAt < PUSH_DUE_MIN_INTERVAL_MS) {
      sendJson(res, 429, { ok: false, error: { code: 'too_soon', message: 'Due was just checked.' } }, origin);
      log(429);
      return;
    }
    if (!PUSH_VAPID_PUBLIC_KEY || !PUSH_VAPID_PRIVATE_KEY) {
      sendJson(res, 503, { ok: false, error: { code: 'push_not_configured', message: 'VAPID keys are not set on the server.' } }, origin);
      log(503);
      return;
    }
    pushDueRunning = true;
    pushDueLastAt = Date.now();
    try {
      const result = await pushRunDue(Date.now());
      sendJson(res, 200, { ok: true, ...result, subscriptions: Object.keys(pushStore.subscriptions).length }, origin);
      log(200);
    } catch (e) {
      console.error('[push] due run failed:', e.message);
      sendJson(res, 500, { ok: false, error: { code: 'unknown', message: 'Due run failed.' } }, origin);
      log(500);
    } finally {
      pushDueRunning = false;
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/library') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    const limited = checkLibraryLimits(ip);
    if (limited === 'daily') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Daily library search limit reached — please try again tomorrow.' } }, origin);
      log(429);
      return;
    }
    if (limited === 'hourly') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Too many library searches from this device this hour — please wait a bit.' } }, origin);
      log(429);
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    const query = String(body.query || '').trim().slice(0, 200);
    if (!query) {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Send a book query.' } }, origin);
      log(400);
      return;
    }
    libraryState.dailyCount += 1;
    const result = await searchMadiLibrary(query);
    sendJson(res, 200, {
      ok: true,
      results: result.results,
      source: result.source,
      note: result.note,
      links: MADI_LIBRARY_LINKS,
    }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/speak') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    const limited = checkSpeakLimits(ip);
    if (limited === 'daily') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Daily voice limit reached — please try again tomorrow.' } }, origin);
      log(429);
      return;
    }
    if (limited === 'hourly') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Too many voice requests from this device this hour — please wait a bit.' } }, origin);
      log(429);
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    const text = String(body.text || '').trim().slice(0, 1000);
    const voice = body.voice === 'aniss' ? 'aniss' : 'masha';
    if (!text) {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Send text to speak.' } }, origin);
      log(400);
      return;
    }
    speakState.dailyCount += 1;
    const result = await speakViaGemini({ text, voice });
    if (!result.ok) {
      const status = result.code === 'quota' ? 429 : result.code === 'invalid_key' ? 500 : 502;
      sendJson(res, status, { ok: false, error: { code: result.code, message: result.message } }, origin);
      log(status);
      return;
    }
    sendJson(res, 200, {
      ok: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      voice: result.voice,
      model: result.model,
    }, origin);
    log(200);
    return;
  }

  // POST /transcribe — voice-call bot demo: one short voice clip in,
  // Arabic transcription out. Follows the same shape as /speak above
  // (origin check, own rate limits, same error codes).
  if (req.method === 'POST' && url.pathname === '/transcribe') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    const limited = checkTranscribeLimits(ip);
    if (limited === 'daily') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Daily transcription limit reached — please try again tomorrow.' } }, origin);
      log(429);
      return;
    }
    if (limited === 'hourly') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Too many transcriptions from this device this hour — please wait a bit.' } }, origin);
      log(429);
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    let audioBase64 = String(body.audioBase64 || '').trim();
    const dataUrl = audioBase64.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (dataUrl) audioBase64 = dataUrl[2];
    let mimeType = String(body.mimeType || '').split(';')[0].trim().toLowerCase();
    if (!mimeType.startsWith('audio/')) mimeType = 'audio/webm';
    if (!audioBase64 || audioBase64.length < 100) {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Send a voice clip to transcribe.' } }, origin);
      log(400);
      return;
    }
    if (audioBase64.length > TRANSCRIBE_MAX_AUDIO_CHARS) {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Voice clip is too long — keep it under 30 seconds.' } }, origin);
      log(400);
      return;
    }
    transcribeState.dailyCount += 1;
    const result = await transcribeViaGemini({ audioBase64, mimeType });
    if (!result.ok) {
      const status = result.code === 'quota' ? 429 : result.code === 'invalid_key' ? 500 : 502;
      sendJson(res, status, { ok: false, error: { code: result.code, message: result.message } }, origin);
      log(status);
      return;
    }
    sendJson(res, 200, { ok: true, text: result.text, model: result.model }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/extract') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    const limited = checkLimits(ip);
    if (limited === 'daily') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Daily AI extraction limit reached — please try again tomorrow.' } }, origin);
      log(429);
      return;
    }
    if (limited === 'hourly') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Too many extractions from this device this hour — please wait a bit.' } }, origin);
      log(429);
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    const pageText = String(body.pageText || '').slice(0, MAX_PAGE_TEXT);
    const pageImageBase64 = String(body.pageImageBase64 || '');
    const topic = String(body.topic || 'ورقة التمرين المستخرجة').slice(0, 200);
    const instructions = String(body.teacherInstructions || 'استخرج جميع التمارين والأسئلة الموجودة في هذه الورقة بالكامل').slice(0, 1000);
    const questionCount = Math.max(2, Math.min(25, Number(body.questionCount) || 5));
    if (!pageText && pageImageBase64.trim().length <= 50) {
      sendJson(res, 400, { ok: false, error: { code: 'no_questions', message: 'Send a page text or a page image to extract from.' } }, origin);
      log(400);
      return;
    }
    if (extractImageTooLarge(pageImageBase64)) {
      sendJson(res, 400, { ok: false, error: { code: 'image_too_large', message: 'Image is too large (over ~2 MB). Please send a smaller or compressed photo of the page.' } }, origin);
      log(400);
      return;
    }
    dailyCount += 1;
    const result = await extractViaGemini({ pageText, pageImageBase64, topic, instructions });
    if (!result.ok) {
      const status = result.code === 'quota' ? 429 : result.code === 'invalid_key' ? 500 : result.code === 'timeout' ? 504 : 502;
      sendJson(res, status, { ok: false, error: { code: result.code, message: result.message } }, origin);
      log(status);
      return;
    }
    sendJson(res, 200, { ok: true, text: result.text, model: result.model }, origin);
    log(200);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/chat') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: { code: 'unknown', message: 'Origin not allowed.' } }, origin);
      log(403);
      return;
    }
    const limited = checkLimits(ip);
    if (limited === 'daily') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Daily AI limit reached — please try again tomorrow.' } }, origin);
      log(429);
      return;
    }
    if (limited === 'hourly') {
      sendJson(res, 429, { ok: false, error: { code: 'quota', message: 'Too many requests from this device this hour — please wait a bit.' } }, origin);
      log(429);
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Invalid JSON body.' } }, origin);
      log(400);
      return;
    }
    const systemPrompt = String(body.systemPrompt || '').slice(0, 2000);
    const messages = Array.isArray(body.messages) ? body.messages.slice(0, 20) : [];
    if (!systemPrompt || messages.length === 0) {
      sendJson(res, 400, { ok: false, error: { code: 'unknown', message: 'Send a systemPrompt and messages.' } }, origin);
      log(400);
      return;
    }
    dailyCount += 1;
    const result = await chatViaGemini({ systemPrompt, messages });
    if (!result.ok) {
      const status = result.code === 'quota' ? 429 : result.code === 'invalid_key' ? 500 : 502;
      sendJson(res, status, { ok: false, error: { code: result.code, message: result.message } }, origin);
      log(status);
      return;
    }
    sendJson(res, 200, { ok: true, text: result.text, model: result.model }, origin);
    log(200);
    return;
  }

  // POST /api/generate-content — the exact contract the Madingo
  // storybook app expects from its own server (its playback/TTS calls
  // this with {model, contents, config} and reads the raw Gemini
  // response). Logic mirrors the book's own server: model allowlist,
  // TTS model fallback with a server-side audio cache, gemini-2.5-flash
  // mapped to gemini-3-flash-preview for text.
  if (req.method === 'POST' && url.pathname === '/api/generate-content') {
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { error: 'Origin not allowed.' }, origin);
      log(403);
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
      log(400);
      return;
    }
    const requestedModel = String(body?.model || '').replace(/^models\//, '');
    if (!GENERATE_CONTENT_MODELS.has(requestedModel)) {
      sendJson(res, 400, { error: 'Model not allowed.' }, origin);
      log(400);
      return;
    }
    // Strip client-only fields the REST API does not take, and translate
    // the JS-SDK body shape the book sends into the REST shape:
    //   * `config` -> `generationConfig` (REST has no top-level `config`;
    //     without this the API answers 500 'Unknown name "config"').
    //   * string `contents` -> [{parts:[{text}]}] (the SDK accepts a
    //     plain string; REST needs the parts form).
    //   * string parts -> {text} objects.
    const { httpOptions, model, config: sdkConfig, ...restBody } = body || {};
    const normalizedContents = (() => {
      const c = restBody?.contents;
      if (typeof c === 'string') return [{ parts: [{ text: c }] }];
      if (!Array.isArray(c)) return c;
      return c.map((item) => {
        if (typeof item === 'string') return { parts: [{ text: item }] };
        if (item && Array.isArray(item.parts)) {
          return {
            ...item,
            parts: item.parts.map((p) => (typeof p === 'string' ? { text: p } : p)),
          };
        }
        return item;
      });
    })();
    const sanitizedBody = { ...restBody, contents: normalizedContents };
    const genConfig = sdkConfig !== undefined ? sdkConfig : restBody?.generationConfig;
    if (genConfig !== undefined) sanitizedBody.generationConfig = genConfig;
    else delete sanitizedBody.generationConfig;
    const isTtsRequest =
      requestedModel.includes('tts') ||
      (Array.isArray(sanitizedBody?.generationConfig?.responseModalities) &&
        sanitizedBody.generationConfig.responseModalities.includes('AUDIO'));
    // TTS cache key (hoisted: needed both for the free cache-hit path
    // below and for storing a fresh synthesis).
    const ttsVoiceName =
      sanitizedBody?.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName || 'Kore';
    const ttsContentKey =
      typeof sanitizedBody?.contents === 'string'
        ? sanitizedBody.contents
        : JSON.stringify(sanitizedBody?.contents || '');
    const ttsCacheKey = `${ttsVoiceName}::${ttsContentKey}`;
    // CACHE FIRST (2026-11-11 fix): a cached turn costs NO Gemini quota,
    // so it must not consume the hourly/daily budget either. Before this
    // fix every replay/re-open re-burned the budget and the 60/hour cap
    // cut the story off mid-book.
    if (isTtsRequest) {
      const cachedPayload = genTtsCache.get(ttsCacheKey);
      if (cachedPayload) {
        sendJson(res, 200, cachedPayload, origin);
        log(200);
        return;
      }
    }
    const limited = checkGenContentLimits(ip);
    if (limited === 'daily') {
      sendJson(res, 429, { error: 'Daily storybook limit reached — please try again tomorrow.' }, origin);
      log(429);
      return;
    }
    if (limited === 'hourly') {
      sendJson(res, 429, { error: 'Too many storybook requests from this device this hour — please wait a bit.' }, origin);
      log(429);
      return;
    }
    genContentState.dailyCount += 1;

    if (isTtsRequest) {
      let lastErr = null;
      let lastStatus = 502;
      let sawQuota = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        for (const ttsModel of GEN_TTS_MODELS) {
          const result = await callGeminiRaw(ttsModel, sanitizedBody);
          if (result.ok) {
            const hasInlineAudio = Boolean(
              result.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data,
            );
            if (hasInlineAudio) {
              const payload = {
                candidates: result.data.candidates,
                promptFeedback: result.data.promptFeedback,
                usageMetadata: result.data.usageMetadata,
                modelVersion: result.data.modelVersion,
                responseId: result.data.responseId,
              };
              if (genTtsCache.size >= TTS_CACHE_MAX) {
                const oldestKey = genTtsCache.keys().next().value;
                genTtsCache.delete(oldestKey);
                ttsCacheDeleteFromDisk(oldestKey);
              }
              genTtsCache.set(ttsCacheKey, payload);
              ttsCacheSaveToDisk(ttsCacheKey, payload);
              sendJson(res, 200, payload, origin);
              log(200);
              return;
            }
          }
          lastErr = result.detail || '';
          lastStatus = result.status === 400 || result.status === 401 || result.status === 403 ? 500 : 502;
          if (result.status === 400 || result.status === 401 || result.status === 403) {
            sendJson(res, 500, { error: lastErr || 'Gemini rejected the API key.' }, origin);
            log(500);
            return;
          }
          // 429 (2026-11-11 fix): do NOT return here — the free-tier
          // quota is per-model, so fall through and try the NEXT TTS
          // model before giving up. Before this fix the first model's
          // 429 short-circuited the loop and the second model (which
          // often still has quota) was never tried.
          if (result.status === 429) {
            sawQuota = true;
            lastStatus = 429;
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
        }
        if (attempt === 0) await new Promise((r) => setTimeout(r, 450));
      }
      if (sawQuota && lastStatus === 429) {
        sendJson(res, 429, { error: lastErr || 'Gemini quota / rate limit reached.' }, origin);
        log(429);
        return;
      }
      sendJson(res, lastStatus, { error: lastErr || 'TTS synthesis failed across candidate models.' }, origin);
      log(lastStatus);
      return;
    }

    const effectiveModel = requestedModel === 'gemini-2.5-flash' ? 'gemini-3-flash-preview' : requestedModel;
    const result = await callGeminiRaw(effectiveModel, sanitizedBody);
    if (!result.ok) {
      if (result.status === 400 || result.status === 401 || result.status === 403) {
        sendJson(res, 500, { error: result.detail || 'Gemini rejected the API key.' }, origin);
        log(500);
        return;
      }
      if (result.status === 429) {
        sendJson(res, 429, { error: result.detail || 'Gemini quota / rate limit reached.' }, origin);
        log(429);
        return;
      }
      sendJson(res, 502, { error: result.detail || 'Failed to generate content.' }, origin);
      log(502);
      return;
    }
    const textParts = [];
    for (const cand of result.data?.candidates || []) {
      for (const part of cand?.content?.parts || []) {
        if (typeof part?.text === 'string') textParts.push(part.text);
      }
    }
    sendJson(res, 200, {
      candidates: result.data?.candidates,
      promptFeedback: result.data?.promptFeedback,
      usageMetadata: result.data?.usageMetadata,
      modelVersion: result.data?.modelVersion,
      responseId: result.data?.responseId,
      text: textParts.join('\n'),
      functionCalls: result.data?.functionCalls,
    }, origin);
    log(200);
    return;
  }

  // --- Arena: live classroom challenge rooms ---------------------------
  // Polling-first: the client polls GET /api/arena/rooms/:id every 3.5s.
  // Every route looks the room up by EITHER id or 6-char code.
  if (url.pathname === '/api/arena/rooms' || url.pathname.startsWith('/api/arena/rooms/')) {
    const segments = url.pathname.split('/').filter(Boolean); // ['api','arena','rooms', id?, action?]
    let idOrCode = null;
    if (segments[3]) {
      try { idOrCode = decodeURIComponent(segments[3]); } catch { idOrCode = segments[3]; }
    }
    const action = segments[4] || null;
    const arenaRateError = (limited) =>
      limited === 'daily'
        ? 'Daily arena limit reached — please try again tomorrow.'
        : 'Too many arena requests from this device this hour — please wait a bit.';

    // GET /api/arena/rooms — all live rooms, newest first.
    if (req.method === 'GET' && !idOrCode) {
      const limited = checkArenaReadLimits(ip);
      if (limited) {
        sendJson(res, 429, { error: arenaRateError(limited) }, origin);
        log(429);
        return;
      }
      const rooms = [...arenaRooms.values()]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(publicArenaRoom);
      sendJson(res, 200, { rooms }, origin);
      log(200);
      return;
    }

    // POST /api/arena/rooms — create a room, returned DIRECTLY (not wrapped).
    if (req.method === 'POST' && !idOrCode) {
      if (!isAllowedOrigin(origin)) {
        sendJson(res, 403, { error: 'Origin not allowed.' }, origin);
        log(403);
        return;
      }
      const limited = checkArenaWriteLimits(ip);
      if (limited) {
        sendJson(res, 429, { error: arenaRateError(limited) }, origin);
        log(429);
        return;
      }
      let body;
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      if (arenaRooms.size >= ARENA_MAX_ROOMS) {
        sendJson(res, 429, { error: 'Too many live rooms right now — please try again later.' }, origin);
        log(429);
        return;
      }
      const room = {
        id: `room-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        code: generateArenaCode(),
        title: String(body.title || '').trim().slice(0, 200) || 'تحدي ورقة الأستاذ — غرفة جديدة',
        teacherId: String(body.teacherId || '').trim().slice(0, 100),
        teacherName: String(body.teacherName || '').trim().slice(0, 100) || 'Teacher',
        status: 'waiting',
        exerciseTopic: String(body.exerciseTopic || '').trim().slice(0, 200),
        teacherInstructions: String(body.teacherInstructions || '').trim().slice(0, 1000),
        pages: [],
        questions: [],
        currentQuestionIndex: 0,
        questionTimeLimitSeconds: clampArenaTimeLimit(body.timeLimitSeconds, 30),
        participants: {},
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
      };
      arenaRooms.set(room.id, room);
      sendJson(res, 200, room, origin);
      log(200);
      return;
    }

    // All routes below need an existing room.
    const room = idOrCode ? findArenaRoom(idOrCode) : null;
    if (!room) {
      sendJson(res, 404, { error: 'Room not found.' }, origin);
      log(404);
      return;
    }

    // GET /api/arena/rooms/:idOrCode — { room, rankings }.
    if (req.method === 'GET' && !action) {
      const limited = checkArenaReadLimits(ip);
      if (limited) {
        sendJson(res, 429, { error: arenaRateError(limited) }, origin);
        log(429);
        return;
      }
      sendJson(res, 200, { room, rankings: realRankingsForRoom(room) }, origin);
      log(200);
      return;
    }

    // DELETE /api/arena/rooms/:idOrCode — { ok: true }.
    if (req.method === 'DELETE' && !action) {
      if (!isAllowedOrigin(origin)) {
        sendJson(res, 403, { error: 'Origin not allowed.' }, origin);
        log(403);
        return;
      }
      const limited = checkArenaWriteLimits(ip);
      if (limited) {
        sendJson(res, 429, { error: arenaRateError(limited) }, origin);
        log(429);
        return;
      }
      arenaRooms.delete(room.id);
      sendJson(res, 200, { ok: true }, origin);
      log(200);
      return;
    }

    // Mutating sub-routes below all share the origin + write-limit checks.
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!isAllowedOrigin(origin)) {
        sendJson(res, 403, { error: 'Origin not allowed.' }, origin);
        log(403);
        return;
      }
      const limited = checkArenaWriteLimits(ip);
      if (limited) {
        sendJson(res, 429, { error: arenaRateError(limited) }, origin);
        log(429);
        return;
      }
    }

    // POST /api/arena/rooms/:id/join — { room, rankings }.
    if (req.method === 'POST' && action === 'join') {
      let body;
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      const participantId = String(body.participantId || '').trim();
      if (!participantId) {
        sendJson(res, 400, { error: 'Send a participantId to join.' }, origin);
        log(400);
        return;
      }
      const participant = ensureArenaParticipant(room, {
        id: participantId,
        name: body.name,
        avatar: body.avatar,
        role: body.role,
      });
      if (!participant) {
        sendJson(res, 400, { error: 'Invalid participant id.' }, origin);
        log(400);
        return;
      }
      sendJson(res, 200, { room, rankings: realRankingsForRoom(room) }, origin);
      log(200);
      return;
    }

    // POST /api/arena/rooms/:id/answer — { isCorrect, pointsEarned,
    // explanationRu/Ar/En, rankings }.
    if (req.method === 'POST' && action === 'answer') {
      let body;
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      const participantId = String(body.participantId || '').trim();
      if (!participantId) {
        sendJson(res, 400, { error: 'Send a participantId to answer.' }, origin);
        log(400);
        return;
      }
      const question = room.questions.find((q) => q.id === String(body.questionId || ''));
      if (!question) {
        sendJson(res, 404, { error: 'Question not found.' }, origin);
        log(404);
        return;
      }
      const optionIndex = Number(body.optionIndex);
      if (!Number.isInteger(optionIndex) || optionIndex < -1 || optionIndex >= question.options.length) {
        sendJson(res, 400, { error: 'Send a valid optionIndex for this question.' }, origin);
        log(400);
        return;
      }
      const timeSpent = Number(body.timeSpentSeconds);
      const timeSpentSeconds = Number.isFinite(timeSpent) && timeSpent >= 0
        ? timeSpent
        : room.questionTimeLimitSeconds || 30;
      // Defensive auto-add: a player answering without joining first
      // still gets recorded (role student).
      const participant = ensureArenaParticipant(room, {
        id: participantId,
        name: body.participantName,
        avatar: body.participantAvatar,
        role: 'student',
      });
      if (!participant) {
        sendJson(res, 400, { error: 'Invalid participant id.' }, origin);
        log(400);
        return;
      }
      const { isCorrect, pointsEarned } = recordArenaAnswer(
        room, participant, question, optionIndex, timeSpentSeconds
      );
      sendJson(res, 200, {
        isCorrect,
        pointsEarned,
        explanationRu: question.explanationRu || '',
        explanationAr: question.explanationAr || '',
        explanationEn: question.explanationEn || '',
        rankings: realRankingsForRoom(room),
      }, origin);
      log(200);
      return;
    }

    // PUT /api/arena/rooms/:id/questions — replace the question list
    // wholesale; returns { room }.
    if (req.method === 'PUT' && action === 'questions') {
      let body;
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      const validated = validateArenaQuestions(body.questions);
      if (!validated.ok) {
        sendJson(res, 400, { error: validated.error }, origin);
        log(400);
        return;
      }
      room.questions = validated.questions;
      if (room.currentQuestionIndex >= room.questions.length) {
        room.currentQuestionIndex = Math.max(0, room.questions.length - 1);
      }
      sendJson(res, 200, { room }, origin);
      log(200);
      return;
    }

    // PUT /api/arena/rooms/:id/settings — update a waiting room's settings
    // (currently only timeLimitSeconds); returns { room }. Only before the
    // challenge starts: once the quiz is live the timer is already running.
    if (req.method === 'PUT' && action === 'settings') {
      let body;
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      if (room.status !== 'waiting') {
        sendJson(res, 400, { error: 'Cannot change settings after the challenge has started.' }, origin);
        log(400);
        return;
      }
      if (body.timeLimitSeconds !== undefined && body.timeLimitSeconds !== null) {
        room.questionTimeLimitSeconds = clampArenaTimeLimit(body.timeLimitSeconds, room.questionTimeLimitSeconds || 30);
      }
      sendJson(res, 200, { room }, origin);
      log(200);
      return;
    }

    // POST /api/arena/rooms/:id/extract-page — AI-extract questions from
    // a lesson page into this room; returns { room }. Shares the /extract
    // Gemini counters (checkLimits) plus a small arena-only daily cap.
    if (req.method === 'POST' && action === 'extract-page') {
      let body;
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      const pageText = String(body.pageText || '').slice(0, MAX_PAGE_TEXT);
      const pageImageBase64 = String(body.pageImageBase64 || '');
      if (!pageText && pageImageBase64.trim().length <= 50) {
        sendJson(res, 400, { error: 'Send a page text or a page image to extract from.' }, origin);
        log(400);
        return;
      }
      if (extractImageTooLarge(pageImageBase64)) {
        sendJson(res, 400, { error: 'Image is too large (over ~2 MB). Please send a smaller or compressed photo of the page.' }, origin);
        log(400);
        return;
      }
      const sharedLimited = checkLimits(ip);
      if (sharedLimited === 'daily') {
        sendJson(res, 429, { error: 'Daily AI extraction limit reached — please try again tomorrow.' }, origin);
        log(429);
        return;
      }
      if (sharedLimited === 'hourly') {
        sendJson(res, 429, { error: 'Too many extractions from this device this hour — please wait a bit.' }, origin);
        log(429);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (today !== arenaExtractState.dailyDate) {
        arenaExtractState.dailyDate = today;
        arenaExtractState.dailyCount = 0;
      }
      if (arenaExtractState.dailyCount >= ARENA_EXTRACT_DAILY_CAP) {
        sendJson(res, 429, { error: 'Daily arena extraction limit reached — please try again tomorrow.' }, origin);
        log(429);
        return;
      }
      const questionCount = Math.max(2, Math.min(20, Number(body.questionCount) || 5));
      const topic = String(body.topic || room.exerciseTopic || 'ورقة التمرين المستخرجة').slice(0, 200);
      const instructions = String(
        body.teacherInstructions || room.teacherInstructions ||
        'استخرج جميع التمارين والأسئلة الموجودة في هذه الورقة بالكامل'
      ).slice(0, 1000);
      dailyCount += 1;
      arenaExtractState.dailyCount += 1;
      const result = await extractViaGemini({ pageText, pageImageBase64, topic, instructions });
      if (!result.ok) {
        const status = result.code === 'quota' ? 429 : result.code === 'invalid_key' ? 500 : result.code === 'timeout' ? 504 : 502;
        sendJson(res, status, { error: { code: result.code, message: result.message || 'AI extraction failed — please try again.' } }, origin);
        console.log(`[extract] done room=${room.id} status=${status} ms=${Date.now() - started} questions=0 code=${result.code}`);
        log(status);
        return;
      }
      const questions = parseArenaQuestionsFromAIText(result.text)
        .slice(0, questionCount)
        .map(shuffleArenaQuestionOptions);
      if (questions.length === 0) {
        sendJson(res, 502, { error: 'Gemini returned no questions from this page — try a clearer page or text.' }, origin);
        console.log(`[extract] done room=${room.id} status=502 ms=${Date.now() - started} questions=0 code=no_questions`);
        log(502);
        return;
      }
      const pageNumber = Number(body.pageNumber);
      room.questions = questions;
      room.pages = [...room.pages, {
        id: `p-${Date.now()}-${crypto.randomInt(1000)}`,
        title: String(body.title || body.bookTitle || '').trim().slice(0, 200) ||
          `صفحة مرفوعة #${room.pages.length + 1}`,
        bookTitle: String(body.bookTitle || '').trim().slice(0, 200) || undefined,
        pageNumber: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : undefined,
        rawText: pageText ? pageText.slice(0, 2000) : undefined,
      }];
      if (body.title) room.title = String(body.title).trim().slice(0, 200);
      if (body.topic) room.exerciseTopic = topic;
      if (body.teacherInstructions) room.teacherInstructions = instructions;
      if (body.timeLimitSeconds !== undefined && body.timeLimitSeconds !== null) {
        room.questionTimeLimitSeconds = clampArenaTimeLimit(body.timeLimitSeconds, room.questionTimeLimitSeconds || 30);
      }
      room.status = 'waiting';
      console.log(`[extract] done room=${room.id} status=200 ms=${Date.now() - started} questions=${questions.length}`);
      sendJson(res, 200, { room }, origin);
      log(200);
      return;
    }

    // POST /api/arena/rooms/:id/start — { room, rankings }.
    if (req.method === 'POST' && action === 'start') {
      let body = {};
      try {
        body = await readArenaJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body.' }, origin);
        log(400);
        return;
      }
      if (room.questions.length < 1) {
        sendJson(res, 400, { error: 'Add at least one question before starting the challenge.' }, origin);
        log(400);
        return;
      }
      // The teacher starting the quiz joins the room too (as teacher —
      // teachers with no answers never appear in the rankings).
      if (body.participantId) {
        ensureArenaParticipant(room, {
          id: body.participantId,
          name: body.participantName,
          avatar: body.participantAvatar,
          role: 'teacher',
        });
      }
      room.status = 'active';
      room.currentQuestionIndex = 0;
      room.startedAt = new Date().toISOString();
      room.finishedAt = null;
      sendJson(res, 200, { room, rankings: realRankingsForRoom(room) }, origin);
      log(200);
      return;
    }

    // POST /api/arena/rooms/:id/next-question — { finished, room, rankings }.
    if (req.method === 'POST' && action === 'next-question') {
      let finished = false;
      if (room.currentQuestionIndex >= room.questions.length - 1) {
        room.status = 'finished';
        room.finishedAt = new Date().toISOString();
        finished = true;
      } else {
        room.currentQuestionIndex += 1;
      }
      sendJson(res, 200, { finished, room, rankings: realRankingsForRoom(room) }, origin);
      log(200);
      return;
    }

    // POST /api/arena/rooms/:id/finish — { room, rankings }.
    if (req.method === 'POST' && action === 'finish') {
      room.status = 'finished';
      room.finishedAt = new Date().toISOString();
      sendJson(res, 200, { room, rankings: realRankingsForRoom(room) }, origin);
      log(200);
      return;
    }

    sendJson(res, 404, { error: 'Arena route not found.' }, origin);
    log(404);
    return;
  }

  // The book itself (GET / and /assets/* from ./book/dist).
  if (serveBookFile(req, res, log)) return;

  sendJson(res, 404, { ok: false, error: { code: 'unknown', message: 'Not found.' } }, origin);
  log(404);
});

// No WebSocket server: the arena client polls room state every 3.5s.
// Fail a WS upgrade fast so the browser falls back to polling instead
// of hanging on a half-open socket.
server.on('upgrade', (_req, socket) => {
  socket.destroy();
});

server.listen(PORT, () => {
  console.log(`[proxy] madingo-gemini-proxy listening on :${PORT} — models: ${MODELS.join(', ')} — daily cap ${DAILY_CAP}, per-IP ${HOURLY_PER_IP}/hour`);
});
