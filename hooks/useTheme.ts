"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pi-theme";
const listeners = new Set<() => void>();

let currentMode: ThemeMode = "dark";
let currentSystem: ResolvedTheme = "light";
let initialized = false;

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // ignore storage errors
  }
  return "dark";
}

function readSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved: ResolvedTheme = mode === "system" ? currentSystem : mode;
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  document.documentElement.dataset.themeMode = mode;
}

function notify() {
  listeners.forEach((cb) => cb());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  currentMode = readStoredMode();
  currentSystem = readSystemPreference();
  applyToDocument(currentMode);

  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (mql && typeof mql.addEventListener === "function") {
    mql.addEventListener("change", (e) => {
      currentSystem = e.matches ? "dark" : "light";
      if (currentMode === "system") {
        applyToDocument("system");
        notify();
      }
    });
  }
}

function subscribe(cb: () => void): () => void {
  init();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ThemeMode {
  init();
  return currentMode;
}

function getServerSnapshot(): ThemeMode {
  return "dark";
}

function getResolvedSnapshot(): ResolvedTheme {
  init();
  return currentMode === "system" ? currentSystem : currentMode;
}

function getResolvedServerSnapshot(): ResolvedTheme {
  return "light";
}

type ToggleOrigin = { x: number; y: number };

function persist(mode: ThemeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function applyMode(mode: ThemeMode) {
  currentMode = mode;
  applyToDocument(mode);
  persist(mode);
  notify();
}

function runThemeTransition(origin: ToggleOrigin | undefined, nextResolved: ResolvedTheme) {
  const apply = () => {
    if (nextResolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    notify();
  };

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const supportsVT = typeof document.startViewTransition === "function";

  if (!supportsVT || reduceMotion) {
    apply();
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 450,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // transition cancelled — ignore
    });
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolved = useSyncExternalStore(
    subscribe,
    getResolvedSnapshot,
    getResolvedServerSnapshot,
  );

  const setMode = useCallback((next: ThemeMode, origin?: ToggleOrigin) => {
    if (typeof window === "undefined") return;
    init();
    if (next === mode) return;
    const nextResolved: ResolvedTheme = next === "system" ? currentSystem : next;
    if (next === mode) return;
    runThemeTransition(origin, nextResolved);
    applyMode(next);
  }, [mode]);

  const toggleTheme = useCallback((origin?: ToggleOrigin) => {
    const resolvedNow: ResolvedTheme = mode === "system" ? currentSystem : mode;
    const nextResolved: ResolvedTheme = resolvedNow === "dark" ? "light" : "dark";
    runThemeTransition(origin, nextResolved);
    applyMode(nextResolved);
  }, [mode]);

  return {
    mode,
    resolved,
    theme: resolved,
    isDark: resolved === "dark",
    setMode,
    toggleTheme,
  };
}