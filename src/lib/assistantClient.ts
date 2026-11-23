// ============================================================================
// MADINGO — PROXY BASE URL (shared Replit proxy)
// The AI chat client used to live here (chatWithAssistant, /chat). The
// chat was REMOVED from the assistant overlay on 2026-11-10, so the
// whole chat client is gone too. What remains is the one helper the
// rest of the app still needs: the generic proxy base URL (…/extract
// stripped) used by the /speak TTS plumbing (lib/speech.ts) and the
// library client (lib/libraryClient.ts). The proxy URL is baked in at
// build time via VITE_GEMINI_PROXY_URL (which points at /extract).
// ============================================================================

import { getGeminiProxyUrl } from './geminiClient';

/** Generic proxy base (…/extract stripped) for the other endpoints. */
export function getProxyBaseUrl(): string {
  const proxyUrl = getGeminiProxyUrl().trim();
  if (!proxyUrl) return '';
  const base = proxyUrl.replace(/\/$/, '');
  if (base.endsWith('/extract')) return base.slice(0, -'/extract'.length);
  return base;
}
