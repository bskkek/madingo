import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRussianText,
  checkTranslationAnswer,
  checkSentenceBuilderOrder,
  extractVowelsAndStress,
  generateNounDeclension,
  generateVerbConjugation,
  advanceLeitnerItem,
  LEITNER_INTERVAL_DAYS,
  createInitialTypingState,
  processTypingInputChar,
  calculateTypingMetrics,
  DictionarySearchEngine,
  DictionaryWordRecord,
  transliterateRussianToLatin,
} from './phase2Engine';

test('Answer-checking: normalizes case, punctuation, stress marks, and ё/е equivalence + computes diff', () => {
  const norm = normalizeRussianText('Перекрёсток! На доро́ге?', { treatYoAsYe: true });
  assert.equal(norm, 'перекресток на дороге');

  const checkOk = checkTranslationAnswer(
    'это новый перекресток',
    ['Э́то но́вый перекрёсток.', 'Но́вый перекрёсток э́то.'],
    { treatYoAsYe: true }
  );
  assert.equal(checkOk.isCorrect, true);
  assert.equal(checkOk.wordDiff.every((d) => d.status === 'match'), true);

  const checkFail = checkTranslationAnswer(
    'это старый мост',
    ['Э́то но́вый мост.']
  );
  assert.equal(checkFail.isCorrect, false);
  assert.equal(checkFail.wordDiff[0].status, 'match');
  assert.equal(checkFail.wordDiff[1].status, 'wrong');
  assert.equal(checkFail.wordDiff[1].expected, 'но́вый');
  assert.equal(checkFail.wordDiff[2].status, 'match');
});

test('Sentence builder accepts primary and alternative word orders', () => {
  const accepted = [
    ['Я', 'учу́сь', 'в', 'МАДИ́'],
    ['В', 'МАДИ́', 'я', 'учу́сь'],
  ];
  assert.equal(checkSentenceBuilderOrder(['я', 'учусь', 'в', 'мади'], accepted), true);
  assert.equal(checkSentenceBuilderOrder(['В', 'МАДИ', 'я', 'учусь'], accepted), true);
  assert.equal(checkSentenceBuilderOrder(['учусь', 'я', 'МАДИ'], accepted), false);
});

test('Stress placement extractor identifies vowel indices and stressed vowel accurately', () => {
  const res = extractVowelsAndStress('маши́на');
  assert.equal(res.cleanWord, 'машина');
  assert.equal(res.vowels.length, 3);
  assert.equal(res.vowels[0].char, 'а');
  assert.equal(res.vowels[0].isStressed, false);
  assert.equal(res.vowels[1].char, 'и');
  assert.equal(res.vowels[1].isStressed, true);
  assert.equal(res.vowels[2].char, 'а');
  assert.equal(res.vowels[2].isStressed, false);

  const yoRes = extractVowelsAndStress('перекрёсток');
  assert.equal(yoRes.cleanWord, 'перекрёсток');
  const stressedVowel = yoRes.vowels.find((v) => v.isStressed);
  assert.equal(stressedVowel?.char, 'ё');
});

