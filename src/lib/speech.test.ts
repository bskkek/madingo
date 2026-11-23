import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWavBytes,
  fetchSpeakAudio,
  speakAudioToDataUrl,
  speakAssistantReply,
  speakWithVoice,
} from './speech';

/** The proxy returns raw PCM s16le 24 kHz mono — the app must wrap it in
 * a 44-byte WAV header before playback. */
test('buildWavBytes: RIFF header fields + total length', () => {
  const pcm = new Uint8Array([0x00, 0x10, 0xff, 0x7f, 0x00, 0x00]);
  const wav = buildWavBytes(pcm, 24000);
  assert.equal(wav.length, 44 + pcm.length);
  const text = (off: number, len: number) =>
    String.fromCharCode(...wav.slice(off, off + len));
  assert.equal(text(0, 4), 'RIFF');
  assert.equal(text(8, 4), 'WAVE');
  assert.equal(text(12, 4), 'fmt ');
  assert.equal(text(36, 4), 'data');
  const view = new DataView(wav.buffer);
  assert.equal(view.getUint32(4, true), 36 + pcm.length); // RIFF size
  assert.equal(view.getUint16(20, true), 1); // PCM format
  assert.equal(view.getUint16(22, true), 1); // mono
  assert.equal(view.getUint32(24, true), 24000); // sample rate
  assert.equal(view.getUint32(28, true), 48000); // byte rate
  assert.equal(view.getUint16(34, true), 16); // bits per sample
  assert.equal(view.getUint32(40, true), pcm.length); // data size
  assert.deepEqual(wav.slice(44), pcm); // PCM bytes untouched
});

test('buildWavBytes: default sample rate is 24000 Hz', () => {
  const wav = buildWavBytes(new Uint8Array(4));
  assert.equal(new DataView(wav.buffer).getUint32(24, true), 24000);
});

function mockFetch(
  responses: Array<{ status: number; body: any }>
): { fetchImpl: typeof fetch; calls: number } {
  let calls = 0;
  const fetchImpl = (async () => {
    const next = responses[Math.min(calls, responses.length - 1)];
    calls++;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
    } as Response;
  }) as typeof fetch;
  return { fetchImpl, calls: 0 };
}

test('fetchSpeakAudio: sends voice "aniss" and returns the audio', async () => {
  let sentBody = '';
  const fetchImpl = (async (_url: any, init: any) => {
    sentBody = init.body;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        audioBase64: 'AAAA',
        mimeType: 'audio/L16;codec=pcm;rate=24000',
      }),
    } as Response;
  }) as typeof fetch;
  const res = await fetchSpeakAudio('Привет', fetchImpl, 'https://proxy.test/speak');
  assert.ok(res);
  assert.equal(res!.audioBase64, 'AAAA');
  assert.match(res!.mimeType, /L16/);
  assert.equal(JSON.parse(sentBody).voice, 'aniss');
});

test('fetchSpeakAudio: retries ONCE on HTTP 502, then succeeds', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    if (calls === 1) {
      return {
        ok: false,
        status: 502,
        json: async () => ({ ok: false, error: { message: 'Gemini TTS returned no audio' } }),
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, audioBase64: 'AAAA', mimeType: 'audio/L16' }),
    } as Response;
  }) as typeof fetch;
  const res = await fetchSpeakAudio('Привет', fetchImpl, 'https://proxy.test/speak');
  assert.ok(res);
  assert.equal(calls, 2);
});

test('fetchSpeakAudio: retries ONCE on OK-but-no-audio, then gives up', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response;
  }) as typeof fetch;
  const res = await fetchSpeakAudio('Привет', fetchImpl, 'https://proxy.test/speak');
  assert.equal(res, null);
  assert.equal(calls, 2);
});

test('fetchSpeakAudio: does NOT retry on 400 — returns null after one call', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return {
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: { message: 'bad request' } }),
    } as Response;
  }) as typeof fetch;
  const res = await fetchSpeakAudio('Привет', fetchImpl, 'https://proxy.test/speak');
  assert.equal(res, null);
  assert.equal(calls, 1);
});

/** TTS failure must be SILENT: no throw, no red banner — just { via: 'none' }.
 * (In the test env there is no window/speechSynthesis and fetch throws,
 * so both TTS paths fail — exactly the phone bug — and the call still
 * resolves quietly.) */
test('speakWithVoice: total TTS failure is silent, resolves { via: "none" }', async () => {
  const failingFetch = (async () => {
    throw new Error('network down');
  }) as typeof fetch;
  // speakWithVoice uses the global fetch; point it at the failing one.
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = failingFetch;
  try {
    const res = await speakWithVoice('Привет, как дела?');
    assert.deepEqual(res, { via: 'none' });
  } finally {
    (globalThis as any).fetch = originalFetch;
  }
});

test('speakAssistantReply: offline/error text is NEVER spoken (no fetch at all)', async () => {
  let calls = 0;
  const countingFetch = (async () => {
    calls++;
    throw new Error('must not be called');
  }) as typeof fetch;
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = countingFetch;
  try {
    const res = await speakAssistantReply('الذكاء الاصطناعي غير متاح الآن', {
      offline: true,
      soundEnabled: true,
      lang: 'ar',
    });
    assert.deepEqual(res, { via: 'none' });
    assert.equal(calls, 0);
  } finally {
    (globalThis as any).fetch = originalFetch;
  }
});

test('speakAssistantReply: sound off means no speech either', async () => {
  const res = await speakAssistantReply('Привет', {
    offline: false,
    soundEnabled: false,
  });
  assert.deepEqual(res, { via: 'none' });
});

test('speakAudioToDataUrl: raw PCM is wrapped in a WAV data URL', () => {
  const pcm = new Uint8Array([0x00, 0x10, 0xff, 0x7f, 0x00, 0x00]);
  const b64 = Buffer.from(pcm).toString('base64');
  const url = speakAudioToDataUrl(b64, 'audio/L16;codec=pcm;rate=24000');
  assert.ok(url && url.startsWith('data:audio/wav;base64,'));
  const wav = Buffer.from(url.split(',')[1], 'base64');
  assert.equal(wav.length, 44 + pcm.length);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.deepEqual(new Uint8Array(wav.subarray(44)), pcm);
});

test('speakAudioToDataUrl: mp3 passes through unchanged', () => {
  const b64 = Buffer.from([0xff, 0xfb, 0x90, 0x00]).toString('base64');
  const url = speakAudioToDataUrl(b64, 'audio/mp3');
  assert.equal(url, `data:audio/mp3;base64,${b64}`);
});

test('speakAudioToDataUrl: empty or invalid input returns null', () => {
  assert.equal(speakAudioToDataUrl('', 'audio/L16'), null);
  assert.equal(speakAudioToDataUrl('!!!', 'audio/mp3'), null);
});
