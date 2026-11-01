// Genera, a partir del catálogo de equipos de Gestión Pro Total, los ficheros
// que se instalan en CADCraft: biblioteca de bloques (LISP) y lista del menú HVAC.
import fs from 'node:fs';
import { ELEMENTOS, CATEGORIAS } from '../src/lib/planoFrigorificoCatalogo.js';

const ACI = { refrigeracion: 4, clima: 30, ventilacion: 3, electrico: 2, seguridad: 1, estructura: 6, ia: 5 };
const num = (n) => Number(n).toFixed(4);
const sin = (s) => String(s).replace(/"/g, "'");
const nombreLisp = (id) => 'EQ-' + id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
const cats = CATEGORIAS.filter((c) => c.id !== 'ia');
const items = ELEMENTOS.filter((e) => ACI[e.cat] && e.w_m && e.h_m);

let l = ';;; Generado por scripts/gen-cadcraft-hvac.mjs — no editar a mano.\n';
l += ';;; Biblioteca de equipos de Gestión Pro Total para CADCraft (unidades: metros).\n\n';
l += '(defun gpt-capa (nombre color) (gpt-nueva-capa nombre color))\n\n';
l += `(defun gpt-def-bloque (nombre w h forzar / k)
  ;; Símbolos pequeños (válvulas, instrumentos, mecanismos) se dibujan a 0,60 m como mínimo para que se vean en el plano.
  (if (or forzar (not (tblsearch "BLOCK" nombre)))
    (progn
      (setq k (/ 0.6 (max w h)))
      (if (< k 1.0) (setq k 1.0))
      (entmake (list (cons 0 "BLOCK") (cons 2 nombre) (cons 70 0) (list 10 0.0 0.0 0.0)))
      (gs-dibuja nombre (* w k) (* h k))
      (entmake (list (cons 0 "ENDBLK"))))))

`;
l += '(setq *gpt-giro* 0.0)\n';
l += '(setq *gpt-equipos* (list\n';
for (const e of items) l += `  (list "${nombreLisp(e.id)}" ${num(e.w_m)} ${num(e.h_m)} "EQUIPO-${e.cat.toUpperCase()}")\n`;
l += '))\n\n';
l += `;; Planos que vienen de Gestión Pro Total traen los equipos como cajas: se cambian por los símbolos reales.
(defun gpt-refrescar-bloques (/ d)
  (foreach d *gpt-equipos*
    (if (tblsearch "BLOCK" (car d)) (gpt-def-bloque (car d) (cadr d) (caddr d) T)))
  (princ))

`;
l += '(defun gpt-capas ()\n';
for (const c of cats) l += `  (gpt-capa "EQUIPO-${c.id.toUpperCase()}" ${ACI[c.id]})\n`;
l += '  (princ))\n\n';
l += `(defun gpt-colocar (id / d p g)
  (gpt-capas)
  (setq d (assoc id *gpt-equipos*))
  (gpt-def-bloque id (cadr d) (caddr d) nil)
  (initget "Giro")
  (while (setq p (getpoint (strcat "\\nPunto de colocación de " id " [Giro " (rtos (* *gpt-giro* (/ 180.0 3.14159265)) 2 0) "°] (Intro para terminar): ")))
    (if (= p "Giro")
      (progn (setq g (getangle "\\nGiro en grados: ")) (if g (setq *gpt-giro* g)))
      (progn
        (entmake (list (cons 0 "INSERT") (cons 8 (cadddr d)) (cons 2 id) (list 10 (car p) (cadr p) 0.0) (cons 41 1.0) (cons 42 1.0) (cons 43 1.0) (cons 50 *gpt-giro*)))
        (princ "\\nColocado."))))
  (princ))

`;
for (const e of items) l += `(defun c:${nombreLisp(e.id)} () (gpt-colocar "${nombreLisp(e.id)}"))\n`;
fs.mkdirSync('cadcraft-hvac/support', { recursive: true });
fs.writeFileSync('cadcraft-hvac/support/hvac-biblioteca.lsp', l);

// Lista para el menú HVAC de CADCraft: categoría \t comando \t nombre \t ancho \t alto
const tsv = items.map((e) => [cats.find((c) => c.id === e.cat).label, nombreLisp(e.id), e.label, e.w_m, e.h_m].join('\t')).join('\n') + '\n';
fs.writeFileSync('cadcraft-hvac/equipos.tsv', tsv);
console.log(items.length, 'equipos');
fs.mkdirSync('cadcraft/crates/ui-egui/src/hvac', { recursive: true }); fs.copyFileSync('cadcraft-hvac/equipos.tsv', 'cadcraft/crates/ui-egui/src/hvac/equipos.tsv');
