import { copiasDeDocumento, copiasHuerfanas, esCopiaGenerada } from '../src/lib/copiasDocumentos.js';
import { construirArbol } from '../src/lib/arbolDocumentos.js';
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };
const inv = [{ id: 'i1', doc_type: 'presupuesto', doc_number: 'P-1', contact_id: 'c' }];
const docs = [
  { id: 'a', contact_id: 'c', doc_type: 'presupuesto', title: 'Presupuesto P-1', description: 'Total: 10.00 € | Estado: borrador' },
  { id: 'b', contact_id: 'c', doc_type: 'presupuesto', title: 'Presupuesto P-2', description: 'Total: 20.00 € | Estado: enviado' },
  { id: 'c1', contact_id: 'c', doc_type: 'presupuesto', title: 'Presupuesto IA', description: 'Total: 5.00 €' },
  { id: 'd', contact_id: 'c', doc_type: 'presupuesto', title: 'Subido', file_url: 'http://x/y.pdf', description: 'Total: 1 € | Estado: x' },
  { id: 'e', contact_id: 'c', doc_type: 'presupuesto', title: 'Presupuesto N', reference_id: 'borrado' },
  { id: 'f', contact_id: 'c', doc_type: 'presupuesto', title: 'Presupuesto P-1', reference_id: 'i1' },
];
ok(!esCopiaGenerada(docs[3]), 'fichero subido no es copia');
ok(copiasDeDocumento(docs, inv[0]).map((x) => x.id).sort().join() === 'a,f', 'copias de P-1');
ok(copiasHuerfanas(docs, inv).map((x) => x.id).sort().join() === 'b,e', 'huérfanas: ' + copiasHuerfanas(docs, inv).map((x) => x.id));
const arbol = construirArbol({ invoices: inv, documents: docs.filter((d) => !copiasHuerfanas(docs, inv).includes(d)) });
const pres = arbol[0].hijos[1].archivos.map((x) => x.id).sort().join();
ok(pres === 'doc-c1,doc-d,inv-i1', 'árbol: ' + pres);
console.log('copias-documentos OK');
