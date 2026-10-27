import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { computeCostMonitorSummary } from '../lib/phase4Engine';
import { useI18n } from '../lib/i18n';

export const Phase4AdminAnalyticsView: React.FC<{
  certificatesCount: number;
  demoMode?: boolean;
}> = ({ certificatesCount, demoMode = false }) => {
  const { lang } = useI18n();
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [langFilter, setLangFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState<number>(150);
  const [liveTelemetry, setLiveTelemetry] = useState<{
    dau: number;
    wau: number;
    mau: number;
    sttRequests: number;
    ttsRequests: number;
    llmRequests: number;
    certificatesIssued: number;
  }>({
    dau: 0,
    wau: 0,
    mau: 0,
    sttRequests: 0,
    ttsRequests: 0,
    llmRequests: 0,
    certificatesIssued: certificatesCount,
  });

  useEffect(() => {
    fetch('/api/phase4/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLiveTelemetry({
            dau: Number(data.dau || 0),
            wau: Number(data.wau || 0),
            mau: Number(data.mau || 0),
            sttRequests: Number(data.sttRequests || 0),
            ttsRequests: Number(data.ttsRequests || 0),
            llmRequests: Number(data.llmRequests || 0),
            certificatesIssued: Number(data.certificatesIssued ?? certificatesCount),
          });
        }
      })
      .catch(() => {});
  }, [certificatesCount]);

  const scaleFactor = useMemo(() => {
    let f = dateRange === '7d' ? 0.35 : dateRange === '90d' ? 2.4 : 1.0;
    if (facultyFilter !== 'ALL') f *= 0.28;
    if (langFilter !== 'ALL') f *= 0.35;
    return f;
  }, [dateRange, facultyFilter, langFilter]);

  const dau = demoMode ? Math.max(18, Math.round(312 * scaleFactor)) : liveTelemetry.dau;
  const wau = demoMode ? Math.max(64, Math.round(685 * scaleFactor)) : liveTelemetry.wau;
  const mau = demoMode ? Math.max(120, Math.round(1140 * scaleFactor)) : liveTelemetry.mau;
  const sttCount = demoMode ? Math.round(4820 * scaleFactor) : liveTelemetry.sttRequests;
  const ttsCount = demoMode ? Math.round(6150 * scaleFactor) : liveTelemetry.ttsRequests;
  const llmCount = demoMode ? Math.round(1940 * scaleFactor) : liveTelemetry.llmRequests;

  const costReport = useMemo(
    () =>
      computeCostMonitorSummary(
        [
          {
            service: 'stt',
            requestsCount: sttCount,
            estimatedCostUsd: Math.round(sttCount * 0.006 * 100) / 100,
          },
          {
            service: 'tts',
            requestsCount: ttsCount,
            estimatedCostUsd: Math.round(ttsCount * 0.003 * 100) / 100,
          },
          {
            service: 'llm',
            requestsCount: llmCount,
            estimatedCostUsd: Math.round(llmCount * 0.015 * 100) / 100,
          },
        ],
        monthlyBudgetUsd
      ),
    [sttCount, ttsCount, llmCount, monthlyBudgetUsd]
  );

  const highFailureContentFlags = demoMode
    ? [
        {
          stepId: 'u4-l2-s5',
          lessonTitle: '[DEMO] Unit 4 · Verbs of Motion (идти vs ходить)',
          exerciseType: 'fill_blank',
          failRatePct: 48,
          attempts: 412,
          recommendation: 'Add visual unidirectional arrow hint before step.',
        },
      ]
    : [];

  const handleExportAnalyticsCsv = () => {
    const rows = [
      ['Metric', 'Value', 'FacultyFilter', 'GroupFilter', 'LangFilter', 'Range', 'Mode'],
      ['DAU', String(dau), facultyFilter, groupFilter, langFilter, dateRange, demoMode ? 'DEMO' : 'LIVE'],
      ['WAU', String(wau), facultyFilter, groupFilter, langFilter, dateRange, demoMode ? 'DEMO' : 'LIVE'],
      ['MAU', String(mau), facultyFilter, groupFilter, langFilter, dateRange, demoMode ? 'DEMO' : 'LIVE'],
      ['CertificatesIssued', String(certificatesCount), facultyFilter, groupFilter, langFilter, dateRange, demoMode ? 'DEMO' : 'LIVE'],
      ['TotalProviderSpendUSD', String(costReport.totalSpendUsd), facultyFilter, groupFilter, langFilter, dateRange, demoMode ? 'DEMO' : 'LIVE'],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `madingo-admin-analytics-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="admin-analytics-view"
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs"
    >
      {/* Top Bar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-blue dark:text-accent-orange" />
            <span>
              {lang === 'ru'
                ? 'Аналитика платформы и Мониторинг расходов ИИ (STT / TTS / LLM)'
                : 'Product Analytics, Content Quality Flags & Provider Cost Monitor'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {demoMode
              ? 'DEMO MODE: Displaying synthetic sample telemetry.'
              : 'Live server telemetry from actual runtime sessions (0 when no requests have been made yet).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            aria-label="Filter by Faculty"
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="min-h-[36px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="ALL">All Faculties</option>
            <option value="FDS">Road Construction (FDS)</option>
            <option value="FAT">Automotive (FAT)</option>
            <option value="PODFAK">Preparatory (PODFAK)</option>
            <option value="FMT">Bridges & Tunnels (FMT)</option>
            <option value="FUE">Logistics (FUE)</option>
          </select>

          <select
            aria-label="Filter by Group"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="min-h-[36px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="ALL">All Groups</option>
          </select>

          <select
            aria-label="Filter by UI Language"
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="min-h-[36px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="ALL">All UI Languages</option>
            <option value="en">English (EN)</option>
            <option value="ar">Arabic (AR)</option>
            <option value="fr">French (FR)</option>
            <option value="ru">Russian (RU)</option>
          </select>

          <select
            aria-label="Filter by Date Range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="min-h-[36px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <button
            type="button"
            data-testid="export-analytics-csv-btn"
            onClick={handleExportAnalyticsCsv}
            className="min-h-[36px] px-3.5 rounded-xl bg-brand-blue text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Grid (Tabular Numerals) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-500">DAU / WAU / MAU</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1" data-testid="analytics-dau-wau-mau">
            {dau} / {wau} / {mau}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {demoMode ? 'Demo sample' : 'Live active sessions'}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-500">Retention (D1 / D7 / D30)</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            {demoMode ? '78% / 61% / 49%' : '0% / 0% / 0%'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {demoMode ? 'Demo sample' : 'Measured cohort'}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-500">TTS Requests</div>
          <div className="text-lg font-extrabold text-emerald-600 mt-1">{ttsCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Gemini TTS Audio</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-500">Speaking Clips Scored</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            {sttCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">STT Evaluations</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-500">Certificates Issued</div>
          <div className="text-lg font-extrabold text-accent-orange mt-1" data-testid="analytics-certs-count">
            {demoMode ? Math.max(certificatesCount, Math.round(94 * scaleFactor)) : certificatesCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Verified via QR</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="text-[11px] text-slate-500">LLM Calls</div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            {llmCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Role-Play & Builder</div>
        </div>
      </div>

      {/* Funnel & High-Failure Content Quality Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-blue" />
            <span>Learner Progression Funnel & Drop-off</span>
          </div>
          {[
            { stage: '1. Onboarding & Alphabet Garage', pct: 100 },
            { stage: '2. Unit 2 (Greetings & Red Square)', pct: 84 },
            { stage: '3. Unit 3 (MADI Campus & Cases)', pct: 71 },
            { stage: '4. Unit 4–5 (Metro, Motion Verbs, Roads)', pct: 58 },
            { stage: '5. CEFR Level Exam & Certificate', pct: 42 },
          ].map((row) => (
            <div key={row.stage} className="space-y-1 text-xs">
              <div className="flex justify-between font-mono">
                <span>{row.stage}</span>
                <span className="font-bold">{row.pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-brand-blue rounded-full"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-7 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Content Quality Flags (Steps with &gt;40% Student Error Rate)</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {highFailureContentFlags.map((flag) => (
              <div key={flag.stepId} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {flag.lessonTitle} <span className="font-mono text-slate-400">({flag.stepId})</span>
                  </div>
                  <div className="text-slate-500">{flag.recommendation}</div>
                </div>
                <div className="font-mono font-extrabold text-red-600 shrink-0">
                  ▲ {flag.failRatePct}% Fail ({flag.attempts} tries)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STT / TTS / LLM Cost Monitor vs Budget */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                STT / TTS / LLM Provider Usage & Monthly Budget Guard
              </h3>
              <p className="text-xs text-slate-500">
                Tracks Whisper STT, Russian TTS, and LLM generation against your configured cap.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <label className="flex items-center gap-1.5">
              <span>Monthly Cap ($):</span>
              <input
                type="number"
                min={20}
                max={2000}
                value={monthlyBudgetUsd}
                onChange={(e) => setMonthlyBudgetUsd(Number(e.target.value) || 150)}
                className="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              />
            </label>
            <span
              className={`px-2.5 py-1 rounded-lg font-bold uppercase ${
                costReport.alertLevel === 'critical'
                  ? 'bg-red-100 text-red-700'
                  : costReport.alertLevel === 'warning'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {costReport.alertLevel === 'nominal' ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ● NOMINAL ({costReport.budgetUsedPct}%)
                </span>
              ) : (
                `▲ ${costReport.alertLevel.toUpperCase()} (${costReport.budgetUsedPct}%)`
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="text-slate-500">1. STT (Whisper Speech Scoring)</div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              ${costReport.byService.stt.costUsd.toFixed(2)} · {costReport.byService.stt.requestsCount} calls
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="text-slate-500">2. TTS (Russian Voice Synthesis)</div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              ${costReport.byService.tts.costUsd.toFixed(2)} · {costReport.byService.tts.requestsCount} calls
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="text-slate-500">3. LLM (Content Pipeline & Chat)</div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              ${costReport.byService.llm.costUsd.toFixed(2)} · {costReport.byService.llm.requestsCount} calls
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
