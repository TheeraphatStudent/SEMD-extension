/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFF9E6',
        gold: {
          DEFAULT: '#F5D76E',
          dark: '#C4A84B',
        },
        safe: {
          DEFAULT: '#4CAF50',
          dark: '#388E3C',
          bg: '#E8F5E9',
        },
        danger: {
          DEFAULT: '#F44336',
          dark: '#D32F2F',
          bg: '#FFEBEE',
        },
      },
      fontFamily: {
        thai: ['Noto Sans Thai', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
