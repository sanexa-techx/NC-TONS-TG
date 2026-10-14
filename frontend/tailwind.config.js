/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#F4F7FB',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E2E8F0',
          cyan: '#2563EB',
          blue: '#1E3A8A',
          gold: '#10B981',
          red: '#DC2626',
          green: '#10B981',
        },
        mint: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#ECFDF5',
        },
        cobalt: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          navy: '#1E3A8A',
          light: '#EFF6FF',
        },
        daylight: '#F4F7FB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 16px rgba(37, 99, 235, 0.25)',
        'glow-gold': '0 0 16px rgba(16, 185, 129, 0.25)',
        'glow-red': '0 0 16px rgba(220, 38, 38, 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
