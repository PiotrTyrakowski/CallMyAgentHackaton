import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0f",
        glow: "#7cffb2",
      },
      animation: {
        "ring-pulse": "ring-pulse 0.7s ease-in-out infinite",
      },
      keyframes: {
        "ring-pulse": {
          "0%, 100%": { transform: "rotate(-12deg) scale(1)" },
          "25%": { transform: "rotate(12deg) scale(1.08)" },
          "75%": { transform: "rotate(-8deg) scale(1.04)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
