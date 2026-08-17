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
  if (fotasYaPresentes < 6) return 120 * 1024;  // hasta 6 fotos: ~0,7 MB total
  if (fotasYaPresentes < 12) return 90 * 1024;  // hasta 12 fotos: ~1,1 MB
  if (fotasYaPresentes < 20) return 60 * 1024;  // hasta 20 fotos: ~1,2 MB
  return 40 * 1024;                             // 30 fotos: ~1,2 MB
}

export const compressImageToDataURL = (file, maxDim = 1100, quality = 0.72, limite = MAX_FALLBACK_DATA_URL_LENGTH) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato no compatible'));
      img.onload = () => {
        let dim = maxDim;
        let q = quality;
        let dataUrl;
        // Antes eran 5 intentos y, si al agotarlos la foto seguía pasándose,
        // se devolvía igualmente: es decir, el límite no se garantizaba y una
        // foto enorme podía tumbar el guardado de toda la ficha. Ahora se
        // insiste hasta cumplirlo (bajando resolución y calidad), con un
        // mínimo razonable para no acabar con una foto ilegible.
        for (let attempt = 0; attempt < 10; attempt++) {
          const scale = Math.min(1, dim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', q);
          if (dataUrl.length <= limite) break;
          // Si ya estamos en el mínimo de calidad y tamaño, no seguir girando.
          if (q <= 0.35 && dim <= 400) break;
          q = Math.max(0.35, q - 0.1);
          dim = Math.max(400, Math.round(dim * 0.8));
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });