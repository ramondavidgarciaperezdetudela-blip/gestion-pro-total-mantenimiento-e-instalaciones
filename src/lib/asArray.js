/**
 * Normaliza la respuesta de cualquier `list()` / `filter()` del SDK de Base44.
 *
 * Desde la versión 0.8.49 del SDK, `list()` y `filter()` con opciones devuelven
 * un objeto página `{ items, has_more, next_cursor }` en vez de un array. Sin
 * esto, cualquier `.map`, `.find`, `.filter` o `.length` sobre el resultado
 * revienta en runtime (`x.find is not a function`) y puede tumbar la página.
 *
 * Uso:  const contacts = asArray(await base44.entities.Contact.list({ limit: 500 }));
 */
export const asArray = (r) => (Array.isArray(r) ? r : (r?.items ?? []));

export default asArray;