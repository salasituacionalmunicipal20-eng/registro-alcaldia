/* Prueba de punta a punta del programa que va DENTRO del formulario de Google
   (worker-gforms/apps-script.gs) contra el intermediario REAL
   (worker-gforms/worker.js), sin tocar Google ni Firebase.

   Se carga el .gs tal cual en una caja aparte con imitaciones de FormApp,
   ScriptApp, Utilities, UrlFetchApp y PropertiesService. Lo que el programa
   manda se pasa por el intermediario, con la firma y la hora de verdad.

       node pruebas/apps-script-gforms.mjs              corre las pruebas
       node pruebas/apps-script-gforms.mjs --mutantes   rompe el programa y exige que se note */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const GS = path.join(AQUI, '..', 'worker-gforms', 'apps-script.gs');

if (process.argv.includes('--mutantes')) {
  const fuente = fs.readFileSync(GS, 'utf8');
  const MUT = [
    ['los bytes de la firma con signo', "('0' + (b & 0xff).toString(16)).slice(-2)", "('0' + b.toString(16)).slice(-2)"],
    ['un error al enviar tumba el disparador', "  } catch (err) {\n    // No se pierde", "  } finally {\n    // No se pierde"],
    ['se pierde la última respuesta de cada lote', 'respuestas.slice(i, i + LOTE)', 'respuestas.slice(i, i + LOTE - 1)'],
    ['un tipo nuevo de Google se manda tal cual', "tipo: CONOCIDOS_.indexOf(tipo) >= 0 ? tipo : 'OTRO'", 'tipo: tipo'],
    ['la lista de vigentes va sin su hora', 'hasta: hasta });', '});'],
    ['se instala sin clave', "  if (!clave_()) throw new Error('Falta la propiedad CLAVE_FIRMA (Configuración del proyecto → Propiedades del script).');\n", ''],
    ['las respuestas vacías se mandan', "    if (x === null || x === undefined || x === '') return;\n", ''],
  ];
  let vivos = 0;
  for (const [nombre, a, b] of MUT) {
    if (fuente.split(a).length !== 2) { console.log(`  ? ${nombre}: no encontré el texto`); vivos++; continue; }
    const tmp = path.join(AQUI, '..', 'worker-gforms', '.mutante.gs');
    fs.writeFileSync(tmp, fuente.replace(a, b));
    try {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, GS_RUTA: tmp }, encoding: 'utf8' });
      const notada = r.status !== 0; if (!notada) vivos++;
      console.log(`  ${notada ? '✓' : '✗'} ${nombre}: ${notada ? 'detectado' : '¡NADIE LO NOTÓ!'}`);
    } finally { fs.rmSync(tmp, { force: true }); }
  }
  console.log(`\nmutantes vivos: ${vivos}`);
  process.exit(vivos ? 1 : 0);
}

const W = await import(pathToFileURL(path.join(AQUI, '..', 'worker-gforms', 'worker.js')).href);
const FORM_ID = '1ZwYffa5Ql29NuKWGZJ177ArhQXLpbzUHJykrcUnBHok';
const CLAVE = crypto.randomBytes(32).toString('base64url');
const ENV = { CLAVE_FIRMA: CLAVE, FIREBASE_DB: 'https://base.prueba', FIREBASE_API_KEY: 'k', ROBOT_CORREO: 'r', ROBOT_CLAVE: 's',
  FORMULARIOS: JSON.stringify({ [FORM_ID]: 'terraza-hugo-chavez-2026' }) };

