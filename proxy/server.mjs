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
const MODELS = ['gemini-3.8-flash', 'gemini-3-flash-preview'];

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

async function callGemini(model, requestBody) {
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
  const requestBody = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json' },
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
// so it can never eat the whole daily quota on its own, plus this small
// separate daily cap for arena extracts specifically.
const ARENA_EXTRACT_DAILY_CAP = Number(process.env.ARENA_EXTRACT_DAILY_CAP || 50);
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
      endpoints: ['/extract', '/chat', '/library', '/speak', '/transcribe', '/api/generate-content', '/api/arena/rooms', '/api/arena/rooms/:id', '/api/arena/rooms/:id/join', '/api/arena/rooms/:id/answer', '/api/arena/rooms/:id/questions', '/api/arena/rooms/:id/extract-page', '/api/arena/rooms/:id/start', '/api/arena/rooms/:id/next-question', '/api/arena/rooms/:id/finish', '/ (madingo storybook)'],
      arenaRooms: arenaRooms.size,
      dailyUsed: dailyCount,
      dailyCap: DAILY_CAP,
      speakDailyUsed: speakState.dailyCount,
      speakDailyCap: SPEAK_DAILY_CAP,
      transcribeDailyUsed: transcribeState.dailyCount,
      transcribeDailyCap: TRANSCRIBE_DAILY_CAP,
      libraryDailyUsed: libraryState.dailyCount,
      libraryDailyCap: LIBRARY_DAILY_CAP,
    }, origin);
    log(200);
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
    dailyCount += 1;
    const result = await extractViaGemini({ pageText, pageImageBase64, topic, instructions });
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
        const status = result.code === 'quota' ? 429 : result.code === 'invalid_key' ? 500 : 502;
        sendJson(res, status, { error: result.message || 'AI extraction failed — please try again.' }, origin);
        log(status);
        return;
      }
      const questions = parseArenaQuestionsFromAIText(result.text)
        .slice(0, questionCount)
        .map(shuffleArenaQuestionOptions);
      if (questions.length === 0) {
        sendJson(res, 502, { error: 'Gemini returned no questions from this page — try a clearer page or text.' }, origin);
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
