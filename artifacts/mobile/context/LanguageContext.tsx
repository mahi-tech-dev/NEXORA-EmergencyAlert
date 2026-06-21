import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { type Locale, type Strings, translations } from "@/lib/i18n";

const LANG_KEY = "nexora_locale_v1";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Strings;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((raw) => {
      if (raw === "en" || raw === "hi" || raw === "mr") {
        setLocaleState(raw);
      }
    });
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(LANG_KEY, l);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
