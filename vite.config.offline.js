import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, transformWithEsbuild } from 'vite'
import pkg from './package.json' with { type: 'json' }

// Build OFFLINE de un solo fichero: todo el JS/CSS/recursos se embeben en
// index.html para que la app funcione abriéndola con doble clic (file://),
// sin servidor. Pensado para entrega "portátil".
export default defineConfig({
  base: './',
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // El código del programa lleva JSX también dentro de archivos .js
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  logLevel: 'error',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: 'jsx-dentro-de-js',
      enforce: 'pre',
      transform(codigo, id) {
        const limpio = id.split('?')[0];
        if (limpio.includes('/src/') && limpio.endsWith('.js')) {
          return transformWithEsbuild(codigo, limpio, { loader: 'jsx', jsx: 'automatic' });
        }
        return null;
      },
    },
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
