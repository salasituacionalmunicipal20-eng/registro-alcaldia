/* Pruebas de la lógica del tablero de formularios de Google
   (formularios-google-logica.js), cargando el archivo REAL.

       node pruebas/formularios-google.mjs              corre las pruebas
       node pruebas/formularios-google.mjs --mutantes   rompe la lógica y exige que se note */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL = path.join(AQUI, '..', 'formularios-google-logica.js');

if (process.argv.includes('--mutantes')) {
  const fuente = fs.readFileSync(ORIGINAL, 'utf8');
  const MUT = [
    ['las tildes no se quitan al agrupar', ".normalize('NFD').replace(/\\p{Diacritic}/gu, '')", ''],
    ['"ninguna" cuenta como enfermedad', "return NEGATIVAS.has(normalizar(v).replace(/[.,;:!¡¿?]+$/g, '').trim());", 'return false;'],
    ['las respuestas borradas en Google se siguen contando', "return !hasta || (vig && vig[id]) || Number(res[id].enviada) > hasta;", 'return true;'],
    ['las que llegan después de la lista no se cuentan', "return !hasta || (vig && vig[id]) || Number(res[id].enviada) > hasta;", 'return !hasta || (vig && vig[id]);'],
    ['lo escrito en «Otro» se pierde', "if (nOtros) salida.filas.push({ valor: 'Otra respuesta', cantidad: nOtros, esOtro: true });", ''],
    ['se agrupan valores que no son iguales', "const k = normalizar(t);\n      if (!grupos.has(k))", "const k = normalizar(t).replace(/S$/, '');\n      if (!grupos.has(k))"],
    ['la edad no se calcula con la fecha de nacimiento', "e = edadDesdeFecha(val(r, P.nacimiento), hoy);", 'e = null;'],
    ['el cumpleaños no se toma en cuenta', "if (h.getMonth() + 1 < Number(m[2]) || (h.getMonth() + 1 === Number(m[2]) && h.getDate() < Number(m[3]))) e--;", ''],
    ['las familias se cuentan por persona, no por jefe', "familias: P.jefe ? distintos(P.jefe) : null,", 'familias: P.jefe ? lista.length : null,'],
    ['el Excel pierde la fecha de envío', "{ titulo: 'Fecha y hora de envío', ancho: 20, de: function (r) { return fechaHora(r.enviada); } }", "{ titulo: 'Fecha y hora de envío', ancho: 20, de: function () { return ''; } }"],
    ['las secciones se cuentan como preguntas', "return p[id] && SIN_RESPUESTA.indexOf(p[id].tipo) < 0;", 'return !!p[id];'],
    ['la cuadrícula pierde el nombre de la fila', "return t ? (filas[i] || ('Fila ' + (i + 1))) + ': ' + t : '';", "return t;"],
    ['un número con letras no se reconoce', "(?:\\s*[A-Za-zÁÉÍÓÚáéíóúñÑ.]*)?$/);", '$/);'],
  ];
  let vivos = 0;
  for (const [nombre, a, b] of MUT) {
    if (fuente.split(a).length !== 2) { console.log(`  ? ${nombre}: no encontré el texto`); vivos++; continue; }
    const tmp = path.join(AQUI, '.mutante-logica.js');
    fs.writeFileSync(tmp, fuente.replace(a, b));
    try {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, LOGICA_RUTA: tmp }, encoding: 'utf8' });
      const notada = r.status !== 0; if (!notada) vivos++;
      console.log(`  ${notada ? '✓' : '✗'} ${nombre}: ${notada ? 'detectado' : '¡NADIE LO NOTÓ!'}`);
    } finally { fs.rmSync(tmp, { force: true }); }
  }
  console.log(`\nmutantes vivos: ${vivos}`);
  process.exit(vivos ? 1 : 0);
}

const caja = { globalThis: {} };
caja.globalThis = caja;
vm.createContext(caja);
vm.runInContext(fs.readFileSync(process.env.LOGICA_RUTA || ORIGINAL, 'utf8'), caja);
const L = caja.GFormsLogica;