test('Leitner Spaced Repetition: boxes 1-5 (1,3,7,14,30 days), wrong resets to box 1, box 5 passed twice enters Showroom', () => {
  assert.deepEqual(LEITNER_INTERVAL_DAYS, { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 });

  const now = new Date('2026-10-25T12:00:00.000Z');
  let item: any = {
    itemType: 'word' as const,
    itemRef: 'w_dvigatel',
    promptPreview: 'engine',
    correctAnswer: 'дви́гатель',
    categoryTag: 'madi_auto',
    box: 1,
    dueAt: now.toISOString(),
    streak: 0,
    masteredShowroom: false,
    lastResult: 'wrong',
    failCount: 1,
  };

  // Correct in Box 1 -> moves to Box 2 (+3 days)
  item = advanceLeitnerItem(item, true, now);
  assert.equal(item.box, 2);
  const diffDaysBox2 = Math.round(
    (new Date(item.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  assert.equal(diffDaysBox2, 3);

  // Wrong in Box 2 -> resets to Box 1 (+1 day)
  item = advanceLeitnerItem(item, false, now);
  assert.equal(item.box, 1);
  assert.equal(item.failCount, 2);

  // Advance to Box 5
  item = advanceLeitnerItem(item, true, now); // -> 2
  item = advanceLeitnerItem(item, true, now); // -> 3
  item = advanceLeitnerItem(item, true, now); // -> 4
  item = advanceLeitnerItem(item, true, now); // -> 5
  assert.equal(item.box, 5);
  assert.equal(item.masteredShowroom, false);

  // Pass Box 5 first time
  item = advanceLeitnerItem(item, true, now);
  assert.equal(item.box, 5);
  assert.equal(item.streak, 1);
  assert.equal(item.masteredShowroom, false);

  // Pass Box 5 second time -> enters Showroom!
  item = advanceLeitnerItem(item, true, now);
  assert.equal(item.box, 5);
  assert.equal(item.streak, 2);
  assert.equal(item.masteredShowroom, true);
});

test('Typing Lab Engine: blocks wrong letters, triggers hint after 2 consecutive mistakes, tracks heatmap & CPM', () => {
  let state = createInitialTypingState('МАДИ́ — наш университе́т');
  assert.equal(state.targetClean, 'МАДИ — наш университет');

  const t0 = 10000;
  // Type correct 'М'
  const r1 = processTypingInputChar(state, 'М', { treatYoAsYe: true }, t0);
  assert.equal(r1.accepted, true);
  assert.equal(r1.nextState.cursorIndex, 1);
  state = r1.nextState;

  // Type wrong 'О' instead of 'А' (1st mistake)
  const err1 = processTypingInputChar(state, 'О', { treatYoAsYe: true }, t0 + 500);
  assert.equal(err1.accepted, false);
  assert.equal(err1.nextState.cursorIndex, 1); // blocked!
  assert.equal(err1.shouldHighlightHintKey, false);
  state = err1.nextState;

  // Type wrong 'И' instead of 'А' (2nd consecutive mistake -> hint key highlighted!)
  const err2 = processTypingInputChar(state, 'И', { treatYoAsYe: true }, t0 + 900);
  assert.equal(err2.accepted, false);
  assert.equal(err2.nextState.cursorIndex, 1); // still blocked!
  assert.equal(err2.shouldHighlightHintKey, true);
  assert.equal(err2.expectedChar, 'А');
  assert.equal(err2.nextState.mistakesByLetter['А'], 2);
  state = err2.nextState;

  // Type correct 'А' -> advances cursor and resets consecutive error counter
  const r2 = processTypingInputChar(state, 'А', { treatYoAsYe: true }, t0 + 1200);
  assert.equal(r2.accepted, true);
  assert.equal(r2.nextState.cursorIndex, 2);
  assert.equal(r2.nextState.consecutiveErrorsOnCurrent, 0);

  const metrics = calculateTypingMetrics(r2.nextState, t0 + 6000);
  assert.equal(metrics.accuracy, 50); // 2 correct out of 4 keystrokes
  assert.equal(metrics.cpm > 0, true);
});

test('Morphology Engine & Fast Dictionary Search (<100ms on 10,000 words)', () => {
  const chelDecl = generateNounDeclension('челове́к', 'm', 'animate', {
    pl: {
      nom: 'лю́ди',
      gen: 'люде́й',
      dat: 'лю́дям',
      acc: 'люде́й',
      ins: 'людьми́',
      prep: 'лю́дях',
    },
  });
  assert.equal(chelDecl.cases.nom.pl.form, 'лю́ди');
  assert.equal(chelDecl.cases.nom.pl.isIrregular, true);

  const idtiConj = generateVerbConjugation('идти́', {
    present: { ya: 'иду́', ty: 'идёшь', onOna: 'идёт', my: 'идём', vy: 'идёте', oni: 'иду́т' },
    past: { m: 'шёл', f: 'шла', n: 'шло', pl: 'шли' },
    motionPair: {
      unidirectional: 'идти́',
      multidirectional: 'ходи́ть',
      note: {
        en: 'One-way vs round-trip on foot',
        ru: 'Однонаправленное / разнонаправленное движение пешком',
        ar: 'حركة باتجاه واحد مقابل ذهاب وإياب سيراً',
        fr: 'Aller simple vs aller-retour à pied',
      },
    },
  });
  assert.equal(idtiConj.present.ya.form, 'иду́');
  assert.equal(idtiConj.past.m.isIrregular, true);
  assert.equal(idtiConj.motionPair?.multidirectional, 'ходи́ть');

  // Benchmark 10,000 words search under 100ms
  const tenThousandWords: DictionaryWordRecord[] = Array.from({ length: 10000 }, (_, idx) => {
    const isTarget = idx === 4200;
    const ru = isTarget ? 'перекрёсток' : `слово_${idx}`;
    return {
      id: `w_${idx}`,
      russian: ru,
      stressed: isTarget ? 'перекрёсток' : `сло́во_${idx}`,
      translit: transliterateRussianToLatin(ru),
      pos: 'noun',
      gender: 'm',
      animacy: 'inanimate',
      level: 'A1',
      isMadiTerm: isTarget,
      verified: false,
      topic: isTarget ? 'madi_auto' : 'daily',
      iconKey: 'road',
      audioSlug: `word-${idx}`,
      translations: {
        en: isTarget ? 'intersection / crossroads' : `word ${idx}`,
        ru: isTarget ? 'пересечение дорог' : `слово ${idx}`,
        ar: isTarget ? 'تقاطع طرق' : `كلمة ${idx}`,
        fr: isTarget ? 'carrefour' : `mot ${idx}`,
      },
      examples: [],
      synonyms: [],
      antonyms: [],
      relatedWords: [],
      lessonIds: ['u5-l1'],
    };
  });

  const engine = new DictionarySearchEngine(tenThousandWords);
  const startMs = performance.now();
  const byCyrillicYo = engine.search({ query: 'перекресток' });
  const byTranslit = engine.search({ query: 'perekryostok' });
  const byArabic = engine.search({ query: 'تقاطع' });
  const elapsedMs = performance.now() - startMs;

  assert.equal(byCyrillicYo[0]?.id, 'w_4200');
  assert.equal(byTranslit[0]?.id, 'w_4200');
  assert.equal(byArabic[0]?.id, 'w_4200');
  assert.equal(elapsedMs < 100, true, `Expected <100ms for 3 searches on 10k words, got ${elapsedMs}ms`);
});
