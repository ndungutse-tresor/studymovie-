/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070a12',
          900: '#0b101c',
          800: '#111827',
          700: '#1b2436',
          600: '#26314a',
          500: '#3a4763',
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
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(7, 10, 18, 0.06), 0 12px 32px -12px rgba(7, 10, 18, 0.18)',
        lift: '0 24px 48px -24px rgba(7, 10, 18, 0.45)',
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
