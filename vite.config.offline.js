import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Build OFFLINE de un solo fichero: todo el JS/CSS/recursos se embeben en
// index.html para que la app funcione abriéndola con doble clic (file://),
// sin servidor. Pensado para entrega "portátil".
export default defineConfig({
  base: './',
  logLevel: 'error',
  plugins: [
    base44({ legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true' }),
    react(),
  ],
  build: {
    outDir: 'dist-offline',
    assetsInlineLimit: 100000000, // inlinar todos los recursos como data URI
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: {
      output: { inlineDynamicImports: true, manualChunks: undefined },
    },
  },
});
