import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["@viggle/splat-engine"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "three-mesh-bvh"],
          playcanvas: ["playcanvas"],
          "splat-engine": ["@viggle/splat-engine"],
        },
      },
    },
  },
});
