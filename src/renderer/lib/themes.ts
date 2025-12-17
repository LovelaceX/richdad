// App Theme Definitions
// Bloomberg is the only theme (simplified in v3.10.0)

export type ThemeId = 'bloomberg'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  colors: {
    bg: string
    panel: string
    border: string
    accent: string
    accentHover: string
    up: string
    down: string
  }
}

export const THEMES: Record<ThemeId, Theme> = {
  bloomberg: {
    id: 'bloomberg',
    name: 'Bloomberg',
    description: 'Classic terminal dark with amber accents',
    colors: {
      bg: '#0A0A0A',
      panel: '#000000',
      border: '#333333',
      accent: '#FFB000',
      accentHover: '#FFD000',
      up: '#4af6c3',
      down: '#ff433d',
    },
  },
}

export const DEFAULT_THEME: ThemeId = 'bloomberg'

/**
 * Apply theme CSS variables to the document root
 * Note: Theme persistence is handled by settingsStore (Zustand persist)
 */
export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME]
  const root = document.documentElement

  // Remove previous theme classes and add current
  const themeClasses = Object.keys(THEMES).map(id => `theme-${id}`)
  document.body.classList.remove(...themeClasses)
  document.body.classList.add(`theme-${theme.id}`)

  root.style.setProperty('--color-terminal-bg', theme.colors.bg)
  root.style.setProperty('--color-terminal-panel', theme.colors.panel)
  root.style.setProperty('--color-terminal-border', theme.colors.border)
  root.style.setProperty('--color-terminal-accent', theme.colors.accent)
  root.style.setProperty('--color-terminal-accent-hover', theme.colors.accentHover)
  root.style.setProperty('--color-terminal-up', theme.colors.up)
  root.style.setProperty('--color-terminal-down', theme.colors.down)
}

/**
 * Get saved theme from Zustand persist storage
 * Falls back to legacy localStorage key for backward compatibility
 */
export function getSavedTheme(): ThemeId {
  // First check Zustand persist storage
  try {
    const zustandStorage = localStorage.getItem('richdad-settings')
    if (zustandStorage) {
      const parsed = JSON.parse(zustandStorage)
      if (parsed?.state?.theme && THEMES[parsed.state.theme as ThemeId]) {
        return parsed.state.theme as ThemeId
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Fallback to legacy key for backward compatibility
  const legacy = localStorage.getItem('richdad_theme') as ThemeId
  if (legacy && THEMES[legacy]) {
    // Migrate: remove legacy key (Zustand will handle persistence)
    localStorage.removeItem('richdad_theme')
    return legacy
  }

  return DEFAULT_THEME
}
