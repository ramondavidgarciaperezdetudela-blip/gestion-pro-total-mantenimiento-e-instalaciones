import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from '@/App.jsx'
import '@/index.css'
import { aplicarFuenteGuardada } from '@/lib/tipoDeFuente'

// El tipo de letra elegido se pone ANTES de pintar nada. Si se aplicara
// después, la pantalla saltaría de un tamaño a otro al cargar.
aplicarFuenteGuardada()

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
)