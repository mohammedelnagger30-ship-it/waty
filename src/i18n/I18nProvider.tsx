import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import { settingsRepository } from '@/src/storage';
import { Language, TranslationKey, translations, isRTL } from './translations';

interface I18nContextValue {
  language: Language;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLanguage = 'ar' }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const loaded = useRef(false);
  const persistedLanguage = useRef<Language>(initialLanguage);
  const rtl = isRTL(language);

  // Load the saved language once on mount.
  useEffect(() => {
    settingsRepository.getOrCreate()
      .then((settings) => {
        const next = settings.language === 'ar' || settings.language === 'en'
          ? settings.language
          : language;
        persistedLanguage.current = next;
        setLanguageState(next);
      })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, []);

  // Persist user changes (skip the initial mount and no-op loads).
  useEffect(() => {
    if (!loaded.current || persistedLanguage.current === language) return;
    persistedLanguage.current = language;
    settingsRepository.patch({ language }).catch(() => {});
  }, [language]);

  // Apply real direction: document dir/lang on web, I18nManager on native.
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
      }
    } else if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }, [rtl, language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key],
    [language],
  );

  // Stable context value prevents re-rendering every consumer on unrelated updates.
  const value = useMemo(
    () => ({ language, isRTL: rtl, t, setLanguage, toggleLanguage }),
    [language, rtl, t, setLanguage, toggleLanguage],
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
