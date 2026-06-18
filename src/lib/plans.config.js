/**
 * plans.config.js — Planes y datos de cobro de la pantalla de inicio.
 * ------------------------------------------------------------------
 * EDITA AQUÍ tus precios, tu Bizum/IBAN y tus enlaces de pago de Stripe.
 * No hay secretos: este fichero es seguro. (Los enlaces de Stripe Payment
 * Link son públicos por diseño.)
 *
 * Para cada plan, `stripeUrl` es tu "Payment Link" de Stripe (lo creas en
 * dashboard.stripe.com > Payment Links). Si lo dejas vacío, el botón de
 * tarjeta no aparece y el cliente paga por Bizum/transferencia.
 *
 * `dias` es la duración de la licencia que TÚ emitirás luego en el panel
 * (0 = perpetua). Es informativo aquí; la licencia real la firmas tú.
 */

export const paymentConfig = {
  // --- Bizum / Transferencia (rellena con tus datos reales) ---
  bizumPhone: '',                 // p.ej. '600 12 34 56'
  iban: '',                       // p.ej. 'ES12 3456 7890 1234 5678 9012'
  beneficiario: 'Gestión Pro Total',
  // --- Contacto / Soporte ---
  contactEmail: 'kairigarcia.gestionprototal@gmail.com',
  whatsapp: '',                   // opcional, p.ej. '34600123456'
};

// `requisito` (opcional): texto del justificante que el cliente debe aportar.
// `gratis: true` marca planes sin pago (no muestran botones de cobro).
export const plans = [
  { id: 'demo',        nombre: 'Demo',            precio: 'Gratis',   periodo: '7 días',     dias: 7,   stripeUrl: '', gratis: true, nota: 'Gratis 7 días · luego elige tu plan' },
  { id: 'mensual',     nombre: 'Mensual',         precio: '19 €',     periodo: '/mes',       dias: 30,  stripeUrl: '' },
  { id: 'trimestral',  nombre: 'Trimestral',      precio: '49 €',     periodo: '/3 meses',   dias: 90,  stripeUrl: '' },
  { id: 'semestral',   nombre: 'Semestral',       precio: '89 €',     periodo: '/6 meses',   dias: 180, stripeUrl: '' },
  { id: 'anual',       nombre: 'Anual',           precio: '149 €',    periodo: '/año',       dias: 365, stripeUrl: '', destacado: true, nota: 'El más elegido · 2 meses gratis' },
  { id: 'perpetuo',    nombre: 'Perpetuo',        precio: '599 €',    periodo: 'pago único', dias: 0,   stripeUrl: '', nota: 'Pagas una vez, para siempre' },
  { id: 'estudiantes', nombre: 'Estudiantes',     precio: 'Gratis',   periodo: '/año',       dias: 365, stripeUrl: '', gratis: true, requisito: 'matrícula actual', nota: 'Gratis con matrícula · renovable cada año' },
  { id: 'empresa',     nombre: 'Empresa (Packs)', precio: 'Desde 49 €', periodo: '/mes',     dias: 30,  stripeUrl: '', nota: 'Varios equipos, a medida' },
];

export default { paymentConfig, plans };
