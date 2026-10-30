import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Split big libraries into their own chunks. These rarely change, so
    // browsers keep them cached between releases instead of re-downloading.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase")) return "firebase-vendor";
          if (id.includes("react-router")) return "router-vendor";
          if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});