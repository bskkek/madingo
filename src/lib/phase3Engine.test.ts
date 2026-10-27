import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignTranscriptToTarget,
  scoreSpeechAttempt,
  validateClipForPublication,
  validateLibraryItemForPublication,
  validateGeneratedContent,
  canReadStudentRecord,
  canApproveContent,
  canModerateLibrary,
  DailyQuotaGuard,
} from './phase3Engine';
import {
  SPEAKING_CLIPS,
  CONVERSATION_SCENARIOS,
  LIBRARY_SEED_ITEMS,
} from '../data/phase3Seed';

describe('Phase 3 Seed Content Integrity — 30 Clips, 6 Scenarios, 20 Library Items', () => {
  it('provides 30 original speaking clips labeled honestly as AI editorial drafts until reviewed', () => {
    assert.equal(SPEAKING_CLIPS.length, 30);
    for (const clip of SPEAKING_CLIPS) {
      assert.equal(clip.reviewStatus, 'draft');
      assert.equal(clip.consentConfirmed, false);
      const check = validateClipForPublication(clip);
      assert.equal(
        check.allowed,
        false,
        `Unreviewed draft clip ${clip.id} must remain blocked from publication until human consent/license review`
      );
      assert.ok(clip.durationSec <= 15, `Clip ${clip.id} exceeds 15s limit`);
    }
  });

  it('provides 6 branching conversation scenarios and 20 library items (3 verified public-domain classics + 17 editorial drafts)', () => {
    assert.equal(CONVERSATION_SCENARIOS.length, 6);
    assert.equal(LIBRARY_SEED_ITEMS.length, 20);
    const approvedItems = LIBRARY_SEED_ITEMS.filter((i) => i.reviewStatus === 'approved');
    assert.equal(approvedItems.length, 3);
    for (const item of approvedItems) {
      const check = validateLibraryItemForPublication(item);
      assert.equal(
        check.allowed,
        true,
        `Approved public-domain item ${item.id} failed publication check: ${check.reasons.join(', ')}`
      );
    }
  });
});

describe('Phase 3 Engine — Speech Aligner & Scorer (Levenshtein/DTW)', () => {
  it('scores an exact match with 100% accuracy, 100% completeness, and 3 stars', () => {
    const target = 'Скажи́те, пожа́луйста, где метро́ Аэропо́рт?';
    const spoken = 'скажите пожалуйста где метро аэропорт';
    const res = scoreSpeechAttempt({
      targetText: target,
      transcriptText: spoken,
      targetDurationSec: 3.5,
      actualDurationSec: 3.4,
    });

    assert.equal(res.accuracy, 100);
    assert.equal(res.completeness, 100);
    assert.equal(res.stars, 3);
    assert.equal(res.mispronouncedWords.length, 0);
    assert.equal(res.aiEstimateDisclaimer, true);
  });

  it('handles missing words and marks them as missing in alignedWords', () => {
    const target = 'Я учу́сь в институ́те МАДИ́ на пе́рвом ку́рсе.';
    const spoken = 'Я учусь в МАДИ на курсе';
    const aligned = alignTranscriptToTarget(target, spoken);

    const missing = aligned.filter((w) => w.status === 'missing').map((w) => w.cleanTarget);
    assert.ok(missing.includes('институте'), 'Expected "институте" to be detected as missing');
    assert.ok(missing.includes('первом'), 'Expected "первом" to be detected as missing');

    const res = scoreSpeechAttempt({
      targetText: target,
      transcriptText: spoken,
      targetDurationSec: 4.0,
      actualDurationSec: 3.5,
    });
    assert.ok(res.completeness < 100);
    assert.ok(res.mispronouncedWords.includes('институте'));
  });

  it('detects wrong case endings as "close" and penalizes extra words', () => {
    const target = 'Два биле́та в метро́, пожа́луйста.';
    // "билет" instead of "билета" (wrong genitive ending) + extra word "вот"
    const spoken = 'Два билет в метро пожалуйста вот';
    const aligned = alignTranscriptToTarget(target, spoken);

    const biletWord = aligned.find((w) => w.cleanTarget === 'билета');
    assert.ok(biletWord);
    assert.equal(biletWord.status, 'close');

    const res = scoreSpeechAttempt({
      targetText: target,
      transcriptText: spoken,
      targetDurationSec: 3.0,
      actualDurationSec: 3.0,
    });
    assert.ok(res.accuracy < 100 && res.accuracy >= 65);
    assert.ok(res.mispronouncedWords.includes('билета'));
  });
});

