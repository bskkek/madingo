/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 2 Pure Logic Engines:
 * 1. Answer Checking, Normalization (ё/е, stress, punctuation) & Word/Char Diff
 * 2. Vowel & Stress Placement Extractor
 * 3. Russian Morphology Engine (6 Cases x Sg/Pl, Verb Conjugation, Aspect & Motion Pairs + Irregular Highlighting)
 * 4. Leitner Spaced Repetition (Boxes 1-5: 1, 3, 7, 14, 30 days, Showroom on Box 5 passed twice)
 * 5. Typing Lab Input Engine (Strict character blocking, 2-error key hint, heatmap, CPM)
 * 6. Fast Dictionary Search Engine (<100ms on 10k words, Cyrillic + Latin transliteration + 4 UI langs)
 */

export type SupportedLang = 'ru' | 'en' | 'ar' | 'fr';

// ==========================================
// 1. ANSWER NORMALIZATION & DIFF ENGINE
// ==========================================

export interface NormalizationOptions {
  ignoreCase?: boolean;
  ignorePunctuation?: boolean;
  treatYoAsYe?: boolean;
  stripStress?: boolean;
}

const DEFAULT_NORM_OPTIONS: Required<NormalizationOptions> = {
  ignoreCase: true,
  ignorePunctuation: true,
  treatYoAsYe: true,
  stripStress: true,
};

export function stripStressMarks(text: string): string {
  return (text || '').replace(/\u0301/g, '').normalize('NFC');
}

