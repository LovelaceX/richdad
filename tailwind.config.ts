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
          bg: '#0A0A0A',
          panel: '#000000',
          border: '#333333',
          amber: '#FFB000',
        },
        semantic: {
          up: '#4af6c3',
          down: '#ff433d',
          'up-cvd': '#0068ff',
          'down-cvd': '#fb8b1e',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'ticker-scroll': 'ticker 60s linear infinite',
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