describe('Phase 3 Engine — Legal & Publication Guardrails', () => {
  it('blocks publishing clips without signed consent document or without reviewer approval', () => {
    const unconsented = validateClipForPublication({
      id: 'clip-1',
      sourceType: 'madi_creator',
      license: 'own_work_with_permission',
      sourceUrl: 'https://madi.ru/clip1',
      author: 'Instructor',
      consentConfirmed: false,
      consentDocumentUrl: null,
      reviewedBy: 'reviewer-1',
      reviewedAt: '2026-10-25T10:00:00Z',
      reviewStatus: 'approved',
    });
    assert.equal(unconsented.allowed, false);
    assert.ok(unconsented.reasons.some((r) => r.includes('consent document')));

    const unreviewed = validateClipForPublication({
      id: 'clip-2',
      sourceType: 'ai_original',
      license: 'cc_by',
      sourceUrl: 'https://madi.ru/clip2',
      author: 'madingo Studio',
      consentConfirmed: true,
      consentDocumentUrl: 'https://madi.ru/consent.pdf',
      reviewedBy: null,
      reviewedAt: null,
      reviewStatus: 'needs_review',
    });
    assert.equal(unreviewed.allowed, false);
  });

  it('strictly blocks third-party URLs from TikTok, YouTube, Instagram, or VK', () => {
    for (const badUrl of [
      'https://www.tiktok.com/@user/video/123',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://instagram.com/reel/abc',
      'https://vk.com/video-123_456',
    ]) {
      const check = validateClipForPublication({
        id: 'clip-bad',
        sourceType: 'open_license',
        license: 'cc_by',
        sourceUrl: 'https://example.org/source',
        author: 'External',
        consentConfirmed: true,
        consentDocumentUrl: 'https://example.org/consent.pdf',
        reviewedBy: 'admin-1',
        reviewedAt: '2026-10-25T10:00:00Z',
        reviewStatus: 'approved',
        videoOrSceneUrl: badUrl,
      });
      assert.equal(check.allowed, false, `Should reject URL: ${badUrl}`);
    }
  });

  it('blocks publishing library items without uploader permission checkbox, fixed license, sourceUrl, or admin approval', () => {
    const noPerm = validateLibraryItemForPublication({
      id: 'lib-1',
      title: 'Test Reader',
      licenseType: 'cc_by',
      sourceUrl: 'https://example.org/book',
      permissionConfirmed: false,
      reviewStatus: 'approved',
      reviewedBy: 'admin-1',
    });
    assert.equal(noPerm.allowed, false);

    const validLib = validateLibraryItemForPublication({
      id: 'lib-2',
      title: 'MADI Road Engineering Glossary',
      licenseType: 'own_work_with_permission',
      sourceUrl: 'https://madi.ru/glossary',
      permissionConfirmed: true,
      reviewStatus: 'approved',
      reviewedBy: 'admin-1',
    });
    assert.equal(validLib.allowed, true);
  });
});

