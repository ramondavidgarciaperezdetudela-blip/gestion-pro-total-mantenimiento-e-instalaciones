// Preset de Tailwind con los colores y la fuente del tema "Carril DIN".
// Uso en tailwind.config.js:
//   presets: [require('./tailwind.gpt.cjs')],
// Clases resultantes: bg-gpt-tinta, text-gpt-azul, border-gpt-grafito, font-gpt...
module.exports = {
  theme: {
    extend: {
      colors: {
        gpt: {
          armario: '#CBD0CC',
          blanco: '#F4F4F4',
          tinta: '#23282B',
          grafito: '#474A50',
          acero: '#8E9591',
          linea: '#A9AFAB',
          suave: '#E4E7E5',
          azul: '#1E4C8A',
          verde: '#237F52',
          amarillo: '#F9A800'
        }
      },
      fontFamily: {
        gpt: ['Archivo', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        gpt: '0px'
      }
    }
  }
};
