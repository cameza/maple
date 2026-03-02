/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ecb613",
        "background-light": "#f8f8f6",
        "background-dark": "#221d10",
        "card-light": "#FFFFFF",
        "card-dark": "#1C1C1E",
        "neutral-surface": "#f1f0ea",
        accent: "#FFD500",
        "text-main": "#1a1a1a",
        "text-muted": "#6b6b6b",
        // Landing page colors
        paper: '#FDFCF9',
        ink: '#1A1C19',
        sand: '#F4F2E9',
        stone: {
          100: '#F2EFEB',
          200: '#E6E2D8',
          300: '#D5CFC3',
          400: '#A39C93',
          500: '#7A756C',
          600: '#54504A',
        },
        gold: '#C69F60',
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        "ios": "0 4px 20px -5px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
