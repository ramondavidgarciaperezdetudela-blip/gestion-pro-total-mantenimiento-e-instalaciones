/**
 * codigosError.js — Chuleta de códigos de error de aire acondicionado, por marca.
 *
 * ─── LO PRIMERO, PORQUE IMPORTA ──────────────────────────────────────────────
 *
 * Los códigos NO son un estándar. Cada fabricante usa los suyos y además los
 * cambia entre gamas y años del mismo fabricante. El mismo "E1" es alta
 * presión en una máquina y fallo de sonda en otra.
 *
 * Así que esto es lo que es: una chuleta para orientarse rápido delante de la
 * máquina, no el manual. Antes de cambiar una pieza, confírmalo con el manual
 * del equipo concreto. En pantalla se dice, y se dice a propósito.
 *
 * ─── CÓMO ESTÁ ORGANIZADO ────────────────────────────────────────────────────
 *
 * Cada código lleva tres cosas:
 *   · qué significa,
 *   · DÓNDE suele estar la avería de verdad —que es lo que hace falta en obra—,
 *   · y a qué familia pertenece, para poder buscar por síntoma.
 *
 * Muchas marcas del mercado español montan plataforma de otro fabricante y
 * comparten tabla de códigos. Eso está anotado en cada marca (`plataforma`),
 * porque saber que tu Mundoclima usa la tabla de Midea te ahorra media hora.
 *
 * ─── TELÉFONOS ───────────────────────────────────────────────────────────────
 *
 * No van números escritos aquí a propósito: cambian, y un teléfono equivocado
 * te hace perder una mañana. Va el enlace de soporte oficial de cada marca —que
 * siempre lleva al número vigente— y un hueco para que apuntes tú el que uses
 * de verdad, que suele ser el de tu delegación o distribuidor. Lo que apuntes
 * se guarda en el propio equipo.
 */

/** Familias de avería: lo que sí vale para cualquier marca. */
export const FAMILIAS = [
  {
    id: 'sonda',
    nombre: 'Sondas de temperatura',
    sintoma: 'Arranca y para solo, no enfría, marca temperaturas imposibles.',
    revisar: 'Mide la resistencia de la sonda en frío y en caliente (NTC de 10 kΩ a 25 °C). Mira el conector antes que la sonda: casi siempre es el conector suelto o el cable rozado.',
  },
  {
    id: 'comunicacion',
    nombre: 'Comunicación interior ↔ exterior',
    sintoma: 'La interior enciende pero la exterior no arranca, o se para a los minutos.',
    revisar: 'Cable de interconexión: sección, apriete y que no haya empalmes en la canaleta. Polaridad y tensión entre bornes de comunicación. Muchas veces es humedad en la regleta.',
  },
  {
    id: 'alta',
    nombre: 'Alta presión / condensación',
    sintoma: 'Corta a los pocos minutos y la exterior se calienta mucho.',
    revisar: 'Batería exterior sucia, ventilador exterior parado o lento, exceso de carga, u obstrucción de aire alrededor de la máquina.',
  },
  {
    id: 'baja',
    nombre: 'Baja presión / falta de gas',
    sintoma: 'Enfría poco, la tubería fina se escarcha, el compresor trabaja seguido.',
    revisar: 'Busca la fuga por las tuercas y la batería. Recalentamiento alto y subenfriamiento bajo. NO cargues sin encontrar la fuga antes.',
  },
  {
    id: 'hielo',
    nombre: 'Antihielo / congelación del evaporador',
    sintoma: 'La interior se llena de hielo y deja de dar aire.',
    revisar: 'Filtros sucios, ventilador interior lento, poca carga de gas o sonda de batería mal colocada.',
  },
  {
    id: 'descarga',
    nombre: 'Temperatura de descarga alta',
    sintoma: 'Para en caliente y tarda en rearmar.',
    revisar: 'Falta de gas, válvula de expansión o EEV mal, o compresor forzado. Mide la temperatura del tubo de descarga.',
  },
  {
    id: 'corriente',
    nombre: 'Sobrecorriente / protección del compresor',
    sintoma: 'Salta al arrancar o a los pocos segundos.',
    revisar: 'Tensión de red en el arranque, condensador de arranque, apriete de bornes, y consumo real con pinza frente al RLA de la placa.',
  },
  {
    id: 'ventilador',
    nombre: 'Motor de ventilador',
    sintoma: 'No sale aire, o la exterior no ventila aunque el compresor gire.',
    revisar: 'Que la turbina gire a mano sin rozar, conector del motor y tensión de salida de la placa. En motores DC no lo des por muerto sin comprobar la placa.',
  },
  {
    id: 'drenaje',
    nombre: 'Drenaje y bomba de condensados',
    sintoma: 'Gotea, o se para al rato de funcionar.',
    revisar: 'Desagüe atascado o sin pendiente, flotador sucio, bomba agarrotada.',
  },
  {
    id: 'placa',
    nombre: 'Placa, inverter, IPM o memoria',
    sintoma: 'Errores raros que se repiten tras desconectar y volver a conectar.',
    revisar: 'Antes de pedir placa: tensión de alimentación, tierra, y que no haya entrado agua o bichos. Es la avería que más se diagnostica de más.',
  },
  {
    id: 'aviso',
    nombre: 'Aviso de funcionamiento (no es avería)',
    sintoma: 'Sale un código pero la máquina funciona.',
    revisar: 'Desescarche, precalentamiento o modo de prueba. Espera a que termine el ciclo antes de tocar nada.',
  },
];

const c = (codigo, significado, donde, familia) => ({ codigo, significado, donde, familia });

/**
 * Los códigos, por marca.
 *
 * `plataforma`: de quién es la electrónica, cuando la marca no la fabrica.
 * `soporte`: la página oficial donde está el teléfono vigente.
 */
