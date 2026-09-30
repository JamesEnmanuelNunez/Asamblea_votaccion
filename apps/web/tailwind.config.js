/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: '#f9f9ff',
        'surface-dim': '#d3daea',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f0f3ff',
        'surface-container': '#e7eefe',
        'surface-container-high': '#e2e8f8',
        'surface-container-highest': '#dce2f3',
        'on-surface': '#151c27',
        'on-surface-variant': '#45464c',
        outline: '#76777d',
        'outline-variant': '#c6c6cd',
        primary: '#000000',
        'on-primary': '#ffffff',
        secondary: '#006c49',
        'on-secondary': '#ffffff',
        'secondary-container': '#6cf8bb',
        'on-secondary-container': '#00714d',
        'secondary-deep': '#003d2b',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#7a0008',
        idle: '#9ca3af',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.5)' },
          '60%': { opacity: '1', transform: 'scale(1.12)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        sonar: {
          '0%': { transform: 'scale(.55)', opacity: '.5' },
          '80%': { opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        breathe: {
          '0%, 100%': { opacity: '.45', transform: 'scale(.96)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'draw-bar': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'live-dot': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,108,73,.5)' },
          '70%': { boxShadow: '0 0 0 6px rgba(0,108,73,0)' },
        },
      },
      animation: {
        'rise-in': 'rise-in .45s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .4s cubic-bezier(.22,1,.36,1) both',
        'pop-in': 'pop-in .5s cubic-bezier(.22,1,.36,1) both',
        sonar: 'sonar 2.6s cubic-bezier(.2,.6,.3,1) infinite',
        breathe: 'breathe 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 10s linear infinite',
        'draw-bar': 'draw-bar .8s cubic-bezier(.22,1,.36,1) both',
        'live-dot': 'live-dot 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
