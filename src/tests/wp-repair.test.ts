import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_CONTENT_LICENSES,
  AI_EDITORIAL_ATTRIBUTION,
  isAllowedLicense,
  validateClipForPublication,
  validateLibraryItemForPublication,
  scoreSpeechAttempt,
} from '../lib/phase3Engine';
import {
  SPEAKING_CLIPS,
  LIBRARY_SEED_ITEMS,
  INITIAL_TEACHER_GROUPS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
} from '../data/phase3Seed';
import {
  SEED_LEAGUE_PARTICIPANTS,
  SEED_CLASS_CHALLENGES,
  SEED_FRIENDS,
} from '../data/phase4Data';
import { DICTIONARY_WORDS } from '../data/curriculum';
import { GRAMMAR_ROAD_SIGNS } from '../data/phase2Units';
import { SEED_NOTIFICATIONS } from '../components/Phase4NotificationsAndLegal';

test('WP-1: No fabricated people, books, or licenses exist in production seed data', () => {
  const forbiddenNames = [
    'Sokolova',
    'Соколова',
    'Morozov',
    'Морозов',
    'Amina Benali',
    'Karim Mansour',
    'Amir Mansour',
    'Амир Мансур',
    'Layla Al-Hashemi',
    'Samuel Okafor',
    'Jean-Luc Traoré',
    'Madingo Grammar Series',
    'MADI Open Educational Resource',
    'madingo Open Grammar CC-BY-4.0',
    'MADI Creator License v1.0 (Signed)',
  ];

  const serializedProdData = JSON.stringify({
    SPEAKING_CLIPS,
    LIBRARY_SEED_ITEMS,
    INITIAL_TEACHER_GROUPS,
    INITIAL_ANNOUNCEMENTS,
    INITIAL_ASSIGNMENTS,
    SEED_LEAGUE_PARTICIPANTS,
    SEED_CLASS_CHALLENGES,
    SEED_FRIENDS,
    SEED_NOTIFICATIONS,
  });

  for (const name of forbiddenNames) {
    assert.equal(
      serializedProdData.includes(name),
      false,
      `Forbidden fabricated entity "${name}" must not appear in production seed data`
    );
  }

  // All 30 speaking clips are labeled as AI-assisted editorial drafts
  for (const clip of SPEAKING_CLIPS) {
    assert.equal(clip.author, AI_EDITORIAL_ATTRIBUTION);
    assert.equal(clip.reviewStatus, 'draft');
    assert.equal(clip.consentConfirmed, false);
  }

  // Library contains >= 25 official MADI Preparatory Faculty & famous RKI books (32 total)
  assert.ok(
    LIBRARY_SEED_ITEMS.length >= 25,
    `Expected at least 25 official books in LIBRARY_SEED_ITEMS, found ${LIBRARY_SEED_ITEMS.length}`
  );
  const madiOfficialBooks = LIBRARY_SEED_ITEMS.filter(
    (item) => item.origin === 'madi_official'
  );
  assert.ok(
    madiOfficialBooks.length >= 20,
    `Expected at least 20 official MADI Preparatory Faculty books, found ${madiOfficialBooks.length}`
  );

  for (const item of LIBRARY_SEED_ITEMS) {
    assert.equal(item.reviewStatus, 'approved');
    assert.equal(item.permissionConfirmed, true);
    assert.equal(isAllowedLicense(item.licenseType), true);
    assert.ok(item.sourceUrl?.startsWith('https://'));
    assert.ok(item.pdfUrl && item.pdfUrl.length > 5);
    assert.ok(
      item.coverImageUrl?.startsWith('/covers/') ||
        item.coverImageUrl?.startsWith('data:image/svg+xml;utf8,'),
      `Book ${item.id} must have a real Page 1 cover image`
    );
  }
});

test('WP-1 & WP-10: License & signed consent validation strictly enforces fixed list and URLs', () => {
  assert.equal(ALLOWED_CONTENT_LICENSES.length, 5);
  assert.equal(isAllowedLicense('cc_by'), true);
  assert.equal(isAllowedLicense('MADI Creator License v1.0 (Signed)'), false);
  assert.equal(isAllowedLicense(''), false);

  // Clip without consentDocumentUrl or valid license cannot be approved
  const invalidClipCheck = validateClipForPublication({
    id: 'clip-test-1',
    sourceType: 'madi_creator',
    author: 'Instructor',
    license: 'cc_by',
    sourceUrl: 'https://madi.ru/clip1',
    consentConfirmed: true,
    consentDocumentUrl: '',
    reviewStatus: 'approved',
    reviewedBy: 'rev-1',
    reviewedAt: '2026-10-25T10:00:00Z',
  });
  assert.equal(invalidClipCheck.allowed, false);

  const validClipCheck = validateClipForPublication({
    id: 'clip-test-2',
    sourceType: 'madi_creator',
    author: 'Instructor',
    license: 'own_work_with_permission',
    sourceUrl: 'https://madi.ru/clip1',
    consentConfirmed: true,
    consentDocumentUrl: 'https://madi.ru/consents/clip1-signed.pdf',
    reviewStatus: 'approved',
    reviewedBy: 'rev-1',
    reviewedAt: '2026-10-25T10:00:00Z',
  });
  assert.equal(validClipCheck.allowed, true);

  // Library item requires fixed license and https:// sourceUrl
  const invalidLib = validateLibraryItemForPublication({
    id: 'lib-test-1',
    title: 'Test Reader',
    licenseType: 'Custom fake license',
    sourceUrl: 'https://example.org/book',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
  });
  assert.equal(invalidLib.allowed, false);

  const validLib = validateLibraryItemForPublication({
    id: 'lib-test-2',
    title: 'Test Reader',
    licenseType: 'cc_by_sa',
    sourceUrl: 'https://example.org/book',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
  });
  assert.equal(validLib.allowed, true);
});

