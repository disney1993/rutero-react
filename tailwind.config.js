/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.js', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F46E5', dark: '#818CF8' },
        secondary: { DEFAULT: '#059669', dark: '#34D399' },
        tertiary: { DEFAULT: '#F59E0B', dark: '#FBBF24' },
        background: { DEFAULT: '#FFFFFF', dark: '#141218' },
        surface: { DEFAULT: '#FFFFFF', dark: '#141218' },
        onSurface: { DEFAULT: '#1C1B1F', dark: '#E6E1E5' },
        onSurfaceVariant: { DEFAULT: '#49454F', dark: '#CAC4D0' },
        surfaceDisabled: { DEFAULT: '#E7E0EC', dark: '#49454F' },
        border: { DEFAULT: '#CAC4D0', dark: '#49454F' },
        error: { DEFAULT: '#B3261E', dark: '#F2B8B5' },
      },
    },
  },
  plugins: [],
};
