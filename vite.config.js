import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, transformWithEsbuild } from 'vite'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // El código del programa lleva JSX también dentro de archivos .js
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  logLevel: 'error', // Suppress warnings, only show errors
  define: {
    // Versión real de la app (para el comprobador de actualizaciones).
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
    // La versión, dentro del index.html. Se usa para registrar el service
    // worker como /sw.js?v=<versión>, que es lo que hace que su caché cambie
    // de nombre en cada versión y se borre la anterior. Sin esto convivían
    // ficheros de dos versiones y el programa arrancaba en blanco.
    {
      name: 'version-en-el-html',
      transformIndexHtml(html) {
        return html.replace(/__VERSION_APP__/g, pkg.version);
      },
    },
  ]
});