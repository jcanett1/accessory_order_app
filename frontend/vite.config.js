import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ⚠️ CRÍTICO: Cambiar por el nombre EXACTO de tu repositorio
  base: process.env.NODE_ENV === 'production' ? '/accessory_order_app/' : '/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // ✅ OPTIMIZACIÓN: Pre-bundling de dependencias problemáticas
  optimizeDeps: {
    include: [
      'xlsx',
      'jspdf',
      'jspdf-autotable'
    ],
    exclude: []
  },
  
  // ✅ CONFIGURACIÓN: Para manejar CommonJS modules
  define: {
    global: 'globalThis',
  }
})

