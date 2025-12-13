/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f4c81',
        secondary: '#7a9e9f',
        accent: '#e85a4f',
        background: '#fdfdfd',
      },
    },
  },
  plugins: [],
};