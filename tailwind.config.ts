import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: 'var(--color-terminal-bg, #0A0A0A)',
          panel: 'var(--color-terminal-panel, #000000)',
          border: 'var(--color-terminal-border, #333333)',
          amber: 'var(--color-terminal-accent, #FFB000)',
          up: 'var(--color-terminal-up, #4af6c3)',
          down: 'var(--color-terminal-down, #ff433d)',
        },
        semantic: {
          up: 'var(--color-terminal-up, #4af6c3)',
          down: 'var(--color-terminal-down, #ff433d)',
          'up-cvd': '#0068ff',
          'down-cvd': '#fb8b1e',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'ticker-scroll': 'ticker 300s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
} satisfies Config
