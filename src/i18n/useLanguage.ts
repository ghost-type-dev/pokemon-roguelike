import { create } from 'zustand'

export type Language = 'en' | 'zh'

const STORAGE_KEY = 'pokemon-roguelike-language'

function loadInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'zh') return stored
  } catch {
    // ignore
  }
  return 'zh'
}

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: loadInitialLanguage(),
  setLanguage: (language) => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // ignore
    }
    set({ language })
  },
  toggleLanguage: () => {
    const next: Language = get().language === 'zh' ? 'en' : 'zh'
    get().setLanguage(next)
  },
}))

/** React hook — subscribes to language so consumer re-renders on change. */
export function useLanguage(): Language {
  return useLanguageStore((s) => s.language)
}

/** Synchronous accessor — for use in non-React utility functions. */
export function getLanguage(): Language {
  return useLanguageStore.getState().language
}
