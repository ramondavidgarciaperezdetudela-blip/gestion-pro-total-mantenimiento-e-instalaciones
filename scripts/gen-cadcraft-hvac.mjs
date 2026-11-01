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
l += '(defun gpt-capa (nombre color)\n  (if (not (tblsearch "LAYER" nombre))\n    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord") (cons 2 nombre) (cons 70 0) (cons 62 color) (cons 6 "Continuous")))))\n\n';
l += '(defun gpt-linea (a b / ) (entmake (list (cons 0 "LINE") (cons 8 "0") (cons 10 a) (cons 11 b))))\n\n';
l += '(defun gpt-def-bloque (nombre w h glyph color / x y)\n  (if (not (tblsearch "BLOCK" nombre))\n    (progn\n      (setq x (/ w 2.0) y (/ h 2.0))\n      (entmake (list (cons 0 "BLOCK") (cons 2 nombre) (cons 70 0) (list 10 0.0 0.0 0.0)))\n      (gpt-linea (list (- x) (- y) 0.0) (list x (- y) 0.0))\n      (gpt-linea (list x (- y) 0.0) (list x y 0.0))\n      (gpt-linea (list x y 0.0) (list (- x) y 0.0))\n      (gpt-linea (list (- x) y 0.0) (list (- x) (- y) 0.0))\n      (gpt-linea (list (- x) (- y) 0.0) (list x y 0.0))\n      (gpt-linea (list (- x) y 0.0) (list x (- y) 0.0))\n      (entmake (list (cons 0 "TEXT") (cons 8 "0") (list 10 0.0 0.0 0.0) (list 11 0.0 0.0 0.0) (cons 40 (* 0.3 (min w h))) (cons 1 glyph) (cons 72 1) (cons 73 2)))\n      (entmake (list (cons 0 "ENDBLK"))))))\n\n';
l += '(defun gpt-cargar-biblioteca ()\n';
for (const c of cats) l += `  (gpt-capa "EQUIPO-${c.id.toUpperCase()}" ${ACI[c.id]})\n`;
for (const e of items) l += `  (gpt-def-bloque "${nombreLisp(e.id)}" ${num(e.w_m)} ${num(e.h_m)} "${sin(e.glyph || e.label.slice(0, 3).toUpperCase())}" ${ACI[e.cat]})\n`;
l += '  (princ))\n\n';
l += '(defun gpt-colocar (id capa / ang p n)\n  (gpt-cargar-biblioteca)\n  (setq ang (getangle "\\nGiro en grados <0>: "))\n  (if (not ang) (setq ang 0.0))\n  (while (setq p (getpoint "\\nPunto de colocación (Intro para terminar): "))\n    (entmake (list (cons 0 "INSERT") (cons 8 capa) (cons 2 id) (list 10 (car p) (cadr p) 0.0) (cons 41 1.0) (cons 42 1.0) (cons 43 1.0) (cons 50 ang)))\n    (princ (strcat "\\nColocado: " id)))\n  (princ))\n\n';
for (const e of items) l += `(defun c:${nombreLisp(e.id)} () (gpt-colocar "${nombreLisp(e.id)}" "EQUIPO-${e.cat.toUpperCase()}"))\n`;
fs.mkdirSync('cadcraft-hvac/support', { recursive: true });
fs.writeFileSync('cadcraft-hvac/support/hvac-biblioteca.lsp', l);

// Lista para el menú HVAC de CADCraft: categoría \t comando \t nombre \t ancho \t alto
const tsv = items.map((e) => [cats.find((c) => c.id === e.cat).label, nombreLisp(e.id), e.label, e.w_m, e.h_m].join('\t')).join('\n') + '\n';
fs.writeFileSync('cadcraft-hvac/equipos.tsv', tsv);
console.log(items.length, 'equipos');
fs.mkdirSync('cadcraft/crates/ui-egui/src/hvac', { recursive: true }); fs.copyFileSync('cadcraft-hvac/equipos.tsv', 'cadcraft/crates/ui-egui/src/hvac/equipos.tsv');
