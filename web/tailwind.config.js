import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(dir, "index.html").replace(/\\/g, "/"),
    path.join(dir, "src/**/*.{js,ts,jsx,tsx}").replace(/\\/g, "/"),
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Consolas", "monospace"],
        empire: ["Space Grotesk", "system-ui", "sans-serif"],
        display: ["Syncopate", "sans-serif"],
      },
      colors: {
        empire: {
          gold: "#ffd54a",
          mid: "#ffb800",
          light: "#ffe88b",
        },
      },
    },
  },
  plugins: [],
};
