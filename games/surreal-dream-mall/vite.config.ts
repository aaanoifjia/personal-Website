import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["@viggle/splat-engine"],
  },
  build: {
    target: "es2022",
  },
});