let ok = 0, mal = 0;
function prueba(nombre, fn) { try { fn(); ok++; console.log('  ✓', nombre); } catch (e) { mal++; console.log('  ✗', nombre, '→', e.message); } }
function igual(a, b, que = 'valor') { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${que}: esperaba ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

// Un formulario como el de la Comuna Terraza de Hugo Chávez (títulos reales).
const T = (id, titulo, tipo = 'TEXT', extra = {}) => [id, { titulo, tipo, ...extra }];
const ESTR = Object.fromEntries([
  T('1', 'INDIQUE SI ES CASA/TORRE/RANCHO Y SEGUIDAMENTE EL NUMERO '),
  T('2', 'JEFE DE FAMILIA (NOMBRE Y APELLIDO)'),
  T('3', 'NUCLEO FAMILIAR ( MENCIONE PARENTEZCO)', 'MULTIPLE_CHOICE', { opciones: ['ESPOSO(A)', 'HIJO(HIJA)', ''], otro: true }),
  T('7', 'FECHA DE NACIMIENTO ', 'DATE'),
  T('8', 'EDAD '),
  T('9', 'SEXO', 'MULTIPLE_CHOICE', { opciones: ['FEMENINA', 'MASCULINO'] }),
  T('10', 'PADECE ALGUNA ENFERMEDAD? INDIQUE'),
  T('11', 'TOMA ALGUN MEDICAMENTO? INDIQUE'),
  T('12', 'POSEE EL CARNET DE LA PATRIA', 'MULTIPLE_CHOICE', { opciones: ['SI', 'NO'] }),
  T('14', 'PADECE ALGUNA DISCAPACIDAD? INDIQUE '),
  T('15', 'POSEE EL CARNET DE DISCAPACIDAD?', 'MULTIPLE_CHOICE', { opciones: ['SI', 'NO'] }),
  T('16', 'EMBARAZADA (INDIQUE TIEMPO DE GESTACIÒN)'),
  T('17', 'LACTANTE ', 'MULTIPLE_CHOICE', { opciones: ['SI', 'NO'] }),
  T('18', 'POSEE CILINDRO DE GAS (INDIQUE KG)', 'MULTIPLE_CHOICE', { opciones: ['10 KG', '18 KG', '43 KG'] }),
  T('19', 'INDIQUE CANTIDAD DE CILINDROS'),
  T('24', 'MENCIONE CENTRO DE VOTACIÒN (DENTRO DEL MUNICIPIO CRISTOBAL ROJAS)', 'LIST', { opciones: ['ESCUELA APACUANA', 'CASA COMUNAL'] }),
  T('27', 'CLASIFICACIÒN DEL VOTO', 'MULTIPLE_CHOICE', { opciones: ['V D', 'V B', 'V O'] }),
  T('90', 'Sección de salud', 'SECTION_HEADER'),
  T('91', 'Cuadrícula', 'GRID', { filas: ['Luz', 'Agua'], columnas: ['Bien', 'Mal'] }),
  T('92', 'Bonos', 'CHECKBOX', { opciones: ['A', 'B'] })
]);
const ORDEN = ['1', '2', '3', '7', '8', '9', '90', '10', '11', '12', '14', '15', '16', '17', '18', '19', '24', '27', '91', '92'];
const HOY = new Date(2026, 8, 19, 10, 0, 0);
const R = (id, ms, v) => [id, { enviada: ms, v }];
const RESP = Object.fromEntries([
  R('a1', 1000, { 1: 'CASA 12', 2: 'Ana Pérez', 9: 'FEMENINA', 8: '45', 10: 'Ninguna.', 11: 'no', 12: 'SI', 14: 'NO', 15: 'NO', 16: 'no', 17: 'NO', 18: '10 KG', 19: '2', 27: 'V D', 24: 'ESCUELA APACUANA', 91: ['Bien', 'Mal'], 92: ['A', 'B'] }),
  R('a2', 2000, { 1: 'casa 12 ', 2: 'ANA  PEREZ', 3: 'HIJO(HIJA)', 9: 'MASCULINO', 8: '10 años', 10: 'ASMA', 11: 'SALBUTAMOL', 12: 'SI', 14: 'VISUAL', 15: 'SI', 17: 'NO', 18: '18 KG', 19: '1', 27: 'V B' }),
  R('a3', 3000, { 1: 'TORRE 3', 2: 'Luis Rojas', 3: 'SOBRINO', 9: 'FEMENINA', 7: '2008-09-20', 10: 'asma', 16: '5 MESES', 17: 'SI', 27: 'V D', 24: 'OTRA ESCUELA' }),
  R('a4', 4000, { 1: 'TORRE 3', 2: 'Luis Rojas', 9: 'MASCULINO', 7: '1950-01-01', 8: 'no sé', 10: 'N/A', 14: 'no aplica' }),
  R('borrada', 5000, { 2: 'Persona borrada en Google', 9: 'FEMENINA' }),
  R('nueva', 99000, { 2: 'Llegó después de la lista', 9: 'FEMENINA', 8: '70' })
]);
const DATOS = { meta: { vigentes_hasta: 50000 }, estructura: { orden: ORDEN, preguntas: ESTR }, respuestas: RESP,
  vigentes: { a1: true, a2: true, a3: true, a4: true } };

console.log('\nNormalizar y "no"');
prueba('agrupa sin tildes, mayúsculas ni espacios de más', () => igual(L.normalizar('  Ána   pérez '), 'ANA PEREZ'));
prueba('"no", "Ninguna.", "N/A" y "no aplica" son negativas', () => igual(['no', 'Ninguna.', 'N/A', 'no aplica', ' NINGUNO '].map(L.esNegativa), [true, true, true, true, true]));
prueba('"asma", "no sé" o "5 meses" no son negativas', () => igual(['asma', 'no sé', '5 MESES'].map(L.esNegativa), [false, false, false]));

console.log('\nRespuestas vigentes');
const LISTA = L.vigentes(DATOS);
prueba('no cuenta la que se borró en Google', () => igual(LISTA.some(r => r.id === 'borrada'), false));
prueba('sí cuenta la que llegó después de la última lista', () => igual(LISTA.some(r => r.id === 'nueva'), true));
prueba('van de la más nueva a la más vieja', () => igual(LISTA.map(r => r.id), ['nueva', 'a4', 'a3', 'a2', 'a1']));
prueba('sin lista todavía, cuentan todas', () => igual(L.vigentes({ respuestas: RESP }).length, 6));

console.log('\nPreguntas y valores');
const PREGS = L.preguntasConRespuesta(DATOS.estructura);
prueba('las secciones no son preguntas y el orden se respeta', () => igual(PREGS.map(p => p.id), ORDEN.filter(x => x !== '90')));
prueba('la fecha se muestra como día/mes/año', () => igual(L.comoTexto('2008-09-20', ESTR['7']), '20/09/2008'));
prueba('la cuadrícula dice cada fila', () => igual(L.comoTexto(['Bien', 'Mal'], ESTR['91']), 'Luz: Bien · Agua: Mal'));
prueba('las casillas van separadas por coma', () => igual(L.comoTexto(['A', 'B'], ESTR['92']), 'A, B'));

console.log('\nConteo por pregunta');
const sexo = L.resumen({ id: '9', ...ESTR['9'] }, LISTA);
prueba('cuenta cada opción en el orden del formulario', () => igual(sexo.filas.map(f => [f.valor, f.cantidad]), [['FEMENINA', 3], ['MASCULINO', 2]]));
const paren = L.resumen({ id: '3', ...ESTR['3'] }, LISTA);
prueba('lo escrito en «Otro» se cuenta aparte y se detalla', () => { igual(paren.filas.map(f => [f.valor, f.cantidad]), [['ESPOSO(A)', 0], ['HIJO(HIJA)', 1], ['Otra respuesta', 1]]); igual(paren.otros, [{ valor: 'SOBRINO', cantidad: 1 }]); });
prueba('en las casillas cuenta cada marca', () => igual(L.resumen({ id: '92', ...ESTR['92'] }, LISTA).filas.map(f => f.cantidad), [1, 1]));
const enf = L.resumen({ id: '10', ...ESTR['10'] }, LISTA);
prueba('abiertas: une "ASMA" y "asma" (lo mismo), nada más', () => igual(enf.filas.find(f => L.normalizar(f.valor) === 'ASMA').cantidad, 2));
prueba('abiertas: no une valores distintos ("ALERGIA" ≠ "ALERGIAS")', () => {
  const s = L.resumen({ id: '10', ...ESTR['10'] }, [{ v: { 10: 'ALERGIA' } }, { v: { 10: 'ALERGIAS' } }]);
  igual(s.filas.length, 2);
});
const cil = L.resumen({ id: '19', ...ESTR['19'] }, LISTA);
prueba('números: mínimo, máximo, promedio y suma', () => igual(cil.numeros, { cuantos: 2, min: 1, max: 2, promedio: 1.5, suma: 3 }));
prueba('dice cuántos respondieron de cuántos', () => { igual(sexo.respondieron, 5); igual(sexo.total, 5); });

console.log('\nNúmeros y edades');
prueba('lee "45", "10 años" y "2,5"', () => igual(['45', '10 años', '2,5'].map(L.numeroDe), [45, 10, 2.5]));
prueba('no inventa números ("no sé", "12-15", "abc")', () => igual(['no sé', '12-15', 'abc'].map(L.numeroDe), [null, null, null]));
prueba('edad desde la fecha: cumple mañana → todavía no', () => igual(L.edadDesdeFecha('2008-09-20', HOY), 17));
prueba('edad desde la fecha: ya cumplió', () => igual(L.edadDesdeFecha('2008-09-19', HOY), 18));

console.log('\nLa comunidad en números');
const P = L.perfilCaracterizacion(PREGS, LISTA, HOY);
prueba('reconoce el formulario de caracterización', () => igual(!!P, true));
prueba('personas = respuestas vigentes', () => igual(P.personas, 5));
prueba('familias = jefes de familia distintos (sin importar tildes ni espacios)', () => igual(P.familias, 3));
prueba('viviendas distintas ("CASA 12" y "casa 12 " son la misma)', () => igual(P.viviendas, 2));
prueba('grupos de edad, calculando con la fecha cuando falta la edad', () => {
  igual(P.edades.grupos.map(g => g.cantidad), [1, 1, 1, 2]); igual(P.edades.desdeFecha, 2); igual(P.edades.sinEdad, 0);
});
prueba('discapacidad: cuenta "VISUAL", no "NO" ni "no aplica"', () => { igual(P.discapacidad.cantidad, 1); igual(P.discapacidad.detalle, [{ valor: 'VISUAL', cantidad: 1 }]); });
prueba('carnet de discapacidad = los que dijeron SI', () => igual(P.carnetDiscapacidad, 1));
prueba('embarazadas: cuenta "5 MESES", no "no"', () => igual(P.embarazadas.cantidad, 1));
prueba('lactantes = SI', () => igual(P.lactantes, 1));
prueba('enfermedad: 2 con asma, "Ninguna." y "N/A" no cuentan', () => igual(P.enfermedad.cantidad, 2));
prueba('cilindros de gas: suma lo escrito', () => igual(P.cilindros, { total: 3, respondieron: 2 }));
prueba('clasificación del voto por opción', () => igual(P.voto.map(f => [f.valor, f.cantidad]), [['V D', 2], ['V B', 1], ['V O', 0]]));
prueba('un formulario de otro tipo no tiene este resumen', () => igual(L.perfilCaracterizacion([{ id: '1', titulo: 'COLOR FAVORITO', tipo: 'TEXT' }], LISTA, HOY), null));

console.log('\nBuscar y filtrar');
const a2 = LISTA.find(r => r.id === 'a2');
prueba('busca sin importar tildes ni mayúsculas', () => { igual(L.coincide(a2, PREGS, 'perez'), true); igual(L.coincide(a2, PREGS, 'rojas'), false); });
prueba('filtrar por «Otra respuesta» encuentra lo escrito fuera de las opciones', () => {
  const a3 = LISTA.find(r => r.id === 'a3');
  igual(L.tieneValor(a3, { id: '3' }, 'Otra respuesta', ESTR['3'].opciones), true);
  igual(L.tieneValor(a2, { id: '3' }, 'Otra respuesta', ESTR['3'].opciones), false);
  igual(L.tieneValor(a2, { id: '3' }, 'HIJO(HIJA)', ESTR['3'].opciones), true);
});

console.log('\nExcel');
const X = L.tablaExcel(PREGS, LISTA);
prueba('encabezados, anchos y cada fila tienen la MISMA cantidad de columnas', () => {
  igual(X.anchos.length, X.encabezados.length, 'anchos'); X.filas.forEach((f, i) => igual(f.length, X.encabezados.length, 'fila ' + i));
});
prueba('todas las preguntas, en orden, después de N° y la fecha', () => igual(X.encabezados.slice(0, 4), ['N°', 'Fecha y hora de envío', ESTR['1'].titulo, ESTR['2'].titulo]));
prueba('numera y pone la fecha de envío', () => { igual(X.filas[0][0], 1); igual(X.filas[4][1], L.fechaHora(1000)); });

console.log('\nFechas');
prueba('fecha larga con año y numérica', () => igual(L.fechaLarga(new Date(2026, 8, 19).getTime()), 'sábado 19 de septiembre de 2026 · 19/09/2026'));
prueba('"hace cuánto" en palabras', () => igual([30e3, 5 * 60e3, 3 * 3600e3].map(ms => L.haceCuanto(0, ms)), ['hace menos de un minuto', 'hace 5 minutos', 'hace 3 horas']));

console.log(`\n${mal ? '✗' : '✓'} ${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
