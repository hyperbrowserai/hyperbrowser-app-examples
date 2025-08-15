/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'hb-yellow': '#F0FF26',
        'hb-green': '#00FF88',
        'hb-black': '#000000',
        'hb-dark': '#111111',
        'hb-gray': '#333333',
      },
    },
  },
  plugins: [],
}