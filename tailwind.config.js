/** @type {import('tailwindcss').Config} */
// Mismos valores que src/theme.js — mantener ambos en sync si cambian.
module.exports = {
  content: ['./index.js', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#007AFF', dark: '#B15CFF' },
        onPrimary: { DEFAULT: '#FFFFFF', dark: '#0A0612' },
        secondary: { DEFAULT: '#248A3D', dark: '#39FF9F' },
        tertiary: { DEFAULT: '#C93400', dark: '#FFC53D' },
        background: { DEFAULT: '#F2F2F7', dark: '#07060D' },
        surface: { DEFAULT: '#FFFFFF', dark: '#13111F' },
        onSurface: { DEFAULT: '#1C1C1E', dark: '#F2EFFF' },
        onSurfaceVariant: { DEFAULT: '#6C6C70', dark: '#A49FC4' },
        surfaceDisabled: { DEFAULT: '#E5E5EA', dark: '#241F3A' },
        fill: { DEFAULT: 'rgba(118,118,128,0.14)', dark: 'rgba(177,92,255,0.08)' },
        border: { DEFAULT: '#D1D1D6', dark: '#2E2850' },
        error: { DEFAULT: '#D70015', dark: '#FF2E88' },
      },
    },
  },
  plugins: [],
};
