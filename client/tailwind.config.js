/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-neutral charcoal, so the brand blue and the reward gold carry the colour.
        ink: {
          950: '#08090c',
          900: '#0d0f14',
          850: '#111319',
          800: '#161920',
          700: '#1f232c',
          600: '#2a2f3a',
          500: '#3d4351',
          400: '#5b6272',
        },
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#5a8cfb',
          500: '#3566f0',
          600: '#2249d6',
          700: '#1c39ac',
          800: '#1c3388',
          900: '#1c2f6c',
        },
        // Earned viewing time: the one warm colour in the product.
        reel: {
          50: '#fff8e8',
          100: '#feedc4',
          200: '#fcdb8a',
          300: '#f8c453',
          400: '#f2ad2b',
          500: '#e0921a',
          600: '#b87112',
          700: '#8f5512',
          800: '#6b4114',
          900: '#4a2e10',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 1px 2px rgba(0, 0, 0, 0.3)',
        lift: '0 24px 48px -24px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        glow: '0 10px 30px -12px rgba(53, 102, 240, 0.7)',
        'glow-reel': '0 10px 30px -12px rgba(242, 173, 43, 0.6)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'progress-pulse': 'progress-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