export function normalizeRussianText(
  text: string,
  options: NormalizationOptions = DEFAULT_NORM_OPTIONS
): string {
  const opts = { ...DEFAULT_NORM_OPTIONS, ...options };
  let out = text || '';
  if (opts.stripStress) {
    out = stripStressMarks(out);
  }
  if (opts.ignoreCase) {
    out = out.toLowerCase();
  }
  if (opts.treatYoAsYe) {
    out = out.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  }
  if (opts.ignorePunctuation) {
    out = out.replace(/[.,!?;:«»"'()[\]—–\-]/g, ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

export interface WordDiffToken {
  word: string;
  status: 'match' | 'wrong' | 'missing' | 'extra';
  expected?: string;
}

export interface CharDiffToken {
  char: string;
  status: 'match' | 'wrong' | 'missing' | 'extra';
}

export function computeWordDiff(
  userText: string,
  targetText: string,
  options: NormalizationOptions = DEFAULT_NORM_OPTIONS
): WordDiffToken[] {
  const cleanUserTokens = userText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const cleanTargetTokens = targetText
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const maxLen = Math.max(cleanUserTokens.length, cleanTargetTokens.length);
  const diff: WordDiffToken[] = [];

  for (let i = 0; i < maxLen; i++) {
    const uWord = cleanUserTokens[i];
    const tWord = cleanTargetTokens[i];

    if (uWord !== undefined && tWord !== undefined) {
      const normU = normalizeRussianText(uWord, options);
      const normT = normalizeRussianText(tWord, options);
      if (normU === normT) {
        diff.push({ word: uWord, status: 'match', expected: tWord });
      } else {
        diff.push({ word: uWord, status: 'wrong', expected: tWord });
      }
    } else if (uWord === undefined && tWord !== undefined) {
      diff.push({ word: tWord, status: 'missing', expected: tWord });
    } else if (uWord !== undefined && tWord === undefined) {
      diff.push({ word: uWord, status: 'extra' });
    }
  }

  return diff;
}

export function computeCharDiff(
  userText: string,
  targetText: string,
  options: NormalizationOptions = DEFAULT_NORM_OPTIONS
): CharDiffToken[] {
  const normU = stripStressMarks(userText.trim());
  const normT = stripStressMarks(targetText.trim());
  const maxLen = Math.max(normU.length, normT.length);
  const out: CharDiffToken[] = [];

  for (let i = 0; i < maxLen; i++) {
    const uChar = normU[i];
    const tChar = normT[i];
    if (uChar !== undefined && tChar !== undefined) {
      const match =
        normalizeRussianText(uChar, { ...options, ignorePunctuation: false }) ===
        normalizeRussianText(tChar, { ...options, ignorePunctuation: false });
      out.push({ char: uChar, status: match ? 'match' : 'wrong' });
    } else if (uChar === undefined && tChar !== undefined) {
      out.push({ char: tChar, status: 'missing' });
    } else if (uChar !== undefined) {
      out.push({ char: uChar, status: 'extra' });
    }
  }
  return out;
}

export function checkTranslationAnswer(
  userInput: string,
  acceptedAnswers: string[],
  options: NormalizationOptions = DEFAULT_NORM_OPTIONS
): {
  isCorrect: boolean;
  matchedAnswer: string;
  wordDiff: WordDiffToken[];
  charDiff: CharDiffToken[];
} {
  const normInput = normalizeRussianText(userInput, options);
  const candidates = acceptedAnswers.length > 0 ? acceptedAnswers : [''];

  for (const ans of candidates) {
    const normAns = normalizeRussianText(ans, options);
    if (normInput.length > 0 && normInput === normAns) {
      return {
        isCorrect: true,
        matchedAnswer: ans,
        wordDiff: computeWordDiff(userInput, ans, options),
        charDiff: computeCharDiff(userInput, ans, options),
      };
    }
  }

  const primary = candidates[0] || '';
  return {
    isCorrect: false,
    matchedAnswer: primary,
    wordDiff: computeWordDiff(userInput, primary, options),
    charDiff: computeCharDiff(userInput, primary, options),
  };
}

export function checkSentenceBuilderOrder(
  assembledTokens: string[],
  acceptedOrders: string[][],
  options: NormalizationOptions = DEFAULT_NORM_OPTIONS
): boolean {
  const joinedUser = normalizeRussianText(assembledTokens.join(' '), options);
  if (!joinedUser) return false;
  return acceptedOrders.some(
    (order) => normalizeRussianText(order.join(' '), options) === joinedUser
  );
}

// ==========================================
// 2. STRESS PLACEMENT EXTRACTOR
// ==========================================

const RUSSIAN_VOWELS = new Set([
  'а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я',
  'А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я',
]);

export interface VowelSlot {
  vowelIndex: number; // 0-based index among vowels
  charIndex: number; // 0-based index in cleanWord
  char: string;
  isStressed: boolean;
}

export function extractVowelsAndStress(stressedWord: string): {
  cleanWord: string;
  vowels: VowelSlot[];
  stressedCharIndex: number;
} {
  const cleanChars: string[] = [];
  let stressedCharIndex = -1;

  for (let i = 0; i < stressedWord.length; i++) {
    const ch = stressedWord[i];
    if (ch === '\u0301') {
      stressedCharIndex = Math.max(0, cleanChars.length - 1);
    } else {
      cleanChars.push(ch);
      if (ch === 'ё' || ch === 'Ё') {
        stressedCharIndex = cleanChars.length - 1;
      }
    }
  }

  const cleanWord = cleanChars.join('');
  const vowels: VowelSlot[] = [];

  for (let i = 0; i < cleanChars.length; i++) {
    const ch = cleanChars[i];
    if (RUSSIAN_VOWELS.has(ch)) {
      vowels.push({
        vowelIndex: vowels.length,
        charIndex: i,
        char: ch,
        isStressed: i === stressedCharIndex || (stressedCharIndex === -1 && vowels.length === 0),
      });
    }
  }

  if (stressedCharIndex === -1 && vowels.length > 0) {
    stressedCharIndex = vowels[0].charIndex;
  }

  return { cleanWord, vowels, stressedCharIndex };
}

// ==========================================
// 3. RUSSIAN MORPHOLOGY RULE ENGINE + IRREGULAR OVERRIDES
// ==========================================

export type CaseCode = 'nom' | 'gen' | 'dat' | 'acc' | 'ins' | 'prep';

export interface CaseCell {
  form: string;
  isIrregular?: boolean;
  note?: string;
}

export interface DeclensionTable {
  type: 'declension';
  cases: Record<CaseCode, { sg: CaseCell; pl: CaseCell }>;
}

export interface VerbConjugationTable {
  type: 'conjugation';
  aspect: 'imperfective' | 'perfective';
  aspectPair?: string;
  motionPair?: {
    unidirectional: string;
    multidirectional: string;
    note: Record<SupportedLang, string>;
  };
  present: {
    ya: CaseCell;
    ty: CaseCell;
    onOna: CaseCell;
    my: CaseCell;
    vy: CaseCell;
    oni: CaseCell;
  };
  past: {
    m: CaseCell;
    f: CaseCell;
    n: CaseCell;
    pl: CaseCell;
  };
  future: {
    ya: CaseCell;
    ty: CaseCell;
    onOna: CaseCell;
    my: CaseCell;
    vy: CaseCell;
    oni: CaseCell;
  };
  imperative: {
    sg: CaseCell;
    pl: CaseCell;
  };
}

export type WordMorphologyTable = DeclensionTable | VerbConjugationTable;

export interface IrregularDeclensionOverrides {
  sg?: Partial<Record<CaseCode, string>>;
  pl?: Partial<Record<CaseCode, string>>;
}

export function generateNounDeclension(
  lemmaStressed: string,
  gender: 'm' | 'f' | 'n' | 'pl' = 'm',
  animacy: 'animate' | 'inanimate' = 'inanimate',
  overrides: IrregularDeclensionOverrides = {}
): DeclensionTable {
  const clean = lemmaStressed;
  const lower = stripStressMarks(clean).toLowerCase();

  let sg: Record<CaseCode, string>;
  let pl: Record<CaseCode, string>;

  if (lower.endsWith('а')) {
    const stem = clean.slice(0, -1);
    const stemClean = stripStressMarks(stem).toLowerCase();
    const velarOrHush = /[гкхжшщч]$/.test(stemClean);
    const yEnd = velarOrHush ? 'и' : 'ы';
    sg = {
      nom: clean,
      gen: `${stem}${yEnd}`,
      dat: `${stem}е`,
      acc: `${stem}у`,
      ins: `${stem}ой`,
      prep: `${stem}е`,
    };
    pl = {
      nom: `${stem}${yEnd}`,
      gen: stem,
      dat: `${stem}ам`,
      acc: animacy === 'animate' ? stem : `${stem}${yEnd}`,
      ins: `${stem}ами`,
      prep: `${stem}ах`,
    };
  } else if (lower.endsWith('я')) {
    const stem = clean.slice(0, -1);
    const isIya = lower.endsWith('ия');
    sg = {
      nom: clean,
      gen: `${stem}и`,
      dat: isIya ? `${stem}и` : `${stem}е`,
      acc: `${stem}ю`,
      ins: `${stem}ей`,
      prep: isIya ? `${stem}и` : `${stem}е`,
    };
    pl = {
      nom: `${stem}и`,
      gen: `${stem}й`,
      dat: `${stem}ям`,
      acc: `${stem}и`,
      ins: `${stem}ями`,
      prep: `${stem}ях`,
    };
  } else if (lower.endsWith('о')) {
    const stem = clean.slice(0, -1);
    sg = {
      nom: clean,
      gen: `${stem}а`,
      dat: `${stem}у`,
      acc: clean,
      ins: `${stem}ом`,
      prep: `${stem}е`,
    };
    pl = {
      nom: `${stem}а`,
      gen: stem,
      dat: `${stem}ам`,
      acc: `${stem}а`,
      ins: `${stem}ами`,
      prep: `${stem}ах`,
    };
  } else if (lower.endsWith('е') || lower.endsWith('ё')) {
    const stem = clean.slice(0, -1);
    const isIye = lower.endsWith('ие');
    sg = {
      nom: clean,
      gen: `${stem}я`,
      dat: `${stem}ю`,
      acc: clean,
      ins: `${stem}ем`,
      prep: isIye ? `${stem}и` : `${stem}е`,
    };
    pl = {
      nom: `${stem}я`,
      gen: isIye ? `${stem}й` : `${stem}ей`,
      dat: `${stem}ям`,
      acc: `${stem}я`,
      ins: `${stem}ями`,
      prep: `${stem}ях`,
    };
  } else if (lower.endsWith('ь') && gender === 'f') {
    const stem = clean.slice(0, -1);
    sg = {
      nom: clean,
      gen: `${stem}и`,
      dat: `${stem}и`,
      acc: clean,
      ins: `${stem}ью`,
      prep: `${stem}и`,
    };
    pl = {
      nom: `${stem}и`,
      gen: `${stem}ей`,
      dat: `${stem}ям`,
      acc: `${stem}и`,
      ins: `${stem}ями`,
      prep: `${stem}ях`,
    };
  } else if (lower.endsWith('ь') || lower.endsWith('й')) {
    const stem = clean.slice(0, -1);
    sg = {
      nom: clean,
      gen: `${stem}я`,
      dat: `${stem}ю`,
      acc: animacy === 'animate' ? `${stem}я` : clean,
      ins: `${stem}ем`,
      prep: `${stem}е`,
    };
    pl = {
      nom: `${stem}и`,
      gen: lower.endsWith('й') ? `${stem}ев` : `${stem}ей`,
      dat: `${stem}ям`,
      acc: animacy === 'animate' ? `${stem}ей` : `${stem}и`,
      ins: `${stem}ями`,
      prep: `${stem}ях`,
    };
  } else {
    // Hard masculine consonant stem (e.g. мост, тормоз, автобус, студент)
    const stem = clean;
    const velarOrHush = /[гкхжшщч]$/.test(lower);
    const plNom = velarOrHush ? `${stem}и` : `${stem}ы`;
    const plGen = /[жшщч]$/.test(lower) ? `${stem}ей` : `${stem}ов`;
    sg = {
      nom: stem,
      gen: `${stem}а`,
      dat: `${stem}у`,
      acc: animacy === 'animate' ? `${stem}а` : stem,
      ins: `${stem}ом`,
      prep: `${stem}е`,
    };
    pl = {
      nom: plNom,
      gen: plGen,
      dat: `${stem}ам`,
      acc: animacy === 'animate' ? plGen : plNom,
      ins: `${stem}ами`,
      prep: `${stem}ах`,
    };
  }

  const caseCodes: CaseCode[] = ['nom', 'gen', 'dat', 'acc', 'ins', 'prep'];
  const cases = {} as Record<CaseCode, { sg: CaseCell; pl: CaseCell }>;

  for (const c of caseCodes) {
    const sgOverride = overrides.sg?.[c];
    const plOverride = overrides.pl?.[c];
    cases[c] = {
      sg: {
        form: sgOverride ?? sg[c],
        isIrregular: Boolean(sgOverride),
      },
      pl: {
        form: plOverride ?? pl[c],
        isIrregular: Boolean(plOverride),
      },
    };
  }

  return {
    type: 'declension',
    cases,
  };
}

export function generateAdjectiveDeclension(
  lemmaStressed: string,
  overrides: IrregularDeclensionOverrides = {}
): DeclensionTable {
  const stem = lemmaStressed.slice(0, -2);
  const soft = lemmaStressed.endsWith('ий');
  const sg: Record<CaseCode, string> = {
    nom: `${lemmaStressed} (м) / ${stem}ая (ж) / ${stem}ое (ср)`,
    gen: soft ? `${stem}его / ${stem}ей` : `${stem}ого / ${stem}ой`,
    dat: soft ? `${stem}ему / ${stem}ей` : `${stem}ому / ${stem}ой`,
    acc: `${lemmaStressed} / ${stem}ую`,
    ins: soft ? `${stem}им / ${stem}ей` : `${stem}ым / ${stem}ой`,
    prep: soft ? `${stem}ем / ${stem}ей` : `${stem}ом / ${stem}ой`,
  };
  const pl: Record<CaseCode, string> = {
    nom: soft ? `${stem}ие` : `${stem}ые`,
    gen: soft ? `${stem}их` : `${stem}ых`,
    dat: soft ? `${stem}им` : `${stem}ым`,
    acc: soft ? `${stem}ие` : `${stem}ые`,
    ins: soft ? `${stem}ими` : `${stem}ыми`,
    prep: soft ? `${stem}их` : `${stem}ых`,
  };

  const caseCodes: CaseCode[] = ['nom', 'gen', 'dat', 'acc', 'ins', 'prep'];
  const cases = {} as Record<CaseCode, { sg: CaseCell; pl: CaseCell }>;
  for (const c of caseCodes) {
    cases[c] = {
      sg: {
        form: overrides.sg?.[c] ?? sg[c],
        isIrregular: Boolean(overrides.sg?.[c]),
      },
      pl: {
        form: overrides.pl?.[c] ?? pl[c],
        isIrregular: Boolean(overrides.pl?.[c]),
      },
    };
  }
  return { type: 'declension', cases };
}

export interface VerbCustomOverrides {
  aspect?: 'imperfective' | 'perfective';
  aspectPair?: string;
  motionPair?: VerbConjugationTable['motionPair'];
  present?: Partial<Record<'ya' | 'ty' | 'onOna' | 'my' | 'vy' | 'oni', string>>;
  past?: Partial<Record<'m' | 'f' | 'n' | 'pl', string>>;
  imperative?: Partial<Record<'sg' | 'pl', string>>;
}

export function generateVerbConjugation(
  infinitiveStressed: string,
  overrides: VerbCustomOverrides = {}
): VerbConjugationTable {
  const lower = stripStressMarks(infinitiveStressed).toLowerCase();
  const isSecondConj = lower.endsWith('ить');
  const stem = infinitiveStressed.slice(0, -2); // drop ть
  const root = infinitiveStressed.slice(0, -3); // drop ать/ять/ить/еть

  const defPres = isSecondConj
    ? {
        ya: `${root}ю́`,
        ty: `${root}ишь`,
        onOna: `${root}ит`,
        my: `${root}им`,
        vy: `${root}ите`,
        oni: `${root}ят`,
      }
    : {
        ya: `${stem}ю`,
        ty: `${stem}ешь`,
        onOna: `${stem}ет`,
        my: `${stem}ем`,
        vy: `${stem}ете`,
        oni: `${stem}ют`,
      };

  const defPast = {
    m: `${stem}л`,
    f: `${stem}ла`,
    n: `${stem}ло`,
    pl: `${stem}ли`,
  };

  const defImp = {
    sg: isSecondConj ? `${root}и́!` : `${stem}й!`,
    pl: isSecondConj ? `${root}и́те!` : `${stem}йте!`,
  };

  return {
    type: 'conjugation',
    aspect: overrides.aspect || 'imperfective',
    aspectPair: overrides.aspectPair || `по${infinitiveStressed}`,
    motionPair: overrides.motionPair,
    present: {
      ya: { form: overrides.present?.ya ?? defPres.ya, isIrregular: Boolean(overrides.present?.ya) },
      ty: { form: overrides.present?.ty ?? defPres.ty, isIrregular: Boolean(overrides.present?.ty) },
      onOna: { form: overrides.present?.onOna ?? defPres.onOna, isIrregular: Boolean(overrides.present?.onOna) },
      my: { form: overrides.present?.my ?? defPres.my, isIrregular: Boolean(overrides.present?.my) },
      vy: { form: overrides.present?.vy ?? defPres.vy, isIrregular: Boolean(overrides.present?.vy) },
      oni: { form: overrides.present?.oni ?? defPres.oni, isIrregular: Boolean(overrides.present?.oni) },
    },
    past: {
      m: { form: overrides.past?.m ?? defPast.m, isIrregular: Boolean(overrides.past?.m) },
      f: { form: overrides.past?.f ?? defPast.f, isIrregular: Boolean(overrides.past?.f) },
      n: { form: overrides.past?.n ?? defPast.n, isIrregular: Boolean(overrides.past?.n) },
      pl: { form: overrides.past?.pl ?? defPast.pl, isIrregular: Boolean(overrides.past?.pl) },
    },
    future: {
      ya: { form: `бу́ду ${infinitiveStressed}` },
      ty: { form: `бу́дешь ${infinitiveStressed}` },
      onOna: { form: `бу́дет ${infinitiveStressed}` },
      my: { form: `бу́дем ${infinitiveStressed}` },
      vy: { form: `бу́дете ${infinitiveStressed}` },
      oni: { form: `бу́дут ${infinitiveStressed}` },
    },
    imperative: {
      sg: { form: overrides.imperative?.sg ?? defImp.sg, isIrregular: Boolean(overrides.imperative?.sg) },
      pl: { form: overrides.imperative?.pl ?? defImp.pl, isIrregular: Boolean(overrides.imperative?.pl) },
    },
  };
}

// ==========================================
// 4. LEITNER SPACED REPETITION (BOXES 1-5)
// ==========================================

export const LEITNER_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export interface LeitnerReviewItem {
  id?: number;
  userId?: string;
  itemType: 'word' | 'step' | 'case' | 'letter';
  itemRef: string;
  promptPreview: string;
  correctAnswer: string;
  categoryTag: string;
  box: number; // 1..5
  dueAt: string; // ISO string
  streak: number;
  masteredShowroom: boolean;
  lastResult: 'correct' | 'wrong';
  failCount: number;
}

export function getLeitnerIntervalDays(box: number): number {
  const clamped = Math.max(1, Math.min(5, Math.round(box)));
  return LEITNER_INTERVAL_DAYS[clamped] || 1;
}

export function advanceLeitnerItem(
  item: LeitnerReviewItem,
  isCorrect: boolean,
  now: Date = new Date()
): LeitnerReviewItem {
  if (isCorrect) {
    const wasBox5 = item.box >= 5;
    const nextBox = Math.min(5, item.box + 1);
    const nextStreak = item.streak + 1;
    // Mastered items: Box 5 passed twice moves to Showroom!
    // When entering Box 5 from Box 4 (1st pass into Box 5 -> streak >= 1) and passing Box 5 again -> mastered!
    // Or if already in Box 5 and streak >= 1 (second pass in Box 5).
    const box5Passes = wasBox5 ? item.streak + 1 : 0;
    const masteredShowroom = item.masteredShowroom || (wasBox5 && box5Passes >= 2);

    const intervalDays = getLeitnerIntervalDays(nextBox);
    const nextDue = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    return {
      ...item,
      box: nextBox,
      streak: wasBox5 ? box5Passes : 0,
      masteredShowroom,
      dueAt: nextDue.toISOString(),
      lastResult: 'correct',
    };
  } else {
    // Wrong answer -> back to Box 1!
    const nextDue = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    return {
      ...item,
      box: 1,
      streak: 0,
      masteredShowroom: false,
      dueAt: nextDue.toISOString(),
      lastResult: 'wrong',
      failCount: (item.failCount || 0) + 1,
    };
  }
}

export function isReviewItemDue(item: LeitnerReviewItem, now: Date = new Date()): boolean {
  if (item.masteredShowroom) return false;
  const dueTime = new Date(item.dueAt).getTime();
  return dueTime <= now.getTime();
}

export function selectGarageExerciseFormat(box: number): 'recognition' | 'production' {
  return box <= 2 ? 'recognition' : 'production';
}

export function computeGarageStats(items: LeitnerReviewItem[]) {
  const dueItems = items.filter((i) => isReviewItemDue(i));
  const showroomItems = items.filter((i) => i.masteredShowroom);
  const byBox: Record<number, LeitnerReviewItem[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  for (const it of items) {
    if (!it.masteredShowroom) {
      const b = Math.max(1, Math.min(5, it.box || 1));
      byBox[b].push(it);
    }
  }

  const sortedByFails = [...items].sort((a, b) => (b.failCount || 0) - (a.failCount || 0));
  const weakLetters = sortedByFails.filter(
    (i) => i.itemType === 'letter' || stripStressMarks(i.correctAnswer).length <= 2
  ).slice(0, 5);
  const weakCases = sortedByFails.filter(
    (i) => i.itemType === 'case' || i.categoryTag.includes('case') || i.categoryTag.includes('sign')
  ).slice(0, 5);
  const mostMissedWords = sortedByFails.slice(0, 6);

  return {
    dueCount: dueItems.length,
    dueItems,
    showroomItems,
    byBox,
    weakLetters,
    weakCases,
    mostMissedWords,
  };
}

// ==========================================
// 5. TYPING LAB INPUT ENGINE
// ==========================================

export interface TypingSessionState {
  targetClean: string;
  cursorIndex: number;
  consecutiveErrorsOnCurrent: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  mistakesByLetter: Record<string, number>;
  startedAtMs: number | null;
  completedAtMs: number | null;
}

export function createInitialTypingState(targetClean: string): TypingSessionState {
  return {
    targetClean: stripStressMarks(targetClean),
    cursorIndex: 0,
    consecutiveErrorsOnCurrent: 0,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    mistakesByLetter: {},
    startedAtMs: null,
    completedAtMs: null,
  };
}

export function processTypingInputChar(
  state: TypingSessionState,
  typedChar: string,
  options: { treatYoAsYe?: boolean; ignoreCase?: boolean } = { treatYoAsYe: true, ignoreCase: false },
  nowMs: number = Date.now()
): {
  accepted: boolean;
  nextState: TypingSessionState;
  expectedChar: string;
  shouldHighlightHintKey: boolean;
  isComplete: boolean;
} {
  if (state.cursorIndex >= state.targetClean.length) {
    return {
      accepted: false,
      nextState: state,
      expectedChar: '',
      shouldHighlightHintKey: false,
      isComplete: true,
    };
  }

  const expectedChar = state.targetClean[state.cursorIndex];
  const startedAtMs = state.startedAtMs ?? nowMs;

  let normTyped = stripStressMarks(typedChar);
  let normExpected = stripStressMarks(expectedChar);

  if (options.ignoreCase) {
    normTyped = normTyped.toLowerCase();
    normExpected = normExpected.toLowerCase();
  }

  if (options.treatYoAsYe) {
    normTyped = normTyped.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
    normExpected = normExpected.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  }

  // Normalize curly quotes or dashes to standard space/dash if matching punctuation
  if (normExpected === '—' || normExpected === '–') {
    if (normTyped === '-') normTyped = normExpected;
  }

  if (normTyped === normExpected) {
    const nextCursor = state.cursorIndex + 1;
    const isComplete = nextCursor >= state.targetClean.length;
    return {
      accepted: true,
      expectedChar,
      shouldHighlightHintKey: false,
      isComplete,
      nextState: {
        ...state,
        cursorIndex: nextCursor,
        consecutiveErrorsOnCurrent: 0,
        totalKeystrokes: state.totalKeystrokes + 1,
        correctKeystrokes: state.correctKeystrokes + 1,
        startedAtMs,
        completedAtMs: isComplete ? nowMs : null,
      },
    };
  } else {
    const nextConsecutive = state.consecutiveErrorsOnCurrent + 1;
    const upperExpected = expectedChar.toUpperCase();
    const updatedHeatmap = { ...state.mistakesByLetter };
    if (/[А-ЯЁ]/i.test(upperExpected)) {
      updatedHeatmap[upperExpected] = (updatedHeatmap[upperExpected] || 0) + 1;
    }

    return {
      accepted: false,
      expectedChar,
      shouldHighlightHintKey: nextConsecutive >= 2,
      isComplete: false,
      nextState: {
        ...state,
        consecutiveErrorsOnCurrent: nextConsecutive,
        totalKeystrokes: state.totalKeystrokes + 1,
        mistakesByLetter: updatedHeatmap,
        startedAtMs,
      },
    };
  }
}

export function calculateTypingMetrics(
  state: TypingSessionState,
  nowMs: number = Date.now()
): {
  accuracy: number;
  cpm: number;
  durationSeconds: number;
  fuelEarned: number;
} {
  const start = state.startedAtMs ?? nowMs;
  const end = state.completedAtMs ?? nowMs;
  const elapsedSeconds = Math.max(1, Math.round((end - start) / 1000));
  const accuracy =
    state.totalKeystrokes > 0
      ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100)
      : 100;
  const cpm = Math.round((state.correctKeystrokes / Math.max(1, end - start)) * 60000);
  const fuelEarned = accuracy >= 95 ? 25 : accuracy >= 85 ? 20 : 15;

  return {
    accuracy,
    cpm,
    durationSeconds: elapsedSeconds,
    fuelEarned,
  };
}

// ==========================================
// 6. FAST DICTIONARY SEARCH & TRANSLITERATION
// ==========================================

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function transliterateRussianToLatin(text: string): string {
  const clean = stripStressMarks(text).toLowerCase();
  let out = '';
  for (const ch of clean) {
    out += CYRILLIC_TO_LATIN_MAP[ch] !== undefined ? CYRILLIC_TO_LATIN_MAP[ch] : ch;
  }
  return out;
}

export interface DictionaryWordRecord {
  id: string;
  russian: string;
  stressed: string;
  translit: string;
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'numeral';
  gender?: 'm' | 'f' | 'n' | 'pl' | null;
  animacy?: 'animate' | 'inanimate' | null;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  isMadiTerm: boolean;
  verified: boolean;
  topic: 'madi_auto' | 'campus' | 'greetings' | 'city_metro' | 'numbers_time' | 'daily';
  iconKey: string;
  audioSlug: string;
  translations: Record<SupportedLang, string>;
  usageNote?: Record<SupportedLang, string>;
  examples: Array<{
    id: string;
    russianStressed: string;
    audioSlug: string;
    translations: Record<SupportedLang, string>;
  }>;
  synonyms: string[];
  antonyms: string[];
  relatedWords: string[];
  lessonIds: string[];
  irregularOverrides?: IrregularDeclensionOverrides;
  verbOverrides?: VerbCustomOverrides;
}

export interface SearchFilterOptions {
  query?: string;
  level?: string; // 'ALL' | 'A1' | 'A2' | 'B1' | 'B2'
  pos?: string; // 'ALL' | 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'numeral'
  topic?: string; // 'ALL' | 'madi_auto' | 'campus' | 'greetings' | 'city_metro' | 'numbers_time' | 'daily'
  onlyMadi?: boolean;
  onlyFavorites?: boolean;
  favoriteIds?: Set<string>;
}

interface IndexedEntry {
  word: DictionaryWordRecord;
  normRu: string;
  normYo: string;
  normTranslit: string;
  normTransAlt: string;
  normTranslations: string;
}

export class DictionarySearchEngine {
  private entries: IndexedEntry[] = [];

  constructor(words: DictionaryWordRecord[]) {
    this.entries = words.map((w) => {
      const normRu = normalizeRussianText(w.russian, { treatYoAsYe: false });
      const normYo = normalizeRussianText(w.russian, { treatYoAsYe: true });
      const normTranslit = w.translit.toLowerCase();
      // Alternative simple transliteration (e.g. yo -> e/o, kh -> h)
      const normTransAlt = normTranslit
        .replace(/yo/g, 'e')
        .replace(/kh/g, 'h')
        .replace(/shch/g, 'sch');
      const normTranslations = [
        w.translations.en,
        w.translations.ru,
        w.translations.ar,
        w.translations.fr,
      ]
        .join(' | ')
        .toLowerCase();

      return {
        word: w,
        normRu,
        normYo,
        normTranslit,
        normTransAlt,
        normTranslations,
      };
    });
  }

  public search(filters: SearchFilterOptions = {}): DictionaryWordRecord[] {
    const rawQ = (filters.query || '').trim();
    const normQ = normalizeRussianText(rawQ, { treatYoAsYe: true });
    const lowerQ = stripStressMarks(rawQ).toLowerCase();

    const matched: Array<{ word: DictionaryWordRecord; score: number }> = [];

    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const w = e.word;

      if (filters.onlyMadi && !w.isMadiTerm) continue;
      if (filters.level && filters.level !== 'ALL' && w.level !== filters.level) continue;
      if (filters.pos && filters.pos !== 'ALL' && w.pos !== filters.pos) continue;
      if (filters.topic && filters.topic !== 'ALL' && w.topic !== filters.topic) continue;
      if (filters.onlyFavorites && filters.favoriteIds && !filters.favoriteIds.has(w.id)) continue;

      if (!rawQ) {
        matched.push({ word: w, score: w.isMadiTerm ? 2 : 1 });
        continue;
      }

      let score = 0;
      if (e.normRu === lowerQ || e.normYo === normQ) {
        score = 100;
      } else if (e.normTranslit === lowerQ || e.normTransAlt === lowerQ) {
        score = 95;
      } else if (e.normRu.startsWith(lowerQ) || e.normYo.startsWith(normQ)) {
        score = 85;
      } else if (e.normTranslit.startsWith(lowerQ) || e.normTransAlt.startsWith(lowerQ)) {
        score = 80;
      } else if (e.normTranslations.includes(lowerQ)) {
        score = 75;
      } else if (
        e.normYo.includes(normQ) ||
        e.normTranslit.includes(lowerQ) ||
        e.normTransAlt.includes(lowerQ)
      ) {
        score = 60;
      } else if (lowerQ.length >= 3 && fuzzySubsequenceMatch(lowerQ, e.normYo, e.normTranslit)) {
        score = 40;
      }

      if (score > 0) {
        matched.push({ word: w, score });
      }
    }

    matched.sort((a, b) => b.score - a.score);
    return matched.map((m) => m.word);
  }
}

function fuzzySubsequenceMatch(query: string, targetRu: string, targetLat: string): boolean {
  return isOneEditAway(query, targetRu) || isOneEditAway(query, targetLat);
}

function isOneEditAway(q: string, target: string): boolean {
  if (Math.abs(q.length - target.length) > 2) return false;
  let mismatches = 0;
  const len = Math.min(q.length, target.length);
  for (let i = 0; i < len; i++) {
    if (q[i] !== target[i]) {
      mismatches++;
      if (mismatches > 1) return false;
    }
  }
  return mismatches <= 1;
}
