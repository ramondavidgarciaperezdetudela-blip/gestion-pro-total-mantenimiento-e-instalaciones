// Ajustes > Empresa y logotipo: logo de fondo y dibujos técnicos de cada pantalla.
// valores: { logoUrl, mostrarLogoFondo, opacidadLogo, mostrarDibujoFondo, opacidadDibujo }
// onCambiar(nuevosValores): guardar en la entidad Empresa (Base44) o en el almacenamiento elegido.
// onSubirLogo(fichero): debe devolver la URL del logo ya subido (por ejemplo con UploadFile de Base44).
export function AjustesTema({ valores, onCambiar, onSubirLogo }) {
  const poner = (clave, valor) => onCambiar({ ...valores, [clave]: valor });
  const subir = async (ev) => {
    const fichero = ev.target.files && ev.target.files[0];
    if (!fichero || !onSubirLogo) return;
    const url = await onSubirLogo(fichero);
    if (url) poner('logoUrl', url);
  };
  const fila = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, minHeight: 48, borderTop: '1px solid var(--gpt-linea)', padding: '8px 0' };
  return (
    <section aria-labelledby="ajustes-fondo" className="gpt-panel gpt-panel--fuerte" style={{ maxWidth: 720 }}>
      <h2 id="ajustes-fondo" className="gpt-titulo gpt-titulo--2" style={{ marginBottom: 12 }}>Logotipo y fondos</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <div className="gpt-panel--placa" style={{ width: 220, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          {valores.logoUrl ? <img src={valores.logoUrl} alt="Logotipo actual" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span className="gpt-etiqueta">Sin logotipo</span>}
        </div>
        <label className="gpt-boton">
          Cambiar logotipo
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={subir} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        </label>
      </div>
      <label style={fila}>
        <input type="checkbox" checked={valores.mostrarLogoFondo} onChange={(e) => poner('mostrarLogoFondo', e.target.checked)} style={{ width: 20, height: 20 }} />
        Mostrar el logotipo de fondo en la pantalla principal
      </label>
      <label style={fila}>
        <span style={{ width: 260 }}>Intensidad del logotipo</span>
        <input type="range" min="0" max="0.3" step="0.01" value={valores.opacidadLogo} onChange={(e) => poner('opacidadLogo', Number(e.target.value))} disabled={!valores.mostrarLogoFondo} />
        <span className="gpt-num" style={{ fontWeight: 700 }}>{Math.round(valores.opacidadLogo * 100)} %</span>
      </label>
      <label style={fila}>
        <input type="checkbox" checked={valores.mostrarDibujoFondo} onChange={(e) => poner('mostrarDibujoFondo', e.target.checked)} style={{ width: 20, height: 20 }} />
        Mostrar dibujos técnicos de fondo en cada pantalla
      </label>
      <label style={fila}>
        <span style={{ width: 260 }}>Intensidad de los dibujos</span>
        <input type="range" min="0" max="0.4" step="0.01" value={valores.opacidadDibujo} onChange={(e) => poner('opacidadDibujo', Number(e.target.value))} disabled={!valores.mostrarDibujoFondo} />
        <span className="gpt-num" style={{ fontWeight: 700 }}>{Math.round(valores.opacidadDibujo * 100)} %</span>
      </label>
    </section>
  );
}

export default AjustesTema;
