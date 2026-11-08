// ============================================================================
// MADINGO — CLIENT-SIDE GEMINI (for static hosting, no server)
// The server used to call Gemini with GEMINI_API_KEY to turn a lesson page
// (image or pasted text) into quiz questions. On static hosting there is no
// server, so the browser calls the Gemini REST API directly with a free API
// key the user pastes once in the app. The key is stored ONLY in this
// browser's localStorage — it is never sent to us, never baked into the
// code, and never leaves the device except to Google's API.
// Free key: https://aistudio.google.com/apikey
// Model: gemini-2.0-flash (free tier, vision + JSON output).
// ============================================================================

import {
  ArenaQuestion,
  parseExerciseFromAIText,
  shuffleQuestionOptions,
} from './arenaEngine';

const GEMINI_KEY_STORAGE_KEY = 'madingo_gemini_api_key_v1';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiExtractErrorCode =
  | 'invalid_key'
  | 'quota'
  | 'no_questions'
  | 'network'
  | 'unknown';

export class GeminiExtractError extends Error {
  code: GeminiExtractErrorCode;
  constructor(code: GeminiExtractErrorCode, message: string) {
    super(message);
    this.code = code;
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

export async function extractQuestionsViaGemini(opts: {
  apiKey: string;
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

  let resp: Response;
  try {
    resp = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': opts.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
  } catch {
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
    if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
      throw new GeminiExtractError(
        'invalid_key',
        detail || 'Gemini rejected the API key.'
      );
    }
    if (resp.status === 429) {
      throw new GeminiExtractError(
        'quota',
        detail || 'Gemini quota / rate limit reached.'
      );
    }
    throw new GeminiExtractError(
      'unknown',
      detail || `Gemini request failed (HTTP ${resp.status}).`
    );
  }

  const data: any = await resp.json().catch(() => null);
  const textParts: string[] = [];
  const candidates = data?.candidates || [];
  for (const cand of candidates) {
    for (const part of cand?.content?.parts || []) {
      if (typeof part?.text === 'string') textParts.push(part.text);
    }
  }
  const rawText = textParts.join('\n');
  const parsed = parseExerciseFromAIText(rawText);
  if (parsed.length === 0) {
    throw new GeminiExtractError(
      'no_questions',
      'Gemini returned no questions from this page.'
    );
  }
  return {
    questions: parsed.slice(0, count).map((q) => shuffleQuestionOptions(q)),
    extractedTopic: topic,
  };
}
