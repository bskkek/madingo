import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BUBBLE_SIZE,
  BUBBLE_STORAGE_KEY,
  clampBubblePos,
  defaultBubblePos,
  dockBubblePos,
  loadBubblePos,
  resolvePointerUp,
  saveBubblePos,
  type StorageLike,
} from './assistantBubble';

const VP = { width: 390, height: 844 };

function fakeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

test('bubble: default position is the right edge, below the middle', () => {
  const pos = defaultBubblePos(VP);
  assert.equal(pos.x, VP.width - BUBBLE_SIZE - 8);
  assert.ok(pos.y > VP.height / 2);
  assert.ok(pos.y < VP.height - BUBBLE_SIZE - 88);
});

test('bubble: clamp keeps it on screen and above the bottom nav', () => {
  const clamped = clampBubblePos({ x: 9999, y: 9999 }, VP);
  assert.equal(clamped.x, VP.width - BUBBLE_SIZE - 8);
  assert.equal(clamped.y, VP.height - BUBBLE_SIZE - 88);
  const clamped2 = clampBubblePos({ x: -50, y: -50 }, VP);
  assert.deepEqual(clamped2, { x: 8, y: 8 });
});

test('bubble: dock snaps to the nearest horizontal edge, keeps y', () => {
  const left = dockBubblePos({ x: 20, y: 300 }, VP);
  assert.equal(left.x, 8);
  assert.equal(left.y, 300);
  const right = dockBubblePos({ x: 300, y: 300 }, VP);
  assert.equal(right.x, VP.width - BUBBLE_SIZE - 8);
  assert.equal(right.y, 300);
});

test('bubble: drag position persists across sessions (localStorage round-trip)', () => {
  const storage = fakeStorage();
  saveBubblePos(storage, { x: 8, y: 420 });
  assert.ok(storage.data[BUBBLE_STORAGE_KEY]);
  const loaded = loadBubblePos(storage, VP);
  assert.deepEqual(loaded, { x: 8, y: 420 });
});

test('bubble: load returns null when nothing is stored, and ignores corrupt data', () => {
  assert.equal(loadBubblePos(fakeStorage(), VP), null);
  assert.equal(
    loadBubblePos(fakeStorage({ [BUBBLE_STORAGE_KEY]: 'not json' }), VP),
    null
  );
  assert.equal(
    loadBubblePos(fakeStorage({ [BUBBLE_STORAGE_KEY]: '{"x":"a","y":1}' }), VP),
    null
  );
});

test('bubble: saved position is clamped to the current viewport on load', () => {
  const storage = fakeStorage({
    [BUBBLE_STORAGE_KEY]: JSON.stringify({ x: 900, y: 2000 }),
  });
  const loaded = loadBubblePos(storage, VP);
  assert.deepEqual(loaded, {
    x: VP.width - BUBBLE_SIZE - 8,
    y: VP.height - BUBBLE_SIZE - 88,
  });
});

test('bubble: tap opens the overlay, a real drag moves the bubble', () => {
  // Almost no movement = tap → open the overlay.
  assert.equal(resolvePointerUp(2, 3), 'tap');
  assert.equal(resolvePointerUp(0, 0), 'tap');
  // Real movement = drag → move/dock, do NOT open.
  assert.equal(resolvePointerUp(40, 5), 'drag');
  assert.equal(resolvePointerUp(5, 60), 'drag');
});

test('bubble: close returns to just the bubble — no state is kept in the position helpers', () => {
  // The overlay open/close is a single boolean in App (assistantOpen):
  // open = tap, closed = back to the bubble. The position helpers are
  // pure, so closing never moves or loses the bubble.
  const storage = fakeStorage();
  saveBubblePos(storage, { x: 8, y: 500 });
  assert.deepEqual(loadBubblePos(storage, VP), { x: 8, y: 500 });
  assert.deepEqual(loadBubblePos(storage, VP), { x: 8, y: 500 });
});

test('bubble: the floating button never carries a transform animation (drag regression)', () => {
  // REGRESSION (reported 2026-11-10 — "the bubble doesn't move"): the
  // bubble is positioned by an inline translate() style, but its
  // <button> also had the `avatar-bob` class, whose keyframes animate
  // `transform`. CSS animations override inline styles, so the
  // positioning transform was ignored and the bubble could not be
  // dragged at all. The idle bob now lives on the portrait <img>
  // inside the button instead. This test reads the component + CSS
  // sources and fails if a transform animation is ever re-added to
  // the button.
  const bubbleSrc = readFileSync(
    new URL('../components/AssistantBubble.tsx', import.meta.url),
    'utf8'
  );
  const cssSrc = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

  const buttonMatch = bubbleSrc.match(
    /<button\s+ref=\{bubbleRef\}[\s\S]*?className="([^"]*)"/
  );
  assert.ok(buttonMatch, 'bubble button not found in AssistantBubble.tsx');
  const buttonClasses = buttonMatch[1].split(/\s+/).filter(Boolean);
  assert.ok(
    !buttonClasses.includes('avatar-bob'),
    'avatar-bob must not be on the bubble button — it freezes the drag'
  );

  // For every class on the button that has an animation rule in
  // index.css, the keyframes it names must not animate `transform`.
  for (const cls of buttonClasses) {
    const rule = cssSrc.match(
      new RegExp(`\\.${cls.replace(/:/g, '\\:')}\\s*\\{[^}]*animation:\\s*([a-zA-Z-]+)`)
    );
    if (!rule) continue;
    const keyframesLine = cssSrc
      .split('\n')
      .find((line) => line.startsWith(`@keyframes ${rule[1]} `));
    assert.ok(keyframesLine, `keyframes ${rule[1]} not found in index.css`);
    assert.ok(
      !/transform\s*:/.test(keyframesLine),
      `class ${cls} animates transform — it would freeze the bubble drag`
    );
  }

  // The idle bob must still exist, on the portrait <img> inside the
  // button (it has no positioning transform, so the animation is safe).
  const imgMatch = bubbleSrc.match(
    /<img\s+src=\{TEACHER_IMAGES\.neutral\}[\s\S]*?className="([^"]*)"/
  );
  assert.ok(imgMatch, 'bubble portrait img not found in AssistantBubble.tsx');
  assert.ok(
    imgMatch[1].split(/\s+/).includes('avatar-bob'),
    'idle bob must live on the inner portrait img'
  );
});
