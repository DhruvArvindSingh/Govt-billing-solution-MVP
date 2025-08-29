import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import commonjs from "vite-plugin-commonjs";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    strictPort: false,
  },
  plugins: [
    react(),
    legacy(),
    commonjs(),
    VitePWA({
      // auto-register the SW and check for updates periodically
      registerType: "autoUpdate",
      injectRegister: "auto",
      // use the manifest.json from public/ to avoid duplication
      manifest: false,
      // precache and cache runtime assets for offline
      includeAssets: [
        "favicon.png",
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "icons/*",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"]
      },
      // disable SW in dev to avoid conflicts with commonjs plugin; PWA works in prod build
      devOptions: {
        enabled: false,
      },
    }),
  ],
  // Test configuration is handled by vitest.config.ts or package.json
});
