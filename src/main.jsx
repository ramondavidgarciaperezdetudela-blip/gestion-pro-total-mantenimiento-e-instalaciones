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

// La IA gratuita se deja puesta sola, sin preguntar y sin descargar nada.
//
// Si hay un Ollama funcionando en este ordenador, se elige él: no tiene tope
// de consultas, no pide cuenta y funciona sin internet. Se hace en segundo
// plano y sin bloquear el arranque — si no hay Ollama, no pasa nada y todo
// sigue como estaba.
// Y se sigue mirando cada minuto por si Ollama aparece después: lo normal es
// abrir el programa y que Ollama tarde en levantarse, o arrancarlo justo
// después de ver el aviso de que no quedan consultas. Antes se miraba UNA vez
// al arrancar y, si no estaba, se quedaba en OpenRouter para siempre.
// La IA gratuita (Ollama local) solo se busca en el programa de escritorio
// instalado (puente window.gptIA) o en la app nativa del móvil. En la versión
// web publicada no existe ningún localhost:11434: esa sonda siempre falla,
// ensucia la consola y, al ser http desde https, el navegador la bloquea como
// contenido mixto. Así que aquí no se lanza.
import('@/lib/proveedorIA')
  .then(async ({ autoConfigurarIALibre, vigilarOllama, hayPuenteEscritorio, esMovil }) => {
    if (!hayPuenteEscritorio() && !esMovil()) return;
    const r = await autoConfigurarIALibre()
    if (!r.puesto) vigilarOllama()
  })
  .catch(() => { /* que esto falle no puede impedir abrir el programa */ })

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <App />
  </ThemeProvider>
)