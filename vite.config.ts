import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon.svg"],
      manifest: {
        name: "Seb's Kitchen",
        short_name: "Kitchen",
        description:
          "Ice cream, bread and ramen noodle calculators and a cookbook finder that work offline.",
        start_url: "/food/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // The music tools embed pdf.js and are never used on the phone; keep
        // them out of the precache and let the network serve them.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        globIgnores: ["music/**", "404.html"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/music\//],
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
