/**
 * Comprime una imagen (File o Blob) usando Canvas antes de subirla.
 * Reduce dimensiones a maxWidth x maxHeight manteniendo proporción,
 * y aplica calidad JPEG configurable.
 *
 * @param {File|Blob} file
 * @param {object} opts
 * @param {number} opts.maxWidth  - máx ancho en px (por defecto 1280)
 * @param {number} opts.maxHeight - máx alto en px (por defecto 1280)
 * @param {number} opts.quality   - calidad JPEG 0-1 (por defecto 0.75)
 * @returns {Promise<File>}       - Blob/File comprimido
 */
export async function compressImage(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.75 } = {}) {
  // Si no es imagen o ya es muy pequeño (<100 KB), no comprimir
  if (!file.type.startsWith('image/') || file.size < 100 * 1024) return file;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // Salvaguarda: si la imagen nunca dispara onload/onerror (fichero
    // corrupto, bug del navegador...), no dejamos la subida colgada.
    const safetyTimer = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(file);
    }, 15000);
    img.onload = () => {
      clearTimeout(safetyTimer);
      URL.revokeObjectURL(url);

      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Mantener nombre original y marcar tipo como jpeg
          const compressed = new File([blob], file.name?.replace(/\.[^.]+$/, '.jpg') || 'foto.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          // Si la compresión aumentó el tamaño, devolver el original
          resolve(compressed.size < file.size ? compressed : file);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { clearTimeout(safetyTimer); URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Comprime una imagen y la devuelve como Data URL (base64) lista para guardar
 * directamente en una entidad cuando UploadFile no está disponible (p.ej.
 * créditos de integración agotados) o como fallback de red.
 *
 * @param {File|Blob} file
 * @param {number} maxDim   - máxima dimensión en px (por defecto 1280)
 * @param {number} quality  - calidad JPEG 0-1 (por defecto 0.72)
 * @returns {Promise<string>} dataURL (image/jpeg)
 * @remarks Exporta también la función nombrada compressImageToDataURL.
 */
// Límite de tamaño del Data URL de fallback: si se incrusta entero en el
// campo de la entidad (porque UploadFile no está disponible), un Data URL
// grande puede hacer que el guardado del documento falle por payload
// demasiado grande — y ese fallo se ve como "revisa tu conexión" aunque no
// tenga nada que ver con la red. Reintentamos con menos calidad/tamaño
// hasta quedar por debajo del límite.
// Bajado a 90 KB. La foto guardada en local viaja DENTRO de la ficha cada vez
// que se guarda, así que su tamaño es lo que decide si el guardado entra o no.
// Con 90 KB por foto, una orden con 10 fotos ronda 0,9 MB (antes, con 350 KB,
// se iba a 3,5 MB y el servidor la rechazaba). A 1100 px sigue siendo nítida
// de sobra para documentar una reparación e imprimirla en un parte.
const MAX_FALLBACK_DATA_URL_LENGTH = 90 * 1024; // ~90 KB de texto base64

/**
 * Tamaño máximo por foto según cuántas lleve ya la ficha.
 *
 * Un tope fijo no vale: 90 KB por foto está muy bien con 5 fotos (0,45 MB),
 * pero con 30 fotos suma 2,7 MB y el guardado vuelve a fallar. Cuantas más
 * fotos tenga la ficha, más se aprieta cada una, para que el total quepa
 * siempre. Con pocas fotos se conserva la mejor calidad posible.
 *
 * @param {number} fotasYaPresentes
 * @returns {number} límite en caracteres del Data URL
 */
export function limiteFotoSegunCantidad(fotasYaPresentes = 0) {
  // El servidor rechaza CADA campo por separado ("Field 'photos_before[0]'
  // exceeds the maximum allowed size"), no por el total de la ficha. Ese tope
  // por campo no está documentado, así que el programa lo va aprendiendo: si
  // un guardado se rechaza por tamaño, recomprime más pequeño, reintenta y
  // guarda aquí el valor que sí entró, para no volver a tropezar.
  const aprendido = leerLimiteAprendido();
  const base = aprendido || 48 * 1024;
  if (fotasYaPresentes < 12) return base;
  if (fotasYaPresentes < 20) return Math.round(base * 0.75);
  return Math.round(base * 0.6);
}

const LIMITE_KEY = 'gpt_limite_foto_aprendido';

/** Tope por foto que ya se comprobó que el servidor acepta (0 si no se sabe). */
export function leerLimiteAprendido() {
  try {
    const v = parseInt(localStorage.getItem(LIMITE_KEY) || '0', 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch { return 0; }
}

/** Recuerda el tope por foto que el servidor ha aceptado. */
export function guardarLimiteAprendido(limite) {
  try { localStorage.setItem(LIMITE_KEY, String(limite)); } catch { /* ignorar */ }
}

/**
 * Recomprime una foto YA guardada (Data URL) para que quepa en `limite`.
 * Se usa cuando el servidor rechaza el guardado por tamaño: en vez de dar el
 * error y perder el trabajo, la foto se reduce y se reintenta.
 *
 * @param {string} dataUrl
 * @param {number} limite
 * @returns {Promise<string>} Data URL más pequeño (o el original si no es data:)
 */
export function recomprimirDataURL(dataUrl, limite) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }
  if (dataUrl.length <= limite) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    // Si la foto no se puede releer, devolverla tal cual: mejor conservarla
    // que romper el guardado entero.
    img.onerror = () => resolve(dataUrl);
    img.onload = () => resolve(ajustarACabida(img, limite));
    img.src = dataUrl;
  });
}

/**
 * Reduce una imagen ya cargada hasta que su Data URL quepa en `limite`.
 * @param {HTMLImageElement} img
 * @param {number} limite
 * @param {number} [maxDim]
 * @param {number} [quality]
 */
function ajustarACabida(img, limite, maxDim = 1100, quality = 0.72) {
  let dim = maxDim;
  let q = quality;
  let dataUrl;
  // Antes eran 5 intentos y, si al agotarlos la foto seguía pasándose, se
  // devolvía igualmente: el límite no se garantizaba de verdad. Ahora se
  // insiste hasta cumplirlo, con un mínimo para no dejarla ilegible.
  for (let attempt = 0; attempt < 12; attempt++) {
    const scale = Math.min(1, dim / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL('image/jpeg', q);
    if (dataUrl.length <= limite) break;
    if (q <= 0.3 && dim <= 320) break;
    q = Math.max(0.3, q - 0.1);
    dim = Math.max(320, Math.round(dim * 0.8));
  }
  return dataUrl;
}

export const compressImageToDataURL = (file, maxDim = 1100, quality = 0.72, limite = MAX_FALLBACK_DATA_URL_LENGTH) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato no compatible'));
      img.onload = () => resolve(ajustarACabida(img, limite, maxDim, quality));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });