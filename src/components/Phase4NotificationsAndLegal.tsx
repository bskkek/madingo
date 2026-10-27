import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  Download,
  Info,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { SupportedLang } from '../data/curriculum';
import { LEGAL_POLICIES } from '../data/phase4Data';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPreferences,
  NotificationType,
  TodayForYouRecommendation,
} from '../lib/phase4Engine';
import { useI18n } from '../lib/i18n';

export interface InAppNotificationItem {
  id: string;
  type: NotificationType;
  title: Record<SupportedLang, string>;
  body: Record<SupportedLang, string>;
  createdAt: string;
  isRead: boolean;
}

// Production starts with zero fake notifications (Ground Rule R1).
export const SEED_NOTIFICATIONS: InAppNotificationItem[] = [];

export const DEMO_NOTIFICATIONS: InAppNotificationItem[] = [
  {
    id: 'demo-notif-1',
    type: 'streak_reminder',
    createdAt: 'Demo sample',
    isRead: false,
    title: {
      ru: '[ДЕМО] Миша прогрел двигатель: сохраните серию км!',
      en: '[DEMO] Misha warmed up the engine: keep your km streak rolling!',
      ar: '[تجريبي] ميشا قام بتسخين المحرك: حافظ على سلسلة الكيلومترات!',
      fr: '[DÉMO] Misha a chauffé le moteur : gardez votre série de km !',
    },
    body: {
      ru: 'Демонстрационное уведомление о дневной цели.',
      en: 'Sample notification showing how daily streak reminders appear.',
      ar: 'إشعار تجريبي يوضح كيف تظهر تذكيرات السلسلة اليومية.',
      fr: 'Notification de démonstration pour le rappel quotidien.',
    },
  },
];

// ============================================================================
// 1. SMART PERSONALIZATION "TODAY FOR YOU" CARD (ON ROAD MAP)
// ============================================================================

