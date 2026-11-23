// ============================================================================
// MADINGO — ASSISTANT VOICE (ANISS ONLY, PROFESSIONAL CLEAR RUSSIAN)
// Two paths, best first:
//   1. Proxy POST /speak (Gemini TTS, voice 'aniss' = Charon). The proxy
//      returns RAW PCM s16le 24 kHz mono (mimeType audio/L16) — NOT a
//      WAV file — so we wrap the bytes in a 44-byte WAV header before
//      playback (an <audio> element cannot play raw PCM). One retry on
//      HTTP 502 / empty-audio (the proxy sometimes returns 502
//      transiently: "Gemini TTS returned no audio").
//   2. Device fallback: raw window.speechSynthesis (NOT audioService —
//      audioService emits a red error banner with Retry when every
//      stage fails, and the assistant must NEVER show that). Voices are
//      waited for (voiceschanged), ru-RU preferred, any voice accepted,
//      and speaking is still attempted when no voice is installed.
//
// HARD RULES (user bug report 2026-11-10):
//   * Error/offline text is NEVER spoken — callers use
//     speakAssistantReply(..., {offline: true}) for fallback replies.
//   * TTS failure is SILENT: text stays on screen, no banner, no
//     Retry, no toast. Failures are logged to console.debug only.
//   * Nothing here ever throws.
// ============================================================================

import { getProxyBaseUrl } from './assistantClient';
import type { SupportedLang } from '../data/curriculum';

export type VoicePath = 'gemini' | 'device' | 'none';

const SPEAK_TIMEOUT_MS = 60_000;
const PCM_SAMPLE_RATE = 24000;

let currentAudio: HTMLAudioElement | null = null;

export function getSpeakUrl(): string {
  const base = getProxyBaseUrl();
  return base ? `${base}/speak` : '';
}

/**
 * Build a WAV file (44-byte header + raw PCM) from s16le mono PCM.
 * The proxy returns raw PCM, not WAV — an <audio> element cannot play
 * it without this header.
 */
