"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type Locale = "zh-CN" | "en-US" | "ja-JP";

export const LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: "zh-CN", label: "Chinese (Simplified)", native: "简体中文" },
  { id: "en-US", label: "English",             native: "English" },
  { id: "ja-JP", label: "Japanese",            native: "日本語" },
];

export type Dictionary = Record<string, string>;

type Dict = {
  [K in Locale]: Dictionary;
};

const STORAGE_KEY = "pi-locale";
const listeners = new Set<() => void>();
let currentLocale: Locale = "zh-CN";
let initialized = false;

function readStored(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "zh-CN" || raw === "en-US" || raw === "ja-JP") return raw;
  } catch {
    // ignore
  }
  return "zh-CN";
}

function persist(value: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((cb) => cb());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  currentLocale = readStored();
  if (typeof document !== "undefined") {
    document.documentElement.lang = currentLocale;
  }
}

function subscribe(cb: () => void): () => void {
  init();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): Locale { init(); return currentLocale; }
function getServerSnapshot(): Locale { return "zh-CN"; }

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, fallback?: string | { fallback?: string; vars?: Record<string, string | number> }, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocaleStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

export function translate(locale: Locale, dict: Dict, key: string, vars?: Record<string, string | number>): string {
  const raw = dict[locale]?.[key] ?? dict["zh-CN"][key] ?? key;
  return vars ? interpolate(raw, vars) : raw;
}

export function LocaleProvider({ dict, children }: { dict: Dict; children: ReactNode }) {
  const locale = useLocaleStore();

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (currentLocale === next) return;
    currentLocale = next;
    persist(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
    notify();
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key, fallback, vars) => {
      const fallbackText = typeof fallback === "string" ? fallback : fallback?.fallback;
      const effectiveVars = (typeof fallback === "object" ? fallback?.vars : vars) ?? {};
      const tryKey = (k: string): string | undefined => {
        const raw = dict[locale]?.[k] ?? dict["zh-CN"]?.[k];
        if (raw) return interpolate(raw, effectiveVars);
        return undefined;
      };
      const value = tryKey(key);
      if (value !== undefined) return value;
      return fallbackText ?? key;
    },
  }), [locale, dict, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return ctx;
}

export function useT() {
  return useLocale().t;
}