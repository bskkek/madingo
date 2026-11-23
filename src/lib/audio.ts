// ============================================================================
// MADINGO — UNIFIED AUDIO SERVICE (WP-3)
// Single AudioService used by every audio button (letters, words, dictionary,
// sentences, "Listen to Page", speaking clips, dictation, exams).
//
// Pipeline in strict order:
//   1. Pre-recorded teacher file for the item if it exists and loads cleanly.
//      (2026-11-15: the 33 alphabet letters + 66 example words are baked
//      as MP3s and registered here — see alphabetAudio.ts — so alphabet
//      speakers play with zero network dependency.)
//   2. Proxy TTS (POST /speak on the Replit proxy, Gemini TTS voice
//      'aniss'), with a PERSISTENT IndexedDB cache (lib/ttsCache.ts) keyed
//      `lang:slow/normal:text` — a word fetched once never hits the network
//      again. If /speak returns nothing (429 quota / 502 / offline), Stage 2
//      falls back to POST /api/generate-content TTS (second model's quota
//      + server-side disk cache, cross-user — see speech.ts).
//      (The old relative '/api/ai/tts' route never existed on the static
//      site (GitHub Pages / Capacitor localhost), so Stage 2 always 404'd
//      — that is the bug fixed 2026-11-15.)
//   3. Hardened Web Speech API: voices are waited for (voiceschanged),
//      any installed voice is accepted, and speaking is still attempted
//      when no ru voice is listed — failure only on a real onerror.
//   4. No silent fallbacks: if all stages fail, emit a translated error state
//      with a Retry callback and log full details to console.error.
// ============================================================================

import {
  fetchGenerateContentAudio,
  fetchSpeakAudio,
  getSpeakUrl,
  speakAudioToDataUrl,
} from './speech';
import { ALPHABET_AUDIO_FILES } from './alphabetAudio';
import { ttsCacheClear, ttsCacheCount, ttsCacheGet, ttsCachePut } from './ttsCache';

let audioCtx: AudioContext | null = null;
let audioUnlockInstalled = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function installGlobalAudioUnlock() {
  if (typeof window === 'undefined' || audioUnlockInstalled) return;
  audioUnlockInstalled = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}

installGlobalAudioUnlock();

export function playSoundEffect(
  type: 'tap' | 'correct' | 'wrong' | 'complete',
  soundEnabled = true
) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'tap') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  } else if (type === 'correct') {
    const freqs = [587.33, 880];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.08;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } else if (type === 'wrong') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.linearRampToValueAtTime(155, now + 0.18);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } else if (type === 'complete') {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.09;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.13, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }
}

export function stripStressMarks(text: string): string {
  // Normalize to NFD, strip combining acute accent U+0301, re-compose to NFC
  return (text || '')
    .normalize('NFD')
    .replace(/\u0301/g, '')
    .normalize('NFC')
    .replace(/\.\.\./g, '')
    .trim();
}

export type AudioPipelineStage =
  | 'teacher_file'
  | 'gemini_tts_cache'
  | 'web_speech_ru'
  | 'failed';

export interface AudioPlaybackOutcome {
  ok: boolean;
  stageUsed: AudioPipelineStage;
  cleanText: string;
  cachedHit: boolean;
  errorMessage?: {
    ru: string;
    en: string;
    ar: string;
    fr: string;
  };
  technicalError?: string;
}

export interface AudioServiceState {
  isPlaying: boolean;
  lastText: string;
  lastStageUsed: AudioPipelineStage | null;
  lastError: {
    ru: string;
    en: string;
    ar: string;
    fr: string;
    technical: string;
  } | null;
  cacheSize: number;
}

type AudioStateListener = (state: AudioServiceState) => void;

// Registry of real uploaded teacher audio URLs (if any are uploaded by teachers)
const registeredTeacherFiles = new Map<string, string>();

