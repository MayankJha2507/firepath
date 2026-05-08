import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Used directly in JSX classNames (JIT resolves fine there)
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          500: "#F97316",
          600: "#ea6c0a",
        },
        surface: "#F8FAFC",
        ink:     "#0F172A",
        muted:   "#64748B",
        dim:     "#94A3B8",
        chart: {
          equity: "#3B82F6",
          debt:   "#8B5CF6",
          gold:   "#F59E0B",
          cash:   "#10B981",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
export default config;
