/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a0e17',
          800: '#111827',
          700: '#1f2937',
        },
      },
    },
  },
  plugins: [],
}