export function registerTeacherAudioFile(slugOrId: string, audioUrl: string) {
  if (slugOrId && audioUrl) {
    registeredTeacherFiles.set(slugOrId, audioUrl);
  }
}

// BAKED ALPHABET AUDIO (ElevenLabs Brian, dual-ASR validated, 2026-11-15):
// the 33 letters + 66 example words ship as MP3s in public/alphabet/audio/
// so the alphabet speakers play with ZERO network dependency — the
// /speak quota (10/day) can be dead and Окно/Остановка still play.
// Registered here, at import time, so every call site (LessonPlayer
// letter_card / example buttons pass the audioSlug) hits Stage 1 first.
// BASE_URL is '/madingo/' on Pages, './' in the Capacitor native app.
for (const [slug, file] of Object.entries(ALPHABET_AUDIO_FILES)) {
  registerTeacherAudioFile(slug, `${import.meta.env.BASE_URL || '/'}${file}`);
}

function base64DataUrlToArrayBuffer(dataUrl: string): ArrayBuffer | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = dataUrl.slice(commaIdx + 1).trim();
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

class UnifiedAudioService {
  private ttsDataUrlCache = new Map<string, string>();
  private persistentCacheSize = -1; // -1 = unknown yet (IndexedDB not probed)
  private listeners = new Set<AudioStateListener>();
  private activeAudioElement: HTMLAudioElement | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  // STALE-AUDIO GUARD (2026-11-18): every speak() bumps this counter.
  // A slow fetch/decode from an EARLIER step must never play after the
  // user moved on — the user hears the CURRENT step's sound only. Each
  // speak() captures its generation and aborts (without playing) as soon
  // as a newer speak() has started.
  private speakGeneration = 0;
  private state: AudioServiceState = {
    isPlaying: false,
    lastText: '',
    lastStageUsed: null,
    lastError: null,
    cacheSize: 0,
  };
  private lastRetryParams: {
    russianText: string;
    teacherAudioUrlOrSlug?: string;
    soundEnabled: boolean;
    rate: number;
    lang: 'ru' | 'ar' | 'en' | 'fr';
  } | null = null;

  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.state = {
      ...this.state,
      cacheSize: this.ttsDataUrlCache.size,
    };
    for (const l of this.listeners) {
      l(this.state);
    }
  }

  public clearError() {
    this.state = { ...this.state, lastError: null };
    this.emit();
  }

  public clearCache() {
    this.ttsDataUrlCache.clear();
    this.persistentCacheSize = 0;
    ttsCacheClear().catch(() => {});
    this.emit();
  }

  /** Last-known persistent (IndexedDB) entry count; refreshes on cache writes. */
  public async refreshPersistentCacheSize(): Promise<number> {
    this.persistentCacheSize = await ttsCacheCount();
    return this.persistentCacheSize;
  }

  public getDiagnostics() {
    const voices =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis.getVoices()
        : [];
    const russianVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ru'));
    return {
      cacheEntries: this.ttsDataUrlCache.size,
      persistentCacheEntries: this.persistentCacheSize,
      registeredTeacherFilesCount: registeredTeacherFiles.size,
      totalBrowserVoices: voices.length,
      russianVoices: russianVoices.map((v) => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService,
      })),
      lastStageUsed: this.state.lastStageUsed,
      lastError: this.state.lastError,
    };
  }

  /**
   * Stop everything right now and invalidate every in-flight speak():
   * a slow fetch that resolves later is discarded (stale guard) instead
   * of playing on the wrong screen. Call this when leaving a lesson or
   * a view that auto-plays audio.
   */
  public stopAll() {
    this.speakGeneration++;
    this.stopActivePlayback();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    this.state = { ...this.state, isPlaying: false };
    this.emit();
  }

  public async retryLast(): Promise<AudioPlaybackOutcome | null> {
    if (!this.lastRetryParams) return null;
    const { russianText, teacherAudioUrlOrSlug, soundEnabled, rate, lang } =
      this.lastRetryParams;
    return this.speak(russianText, teacherAudioUrlOrSlug, soundEnabled, rate, lang);
  }

  private stopActivePlayback() {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.activeSourceNode = null;
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
      } catch {
        // ignore
      }
      this.activeAudioElement = null;
    }
  }

  private async playViaWebAudioContext(dataUrl: string, rate: number, gen?: number): Promise<boolean> {
    try {
      const ctx = getAudioContext();
      if (!ctx) return false;

      let arrayBuffer: ArrayBuffer | null = null;
      if (dataUrl.startsWith('data:audio/')) {
        arrayBuffer = base64DataUrlToArrayBuffer(dataUrl);
      } else {
        const resp = await fetch(dataUrl);
        if (!resp.ok) return false;
        arrayBuffer = await resp.arrayBuffer();
      }
      if (!arrayBuffer || arrayBuffer.byteLength < 44) return false;

      if (ctx.state === 'suspended') {
        await Promise.race([
          ctx.resume().catch(() => {}),
          new Promise((r) => setTimeout(r, 120)),
        ]);
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      // Stale guard: a newer speak() started while this one was
      // fetching/decoding — do NOT start playback (the user is on a
      // newer step now and must not hear this older sound).
      if (gen !== undefined && gen !== this.speakGeneration) return false;
      this.stopActivePlayback();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const clampedRate = Math.max(0.5, Math.min(2.0, rate));
      source.playbackRate.value = clampedRate;
      source.connect(ctx.destination);
      this.activeSourceNode = source;

      this.state = { ...this.state, isPlaying: true };
      this.emit();

      source.onended = () => {
        if (this.activeSourceNode === source) {
          this.activeSourceNode = null;
          this.state = { ...this.state, isPlaying: false };
          this.emit();
        }
      };

      source.start(0);
      return true;
    } catch {
      return false;
    }
  }

  private async playAudioDataUrl(dataUrl: string, rate: number, gen?: number): Promise<boolean> {
    // 1. Prefer WebAudio AudioBufferSourceNode — works reliably across async fetch boundaries & mobile/iFrames
    const playedWebAudio = await this.playViaWebAudioContext(dataUrl, rate, gen);
    if (playedWebAudio) {
      return true;
    }
    // Stale guard: the WebAudio path may have returned false because a
    // newer speak() superseded this one — do not fall through to the
    // HTMLAudioElement and play the old sound anyway.
    if (gen !== undefined && gen !== this.speakGeneration) return false;

    // 2. Fallback to HTMLAudioElement
    return new Promise((resolve) => {
      try {
        this.stopActivePlayback();
        const audio = new Audio(dataUrl);
        this.activeAudioElement = audio;
        audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
        audio.onended = () => {
          this.state = { ...this.state, isPlaying: false };
          this.emit();
          resolve(true);
        };
        audio.onerror = () => {
          this.state = { ...this.state, isPlaying: false };
          this.emit();
          resolve(false);
        };
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              this.state = { ...this.state, isPlaying: true };
              this.emit();
              resolve(true);
            })
            .catch(() => {
              this.state = { ...this.state, isPlaying: false };
              this.emit();
              resolve(false);
            });
        } else {
          resolve(true);
        }
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Wait until the browser has loaded its voices (getVoices() is often
   * empty on first call, especially on mobile). Resolves with whatever
   * is available after the timeout — possibly an empty list.
   */
  private waitForVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
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

  /**
   * Hardened device Web Speech (last-resort stage). Unlike the old code it
   * NEVER hard-fails just because no voice for the target language is
   * listed: voices load async, the best available voice is picked
   * (exact lang -> lang prefix -> Russian -> any voice), and speaking is
   * still attempted with the ru-RU lang tag when no voice is installed at
   * all. Failure only on a real onerror / exception — e.g. Brave on a
   * phone with no Russian TTS voice fires onerror, and only then do we
   * report failure. Resolves true on onend, or on the safety timeout
   * when the browser never fires any event (some browsers stay silent).
   */
  private async tryWebSpeech(
    cleanText: string,
    rate: number,
    lang: 'ru' | 'ar' | 'en' | 'fr' = 'ru',
    gen?: number
  ): Promise<{
    ok: boolean;
    reason?: string;
  }> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { ok: false, reason: 'window.speechSynthesis is not supported in this browser.' };
    }
    try {
      const voices = await this.waitForVoices();
      // Stale guard: a newer speak() started while voices were loading —
      // do not speak this older text.
      if (gen !== undefined && gen !== this.speakGeneration) {
        return { ok: false, reason: 'superseded by a newer speak() call.' };
      }
      const target = lang.toLowerCase();
      const targetVoice =
        voices.find((v) => v.lang.toLowerCase() === `${target}-${target.toUpperCase()}`) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(target)) ??
        voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ??
        voices[0];
      const synth = window.speechSynthesis;
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const bcp47Map: Record<'ru' | 'ar' | 'en' | 'fr', string> = {
        ru: 'ru-RU',
        ar: 'ar-SA',
        en: 'en-US',
        fr: 'fr-FR',
      };
      utterance.lang = bcp47Map[lang] || 'ru-RU';
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      if (targetVoice) {
        utterance.voice = targetVoice;
      }
      return await new Promise<{ ok: boolean; reason?: string }>((resolve) => {
        let settled = false;
        const done = (result: { ok: boolean; reason?: string }) => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };
        utterance.onend = () => done({ ok: true });
        utterance.onerror = (ev: SpeechSynthesisErrorEvent) =>
          done({
            ok: false,
            reason: `speechSynthesis onerror (${(ev as any)?.error || 'unknown'}) with ${
              voices.length
            } installed voice(s), best match: ${targetVoice ? targetVoice.name : 'none'}.`,
          });
        try {
          synth.speak(utterance);
        } catch (err: any) {
          done({ ok: false, reason: err?.message || 'speechSynthesis.speak threw an exception.' });
          return;
        }
        // Safety net: some browsers never fire onend/onerror.
        setTimeout(
          () => done({ ok: true }),
          Math.min(15000, 1500 + cleanText.length * 90)
        );
      });
    } catch (err: any) {
      return { ok: false, reason: err?.message || 'speechSynthesis failed.' };
    }
  }

  public async speak(
    russianText: string,
    teacherAudioUrlOrSlug?: string,
    soundEnabled = true,
    rate = 0.9,
    lang: 'ru' | 'ar' | 'en' | 'fr' = 'ru'
  ): Promise<AudioPlaybackOutcome> {
    const cleanText = stripStressMarks(russianText);
    if (!soundEnabled || typeof window === 'undefined' || !cleanText) {
      return {
        ok: true,
        stageUsed: 'web_speech_ru',
        cleanText,
        cachedHit: false,
      };
    }

    // New speak() supersedes every earlier one: stop the previous sound
    // RIGHT NOW (the user moved on — the old word must not keep playing)
    // and remember this call's generation so slow fetches from earlier
    // steps are discarded instead of playing late on the wrong step.
    const gen = ++this.speakGeneration;
    const isStale = () => gen !== this.speakGeneration;
    this.stopActivePlayback();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }

    this.lastRetryParams = {
      russianText,
      teacherAudioUrlOrSlug,
      soundEnabled,
      rate,
      lang,
    };
    this.state = {
      ...this.state,
      lastText: cleanText,
      lastError: null,
    };
    this.emit();

    const stageErrors: string[] = [];

    // STAGE 1: Pre-recorded teacher file (only if an explicit URL or registered teacher file exists)
    const explicitTeacherUrl =
      teacherAudioUrlOrSlug &&
      (teacherAudioUrlOrSlug.startsWith('http://') ||
        teacherAudioUrlOrSlug.startsWith('https://') ||
        teacherAudioUrlOrSlug.startsWith('data:audio/'))
        ? teacherAudioUrlOrSlug
        : teacherAudioUrlOrSlug
        ? registeredTeacherFiles.get(teacherAudioUrlOrSlug)
        : undefined;

    if (explicitTeacherUrl) {
      const playedTeacher = await this.playAudioDataUrl(explicitTeacherUrl, rate, gen);
      if (isStale()) {
        // A newer speak() started while this file was loading — never
        // report it as played; the newer call owns the speaker now.
        return { ok: true, stageUsed: 'teacher_file', cleanText, cachedHit: false };
      }
      if (playedTeacher) {
        this.state = {
          ...this.state,
          lastStageUsed: 'teacher_file',
          lastError: null,
        };
        this.emit();
        return {
          ok: true,
          stageUsed: 'teacher_file',
          cleanText,
          cachedHit: false,
        };
      }
      stageErrors.push(`Stage 1 (teacher_file) failed to load: ${explicitTeacherUrl}`);
    }

    // STAGE 2: Proxy TTS (POST /speak, Gemini TTS voice 'aniss') + caches,
    // with POST /api/generate-content TTS as fallback when /speak returns
    // nothing (429 quota / 502 / offline — see fetchGenerateContentAudio
    // in lib/speech.ts). A fetched word is stored in the in-memory cache
    // AND in persistent IndexedDB, so it never hits the network again.
    // Slow playback is done via playbackRate — /speak has no slow mode.
    const isSlow = rate < 0.78;
    const cacheKey = `${lang}:${isSlow ? 'slow' : 'normal'}:${cleanText}`;
    const cachedDataUrl =
      this.ttsDataUrlCache.get(cacheKey) ?? (await ttsCacheGet(cacheKey));
    if (isStale()) {
      return { ok: true, stageUsed: 'gemini_tts_cache', cleanText, cachedHit: false };
    }
    if (cachedDataUrl) {
      this.ttsDataUrlCache.set(cacheKey, cachedDataUrl);
      const playedCached = await this.playAudioDataUrl(cachedDataUrl, rate, gen);
      if (isStale()) {
        return { ok: true, stageUsed: 'gemini_tts_cache', cleanText, cachedHit: true };
      }
      if (playedCached) {
        this.state = {
          ...this.state,
          lastStageUsed: 'gemini_tts_cache',
          lastError: null,
        };
        this.emit();
        return {
          ok: true,
          stageUsed: 'gemini_tts_cache',
          cleanText,
          cachedHit: true,
        };
      }
      stageErrors.push('Stage 2 (gemini_tts_cache) cached audio failed to play.');
    }

    if (!getSpeakUrl()) {
      stageErrors.push('Stage 2 (gemini_tts_cache) skipped: proxy URL is not configured.');
    } else {
      let fetched = await fetchSpeakAudio(cleanText);
      if (!fetched) {
        // /speak dead (429 quota / 502 / offline): fall back to
        // POST /api/generate-content TTS (second model's quota +
        // server-side disk cache, cross-user). A word synthesized
        // once via either path lands in the IndexedDB cache below.
        fetched = await fetchGenerateContentAudio(cleanText);
        if (!fetched) {
          stageErrors.push(
            'Stage 2 (gemini_tts_cache) proxy /speak AND /api/generate-content returned no audio (quota 429, proxy down, or offline).'
          );
        }
      }
      // Stale guard: the fetch was slow and the user already moved to a
      // newer step — discard this audio, never play it late.
      if (isStale()) {
        return { ok: true, stageUsed: 'gemini_tts_cache', cleanText, cachedHit: false };
      }
      if (fetched) {
        const dataUrl = speakAudioToDataUrl(fetched.audioBase64, fetched.mimeType);
        if (dataUrl) {
          this.ttsDataUrlCache.set(cacheKey, dataUrl);
          ttsCachePut(cacheKey, dataUrl)
            .then(() => this.refreshPersistentCacheSize())
            .catch(() => {});
          const playedTts = await this.playAudioDataUrl(dataUrl, rate, gen);
          if (isStale()) {
            return { ok: true, stageUsed: 'gemini_tts_cache', cleanText, cachedHit: false };
          }
          if (playedTts) {
            this.state = {
              ...this.state,
              lastStageUsed: 'gemini_tts_cache',
              lastError: null,
            };
            this.emit();
            return {
              ok: true,
              stageUsed: 'gemini_tts_cache',
              cleanText,
              cachedHit: false,
            };
          }
          stageErrors.push('Stage 2 (gemini_tts_cache) audio playback blocked or failed.');
        } else {
          stageErrors.push('Stage 2 (gemini_tts_cache) returned audio that could not be decoded.');
        }
      }
      // (fetched === null: the combined /speak + generate-content error
      // was already recorded above, before this if.)
    }

    // STAGE 3: Hardened Browser Web Speech API (waits for voices, any
    // voice accepted, fails only on a real onerror)
    const webSpeechOutcome = await this.tryWebSpeech(cleanText, rate, lang, gen);
    if (isStale()) {
      // A newer speak() started while this one was waiting on voices —
      // do not report it as played; the newer call owns the speaker now.
      return { ok: true, stageUsed: 'web_speech_ru', cleanText, cachedHit: false };
    }
    if (webSpeechOutcome.ok) {
      this.state = {
        ...this.state,
        lastStageUsed: 'web_speech_ru',
        lastError: null,
      };
      this.emit();
      return {
        ok: true,
        stageUsed: 'web_speech_ru',
        cleanText,
        cachedHit: false,
      };
    }
    stageErrors.push(`Stage 3 (web_speech_ru): ${webSpeechOutcome.reason}`);

    // ALL 3 STAGES FAILED -> Ground Rule R4: No silent fallbacks! Log to console.error & emit translated error with Retry
    const technical = stageErrors.join(' | ');
    console.error(`[AudioService] Failed to play audio for "${cleanText}":`, technical);

    const errorMessage = {
      ru: `Не удалось воспроизвести озвучку («${cleanText}»). Проверьте подключение и нажмите «Повторить».`,
      en: `Audio playback failed for "${cleanText}". Please check your connection and click Retry.`,
      ar: `تعذر تشغيل الصوت لـ "${cleanText}". يرجى التحقق من الاتصال والمحاولة مرة أخرى.`,
      fr: `Échec de la lecture audio pour « ${cleanText} ». Vérifiez votre connexion et cliquez sur Réessayer.`,
    };

    this.state = {
      ...this.state,
      isPlaying: false,
      lastStageUsed: 'failed',
      lastError: {
        ...errorMessage,
        technical,
      },
    };
    this.emit();

    return {
      ok: false,
      stageUsed: 'failed',
      cleanText,
      cachedHit: false,
      errorMessage,
      technicalError: technical,
    };
  }
}

export const audioService = new UnifiedAudioService();

export function speakRussian(
  russianText: string,
  audioSlug?: string,
  soundEnabled = true,
  rate = 0.9
): Promise<AudioPlaybackOutcome> {
  return audioService.speak(russianText, audioSlug, soundEnabled, rate, 'ru');
}

export function speakText(
  text: string,
  lang: 'ru' | 'ar' | 'en' | 'fr' = 'ru',
  soundEnabled = true,
  rate = 0.9
): Promise<AudioPlaybackOutcome> {
  return audioService.speak(text, undefined, soundEnabled, rate, lang);
}

/** Stop all audio now and discard any in-flight speak() (see stopAll). */
export function stopAllAudio(): void {
  audioService.stopAll();
}

