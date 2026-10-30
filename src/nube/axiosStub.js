// La app original consultaba los ajustes públicos de Base44. Aquí no hay nada que consultar.
export function createAxiosClient() {
  return { get: async () => { throw new Error('Sin servicio externo.'); } };
}
