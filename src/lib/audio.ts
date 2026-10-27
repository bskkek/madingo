// ============================================================================
// MADINGO — UNIFIED AUDIO SERVICE (WP-3)
// Single AudioService used by every audio button (letters, words, dictionary,
// sentences, "Listen to Page", speaking clips, dictation, exams).
//
// Pipeline in strict order:
//   1. Pre-recorded teacher file for the item if it exists and loads cleanly.
//   2. Cached AI speech (Gemini TTS /api/ai/tts, Russian, stress marks stripped).
//   3. Verified Russian Web Speech API (ru-RU voice verified).
//   4. No silent fallbacks: if all stages fail, emit a translated error state
//      with a Retry callback and log full details to console.error.
// ============================================================================

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
  private listeners = new Set<AudioStateListener>();
  private activeAudioElement: HTMLAudioElement | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
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
    this.emit();
  }

  public getDiagnostics() {
    const voices =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis.getVoices()
        : [];
    const russianVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ru'));
    return {
      cacheEntries: this.ttsDataUrlCache.size,
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

  private async playViaWebAudioContext(dataUrl: string, rate: number): Promise<boolean> {
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

  private async playAudioDataUrl(dataUrl: string, rate: number): Promise<boolean> {
    // 1. Prefer WebAudio AudioBufferSourceNode — works reliably across async fetch boundaries & mobile/iFrames
    const playedWebAudio = await this.playViaWebAudioContext(dataUrl, rate);
    if (playedWebAudio) {
      return true;
    }

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

  private tryWebSpeech(
    cleanText: string,
    rate: number,
    lang: 'ru' | 'ar' | 'en' | 'fr' = 'ru'
  ): {
    ok: boolean;
    reason?: string;
  } {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { ok: false, reason: 'window.speechSynthesis is not supported in this browser.' };
    }
    try {
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
      if (voices.length > 0 && !targetVoice) {
        return {
          ok: false,
          reason: `No (${lang}) voice found among ${voices.length} installed browser voices.`,
        };
      }
      window.speechSynthesis.cancel();
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
      window.speechSynthesis.speak(utterance);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: err?.message || 'speechSynthesis.speak threw an exception.' };
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
      const playedTeacher = await this.playAudioDataUrl(explicitTeacherUrl, rate);
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

    // STAGE 2: Cached AI / Neural TTS speech (/api/ai/tts)
    const isSlow = rate < 0.78;
    const cacheKey = `${lang}:${isSlow ? 'slow' : 'normal'}:${cleanText}`;
    const cachedDataUrl = this.ttsDataUrlCache.get(cacheKey);
    if (cachedDataUrl) {
      const playedCached = await this.playAudioDataUrl(cachedDataUrl, isSlow ? 1.0 : rate);
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
    }

    try {
      const resp = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          slow: isSlow,
          lang,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && typeof data.audioDataUrl === 'string' && data.audioDataUrl.startsWith('data:audio/')) {
          this.ttsDataUrlCache.set(cacheKey, data.audioDataUrl);
          const playedTts = await this.playAudioDataUrl(data.audioDataUrl, isSlow ? 1.0 : rate);
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
          stageErrors.push('Stage 2 (gemini_tts_cache) returned no audioDataUrl.');
        }
      } else {
        const errBody = await resp.json().catch(() => ({}));
        stageErrors.push(
          `Stage 2 (gemini_tts_cache) HTTP ${resp.status}: ${errBody.error || resp.statusText}`
        );
      }
    } catch (err: any) {
      stageErrors.push(`Stage 2 (gemini_tts_cache) network error: ${err?.message || 'offline'}`);
    }

    // STAGE 3: Verified Browser Web Speech API
    const webSpeechOutcome = this.tryWebSpeech(cleanText, rate, lang);
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

