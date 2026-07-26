/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050d1a',
          900: '#0a1628',
          800: '#0f2040',
          700: '#163055',
          600: '#1e4080',
          500: '#2653a3',
          400: '#3b6dc4',
          300: '#6490d6',
          200: '#a8c0ea',
          100: '#dce8f8',
          50:  '#f0f5fc',
        },
        teal: {
          700: '#0f766e',
          600: '#0d9488',
          500: '#14b8a6',
          400: '#2dd4bf',
          100: '#ccfbf1',
          50:  '#f0fdfa',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'nav': '0 1px 0 0 rgb(0 0 0 / 0.06), 0 2px 8px 0 rgb(0 0 0 / 0.04)',
        'input': '0 0 0 3px rgb(30 64 128 / 0.1)',
      },
      borderRadius: {
        'xs': '4px',
        'DEFAULT': '8px',
      },
      animation: {
        'shimmer': 'shimmer 1.6s infinite linear',
        'live-pulse': 'live-pulse 2s ease infinite',
        'toast-in': 'toast-in 0.2s ease',
        'score-flash': 'score-update 1.5s ease',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'score-update': {
          '0%': { background: '#f0f5fc' },
          '30%': { background: '#ccfbf1' },
          '100%': { background: 'transparent' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
