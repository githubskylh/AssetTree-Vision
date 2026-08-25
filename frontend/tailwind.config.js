/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0B0F19',
          card: '#131B2E',
          border: '#1E293B',
          cyan: '#06B6D4',
          blue: '#3B82F6',
          purple: '#8B5CF6',
          green: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.2))' },
        }
      }
    },
  },
  plugins: [],
}
