import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vox: {
          orange: "#F59E0B",
          red: "#EF4444",
          purple: "#8B5CF6",
          dark: "#020617",
          slate: "#64748B",
          "dark-card": "#0F172A",
          "dark-border": "#1E293B",
        },
      },
      backgroundImage: {
        "vox-gradient": "linear-gradient(135deg, #F59E0B, #EF4444, #8B5CF6)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { opacity: "0.4" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
