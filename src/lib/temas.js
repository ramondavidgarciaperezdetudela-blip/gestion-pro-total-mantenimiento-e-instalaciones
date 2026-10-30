/**
 * temas.js — El aspecto del programa.
 *
 * Todo el programa está pintado en azul: 267 sitios con el fondo azul claro,
 * 232 con la letra azul, 129 con botones azules… Cambiar eso a mano sería
 * tocar más de mil sitios y olvidarse de la mitad.
 *
 * Así que se hace al revés: se deja el código como está y se REDEFINE lo que
 * significa "azul" según el tema elegido. Una hoja de estilos generada al
 * vuelo cambia esos colores, y con ella cambia el programa entero de golpe:
 * botones, cabeceras, avisos, bordes y degradados.
 *
 * Hay un tema pensado para trabajar al sol —"Obra"— con mucho contraste y
 * letra oscura sobre fondo claro. En una cubierta a mediodía, con el móvil en
 * la mano, la diferencia entre ver la pantalla y no verla.
 */

const CLAVE = 'gpt_tema';

/**
 * Cada tema define la gama del color principal, del 50 (casi blanco) al 900
 * (casi negro), que es como la usa el programa.
 */
export const TEMAS = [
  {
    id: 'azul',
    nombre: 'Azul clásico',
    simbolo: '🔧',
    descripcion: 'El de siempre. Sobrio y serio.',
    gama: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
    acento: '#0ea5e9',
    redondeo: null,
  },
  {
    id: 'frio',
    nombre: 'Frío industrial',
    simbolo: '❄️',
    descripcion: 'Azul hielo y turquesa. Va con el oficio.',
    gama: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
    acento: '#38bdf8',
    redondeo: null,
  },
  {
    id: 'obra',
    nombre: 'Obra (para el sol)',
    simbolo: '🦺',
    descripcion: 'Naranja y mucho contraste. Se ve al sol en la cubierta.',
    gama: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
    acento: '#f59e0b',
    redondeo: '0.375rem',
  },
  {
    id: 'campo',
    nombre: 'Verde campo',
    simbolo: '🌿',
    descripcion: 'Verde tranquilo, descansa la vista.',
    gama: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
    acento: '#10b981',
    redondeo: null,
  },
  {
    id: 'taller',
    nombre: 'Taller',
    simbolo: '⚙️',
    descripcion: 'Grises y acero. Discreto, sin colorines.',
    gama: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
    acento: '#64748b',
    redondeo: '0.25rem',
  },
  {
    id: 'brasa',
    nombre: 'Brasa',
    simbolo: '🔥',
    descripcion: 'Rojo cálido. Con carácter.',
    gama: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
    acento: '#f97316',
    redondeo: null,
  },
  {
    id: 'noche',
    nombre: 'Morado noche',
    simbolo: '🌙',
    descripcion: 'Morado elegante, para las tardes.',
    gama: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
    acento: '#c026d3',
    redondeo: '0.75rem',
  },
  {
    id: 'cobre',
    nombre: 'Cobre',
    simbolo: '🟠',
    descripcion: 'Tonos de tubería de cobre. Cálido y distinto.',
    gama: ['#fdf8f6', '#f7e8e0', '#eecfc0', '#dfae96', '#c98a6b', '#b06a4b', '#94533a', '#78412e', '#5f3425', '#4a281d'],
    acento: '#d97706',
    redondeo: '0.5rem',
  },
];

/** Los números de la gama tal y como los escribe Tailwind. */
const NIVELES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export function temaPorDefecto() {
  return TEMAS[0];
}

export function temaGuardado() {
  try {
    const id = localStorage.getItem(CLAVE);
    return TEMAS.find((t) => t.id === id) || temaPorDefecto();
  } catch {
    return temaPorDefecto();
  }
}

const oyentes = new Set();

export function escucharTema(fn) {
  oyentes.add(fn);
  fn(temaGuardado());
  return () => oyentes.delete(fn);
}

/**
 * Las reglas que cambian el aspecto del programa entero.
 *
 * Se escriben con !important y repitiendo el selector porque tienen que ganar
 * a las clases originales de Tailwind, que ya están en el fichero. Sin eso, se
 * aplicaría el color de siempre y no se vería ningún cambio.
 */
export function cssDelTema(tema) {
  if (!tema || tema.id === 'azul') return '';   // el de siempre: nada que cambiar
  const reglas = [];
  NIVELES.forEach((nivel, i) => {
    const color = tema.gama[i];
    const parejas = [
      [`bg-blue-${nivel}`, `background-color: ${color}`],
      [`text-blue-${nivel}`, `color: ${color}`],
      [`border-blue-${nivel}`, `border-color: ${color}`],
      [`ring-blue-${nivel}`, `--tw-ring-color: ${color}`],
      [`from-blue-${nivel}`, `--tw-gradient-from: ${color}`],
      [`to-blue-${nivel}`, `--tw-gradient-to: ${color}`],
      [`via-blue-${nivel}`, `--tw-gradient-stops: var(--tw-gradient-from), ${color}, var(--tw-gradient-to)`],
    ];
    for (const [clase, decl] of parejas) {
      const c = CSS.escape ? CSS.escape(clase) : clase;
      reglas.push(`.${c}{${decl} !important}`);
      reglas.push(`.hover\\:${c}:hover{${decl} !important}`);
      reglas.push(`.focus\\:${c}:focus{${decl} !important}`);
      reglas.push(`.group:hover .group-hover\\:${c}{${decl} !important}`);
    }
  });
  if (tema.redondeo) {
    reglas.push(`.rounded-lg,.rounded-xl,.rounded-md{border-radius:${tema.redondeo} !important}`);
  }
  reglas.push(`:root{--gpt-acento:${tema.acento}}`);
  return reglas.join('\n');
}

const ID_HOJA = 'gpt-hoja-tema';

/** Deja el programa con el tema elegido. */
export function aplicarTema(tema = temaGuardado()) {
  if (typeof document === 'undefined') return;
  let hoja = document.getElementById(ID_HOJA);
  if (!hoja) {
    hoja = document.createElement('style');
    hoja.id = ID_HOJA;
    document.head.appendChild(hoja);
  }
  hoja.textContent = cssDelTema(tema);
  document.documentElement.setAttribute('data-gpt-tema', tema.id);
}

export function guardarTema(id) {
  const tema = TEMAS.find((t) => t.id === id) || temaPorDefecto();
  try { localStorage.setItem(CLAVE, tema.id); } catch { /* sin sitio */ }
  aplicarTema(tema);
  oyentes.forEach((fn) => fn(tema));
  return tema;
}
