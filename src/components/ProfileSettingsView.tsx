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
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  profile,
  onSaveSettings,
  onLogout,
  onDeleteAccount,
  onOpenLegalModal,
  onOpenContactModal,
  onExportGdprJson,
}) => {
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
            {t('profile.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('profile.subtitle')}
          </p>
        </div>
        <PWAInstallButton />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar & Name Card */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <div>
            <label
              htmlFor="profile-display-name"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              {t('profile.displayNameLabel')}
            </label>
            <input
              id="profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[48px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
        </section>

        {/* UI Language & Daily Goal */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2.5">
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
                        ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2.5">
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
                      ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m} {t('common.minPerDay')}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sound, Notifications & Theme */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
            {t('profile.preferencesSection')}
          </h2>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 dark:bg-slate-800 text-brand-blue dark:text-accent-orange flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {t('profile.soundLabel')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Notification Reminders Toggle */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  {t('profile.notificationsLabel')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {notificationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Light / Dark Theme Switcher */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2.5">
              {t('profile.themeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleToggleTheme('light')}
                className={`min-h-[48px] px-4 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer ${
                  theme === 'light'
                    ? 'border-brand-blue bg-blue-50/70 text-slate-900'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
              GDPR Data Portability & Legal Policies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
              className="min-h-[46px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-display font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
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
              className="min-h-[46px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-display font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
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
              className="min-h-[46px] px-4 rounded-2xl border border-brand-blue text-brand-blue dark:text-sky-400 font-display font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Data (JSON)</span>
            </button>
          )}
        </div>
      </section>

      {/* Account & Privacy Data Actions */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
          {t('profile.dangerZone')} ({profile.email})
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 min-h-[48px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('profile.logoutBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 min-h-[48px] px-4 rounded-2xl border border-error text-error font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
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
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              {t('profile.deleteConfirmTitle')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
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
                className="w-full min-h-[48px] rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
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