// ---------------------------------------------------- imitación de Google
function item(id, tipo, titulo, extra = {}) {
  const base = { getId: () => id, getType: () => ({ toString: () => tipo }), getTitle: () => titulo, getHelpText: () => extra.ayuda || '' };
  const como = { isRequired: () => !!extra.obligatoria, getChoices: () => (extra.opciones || []).map(v => ({ getValue: () => v })),
    hasOtherOption: () => !!extra.otro, getRows: () => extra.filas || [], getColumns: () => extra.columnas || [],
    getLowerBound: () => 1, getUpperBound: () => 5, getLeftLabel: () => 'poco', getRightLabel: () => 'mucho' };
  for (const m of ['asTextItem', 'asParagraphTextItem', 'asMultipleChoiceItem', 'asCheckboxItem', 'asListItem', 'asScaleItem', 'asGridItem', 'asCheckboxGridItem', 'asDateItem']) base[m] = () => como;
  return base;
}
const ITEMS = [
  item(11, 'TEXT', 'INDIQUE SI ES CASA/TORRE/RANCHO'),
  item(12, 'TEXT', 'JEFE DE FAMILIA', { obligatoria: true }),
  item(13, 'MULTIPLE_CHOICE', 'NUCLEO FAMILIAR', { opciones: ['ESPOSO(A)', 'HIJO(HIJA)'], otro: true }),
  item(14, 'DATE', 'FECHA DE NACIMIENTO', { obligatoria: true }),
  item(15, 'CHECKBOX', 'BONOS', { opciones: ['A', 'B'] }),
  item(16, 'GRID', 'CUADRÍCULA', { filas: ['f1', 'f2'], columnas: ['c1', 'c2'] }),
  item(17, 'LIST', 'CENTRO DE VOTACIÒN', { opciones: ['ESCUELA APACUANA', 'CASA COMUNAL'] }),
  item(18, 'SECTION_HEADER', 'Sección 2'),
  item(19, 'ALGO_NUEVO_DE_GOOGLE', 'Pregunta de un tipo que no existía'),
  item(20, 'SCALE', 'Satisfacción')
];
const porId = Object.fromEntries(ITEMS.map(i => [i.getId(), i]));
function respuesta(id, ms, valores, correo = '') {
  return { getId: () => id, getTimestamp: () => new Date(ms), getRespondentEmail: () => correo,
    getItemResponses: () => Object.entries(valores).map(([k, x]) => ({ getItem: () => porId[k], getResponse: () => x })) };
}
const AHORA = Date.now();
const RESPUESTAS = Array.from({ length: 205 }, (_, i) => respuesta('2_ABaOnud' + i, AHORA - 3600000 + i * 1000, {
  11: 'CASA 12', 12: i === 0 ? 'MARÍA PEÑA ÑÁÉÍÓÚ' : 'Persona ' + i, 13: 'ESPOSO(A)', 14: '1980-05-02', 15: ['A', 'B'],
  16: ['c1', null], 17: 'CENTRO DE VOTACIÒN "NEGRA CORREA"', 19: 'x', 20: '4', ...(i === 1 ? { 11: '' } : {})
}, i === 2 ? 'alguien@example.com' : ''));

let enviados, triggers, propiedades, fallarEnvio = false, registro;
function cajaNueva() {
  enviados = []; triggers = []; registro = [];
  const Utilities = {
    Charset: { UTF_8: 'UTF-8' },
    computeHmacSha256Signature: (valor, clave, charset) => {
      if (charset !== 'UTF-8') throw new Error('se esperaba UTF-8');
      return [...crypto.createHmac('sha256', Buffer.from(clave, 'utf8')).update(Buffer.from(valor, 'utf8')).digest()].map(b => (b > 127 ? b - 256 : b));
    }
  };
  const UrlFetchApp = { fetch: (url, op) => {
    enviados.push({ url, op });
    if (fallarEnvio) return { getResponseCode: () => 502, getContentText: () => 'caído' };
    return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
  } };
  const ScriptApp = {
    getProjectTriggers: () => triggers.slice(), deleteTrigger: t => { triggers = triggers.filter(x => x !== t); },
    newTrigger: (fn) => { const t = { fn }; const cad = { forForm: () => cad, onFormSubmit: () => cad, timeBased: () => cad, everyHours: h => { t.horas = h; return cad; }, create: () => { triggers.push(t); return t; } }; return cad; }
  };
  const form = { getId: () => FORM_ID, getTitle: () => 'CARACTERIZACIÒN COMUNA TERRAZA', getDescription: () => 'La importancia de la educación popular',
    getItems: () => ITEMS, getResponses: () => RESPUESTAS };
  const ctx = vm.createContext({
    FormApp: { getActiveForm: () => form }, ScriptApp, Utilities, UrlFetchApp,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => propiedades[k] || null }) },
    console: { log: (m) => registro.push(m), error: (m) => registro.push('ERROR ' + m) }, Date, JSON, Array, String, Object
  });
  vm.runInContext(fs.readFileSync(process.env.GS_RUTA || GS, 'utf8'), ctx, { filename: 'apps-script.gs' });
  return ctx;
}

