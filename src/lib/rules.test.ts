import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLessonSummary,
  computeLessonNodeStatuses,
  evaluateBadges,
  updateStreakOdometer,
  validateWordBuilderNextChar,
  verifyAlphabetCompleteness,
} from './rules';

test('Curriculum includes all 33 unique Cyrillic letters', () => {
  const res = verifyAlphabetCompleteness();
  assert.equal(res.count, 33);
  assert.equal(res.uniqueUpper, 33);
});

test('Road map node statuses unlock sequentially', () => {
  const lessons = ['u1-l1', 'u1-l2', 'u1-l3'];
  const statusesInitial = computeLessonNodeStatuses(lessons, []);
  assert.deepEqual(statusesInitial, {
    'u1-l1': 'current',
    'u1-l2': 'locked',
    'u1-l3': 'locked',
  });

  const statusesAfterL1 = computeLessonNodeStatuses(lessons, ['u1-l1']);
  assert.deepEqual(statusesAfterL1, {
    'u1-l1': 'completed',
    'u1-l2': 'current',
    'u1-l3': 'locked',
  });
});

test('Fuel (+10 per correct answer) and accuracy calculate accurately', () => {
  const summary = calculateLessonSummary(3, 4, 4);
  assert.equal(summary.fuelEarned, 40);
  assert.equal(summary.accuracy, 75);
});

test('Word Builder accepts correct next Cyrillic letter and blocks wrong tile', () => {
  const step1 = validateWordBuilderNextChar('ТАМ', '', 'Т');
  assert.equal(step1.accepted, true);
  assert.equal(step1.nextAssembled, 'Т');
  assert.equal(step1.isComplete, false);

  const wrongStep = validateWordBuilderNextChar('ТАМ', 'Т', 'М');
  assert.equal(wrongStep.accepted, false);
  assert.equal(wrongStep.nextAssembled, 'Т');
  assert.equal(wrongStep.isComplete, false);

  const step2 = validateWordBuilderNextChar('ТАМ', 'Т', 'А');
  const step3 = validateWordBuilderNextChar('ТАМ', step2.nextAssembled, 'М');
  assert.equal(step3.accepted, true);
  assert.equal(step3.nextAssembled, 'ТАМ');
  assert.equal(step3.isComplete, true);
});

test('Streak odometer increments, uses Spare Tire freeze on 1 missed day, and resets otherwise', () => {
  const initial = {
    current: 0,
    best: 0,
    lastActiveDate: null,
    spareTireAvailable: true,
    spareTireUsedDate: null,
  };

  const day1 = updateStreakOdometer(initial, '2026-10-20');
  assert.equal(day1.current, 1);

  const day2 = updateStreakOdometer(day1, '2026-10-21');
  assert.equal(day2.current, 2);

  // Skip 2026-10-22, active on 2026-10-23 -> Spare Tire saves streak!
  const day4Saved = updateStreakOdometer(day2, '2026-10-23');
  assert.equal(day4Saved.current, 3);
  assert.equal(day4Saved.spareTireAvailable, false);

  // Skip another day without spare tire -> resets to 1
  const resetAfterMiss = updateStreakOdometer(day4Saved, '2026-10-25');
  assert.equal(resetAfterMiss.current, 1);
  assert.equal(resetAfterMiss.best, 3);
});

test('Achievements unlock at First Lap, Alphabet Master, and 3-Day Trip', () => {
  const badges = evaluateBadges(
    ['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4', 'u1-l5', 'u1-l6'],
    { current: 3, best: 3 }
  );
  assert.deepEqual(badges, [
    { id: 'first_lap', unlocked: true },
    { id: 'alphabet_master', unlocked: true },
    { id: 'three_day_trip', unlocked: true },
  ]);
});
