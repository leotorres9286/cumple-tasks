import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        paper: "#f7f5ef",
        moss: "#3e6b4f",
        leaf: "#7fb069",
        coral: "#e56b6f",
        honey: "#f4b942",
        mist: "#dbe7e4"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 27, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
