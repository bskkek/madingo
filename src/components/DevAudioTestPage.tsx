import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  audioService,
  AudioPlaybackOutcome,
  AudioServiceState,
  registerTeacherAudioFile,
  stripStressMarks,
} from '../lib/audio';
import { useI18n } from '../lib/i18n';

interface DevAudioTestPageProps {
  soundEnabled: boolean;
  onBackToApp: () => void;
}

const SAMPLE_ITEMS = [
  { id: 'letter', label: 'Letter (Ж)', text: 'Ж, жук' },
  { id: 'word', label: 'Stressed Word (автомоби́ль)', text: 'автомоби́ль' },
  {
    id: 'sentence',
    label: 'Sentence (Prepositional)',
    text: 'Здра́вствуйте! Я но́вый студе́нт и учу́сь в университе́те МАДИ́.',
  },
  {
    id: 'minimal_pair',
    label: 'Minimal Pair (мыл / мил)',
    text: 'мыл — мил, был — бил',
  },
];

export const DevAudioTestPage: React.FC<DevAudioTestPageProps> = ({
  soundEnabled,
  onBackToApp,
}) => {
  const { lang } = useI18n();
  const [serviceState, setServiceState] = useState<AudioServiceState | null>(null);
  const [lastOutcome, setLastOutcome] = useState<AudioPlaybackOutcome | null>(null);
  const [customText, setCustomText] = useState(
    'Поверни́те напра́во на перекрёстке по́сле светофо́ра.'
  );
  const [diagnostics, setDiagnostics] = useState(() => audioService.getDiagnostics());

  useEffect(() => {
    const unsub = audioService.subscribe((st) => {
      setServiceState(st);
      setDiagnostics(audioService.getDiagnostics());
    });
    return () => unsub();
  }, []);

  const handlePlaySample = async (text: string, slug?: string, rate = 0.9) => {
    const outcome = await audioService.speak(text, slug, soundEnabled, rate);
    setLastOutcome(outcome);
    setDiagnostics(audioService.getDiagnostics());
  };

  const handleTestTeacherStage1 = async () => {
    // Register a real in-memory 440Hz short WAV data URL to prove Stage 1 teacher file priority
    const sampleRate = 8000;
    const numSamples = 2000; // 0.25s tone
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.25;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const wavDataUrl = `data:audio/wav;base64,${btoa(binary)}`;

    registerTeacherAudioFile('test-teacher-clip', wavDataUrl);
    const outcome = await audioService.speak(
      'Учебная запись преподавателя',
      'test-teacher-clip',
      true,
      1.0
    );
    setLastOutcome(outcome);
    setDiagnostics(audioService.getDiagnostics());
  };

  return (
    <div
      data-testid="dev-audio-test-page"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-8"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="audio-test-back-btn"
              onClick={onBackToApp}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Map</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold">
              Unified AudioService Diagnostics (/dev/audio-test)
            </h1>
          </div>
          <button
            type="button"
            data-testid="audio-test-clear-cache-btn"
            onClick={() => {
              audioService.clearCache();
              setDiagnostics(audioService.getDiagnostics());
            }}
            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear TTS Cache ({diagnostics.cacheEntries})</span>
          </button>
        </div>

        {/* Pipeline Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Last Pipeline Stage
            </div>
            <div
              data-testid="audio-test-last-stage"
              className="text-base font-mono font-extrabold text-brand-blue dark:text-accent-orange mt-1"
            >
              {serviceState?.lastStageUsed || 'idle'}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Gemini TTS Cache Hits
            </div>
            <div
              data-testid="audio-test-cache-count"
              className="text-base font-mono font-extrabold mt-1"
            >
              {diagnostics.cacheEntries} cached items
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Registered Teacher Files
            </div>
            <div className="text-base font-mono font-extrabold mt-1">
              {diagnostics.registeredTeacherFilesCount} files
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Russian Browser Voices
            </div>
            <div
              data-testid="audio-test-ru-voices"
              className="text-base font-mono font-extrabold mt-1"
            >
              {diagnostics.russianVoices.length} / {diagnostics.totalBrowserVoices}
            </div>
          </div>
        </div>

        {/* Sample Playback Matrix */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-display font-bold">
            1. Test Pipeline Stages (1: Teacher File → 2: Gemini TTS Cache → 3: Verified ru-RU Web Speech)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-slate-500">{item.label}</div>
                  <div className="text-sm font-extrabold mt-0.5">{item.text}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Clean (no U+0301): {stripStressMarks(item.text)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`audio-test-play-${item.id}`}
                    onClick={() => handlePlaySample(item.text)}
                    className="px-3 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>1x</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`audio-test-slow-${item.id}`}
                    onClick={() => handlePlaySample(item.text, undefined, 0.65)}
                    className="px-2.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                  >
                    0.65x
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="audio-test-stage1-btn"
              onClick={handleTestTeacherStage1}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              Test Stage 1 (Pre-recorded Teacher WAV File)
            </button>
          </div>
        </div>

        {/* Custom Stress-Stripping & TTS Tester */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-display font-bold">
            2. Custom Russian Text & Stress-Mark Stripping Verification
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <button
              type="button"
              data-testid="audio-test-custom-play-btn"
              onClick={() => handlePlaySample(customText)}
              className="px-4 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Synthesize & Play</span>
            </button>
          </div>
          <div className="text-xs font-mono text-slate-500">
            Normalized for TTS (stress stripped): &quot;{stripStressMarks(customText)}&quot;
          </div>
        </div>

        {/* Outcome / Error Inspector */}
        {lastOutcome && (
          <div
            data-testid="audio-test-outcome-box"
            className={`p-5 rounded-2xl border ${
              lastOutcome.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                {lastOutcome.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span>
                  Outcome: {lastOutcome.ok ? 'PASS' : 'ERROR (No Silent Fallback)'} · Stage:{' '}
                  {lastOutcome.stageUsed} · Cache Hit: {String(lastOutcome.cachedHit)}
                </span>
              </div>
              {!lastOutcome.ok && (
                <button
                  type="button"
                  data-testid="audio-test-retry-btn"
                  onClick={() => audioService.retryLast().then((r) => r && setLastOutcome(r))}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
            {lastOutcome.errorMessage && (
              <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                {lastOutcome.errorMessage[lang] || lastOutcome.errorMessage.en}
              </p>
            )}
            {lastOutcome.technicalError && (
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                Console diagnostics: {lastOutcome.technicalError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