// Lo que el programa mandó, pasado por el intermediario real (firma y hora de verdad).
const guardado = [];
async function pasarPorIntermediario() {
  guardado.length = 0; W.olvidarRobot();
  globalThis.fetch = async (url, op = {}) => {
    if (String(url).includes('identitytoolkit')) return new Response(JSON.stringify({ idToken: 't', expiresIn: '3600' }));
    guardado.push(JSON.parse(op.body)); return new Response('{}');
  };
  const estados = [];
  for (const e of enviados) {
    const req = new Request(e.url, { method: 'POST', headers: { ...e.op.headers, 'Content-Type': e.op.contentType,
      'Content-Length': String(Buffer.byteLength(e.op.payload, 'utf8')) }, body: Buffer.from(e.op.payload, 'utf8') });
    try { estados.push((await W.atender(req, ENV)).status); }
    catch (x) { estados.push(x.estado || 'error: ' + x.message); }
  }
  return estados;
}

let ok = 0, mal = 0;
async function prueba(nombre, fn) { try { await fn(); ok++; console.log('  ✓', nombre); } catch (e) { mal++; console.log('  ✗', nombre, '→', e.message); } }
function cierto(c, que) { if (!c) throw new Error(que); }
function igual(a, b, que) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${que}: esperaba ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

console.log('\nInstalación');
await prueba('sin la clave en las propiedades no se instala', async () => {
  propiedades = {}; const c = cajaNueva(); let error = null;
  try { c.instalar(); } catch (e) { error = e; }
  cierto(error && /CLAVE_FIRMA/.test(error.message), 'debía avisar que falta la clave'); igual(enviados.length, 0, 'envíos');
});
await prueba('instalar deja dos disparadores: al enviar y cada hora', async () => {
  propiedades = { CLAVE_FIRMA: CLAVE }; const c = cajaNueva(); c.instalar();
  igual(triggers.map(t => t.fn).sort(), ['alEnviar', 'sincronizarTodo'], 'disparadores'); igual(triggers.find(t => t.fn === 'sincronizarTodo').horas, 1, 'cada hora');
});
await prueba('instalar dos veces no duplica los disparadores', async () => {
  propiedades = { CLAVE_FIRMA: CLAVE }; const c = cajaNueva(); c.instalar(); c.instalar(); igual(triggers.length, 2, 'disparadores');
});