describe('Phase 3 Engine — AI Content Pipeline Validator & RBAC/RLS', () => {
  it('validates stress marks, safe content, and translations on generated dialogues', () => {
    const validReport = validateGeneratedContent(
      {
        title: 'В кафе́ МАДИ́',
        level: 'A1',
        topic: 'food',
        grammarPoint: 'Accusative Case',
        register: 'formal',
        lines: [
          {
            speaker: 'Студе́нт',
            ru: 'Да́йте, пожа́луйста, ча́шку ко́фе и бу́лочку.',
            en: 'Please give me a cup of coffee and a bun.',
            ar: 'أعطني من فضلك فنجان قهوة وكعكة.',
            fr: 'Donnez-moi, s’il vous plaît, une tasse de café et une brioche.',
          },
          {
            speaker: 'Бари́ста',
            ru: 'Пожа́луйста! Вот ваш горя́чий ко́фе.',
            en: 'Here you go! Here is your hot coffee.',
            ar: 'تفضل! ها هي قهوتك الساخنة.',
            fr: 'Voilà ! Voici votre café chaud.',
          },
        ],
        vocabulary: ['ко́фе', 'бу́лочка'],
      },
      [
        { lemma: 'ко́фе', level: 'A1' },
        { lemma: 'бу́лочка', level: 'A1' },
      ],
      []
    );
    assert.equal(validReport.passed, true);
    assert.equal(validReport.stressMarksPassed, true);

    // Missing stress marks should fail stressMarksPassed
    const unstressedReport = validateGeneratedContent(
      {
        title: 'Без ударения',
        level: 'A1',
        topic: 'campus',
        grammarPoint: 'Prepositional',
        register: 'colloquial',
        lines: [
          {
            speaker: 'А',
            ru: 'Привет, где сейчас преподаватель и аудитория?',
            en: 'Hi, where are the teacher and classroom now?',
            ar: 'مرحباً، أين المدرس والقاعة الآن؟',
            fr: 'Salut, où sont le professeur et la salle maintenant ?',
          },
          {
            speaker: 'Б',
            ru: 'Они направо по коридору.',
            en: 'They are to the right down the hall.',
            ar: 'هم على اليمين في الممر.',
            fr: 'Ils sont à droite dans le couloir.',
          },
        ],
        vocabulary: ['преподаватель'],
      },
      [],
      []
    );
    assert.equal(unstressedReport.stressMarksPassed, false);
    assert.equal(unstressedReport.passed, false);
  });

  it('enforces RLS access rules for students, teachers, content reviewers, and admins', () => {
    // Student can read own record, not another student's
    assert.equal(
      canReadStudentRecord({ actorId: 'stu-1', actorRole: 'student' }, 'stu-1'),
      true
    );
    assert.equal(
      canReadStudentRecord({ actorId: 'stu-1', actorRole: 'student' }, 'stu-2'),
      false
    );

    // Teacher can only read students in their groups
    assert.equal(
      canReadStudentRecord(
        {
          actorId: 'tch-1',
          actorRole: 'teacher',
          teacherGroupStudentIds: ['stu-1', 'stu-2'],
        },
        'stu-2'
      ),
      true
    );
    assert.equal(
      canReadStudentRecord(
        {
          actorId: 'tch-1',
          actorRole: 'teacher',
          teacherGroupStudentIds: ['stu-1', 'stu-2'],
        },
        'stu-99'
      ),
      false
    );

    // Admin can read all
    assert.equal(
      canReadStudentRecord({ actorId: 'adm-1', actorRole: 'admin' }, 'stu-99'),
      true
    );

    // Content approval & library moderation
    assert.equal(canApproveContent('student'), false);
    assert.equal(canApproveContent('content_reviewer'), true);
    assert.equal(canModerateLibrary('teacher'), false);
    assert.equal(canModerateLibrary('admin'), true);
  });

  it('enforces per-user daily quota and global budget guard', () => {
    const guard = new DailyQuotaGuard(2, 1.0);
    assert.equal(guard.checkAndConsume('u1', 0.1).allowed, true);
    assert.equal(guard.checkAndConsume('u1', 0.1).allowed, true);
    // 3rd call for u1 exceeds maxRequestsPerUserPerDay=2
    assert.equal(guard.checkAndConsume('u1', 0.1).allowed, false);
    // u2 exceeding budget
    assert.equal(guard.checkAndConsume('u2', 0.9).allowed, false);
  });
});
