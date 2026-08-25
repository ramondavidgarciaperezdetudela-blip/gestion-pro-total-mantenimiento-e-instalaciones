import React from 'react'
import { aplicarTema } from '@/lib/temas'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from '@/App.jsx'
import '@/index.css'
import { aplicarFuenteGuardada } from '@/lib/tipoDeFuente'

// El tipo de letra elegido se pone ANTES de pintar nada. Si se aplicara
// después, la pantalla saltaría de un tamaño a otro al cargar.
aplicarFuenteGuardada()

// El tema, antes de pintar: si se aplicara después se vería el programa
// cambiar de color delante del usuario.
aplicarTema()

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
)