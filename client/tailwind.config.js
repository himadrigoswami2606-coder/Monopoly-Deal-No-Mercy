/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'monopoly-bg': '#1a1f2e',
        'monopoly-surface': '#252b3d',
        'monopoly-accent': '#f5a623',
        'prop-brown': '#8B4513',
        'prop-lightBlue': '#87CEEB',
        'prop-pink': '#FF69B4',
        'prop-orange': '#FF8C00',
        'prop-red': '#DC143C',
        'prop-yellow': '#FFD700',
        'prop-green': '#228B22',
        'prop-darkBlue': '#00008B',
        'prop-railroad': '#4A4A4A',
        'prop-utility': '#9370DB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Oswald', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
