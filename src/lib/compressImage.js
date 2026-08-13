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