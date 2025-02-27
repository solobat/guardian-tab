import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEME, THEME_STORAGE_KEY } from '../../const'

interface ThemeState {
  darkMode: boolean
  toggleDarkMode: () => void
  theme: string
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME.DARK : THEME.LIGHT,
      toggleDarkMode: () => set((state) => ({ 
        darkMode: !state.darkMode,
        theme: !state.darkMode ? THEME.DARK : THEME.LIGHT
      })),
    }),
    {
      name: THEME_STORAGE_KEY,
    },
  ),
)

export const useDarkMode = () => {
  const { darkMode, toggleDarkMode, theme } = useThemeStore()
  return { darkMode, toggleDarkMode, theme }
}
