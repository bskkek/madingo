// Web Push client (2026-11-15): permission + subscription + open/close sync.
// Talks to the proxy's /api/push/* endpoints (see proxy/server.mjs).
// Design:
//   * Everything here is fire-and-forget from the UI's point of view — a
//     push failure must NEVER break the app or block a lesson.
//   * The server keeps the subscription + a progress snapshot (level,
//     completed stages, current stage) so the morning / 5-min reminders can
//     name the user's level in their own language.
//   * Open = POST /api/push/open (cancels any pending 5-min reminder and
//     re-syncs language + progress). Close = sendBeacon POST
//     /api/push/close with the LATEST snapshot (so the reminder names the
//     stage the user actually stopped at).
//   * Denial is respected: once the browser permission is denied we never
//     ask again; "Not now" waits 7 days before asking again.
import { getProxyBaseUrl } from './assistantClient';

export interface PushSnapshot {
  language: string;
  level: string;
  completedCount: number;
  currentStage: number;
}

const PUSH_ENDPOINT_KEY = 'madingo_push_endpoint_v1';
const PUSH_STATUS_KEY = 'madingo_push_status_v1'; // 'subscribed' | 'denied' | 'dismissed'
const PUSH_NEXT_ASK_KEY = 'madingo_push_next_ask_v1';
const ASK_AGAIN_AFTER_MS = 7 * 24 * 3600 * 1000; // 7 days after "Not now"

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushBaseUrl(): string {
  const base = getProxyBaseUrl();
  return base ? `${base}/api/push` : '';
}

export function getStoredPushEndpoint(): string | null {
  try {
    return localStorage.getItem(PUSH_ENDPOINT_KEY);
  } catch {
    return null;
  }
}

function getPushStatus(): string | null {
  try {
    return localStorage.getItem(PUSH_STATUS_KEY);
  } catch {
    return null;
  }
}

export function setPushDismissed(): void {
  try {
    localStorage.setItem(PUSH_STATUS_KEY, 'dismissed');
    localStorage.setItem(PUSH_NEXT_ASK_KEY, String(Date.now() + ASK_AGAIN_AFTER_MS));
  } catch {
    // ignore
  }
}

/** True when the in-app permission prompt may be shown right now. */
export function shouldAskForPush(): boolean {
  if (!isPushSupported() || !getPushBaseUrl()) return false;
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return false;
  if (getStoredPushEndpoint()) return false; // already subscribed
  const status = getPushStatus();
  if (status === 'denied') return false;
  if (status === 'dismissed') {
    try {
      const next = Number(localStorage.getItem(PUSH_NEXT_ASK_KEY) || 0);
      return Date.now() >= next;
    } catch {
      return false;
    }
  }
  return true; // never asked
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 15000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

/** Ask the browser permission (if needed) and subscribe. Returns ok:false with a reason on any failure. */
export async function subscribePush(snapshot: PushSnapshot): Promise<{ ok: boolean; reason?: string }> {
  try {
    if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
    const base = getPushBaseUrl();
    if (!base) return { ok: false, reason: 'unconfigured' };
    if (Notification.permission === 'denied') {
      try {
        localStorage.setItem(PUSH_STATUS_KEY, 'denied');
      } catch {
        // ignore
      }
      return { ok: false, reason: 'denied' };
    }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        try {
          localStorage.setItem(PUSH_STATUS_KEY, perm === 'denied' ? 'denied' : 'dismissed');
        } catch {
          // ignore
        }
        return { ok: false, reason: perm };
      }
    }
    const keyRes = await fetchJson(`${base}/vapid-public-key`, {});
    if (!keyRes || !keyRes.publicKey) return { ok: false, reason: 'no_vapid_key' };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
      });
    }
    const res = await fetchJson(
      `${base}/subscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), ...snapshot }),
      },
      15000,
    );
    if (!res || !res.ok) return { ok: false, reason: 'subscribe_failed' };
    try {
      localStorage.setItem(PUSH_ENDPOINT_KEY, sub.endpoint);
      localStorage.setItem(PUSH_STATUS_KEY, 'subscribed');
    } catch {
      // ignore
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Unsubscribe in the browser and on the server. Best-effort, never throws. */
export async function unsubscribePush(): Promise<void> {
  try {
    const base = getPushBaseUrl();
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const endpoint = sub ? sub.endpoint : getStoredPushEndpoint();
    if (sub) {
      try {
        await sub.unsubscribe();
      } catch {
        // ignore
      }
    }
    if (base && endpoint) {
      await fetchJson(
        `${base}/unsubscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        },
        10000,
      );
    }
    try {
      localStorage.removeItem(PUSH_ENDPOINT_KEY);
      localStorage.setItem(PUSH_STATUS_KEY, 'dismissed');
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

/**
 * Tell the server the app is open: cancels any pending 5-min reminder +
 * re-syncs the snapshot. Returns true when the server knows this endpoint,
 * false when it does NOT (e.g. the server store was wiped by a proxy
 * republish — the caller should re-register), null on network failure.
 */
export async function pushOpen(snapshot: PushSnapshot): Promise<boolean | null> {
  try {
    const endpoint = getStoredPushEndpoint();
    const base = getPushBaseUrl();
    if (!endpoint || !base) return null;
    const res = await fetch(`${base}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, ...snapshot }),
      keepalive: true,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.known === 'boolean' ? data.known : null;
  } catch {
    return null;
  }
}

/**
 * Called on app open: if the user previously subscribed but the browser
 * lost/rotated the subscription, re-subscribe silently; otherwise just
 * POST /open. No-op when the user never subscribed.
 */
export async function ensurePushSubscription(snapshot: PushSnapshot): Promise<void> {
  try {
    const base = getPushBaseUrl();
    if (!base || !isPushSupported()) return;
    const endpoint = getStoredPushEndpoint();
    if (!endpoint) return;
    if (Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub || sub.endpoint !== endpoint) {
      await subscribePush(snapshot);
      return;
    }
    // Self-healing: if the server lost the subscription (e.g. the proxy
    // was republished and its disk store wiped), re-register the existing
    // browser subscription — no new permission prompt needed.
    const known = await pushOpen(snapshot);
    if (known === false) await subscribePush(snapshot);
  } catch {
    // ignore
  }
}

/** Tell the server the app was closed (sendBeacon survives page unload). */
export function pushClose(snapshot: PushSnapshot): void {
  try {
    const endpoint = getStoredPushEndpoint();
    const base = getPushBaseUrl();
    if (!endpoint || !base) return;
    // NOTE: the Blob MUST be text/plain, not application/json. A beacon
    // with a non-CORS-safelisted content type triggers a preflight, and
    // browsers do not complete preflighted beacons — the POST never lands
    // (proven in the browser test 2026-11-15: only OPTIONS arrived). The
    // server parses the JSON body regardless of content type.
    const blob = new Blob([JSON.stringify({ endpoint, ...snapshot })], { type: 'text/plain' });
    navigator.sendBeacon(`${base}/close`, blob);
  } catch {
    // ignore
  }
}
