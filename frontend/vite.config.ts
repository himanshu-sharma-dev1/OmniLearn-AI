import path from "path"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
 
// https://vite.dev.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp('^/api'), ''),
      },
    },
  },
})
