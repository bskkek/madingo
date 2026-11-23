import test from 'node:test';
import assert from 'node:assert/strict';
import { audioService } from './audio';
import { ALPHABET_AUDIO_COUNT, ALPHABET_AUDIO_FILES } from './alphabetAudio';
import { fetchGenerateContentAudio } from './speech';

/**
 * Baked alphabet audio registry (2026-11-15): the 33 letters + 66
 * example words ship as MP3s and are registered into audioService
 * Stage 1 at import time, so alphabet speakers play with zero
 * network dependency even when the /speak quota is dead.
 */
test('alphabetAudio: 99 slugs map to 66 baked files', () => {
  assert.equal(ALPHABET_AUDIO_COUNT, 99);
  assert.equal(Object.keys(ALPHABET_AUDIO_FILES).length, 99);
  const files = new Set(Object.values(ALPHABET_AUDIO_FILES));
  assert.equal(files.size, 66);
  for (const f of files) {
    assert.match(f, /^alphabet\/audio\/[a-z-]+\.mp3$/);
  }
  // The reported case: letter О + its two example words.
  assert.equal(ALPHABET_AUDIO_FILES['letter-o'], 'alphabet/audio/okno.mp3');
  assert.equal(ALPHABET_AUDIO_FILES['okno'], 'alphabet/audio/okno.mp3');
  assert.equal(ALPHABET_AUDIO_FILES['ostanovka'], 'alphabet/audio/ostanovka.mp3');
  // Every letter slug points at its first example word's file.
  assert.equal(ALPHABET_AUDIO_FILES['letter-a'], 'alphabet/audio/avtobus.mp3');
  assert.equal(ALPHABET_AUDIO_FILES['letter-ya'], 'alphabet/audio/yabloko.mp3');
});

test('audioService: baked alphabet files are registered at import time', () => {
  const diag = audioService.getDiagnostics();
  assert.equal(diag.registeredTeacherFilesCount, 99);
});

function geminiPayload(b64: string, mime = 'audio/L16;rate=24000') {
  return {
    candidates: [
      {
        content: {
          parts: [{ inlineData: { data: b64, mimeType: mime } }],
        },
      },
    ],
  };
}

function mockFetch(
  responses: Array<{ status: number; body: any }>
): { fetchImpl: typeof fetch; calls: Array<{ url: string; body: any }> } {
  const calls: Array<{ url: string; body: any }> = [];
  let i = 0;
  const fetchImpl = (async (url: any, init: any) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    const r = responses[Math.min(i++, responses.length - 1)];
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body,
    } as any;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

/**
 * Stage 2 fallback (2026-11-15): when /speak is dead, audioService
 * tries POST /api/generate-content TTS (second model's quota +
 * server-side disk cache). The request body mirrors the book app's
 * JS-SDK call; the response is the raw Gemini payload.
 */
test('fetchGenerateContentAudio: returns PCM payload on 200', async () => {
  const { fetchImpl, calls } = mockFetch([
    { status: 200, body: geminiPayload('AAAA') },
  ]);
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, 'https://proxy.example');
  assert.ok(res);
  assert.equal(res!.audioBase64, 'AAAA');
  assert.match(res!.mimeType, /L16/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://proxy.example/api/generate-content');
  assert.equal(calls[0].body.model, 'gemini-3.1-flash-tts-preview');
  assert.equal(calls[0].body.config.responseModalities[0], 'AUDIO');
  assert.equal(
    calls[0].body.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
    'Kore'
  );
  assert.match(calls[0].body.contents, /Окно/);
});

test('fetchGenerateContentAudio: 429 then 200 retries once and succeeds', async () => {
  const { fetchImpl, calls } = mockFetch([
    { status: 429, body: { error: 'quota' } },
    { status: 200, body: geminiPayload('BBBB') },
  ]);
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, 'https://proxy.example');
  assert.ok(res);
  assert.equal(res!.audioBase64, 'BBBB');
  assert.equal(calls.length, 2);
});

test('fetchGenerateContentAudio: 429 twice returns null', async () => {
  const { fetchImpl, calls } = mockFetch([
    { status: 429, body: { error: 'quota' } },
    { status: 429, body: { error: 'quota' } },
  ]);
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, 'https://proxy.example');
  assert.equal(res, null);
  assert.equal(calls.length, 2);
});

test('fetchGenerateContentAudio: 200 without inlineData returns null (no retry)', async () => {
  const { fetchImpl, calls } = mockFetch([
    { status: 200, body: { candidates: [{ content: { parts: [{ text: 'hi' }] } }] } },
  ]);
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, 'https://proxy.example');
  assert.equal(res, null);
  assert.equal(calls.length, 1);
});

test('fetchGenerateContentAudio: 400 returns null immediately (no retry)', async () => {
  const { fetchImpl, calls } = mockFetch([
    { status: 400, body: { error: 'Model not allowed.' } },
  ]);
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, 'https://proxy.example');
  assert.equal(res, null);
  assert.equal(calls.length, 1);
});

test('fetchGenerateContentAudio: no proxy base returns null without fetching', async () => {
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    return {} as any;
  }) as typeof fetch;
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, '');
  assert.equal(res, null);
  assert.equal(called, false);
});

test('fetchGenerateContentAudio: network error retries once then null', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    throw new Error('network down');
  }) as typeof fetch;
  const res = await fetchGenerateContentAudio('Окно', fetchImpl, 'https://proxy.example');
  assert.equal(res, null);
  assert.equal(calls, 2);
});
