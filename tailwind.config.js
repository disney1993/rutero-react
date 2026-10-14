/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.js', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#5A31D8', dark: '#9D3DF2' },
        secondary: { DEFAULT: '#0E7C7B', dark: '#00E5FF' },
        tertiary: { DEFAULT: '#B45309', dark: '#E9FF3D' },
        background: { DEFAULT: '#F6F4EF', dark: '#0A0912' },
        surface: { DEFAULT: '#ECE8F7', dark: '#211E3C' },
        onSurface: { DEFAULT: '#241F33', dark: '#F1EEFF' },
        onSurfaceVariant: { DEFAULT: '#5C5568', dark: '#B6AFD6' },
        surfaceDisabled: { DEFAULT: '#DAD3EC', dark: '#363159' },
        border: { DEFAULT: '#D3CBE6', dark: '#4A4480' },
        error: { DEFAULT: '#C0293D', dark: '#FF3B6B' },
      },
    },
  },
  plugins: [],
};
