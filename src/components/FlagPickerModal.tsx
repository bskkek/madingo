import React from 'react';
import { Check } from 'lucide-react';
import { SupportedLang } from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { LanguageFlagIcon, MadingoWordmark, MishaMascot } from './BrandVisuals';

export const LANGUAGE_OPTIONS: { code: SupportedLang; nativeName: string; subLabel: string }[] = [
  { code: 'ru', nativeName: 'Русский', subLabel: 'Russian' },
  { code: 'en', nativeName: 'English', subLabel: 'English' },
  { code: 'ar', nativeName: 'العربية', subLabel: 'Arabic (RTL)' },
  { code: 'fr', nativeName: 'Français', subLabel: 'French' },
];

interface FlagPickerModalProps {
  isOpen: boolean;
  onSelectAndClose: (lang: SupportedLang) => void;
}

export const FlagPickerModal: React.FC<FlagPickerModalProps> = ({
  isOpen,
  onSelectAndClose,
}) => {
  const { lang, setLang, t } = useI18n();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/85 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-picker-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <MadingoWordmark size="md" />
          <img
            src="/brand/madi-logo.svg"
            alt="MADI University Logo"
            className="h-9 w-auto rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
          <MishaMascot expression="happy" size={88} />
          <div>
            <h2
              id="flag-picker-title"
              className="text-2xl font-display font-bold text-slate-900 dark:text-white"
            >
              {t('flagPicker.welcomeTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('flagPicker.welcomeSubtitle')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = lang === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLang(opt.code);
                  onSelectAndClose(opt.code);
                }}
                className={`min-h-[64px] p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                  isSelected
                    ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 hover:border-brand-blue/60 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LanguageFlagIcon lang={opt.code} className="w-10 h-7" />
                  <div className="text-start">
                    <div className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">
                      {opt.nativeName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{opt.subLabel}</div>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-brand-blue dark:text-accent-orange shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onSelectAndClose(lang)}
          className="mt-6 w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-bold text-base shadow-md hover:opacity-95 transition cursor-pointer"
        >
          {t('flagPicker.confirmButton')}
        </button>
      </div>
    </div>
  );
};
