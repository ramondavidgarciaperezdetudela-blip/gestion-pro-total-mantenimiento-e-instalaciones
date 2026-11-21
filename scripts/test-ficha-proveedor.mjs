import assert from 'node:assert/strict';
import { enlaceRuta, enlaceWaze, urlMapaIncrustado, urlWeb, hostDe, provinciaDeCp, candidatasLogo, datosContacto, enlacesContacto, unirDatos, enlaceMapa, direccionCompleta } from '../src/lib/fichaProveedor.js';

// Enlaces: sin «https://» el enlace abría otra ventana de la propia aplicación
assert.equal(urlWeb('saltoki.es'), 'https://saltoki.es/');
assert.equal(urlWeb('  www.comfred.es/contacto '), 'https://www.comfred.es/contacto');
assert.equal(urlWeb('http://a.com'), 'http://a.com/');
assert.equal(urlWeb('javascript:alert(1)'), ''); assert.equal(urlWeb('file:///etc/passwd'), ''); assert.equal(urlWeb('mailto:a@b.es'), '');
assert.equal(urlWeb('hidroelectricsyg'), ''); assert.equal(urlWeb(''), ''); assert.equal(urlWeb(null), '');
assert.equal(hostDe('https://www.saltoki.es/x'), 'saltoki.es');
assert.equal(provinciaDeCp('43001'), 'Tarragona'); assert.equal(provinciaDeCp('08001'), 'Barcelona'); assert.equal(provinciaDeCp('28013'), 'Madrid'); assert.equal(provinciaDeCp('99999'), '');

const portada = `<html><head><meta property="og:image" content="/img/share.jpg"><link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="/touch.png"><link rel="icon" sizes="32x32" href="/f32.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Saltoki","logo":"https://cdn.saltoki.es/logo.png","telephone":"+34 948 00 00 00"}</script></head>
<body><header><a href="/"><img class="site-logo" src="/img/logo-cabecera.png" alt="Saltoki"></a><img src="/img/banner.jpg"></header><footer><a href="/contacto">Contacto</a><a href="/aviso-legal">Aviso legal</a><a href="https://otra.com/contacto">Contacto</a><a href="/tarifas">Tarifas</a></footer></body></html>`;
const logos = candidatasLogo(portada, 'https://www.saltoki.es/');
assert.equal(logos[0].url, 'https://cdn.saltoki.es/logo.png');
assert.ok(logos.some((l) => l.url === 'https://www.saltoki.es/img/logo-cabecera.png'));
assert.ok(logos.some((l) => l.url.endsWith('/touch.png')) && logos.every((l) => !/\.ico|\.svg/.test(l.url)));
assert.ok(logos.findIndex((l) => l.tipo === 'logo') < logos.findIndex((l) => l.tipo === 'og'), 'el logo de la cabecera va antes que og:image');
assert.deepEqual(enlacesContacto(portada, 'https://www.saltoki.es/'), ['https://www.saltoki.es/contacto', 'https://www.saltoki.es/aviso-legal']);

// Datos estructurados
const ld = `<script type="application/ld+json">{"@type":"LocalBusiness","name":"X","legalName":"Comfred Suministros S.L.","telephone":"977 11 22 33","email":"info@comfred.es","address":{"@type":"PostalAddress","streetAddress":"Pol. Ind. Constantí, C/ Aluminio 12","postalCode":"43120","addressLocality":"Constantí","addressRegion":"Tarragona"}}</script>`;
let d = datosContacto(ld);
assert.deepEqual([d.address, d.postal_code, d.city, d.province, d.phone, d.email, d.legal_name], ['Pol. Ind. Constantí, C/ Aluminio 12', '43120', 'Constantí', 'Tarragona', '977 11 22 33', 'info@comfred.es', 'Comfred Suministros S.L.']);
// Texto de contacto sin datos estructurados
const txt = `<div class="contacto"><h2>Dónde estamos</h2><p>Hidroelectric SYG S.L.<br>C/ Mayor, 24<br>43001 Tarragona</p><p>Tel: 977 22 33 44 · <a href="mailto:pedidos@hidroelectric.es">pedidos@hidroelectric.es</a></p><p>CIF: B-43123456</p></div>`;
d = datosContacto(txt);
assert.equal(d.address, 'C/ Mayor, 24'); assert.equal(d.postal_code, '43001'); assert.equal(d.city, 'Tarragona'); assert.equal(d.province, 'Tarragona');
assert.equal(d.phone, '977 22 33 44'); assert.equal(d.email, 'pedidos@hidroelectric.es'); assert.equal(d.tax_id, 'B43123456'); assert.equal(d.legal_name, 'Hidroelectric SYG S.L.');
// En una sola línea del pie de página
d = datosContacto('<footer>Avda. de Catalunya, 105 - 08014 Barcelona | Tel. 93 265 81 00</footer>');
assert.equal(d.address, 'Avda. de Catalunya, 105'); assert.equal(d.postal_code, '08014'); assert.equal(d.city, 'Barcelona'); assert.equal(d.province, 'Barcelona'); assert.equal(d.phone, '93 265 81 00');
d = datosContacto('<p>Pol. Ind. Constantí, C/ Aluminio, 12<br>43120 Constantí</p>'); assert.equal(d.address, 'Pol. Ind. Constantí, C/ Aluminio, 12'); assert.equal(d.city, 'Constantí');
assert.deepEqual(datosContacto('<p>Nada útil aquí</p>'), {});
// Unir y mostrar
const u = unirDatos({ phone: '1' }, { phone: '2', address: 'C/ A, 1', postal_code: '43001' });
assert.deepEqual([u.phone, u.address, u.province], ['1', 'C/ A, 1', 'Tarragona']);
assert.equal(direccionCompleta({ address: 'C/ A, 1', postal_code: '43001', city: 'Tarragona', province: 'Tarragona' }), 'C/ A, 1, 43001 Tarragona, Tarragona');
assert.match(enlaceMapa({ address: 'C/ A, 1', city: 'Tarragona' }), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=C%2F%20A%2C%201%2C%20Tarragona$/); assert.equal(enlaceMapa({}), '');
// Código postal por municipio: el propio del casco, no el compartido con otro municipio (Vila-seca: 43480, no 43206 de Reus)
const { buscarPorMunicipio } = await import('../src/lib/codigosPostales.js');
assert.equal((await buscarPorMunicipio('Vila-seca', 1))[0].postal_code, '43480');
assert.equal((await buscarPorMunicipio('Reus', 1))[0].postal_code, '43201');
assert.equal((await buscarPorMunicipio('Salou', 1))[0].postal_code, '43840');
// GPS y plano
const lugar = { address: 'C/ Mayor, 24', postal_code: '43480', city: 'Vila-seca', province: 'Tarragona' };
assert.equal(enlaceRuta(lugar), 'https://www.google.com/maps/dir/?api=1&destination=C%2F%20Mayor%2C%2024%2C%2043480%2C%20Vila-seca%2C%20Tarragona&travelmode=driving');
assert.match(enlaceWaze(lugar), /^https:\/\/waze\.com\/ul\?q=.*Vila-seca.*&navigate=yes$/);
assert.match(urlMapaIncrustado(lugar), /output=embed/); assert.equal(enlaceRuta({}), ''); assert.equal(urlMapaIncrustado({}), '');
console.log('ficha-proveedor OK');
