// ============================================================================
// MADINGO — WEB SPEECH API WRAPPER (SPEAKING PRACTICE)
// Thin, local-only wrapper around the browser's built-in SpeechRecognition
// (window.SpeechRecognition / window.webkitSpeechRecognition, lang ru-RU).
//
// - No server calls, no API keys, no audio upload: recognition runs entirely
//   in the browser (Chrome / Edge). Safari and Firefox do not expose the API
//   and are reported as unsupported — see isSpeechRecognitionSupported().
// - Used by SpeakingPracticeView.tsx for Repeat-After-Me pronunciation
//   practice. Scoring is done separately by phase3Engine.scoreSpeechAttempt.
// ============================================================================

export type SpeechRecognitionErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'unknown';

/** User-facing message for a recognition error, in the 4 app languages. */
export interface LocalizedMessage {
  ru: string;
  en: string;
  ar: string;
  fr: string;
}

export interface SpeechRecognitionCallbacks {
  /** Live interim (not yet final) transcript, updated as the user speaks. */
  onResult: (interimTranscript: string, finalTranscript: string) => void;
  /** A recognition error occurred; `code` is the mapped SpeechRecognition error. */
  onError: (code: SpeechRecognitionErrorCode, message: LocalizedMessage) => void;
  /** Recognition stopped (after a final result, an error, or stop()). */
  onEnd: () => void;
}

export interface SpeechRecognitionHandle {
  /** True while the microphone is open and listening. */
  readonly isListening: boolean;
  stop: () => void;
  abort: () => void;
}

// --- Minimal local typings for the Web Speech API ---------------------------
// Named with a WebSpeech* prefix on purpose: the TS DOM lib may or may not
// declare SpeechRecognition, so we never collide with (or depend on) it.
interface WebSpeechAlternative {
  transcript: string;
  confidence: number;
}

interface WebSpeechResult {
  isFinal: boolean;
  length: number;
  [index: number]: WebSpeechAlternative;
}

interface WebSpeechResultList {
  length: number;
  [index: number]: WebSpeechResult;
}

interface WebSpeechResultEvent {
  resultIndex: number;
  results: WebSpeechResultList;
}

interface WebSpeechErrorEvent {
  error: string;
  message?: string;
}

