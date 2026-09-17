import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'Calibri', 'sans-serif'] },
      colors: {
        slate:   { DEFAULT: '#122023', sidebar: '#0f1c1f', mid: '#1a2e33', light: '#2e4e55' },
        aqua:    { DEFAULT: '#9ef3ee', mid: '#5dddd7', dark: '#0f9790', light: '#e0faf8', pale: '#f0fffe' },
        inn:     { gray: '#a2acab', steel: '#6f8695', blue: '#8ba8c8', red: '#ff6666', teal: '#157a6e', violet: '#91a6ff', ocean: '#208aae', sand: '#bab1a0', cream: '#f5f2b8' },
        surface: { DEFAULT: '#ffffff', 50: '#f7f9fa', 100: '#eef2f3' },
        content: { primary: '#0f1c1f', secondary: '#3d5a62', muted: '#7a9ba3' },
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px rgba(15,151,144,0.1)',
        aqua: '0 4px 16px rgba(158,243,238,0.45)',
        slate: '0 4px 12px rgba(18,32,35,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out both',
        'slide-up': 'slideUp 0.35s ease-out both',
        'scale-in': 'scaleIn 0.25s ease-out both',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
export default config
