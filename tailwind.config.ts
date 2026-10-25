import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        moss: {
          950: "#0b100d",
          900: "#121a15",
          800: "#1a261c",
          700: "#243328",
          600: "#334538",
          500: "#4a6350",
          400: "#6b8a6f",
          300: "#93b197",
          200: "#c3d4c5",
          100: "#e4eee5",
        },
        kraft: {
          500: "#c4a574",
          400: "#d4bc90",
          300: "#e4d4b4",
          200: "#f0e6d0",
        },
        rust: {
          600: "#9a3b1a",
          500: "#c45c26",
          400: "#e07a3a",
        },
        ochre: "#d4a017",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        field: "0 12px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
