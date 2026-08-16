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
const MAX_FALLBACK_DATA_URL_LENGTH = 350 * 1024; // ~350 KB de texto base64

export const compressImageToDataURL = (file, maxDim = 1280, quality = 0.72) =>
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
        for (let attempt = 0; attempt < 5; attempt++) {
          const scale = Math.min(1, dim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', q);
          if (dataUrl.length <= MAX_FALLBACK_DATA_URL_LENGTH) break;
          q = Math.max(0.35, q - 0.15);
          dim = Math.round(dim * 0.75);
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });