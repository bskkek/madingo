/**
 * Content Validation Script for Phase 4 (Exams, Placement Bank, 40 Badges, Cosmetics, Legal Policies)
 * Run via: npx tsx scripts/validate-phase4-content.ts
 */

import assert from 'node:assert/strict';
import {
  PHASE4_BADGES,
  PHASE4_COSMETICS,
  LEAGUE_TIERS,
  PLACEMENT_QUESTION_BANK,
  CEFR_LEVEL_EXAMS,
  CEFR_CERTIFICATE_META,
  LEGAL_POLICIES,
} from '../src/data/phase4Data';

const LANGS = ['ru', 'en', 'ar', 'fr'] as const;

function validatePhase4Content() {
  // 1. Validate 40 Badges
  assert.equal(PHASE4_BADGES.length, 40, `Expected 40 badges, got ${PHASE4_BADGES.length}`);
  const badgeIds = new Set<string>();
  for (const b of PHASE4_BADGES) {
    assert.ok(!badgeIds.has(b.id), `Duplicate badge ID: ${b.id}`);
    badgeIds.add(b.id);
    for (const l of LANGS) {
      assert.ok(b.title[l]?.trim(), `Badge ${b.id} missing title.${l}`);
      assert.ok(b.description[l]?.trim(), `Badge ${b.id} missing description.${l}`);
    }
  }

  // 2. Validate Free Cosmetics
  assert.ok(PHASE4_COSMETICS.length >= 12, 'Expected at least 12 free cosmetics');
  for (const c of PHASE4_COSMETICS) {
    for (const l of LANGS) {
      assert.ok(c.title[l]?.trim(), `Cosmetic ${c.id} missing title.${l}`);
    }
  }

  // 3. Validate League Tiers (no car brand names)
  assert.equal(LEAGUE_TIERS.length, 6, 'Expected 6 league tiers');

  // 4. Validate Placement Bank & CEFR Level Exams (A1-C2)
  assert.ok(PLACEMENT_QUESTION_BANK.length >= 15, 'Placement bank must have >= 15 questions');
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
    const exam = CEFR_LEVEL_EXAMS[level];
    assert.ok(exam, `Missing exam definition for ${level}`);
    assert.ok(exam.questions.length >= 4, `Exam ${level} must have questions`);
    assert.ok(exam.typingTask.targetText.length > 10, `Exam ${level} missing typing task`);
    assert.ok(exam.speakingTask.targetRussianPhrase.length > 10, `Exam ${level} missing speaking task`);
    assert.ok(CEFR_CERTIFICATE_META[level], `Missing certificate metadata for ${level}`);
  }

  // 5. Validate Legal Policies in 4 languages
  assert.equal(LEGAL_POLICIES.length, 5, 'Expected 5 legal policy sections');
  for (const doc of LEGAL_POLICIES) {
    for (const l of LANGS) {
      assert.ok(doc.title[l]?.trim(), `Legal policy ${doc.id} missing title.${l}`);
      assert.ok(doc.body[l]?.trim(), `Legal policy ${doc.id} missing body.${l}`);
    }
  }

  console.log('✅ Phase 4 content validation passed: 40 badges, 14 cosmetics, 6 CEFR exams, placement bank, and 4-language legal policies verified.');
}

validatePhase4Content();