export function buildWavBytes(
  pcm: Uint8Array,
  sampleRate: number = PCM_SAMPLE_RATE
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (16-bit mono)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

export interface SpeakAudioResult {
  audioBase64: string;
  mimeType: string;
}

/**
 * Convert a /speak payload into a playable data URL.
 * Raw PCM (audio/L16, audio/pcm, ...) is wrapped in a 44-byte WAV header
 * first — an <audio> element / decodeAudioData cannot play raw PCM.
 * Anything else (mp3/wav) is passed through as a data URL unchanged.
 * Returns null on empty/invalid input. Pure — safe to unit-test.
 */
export function speakAudioToDataUrl(
  audioBase64: string,
  mimeType: string
): string | null {
  if (!audioBase64 || audioBase64.length < 8) return null;
  let bytes: Uint8Array;
  try {
    bytes =
      typeof Buffer !== 'undefined'
        ? Buffer.from(audioBase64, 'base64')
        : Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (bytes.length === 0) return null;
  if (isRawPcmMime(mimeType)) {
    const wav = buildWavBytes(bytes);
    let b64: string;
    if (typeof Buffer !== 'undefined') {
      b64 = Buffer.from(wav).toString('base64');
    } else {
      // Chunked binary-string conversion (a single spread would blow
      // the stack on long audio).
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < wav.length; i += CHUNK) {
        binary += String.fromCharCode(...wav.subarray(i, i + CHUNK));
      }
      b64 = btoa(binary);
    }
    return `data:audio/wav;base64,${b64}`;
  }
  const safeMime = (mimeType || 'audio/mp3').split(';')[0].trim() || 'audio/mp3';
  return `data:${safeMime};base64,${audioBase64}`;
}

/**
 * Fetch TTS audio from the proxy (voice 'aniss' only). Retries ONCE on
 * HTTP 502, on an OK response with no audio, or on a network error —
 * all transient. Returns null on any other failure. Never throws.
 * `fetchImpl` is injectable for tests; `urlOverride` lets tests bypass
 * the build-time proxy URL (unset in a test env).
 */
export async function fetchSpeakAudio(
  text: string,
  fetchImpl: typeof fetch = fetch,
  urlOverride?: string
): Promise<SpeakAudioResult | null> {
  const url = urlOverride ?? getSpeakUrl();
  if (!url) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SPEAK_TIMEOUT_MS);
    try {
      const resp = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'aniss' }),
        signal: ctrl.signal,
      });
      const data: any = await resp.json().catch(() => null);
      const hasAudio =
        typeof data?.audioBase64 === 'string' && data.audioBase64.length > 0;
      if (resp.ok && data?.ok && hasAudio) {
        return {
          audioBase64: data.audioBase64,
          mimeType:
            typeof data.mimeType === 'string' ? data.mimeType : 'audio/mp3',
        };
      }
      // Retryable: 502, or OK-but-no-audio. Anything else: give up now.
      const retryable = resp.status === 502 || (resp.ok && !hasAudio);
      if (!retryable) return null;
      // fall through to the retry
    } catch (e) {
      // Network error / abort — transient, retry once.
      if (attempt === 1) {
        console.debug('[assistant speech] /speak network error', e);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const GENERATE_CONTENT_TIMEOUT_MS = 60_000;

/**
 * Fallback TTS via POST /api/generate-content on the same proxy.
 * Used ONLY when /speak returns nothing (429 quota, 502, offline).
 * The proxy tries gemini-2.5-flash-preview-tts then
 * gemini-3.1-flash-tts-preview — each with its own 10/day free quota —
 * and serves repeat texts from its 200-entry server-side disk cache,
 * cross-user, so a word synthesized once is free forever afterwards.
 * Body shape mirrors the book app's JS-SDK call ({model, contents,
 * config}); the proxy translates config -> generationConfig and
 * returns the raw Gemini payload with
 * candidates[0].content.parts[0].inlineData.{data, mimeType}
 * (base64 raw PCM s16le 24 kHz). `contents` is a fixed template per
 * text so the server cache key is stable. Returns null on any
 * failure. Never throws. `fetchImpl` is injectable for tests;
 * `urlOverride` lets tests bypass the build-time proxy URL.
 */
export async function fetchGenerateContentAudio(
  text: string,
  fetchImpl: typeof fetch = fetch,
  urlOverride?: string
): Promise<SpeakAudioResult | null> {
  const base = urlOverride ?? getProxyBaseUrl();
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}/api/generate-content`;
  const body = {
    model: 'gemini-3.1-flash-tts-preview',
    contents: `Say in Russian, clearly and naturally: ${text}`,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GENERATE_CONTENT_TIMEOUT_MS);
    try {
      const resp = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data: any = await resp.json().catch(() => null);
      const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (resp.ok && typeof part?.data === 'string' && part.data.length > 0) {
        return {
          audioBase64: part.data,
          mimeType:
            typeof part?.mimeType === 'string' ? part.mimeType : 'audio/L16;rate=24000',
        };
      }
      // Retryable: 502 (transient) or 429 (both TTS models' quota gone
      // — retry once because a server-cache hit may still land).
      // Anything else (400/403/404/500): give up now.
      if (resp.status !== 502 && resp.status !== 429) return null;
      // fall through to the retry
    } catch (e) {
      if (attempt === 1) {
        console.debug('[assistant speech] /api/generate-content TTS network error', e);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function isRawPcmMime(mimeType: string): boolean {
  const m = (mimeType || '').toLowerCase();
  return (
    m.includes('pcm') || m.includes('l16') || m.includes('x-raw') || m.includes('octet-stream')
  );
}

async function playSpeakAudio(
  audioBase64: string,
  mimeType: string
): Promise<boolean> {
  try {
    stopAssistantSpeech();
    const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    const blob = isRawPcmMime(mimeType)
      ? new Blob([buildWavBytes(bytes)], { type: 'audio/wav' })
      : new Blob([bytes], { type: mimeType || 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        reject(new Error('audio playback failed'));
      };
      audio
        .play()
        .catch((e) => {
          URL.revokeObjectURL(url);
          if (currentAudio === audio) currentAudio = null;
          reject(e);
        });
    });
    return true;
  } catch (e) {
    console.debug('[assistant speech] playback failed', e);
    return false;
  }
}

function bcp47(lang: SupportedLang): string {
  return lang === 'ru'
    ? 'ru-RU'
    : lang === 'ar'
      ? 'ar-SA'
      : lang === 'fr'
        ? 'fr-FR'
        : 'en-US';
}

/**
 * Wait until the browser has loaded its voices (getVoices() is often
 * empty on first call, especially on mobile). Resolves with whatever
 * is available after the timeout — possibly an empty list.
 */
function waitForVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const loaded = synth.getVoices();
    if (loaded.length > 0) {
      resolve(loaded);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        synth.removeEventListener('voiceschanged', finish);
      } catch {
        // ignore
      }
      resolve(synth.getVoices());
    };
    try {
      synth.addEventListener('voiceschanged', finish);
    } catch {
      // ignore
    }
    setTimeout(finish, timeoutMs);
  });
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: SupportedLang
): SpeechSynthesisVoice | undefined {
  const target = bcp47(lang).toLowerCase();
  const prefix = target.slice(0, 2);
  return (
    voices.find((v) => v.lang.toLowerCase() === target) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ??
    voices[0]
  );
}

/**
 * Device speechSynthesis fallback, done directly (never via
 * audioService — its all-stages-failed path emits a red error banner).
 * Never fails on a missing voice: it prefers the reply language, then
 * Russian, then any installed voice, and still tries to speak when no
 * voice is installed at all. Silent on failure. Never throws.
 */
async function speakViaDevice(
  text: string,
  lang: SupportedLang
): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }
    const voices = await waitForVoices();
    const synth = window.speechSynthesis;
    try {
      synth.cancel();
    } catch {
      // ignore
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47(lang);
    utterance.rate = 0.95;
    const voice = pickVoice(voices, lang);
    if (voice) utterance.voice = voice;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };
      utterance.onend = () => done(true);
      utterance.onerror = () => done(false);
      try {
        synth.speak(utterance);
      } catch {
        done(false);
        return;
      }
      // Safety net: some browsers never fire onend/onerror.
      setTimeout(() => done(true), Math.min(15000, 1500 + text.length * 90));
    });
  } catch (e) {
    console.debug('[assistant speech] device TTS failed', e);
    return false;
  }
}

/**
 * Speak `text` with Aniss's voice. Gemini TTS first (clear,
 * professional), device speechSynthesis as fallback. Returns which
 * path actually spoke. Silent on failure — never throws, never shows
 * any UI.
 */
export async function speakWithVoice(
  text: string,
  opts: { soundEnabled?: boolean; lang?: SupportedLang } = {}
): Promise<{ via: VoicePath }> {
  const clean = (text || '').trim();
  if (!clean || opts.soundEnabled === false) return { via: 'none' };
  const audio = await fetchSpeakAudio(clean);
  if (audio && (await playSpeakAudio(audio.audioBase64, audio.mimeType))) {
    return { via: 'gemini' };
  }
  const lang = opts.lang ?? 'ru';
  if (await speakViaDevice(clean, lang)) return { via: 'device' };
  return { via: 'none' };
}

/**
 * Speak a REAL assistant reply. Pass offline: true for fallback /
 * error replies (proxy down, offline text) — those are NEVER spoken:
 * this returns { via: 'none' } without touching any TTS path.
 */
export async function speakAssistantReply(
  text: string,
  opts: { offline: boolean; soundEnabled?: boolean; lang?: SupportedLang }
): Promise<{ via: VoicePath }> {
  if (opts.offline) return { via: 'none' };
  return speakWithVoice(text, opts);
}

/** Stop any assistant voice currently playing (proxy audio or device TTS). */
export function stopAssistantSpeech(): void {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}