test('WP-6 & WP-7: Static dictionary vocabulary is removed in favor of AI Instant Translator and Road Sign P-4 / P-4B are accurate', async () => {
  const {
    detectLanguageFromText,
    applyRussianStressMarks,
    transliterateRussianSimple,
    llmProvider,
  } = await import('../lib/providers');

  assert.equal(
    DICTIONARY_WORDS.length,
    0,
    'Static dictionary vocabulary must be removed in favor of the AI Instant Translator'
  );

  // Verify language detection across all 4 supported languages
  assert.equal(detectLanguageFromText('مرحباً أنا طالب في جامعة مادي'), 'ar');
  assert.equal(detectLanguageFromText('Здравствуйте, я студент университета'), 'ru');
  assert.equal(detectLanguageFromText('Bonjour, je suis étudiant à Moscou'), 'fr');
  assert.equal(detectLanguageFromText('Hello, I am an engineering student'), 'en');

  // Verify Russian stress marks and transliteration accuracy (no wrong middle-vowel guessing)
  const stressed = applyRussianStressMarks('Здравствуйте новый студент университета');
  assert.equal(stressed, 'Здра́вствуйте но́вый студе́нт университе́та');
  assert.equal(transliterateRussianSimple('МАДИ университета'), 'MADI universiteta');

  // Verify AI Instant Translator returns all 4 languages (ru, ar, en, fr)
  const tr = await llmProvider.instantTranslate({
    text: 'مرحبا',
    sourceLang: 'auto',
    targetLang: 'ru',
  });
  assert.equal(tr.detectedSourceLang, 'ar');
  assert.ok(tr.translations.ru.length > 0);
  assert.ok(tr.translations.ruStressed.length > 0);
  assert.ok(tr.translations.ar.length > 0);
  assert.ok(tr.translations.en.length > 0);
  assert.ok(tr.translations.fr.length > 0);

  // Verify auto-switching when source language matches target language
  const ruInputTr = await llmProvider.instantTranslate({
    text: 'университет',
    sourceLang: 'auto',
    targetLang: 'ru',
  });
  assert.equal(ruInputTr.detectedSourceLang, 'ru');
  assert.equal(ruInputTr.targetLang, 'ar');
  assert.notEqual(ruInputTr.primaryTranslation, 'университет');

  const p4 = GRAMMAR_ROAD_SIGNS.find((s) => s.signCode === 'P-4');
  assert.ok(p4, 'Road sign P-4 must exist');
  assert.equal(
    p4.questionsRu.includes('Куда́?'),
    false,
    'P-4 (Direct Object) must only list Кого́? Что? and not conflate Куда́?'
  );
  assert.equal(p4.questionsRu, 'Кого́? Что?');

  const p4b = GRAMMAR_ROAD_SIGNS.find((s) => s.signCode === 'P-4B');
  assert.ok(p4b, 'Dedicated Place vs. Direction road sign P-4B must exist');
  assert.ok(p4b.questionsRu.includes('Где?'));
  assert.ok(p4b.questionsRu.includes('Куда́?'));
  assert.ok(p4b.questionsRu.includes('Отку́да?'));
});

test('WP-4: Pronunciation scoring compares word-by-word and never awards 3 stars to wrong transcripts', () => {
  const target = 'Здра́вствуйте, меня́ зову́т Ами́р.';
  const wrongResult = scoreSpeechAttempt({
    targetText: target,
    transcriptText: 'Пока спасибо',
    targetDurationSec: 3.0,
    actualDurationSec: 2.5,
  });
  assert.ok(wrongResult.stars <= 1);
  assert.ok(wrongResult.overall < 50);

  const exactResult = scoreSpeechAttempt({
    targetText: target,
    transcriptText: 'Здравствуйте меня зовут Амир',
    targetDurationSec: 3.0,
    actualDurationSec: 3.0,
  });
  assert.equal(exactResult.stars, 3);
  assert.equal(exactResult.accuracy, 100);
});

test('WP-3: Multi-language TTS synthesis returns valid audioDataUrl without 429 or 503 errors', async () => {
  const { ttsProvider } = await import('../lib/providers');

  const ruSpeech = await ttsProvider.synthesize({
    text: 'Здра́вствуйте, я студе́нт подготови́тельного факульте́та МАДИ.',
    slow: false,
    lang: 'ru',
  });
  assert.ok(ruSpeech.audioDataUrl && ruSpeech.audioDataUrl.startsWith('data:audio/'));
  assert.ok(ruSpeech.audioDataUrl.length > 500);

  const arSpeech = await ttsProvider.synthesize({
    text: 'مرحباً بكم في جامعة مادي التقنية',
    slow: false,
    lang: 'ar',
  });
  assert.ok(arSpeech.audioDataUrl && arSpeech.audioDataUrl.startsWith('data:audio/'));
  assert.ok(arSpeech.audioDataUrl.length > 500);
});

