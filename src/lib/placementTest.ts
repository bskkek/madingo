/**
 * Placement Test — question bank + scoring.
 *
 * Built ONLY from existing curriculum content:
 * - letters from CYRILLIC_LETTERS
 * - phrases from UNIT2_PHRASES
 * - cases from GRAMMAR_ROAD_SIGNS
 * (all in src/data/curriculum.ts / src/data/phase2Units.ts)
 *
 * 12 questions: 4 letter-recognition, 4 phrase/meaning, 4 case/grammar.
 * Score 0-12 maps to a recommended starting unit:
 *   0-3  -> unit-1,  4-7 -> unit-2,  8-10 -> unit-3,  11-12 -> unit-4.
 * unlockLessonIds = lesson ids of every unit ordered before the
 * recommended unit (by orderIndex in CURRICULUM_UNITS).
 */

import {
  CYRILLIC_LETTERS,
  UNIT2_PHRASES,
  GRAMMAR_ROAD_SIGNS,
  CURRICULUM_UNITS,
  type SupportedLang,
} from '../data/curriculum';

export const PLACEMENT_TEST_TOTAL = 12;

export type PlacementQuestionKind = 'letter' | 'phrase' | 'grammar';

export interface PlacementQuestion {
  id: string;
  kind: PlacementQuestionKind;
  /** Question text in the UI language the test was built with. */
  questionText: string;
  /** Russian text to speak aloud (phrase / letter word), if any. */
  speakText?: string;
  options: string[];
  correctIndex: number;
}

export interface PlacementRecommendation {
  score: number;
  total: number;
  recommendedUnitId: string;
  unlockLessonIds: string[];
}

/** Short case names in all 4 UI languages. */
export const CASE_NAMES: Record<
  'nom' | 'gen' | 'dat' | 'acc' | 'ins' | 'prep',
  Record<SupportedLang, string>
> = {
  nom: { en: 'Nominative', ru: 'Именительный', ar: 'حالة الرفع', fr: 'Nominatif' },
  gen: { en: 'Genitive', ru: 'Родительный', ar: 'حالة الإضافة', fr: 'Génitif' },
  dat: { en: 'Dative', ru: 'Дательный', ar: 'حالة العطاء', fr: 'Datif' },
  acc: { en: 'Accusative', ru: 'Винительный', ar: 'حالة النصب', fr: 'Accusatif' },
  ins: { en: 'Instrumental', ru: 'Творительный', ar: 'حالة الأداة', fr: 'Instrumental' },
  prep: { en: 'Prepositional', ru: 'Предложный', ar: 'حالة الجر', fr: 'Prépositionnel' },
};

type CaseCode = keyof typeof CASE_NAMES;

const PROMPTS: Record<
  SupportedLang,
  {
    letterSound: (phonetic: string) => string;
    letterStartsWord: (word: string) => string;
    softSign: string;
    phraseMeaning: (phrase: string) => string;
    caseQuestion: (questionsRu: string) => string;
  }
> = {
  en: {
    letterSound: (p) => `Which letter makes the sound ${p}?`,
    letterStartsWord: (w) => `Which letter does the word «${w}» start with?`,
    softSign: 'What does the soft sign «Ь» do?',
    phraseMeaning: (p) => `What does «${p}» mean?`,
    caseQuestion: (q) => `Which case answers the question «${q}»?`,
  },
  ru: {
    letterSound: (p) => `Какая буква даёт звук ${p}?`,
    letterStartsWord: (w) => `С какой буквы начинается слово «${w}»?`,
    softSign: 'Что делает мягкий знак «Ь»?',
    phraseMeaning: (p) => `Что означает «${p}»?`,
    caseQuestion: (q) => `Какой падеж отвечает на вопрос «${q}»?`,
  },
  ar: {
    letterSound: (p) => `أي حرف ينطق بالصوت ${p}؟`,
    letterStartsWord: (w) => `بأي حرف تبدأ كلمة «${w}»؟`,
    softSign: 'ما وظيفة علامة الترقيق «Ь»؟',
    phraseMeaning: (p) => `ماذا تعني عبارة «${p}»؟`,
    caseQuestion: (q) => `أي حالة تجيب عن السؤال «${q}»؟`,
  },
  fr: {
    letterSound: (p) => `Quelle lettre donne le son ${p} ?`,
    letterStartsWord: (w) => `Par quelle lettre commence le mot « ${w} » ?`,
    softSign: 'Que fait le signe mou « Ь » ?',
    phraseMeaning: (p) => `Que signifie « ${p} » ?`,
    caseQuestion: (q) => `Quel cas répond à la question « ${q} » ?`,
  },
};

