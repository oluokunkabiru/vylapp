/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        violet: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        teal: {
          50:  "#f0fdf9",
          100: "#ccfbee",
          200: "#99f6dd",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#1D9E75",
          600: "#0f766e",
          700: "#0d5d56",
        },
        coral: {
          50:  "#fff1f1",
          100: "#ffe4e4",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#FF6B6B",
          600: "#dc2626",
        },
        amber: {
          400: "#fbbf24",
          500: "#FFB830",
          600: "#d97706",
        },
        void: {
          50:  "#F8F7FF",
          100: "#EEEDF8",
          200: "#D5D3E8",
          900: "#13121F",
          950: "#08070F",
        },
      },
      fontFamily: {
        sora:  ["Sora", "system-ui", "sans-serif"],
        dm:    ["DM Sans", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
