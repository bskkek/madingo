import React, { useState } from 'react';
import {
  Volume2,
  Bell,
  Sun,
  Moon,
  LogOut,
  Trash2,
  Check,
  Award,
  ShieldCheck,
  Download,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { SupportedLang } from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { LanguageFlagIcon } from './BrandVisuals';
import { LANGUAGE_OPTIONS } from './FlagPickerModal';
import { PWAInstallButton } from './PWAInstallButton';

export interface UserProfileState {
  id: string;
  email: string;
  displayName: string;
  uiLang: SupportedLang;
  goalMinutes: number;
  avatarId: string;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark';
}

interface ProfileSettingsViewProps {
  profile: UserProfileState;
  onSaveSettings: (updates: Partial<UserProfileState>) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
  onOpenLegalModal?: () => void;
  onOpenContactModal?: () => void;
  onExportGdprJson?: () => void;
  /** 'glass' = dark glass panels with white text, over the MADI photo
      (Profile window). Default keeps the classic white cards. */
  surface?: 'default' | 'glass';
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  profile,
  onSaveSettings,
  onLogout,
  onDeleteAccount,
  onOpenLegalModal,
  onOpenContactModal,
  onExportGdprJson,
  surface = 'default',
}) => {
  const isGlass = surface === 'glass';
  const cardCls = isGlass
    ? 'rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 space-y-5 shadow-xs'
    : 'rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs';
  const headingCls = isGlass
    ? 'text-2xl sm:text-3xl font-display font-extrabold text-white'
    : 'text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white';
  const subCls = isGlass ? 'mt-1 text-sm text-white/60' : 'mt-1 text-sm text-slate-600 dark:text-slate-400';
  const labelCls = isGlass
    ? 'block text-sm font-bold text-white'
    : 'block text-sm font-semibold text-slate-700 dark:text-slate-200';
  const hintCls = isGlass ? 'text-xs text-white/60' : 'text-xs text-slate-500 dark:text-slate-400';
  const rowTitleCls = isGlass
    ? 'font-semibold text-sm text-white'
    : 'font-semibold text-sm text-slate-900 dark:text-white';
  const inputCls = isGlass
    ? 'w-full min-h-[48px] px-4 rounded-2xl border border-white/25 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400'
    : 'w-full min-h-[48px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue';
  const inactiveOptCls = isGlass
    ? 'border-white/25 text-white/70'
    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
  const activeOptCls = isGlass
    ? 'border-orange-400 bg-orange-400/20 text-white'
    : 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800 text-slate-900 dark:text-white';
  const { lang, setLang, t } = useI18n();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarId, setAvatarId] = useState(profile.avatarId || 'misha-cap');
  const [goalMinutes, setGoalMinutes] = useState<number>(profile.goalMinutes || 10);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(profile.soundEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    profile.notificationsEnabled ?? true
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(
    profile.theme === 'dark' ? 'dark' : 'light'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedNotice(false);
    try {
      await onSaveSettings({
        displayName: displayName.trim() || 'Student',
        uiLang: lang,
        goalMinutes,
        avatarId,
        soundEnabled,
        notificationsEnabled,
        theme,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTheme = (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    onSaveSettings({ theme: nextTheme });
  };

  const handleToggleSound = (nextVal: boolean) => {
    setSoundEnabled(nextVal);
    onSaveSettings({ soundEnabled: nextVal });
  };

  const handleToggleNotifications = (nextVal: boolean) => {
    setNotificationsEnabled(nextVal);
    onSaveSettings({ notificationsEnabled: nextVal });
  };

  // 'More settings' label in the UI language (kept local so no other
  // file needs a new i18n key).
  const MORE_SETTINGS_LABEL: Record<SupportedLang, string> = {
    en: 'More settings',
    ru: 'Ещё настройки',
    ar: 'إعدادات إضافية',
    fr: 'Plus de réglages',
  };

  // Glass surface (Profile window): compact one-screen layout — the
  // essentials (UI language, daily goal, notifications + save) in front,
  // everything else behind ONE 'More settings' row. Same state, same
  // handlers, same actions — only the organization is different, so the
  // whole window (identity + stats + settings) fits without scrolling.
  if (isGlass) {
    return (
      <div className="space-y-2.5">
        <form onSubmit={handleSave} className="space-y-2.5">
          {/* Essentials */}
          <section className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-3 space-y-2.5 shadow-xs">
            <div>
              <label className="block text-xs font-bold text-white mb-1">
                {t('profile.uiLanguageLabel')}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {LANGUAGE_OPTIONS.map((opt) => {
                  const active = lang === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setLang(opt.code);
                        onSaveSettings({ uiLang: opt.code });
                      }}
                      className={`min-h-[36px] px-1 rounded-xl border-2 flex items-center justify-center gap-1 text-[11px] font-semibold transition cursor-pointer ${
                        active
                          ? activeOptCls
                          : inactiveOptCls
                      }`}
                    >
                      <LanguageFlagIcon lang={opt.code} className="w-5 h-3.5 shrink-0" />
                      <span className="truncate">{opt.nativeName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1">
                {t('profile.dailyGoalLabel')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[5, 10, 20].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setGoalMinutes(m)}
                    className={`min-h-[36px] rounded-xl border-2 font-display font-bold text-xs transition cursor-pointer ${
                      goalMinutes === m
                        ? activeOptCls
                        : inactiveOptCls
                    }`}
                  >
                    {m} {t('common.minPerDay')}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Reminders Toggle */}
            <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="font-semibold text-sm text-white truncate">
                  {t('profile.notificationsLabel')}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label={t('profile.notificationsLabel')}
                onClick={() => handleToggleNotifications(!notificationsEnabled)}
                className={`min-h-[34px] min-w-[56px] px-2.5 rounded-xl font-semibold text-[11px] transition cursor-pointer shrink-0 ${
                  notificationsEnabled
                    ? 'bg-success text-white'
                    : 'bg-white/15 text-white/70'
                }`}
              >
                {notificationsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full min-h-[40px] rounded-2xl bg-brand-blue text-white font-display font-extrabold text-sm shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {savedNotice ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('common.saved')}</span>
                </>
              ) : (
                <span>{t('profile.saveProfileBtn')}</span>
              )}
            </button>
          </section>

          {/* More settings — one row, expands inline */}
          <button
            type="button"
            data-testid="profile-more-settings"
            aria-expanded={showMore}
            onClick={() => setShowMore(!showMore)}
            className="w-full min-h-[44px] px-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{MORE_SETTINGS_LABEL[lang]}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
            />
          </button>

          {showMore && (
            <section className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-3 space-y-2 shadow-xs">
              {/* Display name */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="profile-display-name-compact"
                  className="w-20 shrink-0 text-xs font-bold text-white"
                >
                  {t('profile.displayNameLabel')}
                </label>
                <input
                  id="profile-display-name-compact"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 min-w-0 min-h-[36px] px-3 rounded-xl border border-white/25 bg-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-sm text-white truncate">
                    {t('profile.soundLabel')}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  aria-label={t('profile.soundLabel')}
                  onClick={() => handleToggleSound(!soundEnabled)}
                  className={`min-h-[34px] min-w-[56px] px-2.5 rounded-xl font-semibold text-[11px] transition cursor-pointer shrink-0 ${
                    soundEnabled
                      ? 'bg-success text-white'
                      : 'bg-white/15 text-white/70'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Light / Dark Theme Switcher */}
              <div className="flex items-center gap-2 border-t border-white/15 pt-2">
                <span className="w-20 shrink-0 text-xs font-bold text-white">
                  {t('profile.themeLabel')}
                </span>
                <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('light')}
                    className={`min-h-[34px] px-2 rounded-xl border-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                      theme === 'light'
                        ? 'border-orange-400 bg-orange-400/20 text-white'
                        : inactiveOptCls
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('profile.themeLight')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('dark')}
                    className={`min-h-[34px] px-2 rounded-xl border-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                      theme === 'dark'
                        ? 'border-accent-orange bg-slate-800 text-white'
                        : inactiveOptCls
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('profile.themeDark')}</span>
                  </button>
                </div>
              </div>

              <PWAInstallButton />

              {/* Legal & GDPR Data Portability */}
              <div className="grid grid-cols-3 gap-1.5 border-t border-white/15 pt-2">
                {onOpenLegalModal && (
                  <button
                    type="button"
                    data-testid="profile-open-legal-btn"
                    onClick={onOpenLegalModal}
                    className="min-h-[36px] px-1 rounded-xl border border-white/25 text-white font-display font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Legal & Privacy</span>
                  </button>
                )}
                {onOpenContactModal && (
                  <button
                    type="button"
                    data-testid="profile-open-contact-btn"
                    onClick={onOpenContactModal}
                    className="min-h-[36px] px-1 rounded-xl border border-white/25 text-white font-display font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-accent-orange shrink-0" />
                    <span className="truncate">Contact MADI</span>
                  </button>
                )}
                {onExportGdprJson && (
                  <button
                    type="button"
                    data-testid="profile-gdpr-export-btn"
                    onClick={onExportGdprJson}
                    className="min-h-[36px] px-1 rounded-xl border border-orange-400 text-orange-300 font-display font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Export Data (JSON)</span>
                  </button>
                )}
              </div>

              {/* Account actions */}
              <div className="border-t border-white/15 pt-2">
                <div className="text-[11px] font-bold text-white truncate mb-1.5">
                  {t('profile.dangerZone')} · {profile.email}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex-1 min-h-[38px] px-2 rounded-xl border border-white/25 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-white/10 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('profile.logoutBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 min-h-[38px] px-2 rounded-xl border border-red-400/60 text-red-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('profile.deleteAccountBtn')}</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </form>

        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-3xl bg-[#0A1628]/95 backdrop-blur-xl border border-white/20 p-6 text-center space-y-4 shadow-2xl">
              <h3 className="text-xl font-display font-bold text-white">
                {t('profile.deleteConfirmTitle')}
              </h3>
              <p className="text-sm text-white/60">
                {t('profile.deleteConfirmBody')}
              </p>
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setShowDeleteModal(false);
                    await onDeleteAccount();
                  }}
                  className="w-full min-h-[48px] rounded-2xl bg-error text-white font-display font-bold text-sm cursor-pointer"
                >
                  {t('profile.deleteConfirmYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full min-h-[48px] rounded-2xl border border-white/25 text-white font-semibold text-sm cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={isGlass ? 'space-y-5' : 'max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-8'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={headingCls}>
            {t('profile.title')}
          </h1>
          <p className={subCls}>
            {t('profile.subtitle')}
          </p>
        </div>
        <PWAInstallButton />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar & Name Card */}
        <section className={cardCls}>
          <div>
            <label
              htmlFor="profile-display-name"
              className={labelCls + ' mb-1.5'}
            >
              {t('profile.displayNameLabel')}
            </label>
            <input
              id="profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
            />
          </div>
        </section>

        {/* UI Language & Daily Goal */}
        <section className={cardCls}>
          <div>
            <label className={labelCls + ' mb-2.5'}>
              {t('profile.uiLanguageLabel')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = lang === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      setLang(opt.code);
                      onSaveSettings({ uiLang: opt.code });
                    }}
                    className={`min-h-[48px] px-3 py-2 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      active
                        ? activeOptCls
                        : inactiveOptCls
                    }`}
                  >
                    <LanguageFlagIcon lang={opt.code} className="w-6 h-4" />
                    <span>{opt.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelCls + ' mb-2.5'}>
              {t('profile.dailyGoalLabel')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 20].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGoalMinutes(m)}
                  className={`min-h-[48px] rounded-2xl border-2 font-display font-bold text-sm transition cursor-pointer ${
                    goalMinutes === m
                      ? activeOptCls
                      : inactiveOptCls
                  }`}
                >
                  {m} {t('common.minPerDay')}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sound, Notifications & Theme */}
        <section className={cardCls}>
          <h2 className={isGlass ? 'text-lg font-display font-bold text-white' : 'text-lg font-display font-bold text-slate-900 dark:text-white'}>
            {t('profile.preferencesSection')}
          </h2>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 dark:bg-slate-800 text-brand-blue dark:text-accent-orange flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className={rowTitleCls}>
                  {t('profile.soundLabel')}
                </div>
                <div className={hintCls}>
                  {t('profile.soundDesc')}
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label={t('profile.soundLabel')}
              onClick={() => handleToggleSound(!soundEnabled)}
              className={`min-h-[44px] min-w-[68px] px-3 rounded-2xl font-semibold text-xs transition cursor-pointer ${
                soundEnabled
                  ? 'bg-success text-white'
                  : isGlass ? 'bg-white/15 text-white/70' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Notification Reminders Toggle */}
          <div className={`flex items-center justify-between gap-4 py-2 ${isGlass ? 'border-t border-white/15' : 'border-t border-slate-100 dark:border-slate-800'}`}>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className={rowTitleCls}>
                  {t('profile.notificationsLabel')}
                </div>
                <div className={hintCls}>
                  {t('profile.notificationsDesc')}
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label={t('profile.notificationsLabel')}
              onClick={() => handleToggleNotifications(!notificationsEnabled)}
              className={`min-h-[44px] min-w-[68px] px-3 rounded-2xl font-semibold text-xs transition cursor-pointer ${
                notificationsEnabled
                  ? 'bg-success text-white'
                  : isGlass ? 'bg-white/15 text-white/70' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {notificationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Light / Dark Theme Switcher */}
          <div className={`pt-2 ${isGlass ? 'border-t border-white/15' : 'border-t border-slate-100 dark:border-slate-800'}`}>
            <label className={labelCls + ' mb-2.5'}>
              {t('profile.themeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleToggleTheme('light')}
                className={`min-h-[48px] px-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                  theme === 'light'
                    ? isGlass ? 'border-orange-400 bg-orange-400/20 text-white' : 'border-brand-blue bg-blue-50/70 text-slate-900'
                    : inactiveOptCls
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{t('profile.themeLight')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleTheme('dark')}
                className={`min-h-[48px] px-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'border-accent-orange bg-slate-800 text-white'
                    : inactiveOptCls
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{t('profile.themeDark')}</span>
              </button>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full min-h-[52px] rounded-2xl bg-brand-blue text-white font-display font-extrabold text-base shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {savedNotice ? (
            <>
              <Check className="w-5 h-5" />
              <span>{t('common.saved')}</span>
            </>
          ) : (
            <span>{t('profile.saveProfileBtn')}</span>
          )}
        </button>
      </form>

      {/* Legal & GDPR Data Portability */}
      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={isGlass ? 'text-base font-display font-bold text-white' : 'text-base font-display font-bold text-slate-900 dark:text-white'}>
              GDPR Data Portability & Legal Policies
            </h2>
            <p className={hintCls}>
              Access privacy policies, copyright disclosures, or export your personal learning data in JSON.
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {onOpenLegalModal && (
            <button
              type="button"
              data-testid="profile-open-legal-btn"
              onClick={onOpenLegalModal}
              className={`min-h-[46px] px-4 rounded-2xl ${isGlass ? 'border border-white/25 text-white font-display font-bold text-xs' : 'border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-display font-bold text-xs'} flex items-center justify-center gap-2 cursor-pointer}`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Legal & Privacy</span>
            </button>
          )}
          {onOpenContactModal && (
            <button
              type="button"
              data-testid="profile-open-contact-btn"
              onClick={onOpenContactModal}
              className={`min-h-[46px] px-4 rounded-2xl ${isGlass ? 'border border-white/25 text-white font-display font-bold text-xs' : 'border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-display font-bold text-xs'} flex items-center justify-center gap-2 cursor-pointer}`}
            >
              <Mail className="w-4 h-4 text-accent-orange" />
              <span>Contact MADI</span>
            </button>
          )}
          {onExportGdprJson && (
            <button
              type="button"
              data-testid="profile-gdpr-export-btn"
              onClick={onExportGdprJson}
              className={`min-h-[46px] px-4 rounded-2xl ${isGlass ? 'border border-orange-400 text-orange-300 font-display font-bold text-xs' : 'border border-brand-blue text-brand-blue dark:text-sky-400 font-display font-bold text-xs'} flex items-center justify-center gap-2 cursor-pointer}`}
            >
              <Download className="w-4 h-4" />
              <span>Export Data (JSON)</span>
            </button>
          )}
        </div>
      </section>

      {/* Account & Privacy Data Actions */}
      <section className={cardCls}>
        <h2 className={isGlass ? 'text-base font-display font-bold text-white' : 'text-base font-display font-bold text-slate-900 dark:text-white'}>
          {t('profile.dangerZone')} ({profile.email})
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onLogout}
            className={`flex-1 min-h-[48px] px-4 rounded-2xl ${isGlass ? 'border border-white/25 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition cursor-pointer' : 'border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer'}`}
          >
            <LogOut className="w-4 h-4" />
            <span>{t('profile.logoutBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className={`flex-1 min-h-[48px] px-4 rounded-2xl ${isGlass ? 'border border-red-400/60 text-red-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 transition cursor-pointer' : 'border border-error text-error font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer'}`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('profile.deleteAccountBtn')}</span>
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className={isGlass ? 'w-full max-w-sm rounded-3xl bg-[#0A1628]/95 backdrop-blur-xl border border-white/20 p-6 text-center space-y-4 shadow-2xl' : 'w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl'}>
            <h3 className={isGlass ? 'text-xl font-display font-bold text-white' : 'text-xl font-display font-bold text-slate-900 dark:text-white'}>
              {t('profile.deleteConfirmTitle')}
            </h3>
            <p className={isGlass ? 'text-sm text-white/60' : 'text-sm text-slate-600 dark:text-slate-400'}>
              {t('profile.deleteConfirmBody')}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteModal(false);
                  await onDeleteAccount();
                }}
                className="w-full min-h-[48px] rounded-2xl bg-error text-white font-display font-bold text-sm cursor-pointer"
              >
                {t('profile.deleteConfirmYes')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`w-full min-h-[48px] rounded-2xl ${isGlass ? 'border border-white/25 text-white font-semibold text-sm cursor-pointer' : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer'}`}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