interface WebSpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechResultEvent) => void) | null;
  onerror: ((event: WebSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type WebSpeechRecognitionConstructor = new () => WebSpeechRecognitionLike;

function getSpeechRecognitionConstructor(): WebSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | WebSpeechRecognitionConstructor
    | undefined;
  return typeof ctor === 'function' ? ctor : null;
}

/** True when this browser exposes built-in speech recognition (Chrome / Edge). */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

const ERROR_MESSAGES: Record<SpeechRecognitionErrorCode, LocalizedMessage> = {
  'not-allowed': {
    ru: 'Доступ к микрофону запрещён. Разрешите доступ к микрофону в настройках браузера и попробуйте снова.',
    en: 'Microphone access was denied. Allow microphone access in your browser settings and try again.',
    ar: 'تم رفض الوصول إلى الميكروفون. اسمح بالوصول إلى الميكروفون من إعدادات المتصفح وحاول مرة أخرى.',
    fr: 'L’accès au microphone a été refusé. Autorisez l’accès au microphone dans les réglages du navigateur, puis réessayez.',
  },
  'service-not-allowed': {
    ru: 'Распознавание речи запрещено в этом браузере. Попробуйте Chrome.',
    en: 'Speech recognition is not allowed in this browser. Try Chrome.',
    ar: 'التعرف على الكلام غير مسموح به في هذا المتصفح. جرّب متصفح Chrome.',
    fr: 'La reconnaissance vocale n’est pas autorisée dans ce navigateur. Essayez Chrome.',
  },
  'no-speech': {
    ru: 'Речь не распознана. Говорите чётче и ближе к микрофону, затем попробуйте снова.',
    en: 'No speech was detected. Speak clearly, closer to the microphone, and try again.',
    ar: 'لم يتم اكتشاف أي كلام. تحدث بوضوح وقرب الميكروفون وحاول مرة أخرى.',
    fr: 'Aucune parole détectée. Parlez clairement, plus près du microphone, puis réessayez.',
  },
  'audio-capture': {
    ru: 'Микрофон не найден. Подключите микрофон и попробуйте снова.',
    en: 'No microphone was found. Connect a microphone and try again.',
    ar: 'لم يتم العثور على ميكروفون. وصّل ميكروفوناً وحاول مرة أخرى.',
    fr: 'Aucun microphone trouvé. Branchez un microphone, puis réessayez.',
  },
  network: {
    ru: 'Ошибка сети при распознавании речи. Проверьте подключение к интернету и попробуйте снова.',
    en: 'A network error occurred during speech recognition. Check your connection and try again.',
    ar: 'حدث خطأ في الشبكة أثناء التعرف على الكلام. تحقق من الاتصال وحاول مرة أخرى.',
    fr: 'Une erreur réseau est survenue pendant la reconnaissance vocale. Vérifiez votre connexion, puis réessayez.',
  },
  aborted: {
    ru: 'Запись остановлена.',
    en: 'Recording was stopped.',
    ar: 'تم إيقاف التسجيل.',
    fr: 'L’enregistrement a été arrêté.',
  },
  'bad-grammar': {
    ru: 'Ошибка распознавания речи. Попробуйте снова.',
    en: 'A speech recognition error occurred. Please try again.',
    ar: 'حدث خطأ في التعرف على الكلام. حاول مرة أخرى.',
    fr: 'Une erreur de reconnaissance vocale est survenue. Veuillez réessayer.',
  },
  'language-not-supported': {
    ru: 'Русский язык не поддерживается распознаванием речи в этом браузере. Попробуйте Chrome.',
    en: 'Russian is not supported by speech recognition in this browser. Try Chrome.',
    ar: 'اللغة الروسية غير مدعومة للتعرف على الكلام في هذا المتصفح. جرّب متصفح Chrome.',
    fr: 'Le russe n’est pas pris en charge par la reconnaissance vocale dans ce navigateur. Essayez Chrome.',
  },
  unknown: {
    ru: 'Не удалось распознать речь. Попробуйте снова.',
    en: 'Speech recognition failed. Please try again.',
    ar: 'تعذّر التعرف على الكلام. حاول مرة أخرى.',
    fr: 'La reconnaissance vocale a échoué. Veuillez réessayer.',
  },
};

function mapRecognitionError(rawError: string): SpeechRecognitionErrorCode {
  switch (rawError) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'no-speech':
    case 'audio-capture':
    case 'network':
    case 'aborted':
    case 'bad-grammar':
    case 'language-not-supported':
      return rawError;
    default:
      return 'unknown';
  }
}

/** User-friendly, localized message for a recognition error code. */
export function speechRecognitionErrorMessage(
  code: SpeechRecognitionErrorCode
): LocalizedMessage {
  return ERROR_MESSAGES[code];
}

/**
 * Start one recognition session (single utterance, lang ru-RU).
 * Returns a handle to stop/abort it. Throws if the API is unsupported —
 * callers must check isSpeechRecognitionSupported() first.
 */
export function startSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks
): SpeechRecognitionHandle {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    throw new Error('SpeechRecognition is not supported in this browser.');
  }

  const recognition: WebSpeechRecognitionLike = new Ctor();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let listening = true;
  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const alternative = result[0];
      if (!alternative) continue;
      if (result.isFinal) {
        finalTranscript += alternative.transcript;
      } else {
        interimTranscript += alternative.transcript;
      }
    }
    callbacks.onResult(interimTranscript, finalTranscript);
  };

  recognition.onerror = (event) => {
    const code = mapRecognitionError(event.error || 'unknown');
    callbacks.onError(code, ERROR_MESSAGES[code]);
  };

  recognition.onend = () => {
    listening = false;
    callbacks.onEnd();
  };

  try {
    recognition.start();
  } catch {
    listening = false;
    callbacks.onError('unknown', ERROR_MESSAGES.unknown);
    callbacks.onEnd();
  }

  return {
    get isListening() {
      return listening;
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Already stopped — onend will fire (or already fired).
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // Already stopped.
      }
    },
  };
}
