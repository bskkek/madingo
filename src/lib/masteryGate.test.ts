import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMasteryMigration,
  canAdvanceFromFeedback,
  computeLessonNodeStatuses,
  hasMasteredAllQuestions,
  shouldAcceptLessonCompletion,
} from './rules';

test('MASTERY GATE: wrong answer blocks advance, correct answer allows it', () => {
  // The core rule: under mastery a wrong answer must NOT let the student
  // past that question — the feedback bar retries instead of advancing.
  assert.equal(canAdvanceFromFeedback('wrong', true), false);
  assert.equal(canAdvanceFromFeedback('correct', true), true);
  assert.equal(canAdvanceFromFeedback('none', true), false);
  // Without mastery (dev preview only) the old click-through stays.
  assert.equal(canAdvanceFromFeedback('wrong', false), true);
  assert.equal(canAdvanceFromFeedback('correct', false), true);
  assert.equal(canAdvanceFromFeedback('none', false), false);
});

test('MASTERY GATE: completion requires ALL questions correct', () => {
  assert.equal(
    hasMasteredAllQuestions({ correctStepsCount: 4, totalExercises: 4 }),
    true
  );
  assert.equal(
    hasMasteredAllQuestions({ correctStepsCount: 3, totalExercises: 4 }),
    false
  );
  assert.equal(
    hasMasteredAllQuestions({ correctStepsCount: 0, totalExercises: 4 }),
    false
  );
  // Teach-cards-only lesson (no question steps) counts as mastered.
  assert.equal(
    hasMasteredAllQuestions({ correctStepsCount: 0, totalExercises: 0 }),
    true
  );
  // Extra reinforce steps answered correctly may push the count above
  // the question total — still mastered.
  assert.equal(
    hasMasteredAllQuestions({ correctStepsCount: 5, totalExercises: 4 }),
    true
  );
});

test('MASTERY GATE: handleCompleteLesson accepts only mastery proof', () => {
  // A student who retried finishes with first-try accuracy < 100, yet
  // answered everything correctly — allCorrect is what proves mastery.
  assert.equal(
    shouldAcceptLessonCompletion({ allCorrect: true, accuracy: 60 }),
    true
  );
  assert.equal(
    shouldAcceptLessonCompletion({ allCorrect: true, accuracy: 75 }),
    true
  );
  // No mastery proof, even with a decent accuracy: rejected entirely.
  assert.equal(
    shouldAcceptLessonCompletion({ allCorrect: false, accuracy: 75 }),
    false
  );
  assert.equal(shouldAcceptLessonCompletion({ accuracy: 99 }), false);
  assert.equal(shouldAcceptLessonCompletion({ accuracy: 0 }), false);
  // Legacy payloads without the flag: accuracy 100 is the fallback proof.
  assert.equal(shouldAcceptLessonCompletion({ accuracy: 100 }), true);
  assert.equal(
    shouldAcceptLessonCompletion({ allCorrect: false, accuracy: 100 }),
    true
  );
});

test('MASTERY GATE: completion decision composes from the question counts', () => {
  const mastered = hasMasteredAllQuestions({
    correctStepsCount: 4,
    totalExercises: 4,
  });
  assert.equal(
    shouldAcceptLessonCompletion({ allCorrect: mastered, accuracy: 75 }),
    true
  );
  const notMastered = hasMasteredAllQuestions({
    correctStepsCount: 3,
    totalExercises: 4,
  });
  assert.equal(
    shouldAcceptLessonCompletion({ allCorrect: notMastered, accuracy: 75 }),
    false
  );
});

test('MASTERY GATE migration: drops <100% completions, keeps the rest', () => {
  const migrated = applyMasteryMigration(['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4'], {
    'u1-l1': 100,
    'u1-l2': 75,
    'u1-l3': 0,
    // u1-l4 has no stored accuracy entry — kept (predates accuracy tracking).
  });
  assert.deepEqual(migrated.completedLessonIds, ['u1-l1', 'u1-l4']);
  assert.deepEqual(migrated.accuracyByLesson, { 'u1-l1': 100 });
});

test('MASTERY GATE migration: empty progress stays empty', () => {
  assert.deepEqual(applyMasteryMigration([], {}), {
    completedLessonIds: [],
    accuracyByLesson: {},
    masteredLessonIds: [],
  });
});

test('MASTERY GATE migration: mastered lesson with accuracy < 100 is KEPT', () => {
  // The bug this fixes: a student who mastered a stage with retries
  // finishes with first-try accuracy < 100, yet answered everything
  // correctly. The migration must NOT drop it on the next app reopen.
  const migrated = applyMasteryMigration(
    ['u1-l1', 'u1-l2', 'u1-l3'],
    { 'u1-l1': 90, 'u1-l2': 75, 'u1-l3': 100 },
    ['u1-l1']
  );
  assert.deepEqual(migrated.completedLessonIds, ['u1-l1', 'u1-l3']);
  assert.deepEqual(migrated.accuracyByLesson, { 'u1-l1': 90, 'u1-l3': 100 });
  assert.deepEqual(migrated.masteredLessonIds, ['u1-l1']);
});

test('MASTERY GATE migration: mastered set is pruned to kept lessons', () => {
  // A mastered id that is no longer in the completed list disappears
  // from the record instead of lingering forever.
  const migrated = applyMasteryMigration(['u1-l1'], { 'u1-l1': 90 }, [
    'u1-l1',
    'u1-l9',
  ]);
  assert.deepEqual(migrated.completedLessonIds, ['u1-l1']);
  assert.deepEqual(migrated.masteredLessonIds, ['u1-l1']);
});

test('MASTERY GATE migration: redone stage unlocks the road again', () => {
  const lessons = ['u1-l1', 'u1-l2', 'u1-l3'];
  // Before the gate the student "completed" l1 (100%) and l2 (75% — with
  // wrong answers). After migration l2 must be redone and l3 stays locked.
  const migrated = applyMasteryMigration(['u1-l1', 'u1-l2'], {
    'u1-l1': 100,
    'u1-l2': 75,
  });
  const statuses = computeLessonNodeStatuses(
    lessons,
    migrated.completedLessonIds
  );
  assert.deepEqual(statuses, {
    'u1-l1': 'completed',
    'u1-l2': 'current',
    'u1-l3': 'locked',
  });
});
