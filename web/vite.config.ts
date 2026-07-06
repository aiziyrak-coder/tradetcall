import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.join(__dirname, ".."), "");
  const apiBase =
    env.VITE_API_BASE ||
    (mode === "production" ? "https://tradeapi.ziyrak.org" : "");

  return {
  plugins: [react()],
  root: path.join(__dirname),
  base: "/",
  define: {
    "import.meta.env.VITE_API_BASE": JSON.stringify(apiBase),
  },
  build: {
    outDir: path.join(__dirname, "../dist-web"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3080", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:3080", ws: true },
    },
  },
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
};
});
