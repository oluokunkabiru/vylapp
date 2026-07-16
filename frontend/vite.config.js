import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL,
        rewrite: (path) => path.replace(/^\/api/, ""),
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.BACKEND_URL,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
