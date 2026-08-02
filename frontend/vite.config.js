import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_ prefixed) from the correct .env file
  // for the current mode (development / production / etc.)
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = env.BACKEND_BASE_URL;// || "http://localhost:4000";
  console.log("Base url on the backend", backendUrl);

  // Shared by both `server` (npm run dev) and `preview` (npm run preview) —
  // Vite does NOT reuse server.proxy for the preview server, they're
  // separate config blocks, so this must be defined twice or the built
  // production bundle has no /api proxy when served via `vite preview`.
  // (A bare static server like `serve -s dist` has no proxy support at
  // all — /api/* just falls through to index.html — always use
  // `npm run preview` to test the production build locally instead.)
  const proxy = {
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
  };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },

  };
});
