// ============================================================================
// MADINGO — ASSISTANT BUBBLE LOGIC (PURE, TESTED)
// The personal assistant (Aniss) is a floating bubble, not a tab: a small
// circular portrait that sits on top of every screen. Pure position math
// lives here so it can be unit-tested without a DOM:
//   * draggable anywhere (touch + mouse), docks to the nearest screen
//     edge on release, never sits under the bottom nav;
//   * position persists in localStorage across sessions;
//   * a pointer-up with almost no movement counts as a TAP (opens the
//     overlay); a real drag moves the bubble instead.
// The React component (AssistantBubble.tsx) wires these helpers to
// pointer events.
// ============================================================================

export const BUBBLE_SIZE = 56;
export const EDGE_MARGIN = 8;
/** Keep the bubble above the fixed bottom nav (~64px + safe area). */
export const BOTTOM_CLEARANCE = 88;
export const TAP_MAX_MOVE_PX = 8;

export const BUBBLE_STORAGE_KEY = 'madingo_assistant_bubble_pos_v1';

export interface BubblePos {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function clampBubblePos(pos: BubblePos, vp: Viewport): BubblePos {
  const maxX = Math.max(EDGE_MARGIN, vp.width - BUBBLE_SIZE - EDGE_MARGIN);
  const maxY = Math.max(
    EDGE_MARGIN,
    vp.height - BUBBLE_SIZE - BOTTOM_CLEARANCE
  );
  return {
    x: Math.min(Math.max(pos.x, EDGE_MARGIN), maxX),
    y: Math.min(Math.max(pos.y, EDGE_MARGIN), maxY),
  };
}

/** Default spot: right edge, a little below middle of the screen. */
export function defaultBubblePos(vp: Viewport): BubblePos {
  return clampBubblePos(
    { x: vp.width - BUBBLE_SIZE - EDGE_MARGIN, y: Math.round(vp.height * 0.55) },
    vp
  );
}

/** Snap to the nearest horizontal edge (left or right), keeping y. */
export function dockBubblePos(pos: BubblePos, vp: Viewport): BubblePos {
  const leftEdge = EDGE_MARGIN;
  const rightEdge = vp.width - BUBBLE_SIZE - EDGE_MARGIN;
  const x = pos.x + BUBBLE_SIZE / 2 < vp.width / 2 ? leftEdge : rightEdge;
  return clampBubblePos({ x, y: pos.y }, vp);
}

/** Load the saved position (clamped to the current viewport), or null. */
export function loadBubblePos(
  storage: StorageLike | null | undefined,
  vp: Viewport
): BubblePos | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BUBBLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as BubblePos).x !== 'number' ||
      typeof (parsed as BubblePos).y !== 'number' ||
      !Number.isFinite((parsed as BubblePos).x) ||
      !Number.isFinite((parsed as BubblePos).y)
    ) {
      return null;
    }
    return clampBubblePos(parsed as BubblePos, vp);
  } catch {
    return null;
  }
}

/** Persist the position. Never throws (private-mode storage may fail). */
export function saveBubblePos(
  storage: StorageLike | null | undefined,
  pos: BubblePos
): void {
  if (!storage) return;
  try {
    storage.setItem(BUBBLE_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore — the bubble still works, it just won't remember the spot
  }
}

/**
 * Decide what a pointer-up means: a tap (open the overlay) when the
 * pointer barely moved, a drag otherwise.
 */
export function resolvePointerUp(
  dx: number,
  dy: number,
  maxMovePx: number = TAP_MAX_MOVE_PX
): 'tap' | 'drag' {
  return Math.hypot(dx, dy) < maxMovePx ? 'tap' : 'drag';
}
