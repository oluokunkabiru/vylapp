import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_ prefixed) from the correct .env file
  // for the current mode (development / production / etc.)
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = env.BACKEND_BASE_URL;
  console.log("Backend url", backendUrl);
  

  // Dev-only: the built app (lib/api.js, lib/socket.js) talks to
  // VITE_BACKEND_URL directly in production — no proxy exists once it's
  // built, so `preview` deliberately has none either, matching real
  // production (nginx/static hosting) exactly. This proxy only exists to
  // make the dev server's relative /api and /socket.io paths work.
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendUrl,
          rewrite: (path) => path.replace(/^\/api/, ""),
          changeOrigin: true,
          secure: false, // allow self-signed / HTTPS targets on Render
        },
        "/socket.io": {
          target: backendUrl,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
