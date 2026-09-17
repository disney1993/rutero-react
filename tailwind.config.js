/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#5A31D8', dark: '#9D3DF2' },
        secondary: { DEFAULT: '#0E7C7B', dark: '#00E5FF' },
        tertiary: { DEFAULT: '#B45309', dark: '#E9FF3D' },
        background: { DEFAULT: '#F6F4EF', dark: '#121214' },
        surface: { DEFAULT: '#ECE8F7', dark: '#15132A' },
        onSurface: { DEFAULT: '#241F33', dark: '#F1EEFF' },
        onSurfaceVariant: { DEFAULT: '#5C5568', dark: '#B6AFD6' },
        surfaceDisabled: { DEFAULT: '#DAD3EC', dark: '#2B2748' },
        border: { DEFAULT: '#D3CBE6', dark: '#3A3560' },
        error: { DEFAULT: '#C0293D', dark: '#FF3B6B' },
      },
    },
  },
  plugins: [],
};