export const SmartPersonalizationCard: React.FC<{
  recommendation: TodayForYouRecommendation;
  onExecuteRecommendation: (rec: TodayForYouRecommendation) => void;
}> = ({ recommendation, onExecuteRecommendation }) => {
  const { lang } = useI18n();
  const [showExplainWhy, setShowExplainWhy] = useState(true);

  return (
    <div
      data-testid="today-for-you-card"
      className="mb-6 rounded-3xl bg-gradient-to-r from-brand-navy via-slate-900 to-brand-navy text-white p-5 sm:p-6 border border-slate-700 shadow-md space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent-orange uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>
            {lang === 'ru'
              ? 'СЕГОДНЯ ДЛЯ ВАС · УМНАЯ ПЕРСОНАЛИЗАЦИЯ'
              : lang === 'ar'
              ? 'مقترح اليوم لك · تخصيص ذكي'
              : lang === 'fr'
              ? 'AUJOURD’HUI POUR VOUS · PERSONNALISATION INTELLIGENTE'
              : 'TODAY FOR YOU · SMART PERSONALIZATION'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowExplainWhy((v) => !v)}
          className="text-[11px] font-mono text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Why recommended? (Score {recommendation.priorityScore}/100)</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-display font-extrabold text-white">
            {recommendation.headline[lang]}
          </h2>
          {showExplainWhy && (
            <p
              data-testid="today-for-you-why"
              className="text-xs text-slate-300 leading-relaxed"
            >
              {recommendation.whyRecommended[lang]}
            </p>
          )}
        </div>

        <button
          type="button"
          data-testid="today-for-you-cta"
          onClick={() => onExecuteRecommendation(recommendation)}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 hover:brightness-105 transition cursor-pointer"
        >
          <span>{recommendation.ctaLabel[lang]}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 2. NOTIFICATION CENTER DRAWER (QUIET HOURS, OPT-IN, DIGEST PREVIEW)
// ============================================================================

export const NotificationsCenterDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotificationItem[];
  onMarkAllRead: () => void;
}> = ({ isOpen, onClose, notifications, onMarkAllRead }) => {
  const { lang } = useI18n();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [showDigestPreview, setShowDigestPreview] = useState(false);

  if (!isOpen) return null;

  const toggleType = (type: NotificationType) => {
    setPrefs((prev) => ({
      ...prev,
      typesEnabled: {
        ...prev.typesEnabled,
        [type]: !prev.typesEnabled[type],
      },
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="notifications-drawer"
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 space-y-6 shadow-2xl border-s border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-accent-orange" />
            <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
              {lang === 'ru' ? 'Центр уведомлений' : 'Notification Center'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs font-bold text-brand-blue dark:text-sky-400 hover:underline cursor-pointer"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 && (
            <div
              data-testid="notifications-empty-state"
              className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500"
            >
              {lang === 'ru'
                ? 'Уведомлений пока нет.'
                : lang === 'ar'
                ? 'لا توجد إشعارات حتى الآن.'
                : lang === 'fr'
                ? 'Aucune notification pour le moment.'
                : 'No notifications yet.'}
            </div>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border space-y-1 ${
                n.isRead
                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  : 'border-brand-blue/50 bg-blue-50/50 dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="uppercase text-accent-orange font-bold">
                  {n.type.replace('_', ' ')}
                </span>
                <span>{n.createdAt}</span>
              </div>
              <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                {n.title[lang]}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {n.body[lang]}
              </p>
            </div>
          ))}
        </div>

        {/* Quiet Hours, Frequency Cap & Per-Type Toggles */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-display font-bold text-slate-900 dark:text-white">
              <Moon className="w-4 h-4 text-brand-blue" />
              <span>Quiet Hours (Suppressed): {prefs.quietHoursStart}:00 – 0{prefs.quietHoursEnd}:00</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Max {prefs.maxDailyNotifications}/day
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span>Browser Web Push Notifications (Explicit Opt-In)</span>
            <button
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, webPushOptIn: !p.webPushOptIn }))}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                prefs.webPushOptIn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {prefs.webPushOptIn ? 'Opted In' : 'Off'}
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-mono uppercase text-slate-500">
              Per-Type Notification Toggles
            </div>
            {(
              [
                'streak_reminder',
                'garage_due',
                'assignment_due',
                'league_result',
                'certificate_issued',
                'teacher_announcement',
              ] as NotificationType[]
            ).map((tp) => (
              <label
                key={tp}
                className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <span>{tp.replace(/_/g, ' ')}</span>
                <input
                  type="checkbox"
                  checked={prefs.typesEnabled[tp]}
                  onChange={() => toggleType(tp)}
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowDigestPreview((v) => !v)}
            className="w-full min-h-[38px] rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{showDigestPreview ? 'Hide Email Digest Preview' : 'Preview Weekly Email Digest'}</span>
          </button>

          {showDigestPreview && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-mono font-bold text-brand-blue">
                Subject: [madingo MADI] Your Weekly Highway Digest
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Hello Driver! You traveled 7 km this week, learned 18 new Russian terms, and entered the Promotion Zone in Campus Street league. Keep your engine humming!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. LEGAL, PRIVACY & GDPR DATA EXPORT MODAL
// ============================================================================

export const LegalAndGdprModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExportGdprJson: () => void;
}> = ({ isOpen, onClose, onExportGdprJson }) => {
  const { lang } = useI18n();
  const [cookieConsent, setCookieConsent] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="legal-gdpr-modal"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
              {lang === 'ru'
                ? 'Правовая информация, Лицензии и Защита данных (GDPR)'
                : 'Legal Policies, Copyright, Voice Consent & GDPR Data Rights'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GDPR Export & Consent Banner */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
              GDPR / 152-ФЗ Student Data Portability
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Download a complete machine-readable JSON archive of your profile, progress, certificates, and Garage SRS records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="gdpr-export-json-btn"
              onClick={onExportGdprJson}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-blue text-white font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export My Data (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => setCookieConsent(!cookieConsent)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{cookieConsent ? 'Analytics Consent: ON' : 'Essential Only'}</span>
            </button>
          </div>
        </div>

        {/* 5 Legal Policy Sections in 4 Languages */}
        <div className="space-y-4">
          {LEGAL_POLICIES.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5"
            >
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                {doc.title[lang]}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {doc.body[lang]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