export const MARCAS = [
  {
    id: 'midea',
    nombre: 'Midea',
    plataforma: null,
    nota: 'Midea fabrica para muchas marcas: Mundoclima, Kaysun, Giatsu, Comfee y parte de la gama de Carrier y Daitsu comparten esta misma tabla.',
    soporte: 'https://www.midea.com/es/support',
    codigos: [
      c('E0', 'Error de EEPROM de la unidad interior', 'Placa interior. Prueba a desconectar 5 minutos antes de pedirla: a veces es un pico de tensión.', 'placa'),
      c('E1', 'Protección de alta presión', 'Batería exterior sucia, ventilador exterior parado, exceso de carga o falta de aire alrededor de la exterior.', 'alta'),
      c('E2', 'Protección antihielo del evaporador', 'Filtros sucios, ventilador interior lento o poca carga de gas.', 'hielo'),
      c('E3', 'Protección de baja presión / falta de gas', 'Fuga. Mira tuercas, batería y conexiones antes de cargar.', 'baja'),
      c('E4', 'Temperatura de descarga demasiado alta', 'Falta de gas, EEV mal o compresor forzado. Mide el tubo de descarga.', 'descarga'),
      c('E5', 'Sobrecorriente o tensión de red baja', 'Tensión en el arranque, apriete de bornes y consumo con pinza frente al RLA.', 'corriente'),
      c('E6', 'Fallo de comunicación interior – exterior', 'Cable de interconexión, polaridad y humedad en la regleta. Este es el de comunicación, no el E1.', 'comunicacion'),
      c('E7', 'Error de EEPROM de la unidad exterior', 'Placa exterior. Comprueba tierra y alimentación antes.', 'placa'),
      c('E8', 'Fallo del motor del ventilador interior', 'Que la turbina gire a mano, conector del motor y tensión de la placa.', 'ventilador'),
      c('F0', 'Protección de baja presión del sistema', 'Falta de refrigerante o presostato de baja. Busca la fuga.', 'baja'),
      c('F1', 'Sonda de temperatura de descarga', 'Sonda de descarga o su conector. Mide la NTC.', 'sonda'),
      c('F2', 'Protección del módulo IPM', 'Módulo de potencia de la exterior. Antes: tensión, tierra y que el compresor no esté agarrotado.', 'placa'),
      c('F3', 'Sonda de temperatura de tubería', 'Sonda de batería y su conector.', 'sonda'),
      c('F4', 'Sonda de ambiente exterior', 'Sonda exterior o conector.', 'sonda'),
      c('F5', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('L3', 'Sonda de temperatura de aspiración', 'Sonda de aspiración o conector.', 'sonda'),
      c('P0', 'Módulo de potencia protegido', 'IPM. Tensión de red, apriete y consumo del compresor.', 'placa'),
      c('P1', 'Tensión de continua fuera de rango', 'Alimentación, condensadores del bus DC o red inestable.', 'placa'),
      c('P2', 'Protección de temperatura del IPM', 'Disipador sucio o pasta térmica seca en el módulo.', 'placa'),
      c('P4', 'Fallo del compresor o arranque anormal', 'Bobinados del compresor, condensador de arranque y tensión en el arranque.', 'corriente'),
      c('dF', 'Desescarche en curso', 'No es avería: está desescarchando. Espera a que acabe.', 'aviso'),
    ],
  },
  {
    id: 'gree',
    nombre: 'Gree',
    plataforma: null,
    nota: 'Tosot y parte de las gamas de Sinclair y Argo usan esta misma electrónica.',
    soporte: 'https://www.gree.com/service',
    codigos: [
      c('E1', 'Protección de alta presión', 'Condensador sucio, ventilador exterior parado o exceso de carga.', 'alta'),
      c('E2', 'Protección antihielo del evaporador', 'Filtros, ventilador interior o falta de gas.', 'hielo'),
      c('E3', 'Protección de baja presión', 'Fuga de refrigerante o presostato de baja.', 'baja'),
      c('E4', 'Temperatura de descarga alta', 'Falta de gas o compresor forzado.', 'descarga'),
      c('E5', 'Sobrecorriente / protección de sobrecarga', 'Tensión de red, bornes y consumo real del compresor.', 'corriente'),
      c('E6', 'Fallo de comunicación', 'Cable entre unidades, polaridad y humedad en la regleta.', 'comunicacion'),
      c('E8', 'Protección por temperatura ambiente alta', 'Falta de ventilación o ambiente por encima del rango de trabajo.', 'alta'),
      c('F0', 'Falta de refrigerante o bloqueo del circuito', 'Fuga, filtro deshidratador obstruido o capilar taponado.', 'baja'),
      c('F1', 'Sonda de ambiente interior', 'Sonda de ambiente o conector.', 'sonda'),
      c('F2', 'Sonda del evaporador', 'Sonda de batería interior.', 'sonda'),
      c('F3', 'Sonda de ambiente exterior', 'Sonda exterior o conector.', 'sonda'),
      c('F4', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('F5', 'Sonda de descarga del compresor', 'Sonda de descarga.', 'sonda'),
      c('H3', 'Protección por sobrecarga del compresor', 'Consumo del compresor, tensión y presión de trabajo.', 'corriente'),
      c('H5', 'Protección del módulo IPM', 'Módulo de potencia. Mira antes tensión y tierra.', 'placa'),
      c('H6', 'Error del motor del ventilador (DC)', 'Motor DC del ventilador interior, conector y placa.', 'ventilador'),
      c('U8', 'Detección de paso por cero de la placa interior', 'Placa interior o alimentación con distorsión.', 'placa'),
      c('PH', 'Tensión de continua demasiado alta', 'Red por encima del rango. Mide la tensión de entrada.', 'placa'),
      c('PL', 'Tensión de continua demasiado baja', 'Caída de tensión en la línea o sección de cable insuficiente.', 'placa'),
    ],
  },
  {
    id: 'daikin',
    nombre: 'Daikin',
    plataforma: null,
    nota: 'En Daikin el código sale en el mando: mantén pulsado el botón de cancelar hasta que aparezca.',
    soporte: 'https://www.daikin.es/es_es/servicio-de-asistencia-tecnica.html',
    codigos: [
      c('A1', 'Fallo de la placa de la unidad interior', 'Placa interior. Comprueba alimentación y tierra antes de sustituirla.', 'placa'),
      c('A5', 'Control antihielo / alta presión en la interior', 'Filtros sucios, caudal de aire bajo o carga de gas.', 'hielo'),
      c('A6', 'Fallo del motor del ventilador interior', 'Motor, conector y placa. Gira la turbina a mano.', 'ventilador'),
      c('AH', 'Filtro electrostático / purificador', 'Limpieza del filtro o del módulo purificador.', 'aviso'),
      c('C4', 'Sonda de batería (líquido) de la interior', 'Sonda del intercambiador interior.', 'sonda'),
      c('C9', 'Sonda de aspiración de la interior', 'Sonda de aire de aspiración.', 'sonda'),
      c('E5', 'Bloqueo o sobrecarga del compresor inverter', 'Compresor agarrotado, tensión en el arranque o inverter.', 'corriente'),
      c('E6', 'Arranque forzado del compresor', 'Consumo y bobinados del compresor.', 'corriente'),
      c('E7', 'Fallo del motor del ventilador exterior', 'Motor exterior, conector y placa.', 'ventilador'),
      c('F3', 'Temperatura de descarga demasiado alta', 'Falta de gas, EEV o compresor forzado.', 'descarga'),
      c('F6', 'Carga de refrigerante excesiva', 'Exceso de carga. Recupera y pesa la carga correcta.', 'alta'),
      c('H6', 'Fallo del detector de posición del compresor', 'Placa inverter o compresor.', 'placa'),
      c('H9', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('J3', 'Sonda de descarga', 'Sonda de tubo de descarga.', 'sonda'),
      c('J6', 'Sonda de batería exterior', 'Sonda del condensador.', 'sonda'),
      c('L5', 'Sobrecorriente en el inverter', 'Módulo inverter o compresor en corto.', 'placa'),
      c('U0', 'Falta de refrigerante', 'Fuga. Busca antes de cargar.', 'baja'),
      c('U2', 'Tensión de alimentación fuera de rango', 'Tensión de red y sección del cable.', 'placa'),
      c('U4', 'Fallo de comunicación entre interior y exterior', 'Cable de interconexión y bornes.', 'comunicacion'),
      c('UF', 'Tubería y cableado mal emparejados', 'Se ha cruzado el cableado o las tuberías entre unidades de un multi.', 'comunicacion'),
      c('UH', 'Fallo del sistema en la puesta en marcha', 'Revisa el conexionado completo de la instalación.', 'comunicacion'),
    ],
  },
  {
    id: 'mitsubishi-electric',
    nombre: 'Mitsubishi Electric',
    plataforma: null,
    nota: null,
    soporte: 'https://www.mitsubishielectric.es/aire-acondicionado/servicio-tecnico',
    codigos: [
      c('P1', 'Sonda de ambiente interior', 'Sonda de aire o conector.', 'sonda'),
      c('P2', 'Sonda de tubería de la interior', 'Sonda del intercambiador.', 'sonda'),
      c('P4', 'Flotador de drenaje activado', 'Desagüe atascado, sin pendiente, o flotador sucio.', 'drenaje'),
      c('P5', 'Fallo de la bomba de drenaje', 'Bomba agarrotada o su conexión.', 'drenaje'),
      c('P6', 'Protección por congelación o sobrecalentamiento', 'Filtros, caudal de aire o carga de gas.', 'hielo'),
      c('P8', 'Temperatura de tubería fuera de rango', 'Sonda de tubería o carga de gas.', 'sonda'),
      c('U2', 'Temperatura de descarga alta / falta de gas', 'Fuga o EEV. Mide la descarga.', 'descarga'),
      c('U3', 'Sonda de descarga abierta o en corto', 'Sonda de descarga y conector.', 'sonda'),
      c('U5', 'Temperatura del módulo de potencia alta', 'Disipador sucio o pasta térmica seca.', 'placa'),
      c('U6', 'Sobrecorriente del compresor', 'Consumo, bobinados y tensión de arranque.', 'corriente'),
      c('UF', 'Sobrecorriente detectada en el arranque', 'Compresor bloqueado o inverter.', 'corriente'),
      c('UP', 'Sobrecorriente del compresor', 'Igual que U6: mide con pinza.', 'corriente'),
      c('E0 – E9', 'Fallos de comunicación (mando, interior, exterior)', 'Cable de mando, cable de interconexión y direcciones de las unidades.', 'comunicacion'),
      c('EA / Eb', 'Error de conexión entre unidades', 'Nº de unidades conectadas o direccionamiento.', 'comunicacion'),
      c('FA', 'Fallo del circuito de la exterior', 'Placa exterior.', 'placa'),
    ],
  },
  {
    id: 'lg',
    nombre: 'LG',
    plataforma: null,
    nota: 'En LG el código aparece como "CH" seguido del número.',
    soporte: 'https://www.lg.com/es/soporte',
    codigos: [
      c('CH01', 'Sonda de ambiente interior', 'Sonda de aire o conector.', 'sonda'),
      c('CH02', 'Sonda de tubería de entrada del interior', 'Sonda del evaporador.', 'sonda'),
      c('CH03', 'Fallo de comunicación con el mando a distancia', 'Cable del mando por cable o su conector.', 'comunicacion'),
      c('CH04', 'Bomba de drenaje', 'Bomba, flotador y desagüe.', 'drenaje'),
      c('CH05', 'Comunicación interior – exterior', 'Cable de interconexión y bornes.', 'comunicacion'),
      c('CH06', 'Sonda de tubería de salida del interior', 'Sonda de salida del evaporador.', 'sonda'),
      c('CH09', 'EEPROM de la placa interior', 'Placa interior.', 'placa'),
      c('CH10', 'Motor del ventilador interior bloqueado', 'Turbina rozando, motor o placa.', 'ventilador'),
      c('CH21', 'Sobrecorriente del IPM (inverter)', 'Módulo de potencia o compresor.', 'placa'),
      c('CH22', 'Sobrecorriente medida por el transformador de corriente', 'Consumo real del compresor con pinza.', 'corriente'),
      c('CH23', 'Tensión de continua del bus baja', 'Alimentación y condensadores del bus.', 'placa'),
      c('CH26', 'Fallo de arranque del compresor DC', 'Compresor agarrotado o placa inverter.', 'corriente'),
      c('CH27', 'Fallo del PSC / corrección de factor de potencia', 'Placa de potencia exterior.', 'placa'),
      c('CH29', 'Sobrecorriente del compresor', 'Consumo, tensión y estado del compresor.', 'corriente'),
      c('CH32', 'Temperatura de descarga demasiado alta', 'Falta de gas o EEV.', 'descarga'),
      c('CH34', 'Alta presión en la unidad exterior', 'Condensador sucio, ventilador exterior o exceso de carga.', 'alta'),
      c('CH35', 'Baja presión en la unidad exterior', 'Fuga de refrigerante.', 'baja'),
      c('CH41', 'Sonda de descarga del compresor', 'Sonda de descarga.', 'sonda'),
      c('CH44', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('CH45', 'Sonda de la batería exterior', 'Sonda del condensador.', 'sonda'),
      c('CH46', 'Sonda de aspiración', 'Sonda de aspiración.', 'sonda'),
      c('CH53', 'Comunicación interior → exterior', 'Cable de interconexión.', 'comunicacion'),
      c('CH60', 'EEPROM de la placa exterior', 'Placa exterior.', 'placa'),
      c('CH62', 'Temperatura del disipador alta', 'Disipador sucio o pasta térmica.', 'placa'),
    ],
  },
  {
    id: 'samsung',
    nombre: 'Samsung',
    plataforma: null,
    nota: null,
    soporte: 'https://www.samsung.com/es/support/',
    codigos: [
      c('E101', 'Sin comunicación entre interior y exterior', 'Cable de interconexión y bornes.', 'comunicacion'),
      c('E102', 'Comunicación entre unidades interiores', 'Bus de comunicación del multi.', 'comunicacion'),
      c('E121', 'Sonda de ambiente interior', 'Sonda de aire.', 'sonda'),
      c('E122', 'Sonda de entrada del evaporador', 'Sonda de tubería de entrada.', 'sonda'),
      c('E123', 'Sonda de salida del evaporador', 'Sonda de tubería de salida.', 'sonda'),
      c('E128', 'Sonda del evaporador abierta o en corto', 'Sonda y conector.', 'sonda'),
      c('E154', 'Fallo del ventilador interior', 'Motor, turbina y placa.', 'ventilador'),
      c('E163', 'EEPROM de la unidad interior', 'Placa interior.', 'placa'),
      c('E201', 'Error de emparejamiento interior – exterior', 'Nº de unidades o direccionamiento.', 'comunicacion'),
      c('E221', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('E231', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('E237', 'Sonda del condensador abierta o en corto', 'Sonda y conector.', 'sonda'),
      c('E251', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
      c('E320', 'OLP: protección de sobrecarga del compresor', 'Consumo del compresor, tensión y presiones.', 'corriente'),
      c('E416', 'Descarga sobrecalentada', 'Falta de gas o EEV.', 'descarga'),
      c('E422', 'Válvula de servicio cerrada o obstrucción', 'Comprueba que las llaves están abiertas.', 'baja'),
      c('E428', 'Baja presión / falta de refrigerante', 'Fuga. Busca antes de cargar.', 'baja'),
      c('E440', 'Fuera del rango de funcionamiento en calor', 'Temperatura exterior fuera de rango. No es avería.', 'aviso'),
      c('E458', 'Fallo del ventilador exterior', 'Motor exterior y placa.', 'ventilador'),
      c('E461', 'Fallo de arranque del compresor', 'Compresor o inverter.', 'corriente'),
      c('E462', 'Limitación de corriente / arranque anormal', 'Tensión de red y consumo.', 'corriente'),
      c('E464', 'Sobrecorriente del IPM', 'Módulo de potencia.', 'placa'),
      c('E554', 'Fuga de gas detectada', 'Fuga de refrigerante.', 'baja'),
    ],
  },
  {
    id: 'panasonic',
    nombre: 'Panasonic',
    plataforma: null,
    nota: null,
    soporte: 'https://www.aircon.panasonic.eu/ES_es/support/',
    codigos: [
      c('H11', 'Comunicación interior – exterior', 'Cable de interconexión y bornes.', 'comunicacion'),
      c('H12', 'Capacidad de las unidades incompatible', 'Interior y exterior no casan. Revisa el emparejamiento.', 'comunicacion'),
      c('H14', 'Sonda de aspiración de la interior', 'Sonda y conector.', 'sonda'),
      c('H15', 'Sonda del compresor', 'Sonda del compresor.', 'sonda'),
      c('H16', 'Transformador de corriente (CT)', 'Poca carga de gas o CT de la placa exterior.', 'corriente'),
      c('H19', 'Motor del ventilador interior', 'Motor, turbina y placa.', 'ventilador'),
      c('H23', 'Sonda del evaporador', 'Sonda de batería interior.', 'sonda'),
      c('H27', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('H28', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('H30', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
      c('H33', 'Tensión de alimentación incorrecta', 'Alimentación de las unidades.', 'placa'),
      c('H97', 'Motor del ventilador exterior', 'Motor exterior y placa.', 'ventilador'),
      c('H98', 'Protección por alta presión', 'Condensador sucio o ventilador exterior.', 'alta'),
      c('H99', 'Congelación de la unidad interior', 'Filtros, caudal de aire o carga de gas.', 'hielo'),
      c('F11', 'Válvula de 4 vías', 'Válvula de inversión de ciclo o su bobina.', 'placa'),
      c('F17', 'Congelación en unidad interior parada (multi)', 'EEV de esa interior con fuga interna.', 'hielo'),
      c('F90', 'Circuito de corrección de factor de potencia', 'Placa exterior.', 'placa'),
      c('F91', 'Ciclo frigorífico anormal (falta de gas)', 'Fuga. Busca antes de cargar.', 'baja'),
      c('F93', 'Giro anormal del compresor', 'Compresor o inverter.', 'corriente'),
      c('F95', 'Alta presión en refrigeración', 'Condensador sucio o exceso de carga.', 'alta'),
      c('F96', 'Sobrecalentamiento del módulo de potencia', 'Disipador y pasta térmica.', 'placa'),
      c('F97', 'Temperatura de descarga alta', 'Falta de gas o EEV.', 'descarga'),
      c('F98', 'Protección por sobrecorriente', 'Consumo real y tensión.', 'corriente'),
      c('F99', 'Corriente continua de pico detectada', 'Módulo de potencia o compresor.', 'placa'),
    ],
  },
  {
    id: 'fujitsu',
    nombre: 'Fujitsu / General',
    plataforma: null,
    nota: 'El código se lee con los pilotos de la interior o entrando en modo de diagnóstico con el mando.',
    soporte: 'https://www.fujitsu-general.com/es/support/',
    codigos: [
      c('E:EE / 11', 'Fallo de comunicación con el mando', 'Cable de mando o su conector.', 'comunicacion'),
      c('12', 'Comunicación entre interior y exterior', 'Cable de interconexión.', 'comunicacion'),
      c('13', 'Comunicación en la unidad exterior', 'Placa exterior.', 'comunicacion'),
      c('14', 'Error de la placa interior', 'Placa interior.', 'placa'),
      c('17', 'Sonda de ambiente interior', 'Sonda de aire.', 'sonda'),
      c('18', 'Sonda de tubería de la interior', 'Sonda de batería.', 'sonda'),
      c('21', 'Motor del ventilador interior', 'Motor y placa.', 'ventilador'),
      c('24', 'Bomba de drenaje o flotador', 'Desagüe y bomba.', 'drenaje'),
      c('41', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
      c('44', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('45', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('51', 'Fallo del inverter', 'Módulo de potencia.', 'placa'),
      c('53', 'Sobrecorriente del compresor', 'Consumo y compresor.', 'corriente'),
      c('57', 'Falta de refrigerante', 'Fuga.', 'baja'),
      c('5A', 'Alta temperatura de descarga', 'Falta de gas o EEV.', 'descarga'),
    ],
  },
  {
    id: 'toshiba',
    nombre: 'Toshiba',
    plataforma: null,
    nota: 'Toshiba y Carrier comparten desarrollos en varias gamas.',
    soporte: 'https://www.toshiba-aire.es/servicio-tecnico/',
    codigos: [
      c('E01', 'Comunicación mando → interior', 'Cable de mando.', 'comunicacion'),
      c('E02', 'Comunicación interior → mando', 'Cable de mando.', 'comunicacion'),
      c('E03', 'Sin comunicación con el mando', 'Cable de mando o placa interior.', 'comunicacion'),
      c('E04', 'Comunicación interior – exterior', 'Cable de interconexión.', 'comunicacion'),
      c('E08', 'Dirección de la interior duplicada', 'Direccionamiento del sistema.', 'comunicacion'),
      c('F01', 'Sonda del evaporador (TCJ)', 'Sonda de batería interior.', 'sonda'),
      c('F02', 'Sonda de tubería de la interior (TC)', 'Sonda de tubería.', 'sonda'),
      c('F10', 'Sonda de ambiente interior (TA)', 'Sonda de aire.', 'sonda'),
      c('F04', 'Sonda de descarga (TD)', 'Sonda de descarga.', 'sonda'),
      c('F06', 'Sonda de batería exterior (TE)', 'Sonda del condensador.', 'sonda'),
      c('F08', 'Sonda de ambiente exterior (TO)', 'Sonda exterior.', 'sonda'),
      c('H01', 'Bloqueo del compresor', 'Compresor agarrotado o inverter.', 'corriente'),
      c('H02', 'Sobrecorriente del compresor', 'Consumo y tensión.', 'corriente'),
      c('H03', 'Circuito de detección de corriente', 'Placa exterior.', 'placa'),
      c('L03', 'Varias unidades configuradas como principal', 'Direccionamiento.', 'comunicacion'),
      c('P03', 'Temperatura de descarga alta', 'Falta de gas o EEV.', 'descarga'),
      c('P04', 'Protección de alta presión', 'Condensador sucio o ventilador exterior.', 'alta'),
      c('P05', 'Fase invertida o falta de fase', 'Orden de fases en la acometida.', 'placa'),
      c('P07', 'Sobrecalentamiento del disipador', 'Disipador y pasta térmica.', 'placa'),
      c('P10', 'Rebose de agua en la interior', 'Desagüe y bomba de condensados.', 'drenaje'),
      c('P12', 'Motor del ventilador interior', 'Motor y placa.', 'ventilador'),
      c('P19', 'Válvula de 4 vías', 'Válvula de inversión o bobina.', 'placa'),
      c('P22', 'Motor del ventilador exterior', 'Motor exterior y placa.', 'ventilador'),
      c('P26', 'Sobrecorriente instantánea del inverter', 'Módulo de potencia.', 'placa'),
      c('P29', 'Detección de posición del compresor', 'Placa inverter o compresor.', 'placa'),
      c('P31', 'Parada por fallo de otra unidad del grupo', 'Mira el error de la unidad que ha fallado.', 'comunicacion'),
    ],
  },
  {
    id: 'hitachi',
    nombre: 'Hitachi',
    plataforma: null,
    nota: null,
    soporte: 'https://www.hitachiaircon.com/es/asistencia',
    codigos: [
      c('01', 'Protección de la unidad interior', 'Flotador de drenaje o protección de la interior.', 'drenaje'),
      c('02', 'Protección de la unidad exterior', 'Alta presión o protección del compresor.', 'alta'),
      c('03', 'Comunicación interior – exterior', 'Cable de interconexión.', 'comunicacion'),
      c('04', 'Comunicación en la unidad exterior (inverter)', 'Placa inverter.', 'comunicacion'),
      c('05', 'Fuente de alimentación anormal', 'Tensión y orden de fases.', 'placa'),
      c('06', 'Tensión del inverter baja o alta', 'Alimentación de la exterior.', 'placa'),
      c('07', 'Recalentamiento en el ciclo bajo', 'Falta de gas o EEV.', 'baja'),
      c('08', 'Temperatura de descarga alta', 'Falta de gas o compresor.', 'descarga'),
      c('11', 'Sonda de aire de entrada de la interior', 'Sonda de aspiración.', 'sonda'),
      c('12', 'Sonda de aire de salida de la interior', 'Sonda de impulsión.', 'sonda'),
      c('13', 'Sonda de líquido de la interior', 'Sonda de tubería.', 'sonda'),
      c('14', 'Sonda de gas de la interior', 'Sonda de tubería de gas.', 'sonda'),
      c('21', 'Sonda de alta presión', 'Transductor de alta.', 'sonda'),
      c('22', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('24', 'Sonda del evaporador exterior', 'Sonda de batería exterior.', 'sonda'),
      c('31', 'Ajuste incorrecto de capacidades', 'Emparejamiento interior/exterior.', 'comunicacion'),
      c('35', 'Dirección de unidad interior incorrecta', 'Direccionamiento.', 'comunicacion'),
      c('53', 'Protección del módulo de potencia', 'IPM de la exterior.', 'placa'),
      c('EE', 'Protección del compresor', 'Compresor. Requiere revisión completa.', 'corriente'),
    ],
  },
  {
    id: 'haier',
    nombre: 'Haier',
    plataforma: null,
    nota: null,
    soporte: 'https://www.haier.com/es/service/',
    codigos: [
      c('E1', 'Protección de alta presión', 'Condensador sucio o ventilador exterior.', 'alta'),
      c('E2', 'Protección antihielo', 'Filtros o carga de gas.', 'hielo'),
      c('E3', 'Protección de baja presión', 'Fuga de refrigerante.', 'baja'),
      c('E4', 'Temperatura de descarga alta', 'Falta de gas o EEV.', 'descarga'),
      c('E5', 'Sobrecorriente / tensión baja', 'Tensión de red y consumo.', 'corriente'),
      c('E6', 'Fallo de comunicación', 'Cable de interconexión.', 'comunicacion'),
      c('E7', 'Fallo del motor del ventilador', 'Motor y placa.', 'ventilador'),
      c('E9', 'Rebose de agua / flotador', 'Desagüe y bomba.', 'drenaje'),
      c('F1', 'Sonda de ambiente interior', 'Sonda de aire.', 'sonda'),
      c('F2', 'Sonda del evaporador', 'Sonda de batería interior.', 'sonda'),
      c('F3', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('F4', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('F5', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
    ],
  },
  {
    id: 'hisense',
    nombre: 'Hisense',
    plataforma: null,
    nota: 'Parte de la gama de Daitsu monta electrónica Hisense.',
    soporte: 'https://www.hisense.es/soporte/',
    codigos: [
      c('E1', 'Protección de alta presión', 'Condensador sucio, ventilador exterior o exceso de carga.', 'alta'),
      c('E2', 'Protección antihielo del evaporador', 'Filtros, ventilador interior o carga de gas.', 'hielo'),
      c('E3', 'Protección de baja presión', 'Fuga.', 'baja'),
      c('E4', 'Temperatura de descarga alta', 'Falta de gas o EEV.', 'descarga'),
      c('E5', 'Sobrecorriente o tensión anormal', 'Tensión de red y consumo.', 'corriente'),
      c('E6', 'Comunicación interior – exterior', 'Cable de interconexión.', 'comunicacion'),
      c('F0', 'Protección por baja presión del sistema', 'Falta de refrigerante.', 'baja'),
      c('F1', 'Sonda de ambiente interior', 'Sonda de aire.', 'sonda'),
      c('F2', 'Sonda del evaporador', 'Sonda de batería.', 'sonda'),
      c('F3', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('F4', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('F5', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
      c('P4', 'Fallo del compresor o arranque anormal', 'Compresor, condensador de arranque y tensión.', 'corriente'),
      c('PC01', 'Protección de módulo por tensión', 'Alimentación de la exterior.', 'placa'),
      c('PC02', 'Protección del módulo de potencia', 'IPM.', 'placa'),
      c('PC03', 'Fallo de detección de corriente', 'Circuito de medida de corriente de la placa exterior.', 'placa'),
      c('PC04', 'Fallo del módulo inverter', 'Módulo de potencia.', 'placa'),
      c('PC08', 'Protección por sobrecorriente', 'Consumo real del compresor.', 'corriente'),
    ],
  },
  {
    id: 'tcl',
    nombre: 'TCL',
    plataforma: 'Comparte buena parte de la tabla con las plataformas chinas tipo Midea/Gree.',
    nota: null,
    soporte: 'https://www.tcl.com/es/es/support',
    codigos: [
      c('E0', 'EEPROM de la placa interior', 'Placa interior.', 'placa'),
      c('E1', 'Comunicación interior – exterior', 'Cable de interconexión y bornes.', 'comunicacion'),
      c('E2', 'Sonda de ambiente interior', 'Sonda de aire.', 'sonda'),
      c('E3', 'Sonda del evaporador', 'Sonda de batería interior.', 'sonda'),
      c('E4', 'Sonda del condensador', 'Sonda de batería exterior.', 'sonda'),
      c('E5', 'Sobrecorriente o tensión anormal', 'Tensión de red y consumo.', 'corriente'),
      c('E6', 'Motor del ventilador interior', 'Motor y placa.', 'ventilador'),
      c('F1', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
      c('F2', 'Protección del módulo IPM', 'Módulo de potencia.', 'placa'),
      c('F3', 'Sonda de temperatura del tubo', 'Sonda de tubería.', 'sonda'),
      c('U4', 'Fallo de cableado o conexión', 'Conexionado entre unidades: repásalo entero.', 'comunicacion'),
      c('U8', 'Detección de paso por cero', 'Placa interior o alimentación.', 'placa'),
    ],
  },
  {
    id: 'mitsubishi-heavy',
    nombre: 'Mitsubishi Heavy Industries',
    plataforma: null,
    nota: 'No confundir con Mitsubishi Electric: son fabricantes distintos y los códigos NO coinciden.',
    soporte: 'https://www.mhi-mth.co.jp/en/support/',
    codigos: [
      c('E1', 'Comunicación con el mando', 'Cable de mando.', 'comunicacion'),
      c('E5', 'Comunicación interior – exterior', 'Cable de interconexión.', 'comunicacion'),
      c('E6', 'Sonda del intercambiador interior', 'Sonda de batería.', 'sonda'),
      c('E7', 'Sonda de aire de retorno', 'Sonda de aspiración.', 'sonda'),
      c('E9', 'Bomba de drenaje / flotador', 'Desagüe y bomba.', 'drenaje'),
      c('E16', 'Motor del ventilador interior', 'Motor y placa.', 'ventilador'),
      c('E28', 'Sonda del mando a distancia', 'Sonda del termostato.', 'sonda'),
      c('E35', 'Alta presión en refrigeración', 'Condensador sucio.', 'alta'),
      c('E36', 'Temperatura de descarga alta', 'Falta de gas o EEV.', 'descarga'),
      c('E37', 'Sonda del intercambiador exterior', 'Sonda de batería exterior.', 'sonda'),
      c('E38', 'Sonda de ambiente exterior', 'Sonda exterior.', 'sonda'),
      c('E39', 'Sonda de descarga', 'Sonda de descarga.', 'sonda'),
      c('E40', 'Alta presión detectada por presostato', 'Presostato de alta y condensación.', 'alta'),
      c('E42', 'Sobrecorriente del compresor', 'Consumo y compresor.', 'corriente'),
      c('E48', 'Motor del ventilador exterior', 'Motor exterior y placa.', 'ventilador'),
      c('E49', 'Presión baja anormal', 'Fuga de refrigerante.', 'baja'),
      c('E51', 'Fallo del inverter', 'Módulo de potencia.', 'placa'),
      c('E59', 'Fallo de arranque del compresor', 'Compresor o inverter.', 'corriente'),
    ],
  },
  {
    id: 'carrier',
    nombre: 'Carrier',
    plataforma: 'Según la gama, comparte electrónica con Toshiba o con plataformas Midea.',
    nota: 'Mira la placa del equipo: si el código es tipo "E04/F01" tira de la tabla de Toshiba; si es tipo "E1/F2" tira de la de Midea.',
    soporte: 'https://www.carrier.com/carrier/es/es/soporte/',
    codigos: [
      c('E1', 'Alta presión o comunicación, según gama', 'Comprueba primero de qué plataforma es tu equipo.', 'alta'),
      c('E2', 'Antihielo del evaporador', 'Filtros y caudal de aire.', 'hielo'),
      c('E3', 'Baja presión / falta de gas', 'Fuga.', 'baja'),
      c('E4', 'Temperatura de descarga alta', 'Falta de gas o EEV.', 'descarga'),
      c('E5', 'Sobrecorriente', 'Consumo y tensión.', 'corriente'),
      c('E6', 'Comunicación entre unidades', 'Cable de interconexión.', 'comunicacion'),
      c('P1', 'Tensión fuera de rango', 'Alimentación.', 'placa'),
      c('P4', 'Fallo del compresor', 'Compresor y arranque.', 'corriente'),
    ],
  },
  {
    id: 'mundoclima',
    nombre: 'Mundoclima',
    plataforma: 'Plataforma Midea.',
    nota: 'Usa la tabla de Midea: E1 alta presión, E6 comunicación, F-x sondas, P-x potencia.',
    soporte: 'https://mundoclima.com/servicio-tecnico/',
    codigos: [],
  },
  {
    id: 'kaysun',
    nombre: 'Kaysun',
    plataforma: 'Plataforma Midea.',
    nota: 'Usa la tabla de Midea.',
    soporte: 'https://kaysun.es/servicio-tecnico/',
    codigos: [],
  },
  {
    id: 'giatsu',
    nombre: 'Giatsu',
    plataforma: 'Plataforma Midea.',
    nota: 'Usa la tabla de Midea.',
    soporte: 'https://giatsu.com/soporte/',
    codigos: [],
  },
  {
    id: 'daitsu',
    nombre: 'Daitsu',
    plataforma: 'Según la gama, plataforma Hisense o Midea.',
    nota: 'Mira primero la tabla de Hisense; si no cuadra, prueba la de Midea.',
    soporte: 'https://www.daitsu.es/servicio-tecnico/',
    codigos: [],
  },
  {
    id: 'tosot',
    nombre: 'Tosot',
    plataforma: 'Plataforma Gree.',
    nota: 'Usa la tabla de Gree.',
    soporte: 'https://www.gree.com/service',
    codigos: [],
  },
  {
    id: 'baxi',
    nombre: 'Baxi',
    plataforma: 'En aire acondicionado, plataformas chinas tipo Midea/Gree según gama.',
    nota: 'Para calderas y aerotermia, los códigos son propios de Baxi y no están en esta chuleta.',
    soporte: 'https://www.baxi.es/servicio-tecnico',
    codigos: [],
  },
  {
    id: 'ferroli',
    nombre: 'Ferroli',
    plataforma: 'En aire acondicionado, plataformas chinas tipo Midea/Gree según gama.',
    nota: null,
    soporte: 'https://www.ferroli.com/es/asistencia',
    codigos: [],
  },
  {
    id: 'johnson',
    nombre: 'Johnson',
    plataforma: 'Plataformas chinas tipo Midea/Gree según gama.',
    nota: null,
    soporte: 'https://www.johnsonaire.com/',
    codigos: [],
  },
  {
    id: 'airwell',
    nombre: 'Airwell',
    plataforma: 'Plataformas chinas según gama.',
    nota: null,
    soporte: 'https://www.airwell.com/es/soporte/',
    codigos: [],
  },
  {
    id: 'bosch',
    nombre: 'Bosch',
    plataforma: 'En split, plataformas chinas según gama.',
    nota: null,
    soporte: 'https://www.bosch-climate.es/servicio-tecnico/',
    codigos: [],
  },
  {
    id: 'vaillant',
    nombre: 'Vaillant',
    plataforma: null,
    nota: 'En aerotermia y calderas los códigos son propios (F.xx). Esta chuleta cubre sobre todo split.',
    soporte: 'https://www.vaillant.es/usuarios/servicio-tecnico/',
    codigos: [],
  },
  {
    id: 'saunier',
    nombre: 'Saunier Duval',
    plataforma: null,
    nota: 'En aerotermia y calderas los códigos son propios (F.xx).',
    soporte: 'https://www.saunierduval.es/servicio-tecnico/',
    codigos: [],
  },
  {
    id: 'electra',
    nombre: 'Electra',
    plataforma: 'Plataformas chinas según gama.',
    nota: null,
    soporte: 'https://www.electra.com/',
    codigos: [],
  },
  {
    id: 'sinclair',
    nombre: 'Sinclair',
    plataforma: 'Plataforma Gree.',
    nota: 'Usa la tabla de Gree.',
    soporte: 'https://www.sinclair-solutions.com/es/',
    codigos: [],
  },
  {
    id: 'aux',
    nombre: 'AUX',
    plataforma: 'Plataforma propia, muy parecida a la de Midea.',
    nota: null,
    soporte: 'https://www.auxgroup.com/',
    codigos: [],
  },
];

/** Marcas que tienen tabla propia (las que no remiten a otra). */
export function marcasConTabla() {
  return MARCAS.filter((m) => m.codigos.length > 0);
}

/** Marcas que remiten a la tabla de otra plataforma. */
export function marcasQueRemiten() {
  return MARCAS.filter((m) => m.codigos.length === 0);
}

/** Una marca por su identificador. */
export function marca(id) {
  return MARCAS.find((m) => m.id === id) || null;
}

/** Cuántos códigos hay en total. */
export function cuantosCodigos() {
  return MARCAS.reduce((n, m) => n + m.codigos.length, 0);
}

function normalizar(t) {
  return String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Busca un código dentro de una marca. Si no se da marca, busca en todas: en
 * obra tienes el código en el display y muchas veces ni sabes de qué marca es.
 */
export function buscar(texto, idMarca = null) {
  const q = normalizar(texto);
  if (!q) return [];
  const donde = idMarca ? MARCAS.filter((m) => m.id === idMarca) : MARCAS;
  const salida = [];
  for (const m of donde) {
    for (const cod of m.codigos) {
      const enCodigo = normalizar(cod.codigo).includes(q);
      const enTexto = normalizar(`${cod.significado} ${cod.donde}`).includes(q);
      if (enCodigo || enTexto) {
        salida.push({ ...cod, marca: m.nombre, idMarca: m.id, exacto: normalizar(cod.codigo) === q });
      }
    }
  }
  // Lo que coincide exactamente con el código va primero.
  return salida.sort((a, b) => Number(b.exacto) - Number(a.exacto));
}

/** La familia de avería de un código, con su explicación. */
export function familia(id) {
  return FAMILIAS.find((f) => f.id === id) || null;
}

// ─── Teléfonos del servicio técnico ──────────────────────────────────────────

const CLAVE_TELEFONOS = 'gpt:sat:telefonos';

/**
 * Los teléfonos que hayas apuntado tú, por marca.
 *
 * No vienen escritos de fábrica a propósito: los números de atención cambian y
 * uno equivocado te hace perder una mañana. Además, el que de verdad sirve
 * suele ser el de tu delegación o distribuidor, no el 900 genérico. Apúntalo
 * la primera vez y ya se queda.
 */
export function telefonosSat() {
  try { return JSON.parse(localStorage.getItem(CLAVE_TELEFONOS) || '{}'); } catch { return {}; }
}

/** Apuntar (o borrar, pasando cadena vacía) el teléfono de una marca. */
export function guardarTelefonoSat(idMarca, telefono) {
  const todos = telefonosSat();
  const t = String(telefono ?? '').trim();
  if (t) todos[idMarca] = t; else delete todos[idMarca];
  try { localStorage.setItem(CLAVE_TELEFONOS, JSON.stringify(todos)); } catch { /* sin almacenamiento, se pierde al cerrar */ }
  return todos;
}