console.log('\nSincronización completa (205 respuestas, con tildes y ñ)');
propiedades = { CLAVE_FIRMA: CLAVE }; { const c = cajaNueva(); c.sincronizarTodo(); }
const estados = await pasarPorIntermediario();
await prueba('el intermediario acepta TODOS los envíos (las firmas coinciden)', async () => { cierto(estados.length >= 4 && estados.every(s => s === 200), 'estados: ' + JSON.stringify(estados)); });
await prueba('manda las preguntas, dos lotes de respuestas (200 + 5) y la lista de vigentes', async () => {
  const tipos = enviados.map(e => JSON.parse(e.op.payload).tipo); igual(tipos, ['estructura', 'respuestas', 'respuestas', 'vigentes'], 'orden');
  igual(JSON.parse(enviados[1].op.payload).respuestas.length, 200, 'lote 1'); igual(JSON.parse(enviados[2].op.payload).respuestas.length, 5, 'lote 2');
});
const est = guardado[0].estructura;
await prueba('las preguntas llegan en orden, con sus opciones, "otro" y obligatorias', async () => {
  igual(est.orden, ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20'], 'orden');
  igual(est.preguntas['13'].opciones, ['ESPOSO(A)', 'HIJO(HIJA)'], 'opciones'); igual(est.preguntas['13'].otro, true, 'otro');
  igual(est.preguntas['12'].obligatoria, true, 'obligatoria'); igual(est.preguntas['16'].filas, ['f1', 'f2'], 'filas');
  igual(guardado[0]['meta/titulo'], 'CARACTERIZACIÒN COMUNA TERRAZA', 'título con tilde');
});
await prueba('un tipo de pregunta nuevo de Google llega como OTRO (no traba nada)', async () => { igual(est.preguntas['19'].tipo, 'OTRO', 'tipo'); });
await prueba('la escala lleva sus límites', async () => { igual(est.preguntas['20'].escala, { min: 1, max: 5, izq: 'poco', der: 'mucho' }, 'escala'); });
const r0 = guardado[1]['respuestas/2_ABaOnud0'];
await prueba('las tildes y la ñ llegan intactas', async () => { igual(r0.v['12'], 'MARÍA PEÑA ÑÁÉÍÓÚ', 'nombre'); igual(r0.v['17'], 'CENTRO DE VOTACIÒN "NEGRA CORREA"', 'centro'); });
await prueba('las casillas llegan como lista y la cuadrícula con su celda vacía', async () => { igual(r0.v['15'], ['A', 'B'], 'casillas'); igual(r0.v['16'], ['c1', ''], 'cuadrícula'); });
await prueba('una respuesta vacía no se manda', async () => { cierto(!('11' in guardado[1]['respuestas/2_ABaOnud1'].v), 'la vacía llegó'); });
await prueba('el correo va solo si el formulario lo recogió', async () => { igual(guardado[1]['respuestas/2_ABaOnud2'].correo, 'alguien@example.com', 'correo'); cierto(!('correo' in r0), 'correo vacío'); });
await prueba('la hora de envío es la de Google', async () => { igual(r0.enviada, AHORA - 3600000, 'hora'); });
await prueba('la lista de vigentes trae las 205 y una hora de corte', async () => {
  const v = guardado[3]; igual(Object.keys(v.vigentes).length, 205, 'vigentes'); cierto(v['meta/vigentes_hasta'] <= Date.now() - 59000, 'hora de corte');
});

console.log('\nAl enviar el formulario');
await prueba('manda solo esa respuesta', async () => {
  propiedades = { CLAVE_FIRMA: CLAVE }; const c = cajaNueva(); fallarEnvio = false;
  c.alEnviar({ response: RESPUESTAS[7] });
  igual(enviados.length, 1, 'envíos'); const st = await pasarPorIntermediario(); igual(st, [200], 'estado');
  igual(guardado[0]['respuestas/2_ABaOnud7'].v['12'], 'Persona 7', 'valor');
});
await prueba('si la Sala no responde, no se cae y deja aviso (se reintenta cada hora)', async () => {
  propiedades = { CLAVE_FIRMA: CLAVE }; const c = cajaNueva(); fallarEnvio = true;
  let error = null; try { c.alEnviar({ response: RESPUESTAS[3] }); } catch (e) { error = e; }
  fallarEnvio = false;
  cierto(!error, 'el disparador se cayó'); cierto(registro.some(m => /^ERROR .*reintentará/.test(m)), 'no dejó aviso');
});

console.log(`\n${mal ? '✗' : '✓'} ${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
