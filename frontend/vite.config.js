import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_ prefixed) from the correct .env file
  // for the current mode (development / production / etc.)
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = env.BACKEND_BASE_URL;// || "http://localhost:4000";
  console.log("Base url on the backend", backendUrl);
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
