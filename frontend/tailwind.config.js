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
        control: {
          bg: '#0b0f17',       // deep industrial dark
          panel: '#131b26',    // primary panel background
          subpanel: '#1b2432', // card/subpanel background
          border: '#273447',   // calm neutral border
          borderLight: '#384860',
          text: '#f1f5f9',     // high contrast text
          muted: '#94a3b8',    // secondary muted text
          dim: '#64748b',      // subtle text
        },
        severity: {
          healthy: '#10b981',    // emerald-500
          healthyBg: 'rgba(16, 185, 129, 0.12)',
          watch: '#f59e0b',      // amber-500
          watchBg: 'rgba(245, 158, 11, 0.15)',
          maintenance: '#f97316',// orange-500
          maintenanceBg: 'rgba(249, 115, 22, 0.15)',
          critical: '#ef4444',   // red-500
          criticalBg: 'rgba(239, 68, 68, 0.18)',
          offline: '#6b7280',    // gray-500
          offlineBg: 'rgba(107, 114, 128, 0.12)',
        },
        demo: {
          bannerBg: '#7c3aed',   // visible purple DEMO banner
          bannerText: '#ffffff',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Roboto Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
