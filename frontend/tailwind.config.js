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
          bg: '#090c12',
          surface: '#111622',
          card: '#161c2b',
          border: '#212a3e',
          cyan: '#00f0ff',
          blue: '#0077fe',
          gold: '#ffb703',
          red: '#ff0055',
          green: '#00f59b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.4)',
        'glow-gold': '0 0 20px rgba(255, 183, 3, 0.4)',
        'glow-red': '0 0 20px rgba(255, 0, 85, 0.4)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