const SOFT_SIGN_OPTIONS: Record<SupportedLang, { correct: string; wrong: string[] }> = {
  en: {
    correct: 'It makes the consonant before it soft',
    wrong: ['It is pronounced [r]', 'It is a vowel', 'It means “and”'],
  },
  ru: {
    correct: 'Смягчает предыдущий согласный',
    wrong: ['Произносится как [р]', 'Это гласная буква', 'Означает «и»'],
  },
  ar: {
    correct: 'يُرقّق الحرف الساكن الذي قبله',
    wrong: ['يُنطق [ر]', 'إنه حرف علة', 'يعني «و»'],
  },
  fr: {
    correct: 'Il adoucit la consonne qui précède',
    wrong: ['Il se prononce [r]', 'C’est une voyelle', 'Il signifie « et »'],
  },
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function findLetter(id: string) {
  const letter = CYRILLIC_LETTERS.find((l) => l.id === id);
  if (!letter) throw new Error(`Placement test: letter ${id} not found in curriculum`);
  return letter;
}

function findPhrase(id: string) {
  const phrase = UNIT2_PHRASES.find((p) => p.id === id);
  if (!phrase) throw new Error(`Placement test: phrase ${id} not found in curriculum`);
  return phrase;
}

function findSign(caseCode: CaseCode) {
  const sign = GRAMMAR_ROAD_SIGNS.find((s) => s.caseCode === caseCode);
  if (!sign) throw new Error(`Placement test: case ${caseCode} not found in GRAMMAR_ROAD_SIGNS`);
  return sign;
}

/** Build the 12 placement questions in the given UI language. Options are shuffled. */
export function buildPlacementQuestions(lang: SupportedLang): PlacementQuestion[] {
  const t = PROMPTS[lang] || PROMPTS.en;
  const questions: PlacementQuestion[] = [];

  // ---- 4 LETTER questions (from CYRILLIC_LETTERS) ----
  const letterR = findLetter('let-r'); // Р [r]
  const letterM = findLetter('let-m'); // М [m]
  const letterK = findLetter('let-k');
  const letterT = findLetter('let-t');
  const letterN = findLetter('let-n');
  const letterV = findLetter('let-v');
  const letterS = findLetter('let-s');

  // L1: which letter makes the sound [r]?
  questions.push(
    makeMcq('letter-sound-r', 'letter', t.letterSound(letterR.phonetic), [
      letterR.upper,
      letterM.upper,
      letterK.upper,
      letterT.upper,
    ])
  );
  // L2: which letter does the word «Руль» start with? (Руль = first example of Р)
  const rulWord = letterR.examples[0].cleanWord;
  questions.push(
    makeMcq('letter-word-start', 'letter', t.letterStartsWord(rulWord), [
      letterR.upper,
      letterK.upper,
      letterT.upper,
      letterM.upper,
    ])
  );
  // L3: what does the soft sign Ь do? (from its soundComparison in the curriculum)
  const soft = SOFT_SIGN_OPTIONS[lang] || SOFT_SIGN_OPTIONS.en;
  questions.push(
    makeMcq('letter-soft-sign', 'letter', t.softSign, [soft.correct, ...soft.wrong])
  );
  // L4: which letter makes the sound [m]?
  questions.push(
    makeMcq('letter-sound-m', 'letter', t.letterSound(letterM.phonetic), [
      letterM.upper,
      letterN.upper,
      letterV.upper,
      letterS.upper,
    ])
  );

  // ---- 4 PHRASE questions (from UNIT2_PHRASES) ----
  // Each question shows one phrase; the 4 options are the meanings of the
  // same 4 phrases in the UI language, so distractors always come from the data.
  const phraseIds = ['phr-privet', 'phr-spasibo', 'phr-kak-dela', 'phr-menya-zovut'];
  const phrases = phraseIds.map(findPhrase);
  const phraseMeanings = phrases.map((p) => p.translations[lang] || p.translations.en);
  for (let i = 0; i < phrases.length; i++) {
    questions.push(
      makeMcq(
        `phrase-${phrases[i].id}`,
        'phrase',
        t.phraseMeaning(phrases[i].phraseWithStress),
        phraseMeanings,
        i,
        phrases[i].cleanPhrase
      )
    );
  }

  // ---- 4 GRAMMAR questions (from GRAMMAR_ROAD_SIGNS) ----
  const grammarCases: CaseCode[] = ['nom', 'gen', 'ins', 'prep'];
  const allCaseCodes: CaseCode[] = ['nom', 'gen', 'dat', 'acc', 'ins', 'prep'];
  for (const caseCode of grammarCases) {
    const sign = findSign(caseCode);
    const distractors = shuffle(
      allCaseCodes.filter((c) => c !== caseCode)
    ).slice(0, 3);
    const optionCodes = shuffle([caseCode, ...distractors]);
    questions.push({
      id: `grammar-${caseCode}`,
      kind: 'grammar',
      questionText: t.caseQuestion(sign.questionsRu),
      options: optionCodes.map((c) => CASE_NAMES[c][lang] || CASE_NAMES[c].en),
      correctIndex: optionCodes.indexOf(caseCode),
    });
  }

  return shuffle(questions);
}

/** Build a multiple-choice question; options are shuffled, correctIndex tracked. */
function makeMcq(
  id: string,
  kind: PlacementQuestionKind,
  questionText: string,
  optionsInOrder: string[],
  correctPosition = 0,
  speakText?: string
): PlacementQuestion {
  const correct = optionsInOrder[correctPosition];
  const shuffled = shuffle(optionsInOrder);
  return {
    id,
    kind,
    questionText,
    speakText,
    options: shuffled,
    correctIndex: shuffled.indexOf(correct),
  };
}

/** Map a 0-12 score to the recommended starting unit + lessons to unlock. */
export function getPlacementRecommendation(score: number): PlacementRecommendation {
  const clamped = Math.max(0, Math.min(PLACEMENT_TEST_TOTAL, Math.round(score)));
  const recommendedUnitId =
    clamped <= 3 ? 'unit-1' : clamped <= 7 ? 'unit-2' : clamped <= 10 ? 'unit-3' : 'unit-4';

  const recommended = CURRICULUM_UNITS.find((u) => u.id === recommendedUnitId);
  const unlockLessonIds = recommended
    ? CURRICULUM_UNITS.filter((u) => u.orderIndex < recommended.orderIndex).flatMap((u) =>
        u.lessons.map((l) => l.id)
      )
    : [];

  return {
    score: clamped,
    total: PLACEMENT_TEST_TOTAL,
    recommendedUnitId,
    unlockLessonIds,
  };
}
