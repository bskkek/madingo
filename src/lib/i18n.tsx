import React, { createContext, useContext, useEffect, useState } from 'react';
import enMessages from '../../messages/en.json';
import ruMessages from '../../messages/ru.json';
import arMessages from '../../messages/ar.json';
import frMessages from '../../messages/fr.json';
import { SupportedLang } from '../data/curriculum';

const MESSAGES: Record<SupportedLang, Record<string, any>> = {
  en: enMessages,
  ru: ruMessages,
  ar: arMessages,
  fr: frMessages,
};

interface I18nContextValue {
  lang: SupportedLang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: SupportedLang) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  hasChosenInitialLang: boolean;
  confirmInitialLang: (lang: SupportedLang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_STORAGE_KEY = 'madingo_ui_lang';
const LANG_CHOSEN_KEY = 'madingo_lang_chosen';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY) as SupportedLang | null;
      if (saved && ['ru', 'en', 'ar', 'fr'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  const [hasChosenInitialLang, setHasChosenInitialLang] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
      return window.localStorage.getItem(LANG_CHOSEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang, dir]);

  const setLang = (nextLang: SupportedLang) => {
    setLangState(nextLang);
  };

  const confirmInitialLang = (nextLang: SupportedLang) => {
    setLangState(nextLang);
    setHasChosenInitialLang(true);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
      window.localStorage.setItem(LANG_CHOSEN_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const t = (path: string, vars?: Record<string, string | number>): string => {
    const parts = path.split('.');
    let current: any = MESSAGES[lang] || MESSAGES.en;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current !== 'string') {
      // Fallback to English
      let fallback: any = MESSAGES.en;
      for (const part of parts) {
        fallback = fallback?.[part];
      }
      current = typeof fallback === 'string' ? fallback : path;
    }

    if (!vars) return current;
    return Object.entries(vars).reduce((acc, [k, v]) => {
      return acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }, current);
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        dir,
        setLang,
        t,
        hasChosenInitialLang,
        confirmInitialLang,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
