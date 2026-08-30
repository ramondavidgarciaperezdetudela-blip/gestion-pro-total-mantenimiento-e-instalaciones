import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' assert { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  define: {
    // Versión real de la app (para el comprobador de actualizaciones).
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
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