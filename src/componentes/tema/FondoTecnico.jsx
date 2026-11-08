import { FONDOS, useTema } from './TemaContexto.jsx';

// Dibujo técnico o logotipo detrás del contenido de una pantalla.
// El contenedor padre debe llevar la clase "gpt-con-fondo".
//
//   <div className="gpt-app gpt-papel gpt-con-fondo">
//     <FondoTecnico tipo="equipo" estilo={{ right: 60, top: 150, height: 920 }} />
//     ...
//   </div>
//
// tipo="logo" pinta el logotipo de la empresa (pantalla principal).
export function FondoTecnico({ tipo, estilo }) {
  const tema = useTema();
  let src;
  let opacidad;
  if (tipo === 'logo') {
    if (!tema.mostrarLogoFondo || !tema.logoUrl) return null;
    src = tema.logoUrl;
    opacidad = tema.opacidadLogo;
  } else {
    if (!tema.mostrarDibujoFondo) return null;
    src = tema.fondosPersonalizados[tipo] || FONDOS[tipo];
    opacidad = tema.opacidadDibujo;
  }
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="gpt-fondo"
      style={{ right: 40, bottom: 30, width: 'min(70%, 1000px)', height: 'auto', opacity: opacidad, ...estilo }}
    />
  );
}

export default FondoTecnico;
