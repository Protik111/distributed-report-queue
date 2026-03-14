import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT) || 5004,
    host: true, // Allow external access in Docker
    strictPort: false,
  },
  envPrefix: "VITE_", // Use VITE_ prefix for environment variables
});
