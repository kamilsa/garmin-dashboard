/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      colors: {
        'apple-bg': {
          light: '#F5F5F7',
          dark: '#000000',
        },
        'apple-card': {
          light: '#FFFFFF',
          dark: '#1C1C1E',
        },
      },
      boxShadow: {
        'apple': '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
