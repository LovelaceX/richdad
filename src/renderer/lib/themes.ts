// App Theme Definitions
// Each theme defines colors for the entire application

export type ThemeId = 'bloomberg' | 'midnight' | 'forest' | 'slate' | 'clearview'

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
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep navy blue with cyan accents',
    colors: {
      bg: '#0D1B2A',
      panel: '#1B263B',
      border: '#415A77',
      accent: '#00D9FF',
      accentHover: '#00EEFF',
      up: '#4af6c3',
      down: '#ff433d',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Dark green trading theme',
    colors: {
      bg: '#0A1612',
      panel: '#0F2318',
      border: '#1E3A2A',
      accent: '#4AF6C3',
      accentHover: '#6AFFD6',
      up: '#4AF6C3',
      down: '#FF6B6B',
    },
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    description: 'Clean gray professional theme',
    colors: {
      bg: '#1A1A2E',
      panel: '#16213E',
      border: '#2C3E50',
      accent: '#E94560',
      accentHover: '#FF5A75',
      up: '#00D9A0',
      down: '#FF6B6B',
    },
  },
  clearview: {
    id: 'clearview',
    name: 'Clearview',
    description: 'Clean light theme for daytime trading',
    colors: {
      bg: '#F5F5F5',
      panel: '#FFFFFF',
      border: '#E0E0E0',
      accent: '#D4A500',
      accentHover: '#B8860B',
      up: '#16A34A',
      down: '#DC2626',
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
