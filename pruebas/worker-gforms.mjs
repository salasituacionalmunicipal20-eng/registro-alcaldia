/* Pruebas del intermediario de formularios de Google (worker-gforms/worker.js).
   Importan el código REAL; la conexión a Google y a Firebase se reemplaza
   por una falsa que anota lo que se intentó escribir.

       node pruebas/worker-gforms.mjs              corre las pruebas
       node pruebas/worker-gforms.mjs --mutantes   rompe cada candado y exige
                                                   que alguna prueba lo note */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL = path.join(AQUI, '..', 'worker-gforms', 'worker.js');

// ------------------------------------------------------------ mutantes
if (process.argv.includes('--mutantes')) {
  const fuente = fs.readFileSync(ORIGINAL, 'utf8');
  const MUT = [
    ['no se comprueba la firma', "  await comprobarFirma(env, req.headers.get('X-Momento'), req.headers.get('X-Firma'), cuerpo, ahora);\n", ''],
    ['se acepta cualquier hora', 'if (Math.abs(ahora - Number(momentoTxt)) > VENTANA_MS)', 'if (false)'],
    ['la comparación de firmas siempre dice que sí', 'return d === 0;', 'return true;'],
    ['sin clave de firma se acepta todo', "if (!env.CLAVE_FIRMA || env.CLAVE_FIRMA.length < 32) throw new Rechazo(500, 'El intermediario no tiene su clave de firma.');", ''],
    ['cualquier formulario entra', "if (!clave) throw new Rechazo(403, 'Ese formulario no está conectado con la Sala Situacional.');", ''],
    ['el identificador de respuesta no se revisa', "if (!RE_RESPUESTA.test(String(r.id || ''))) throw new Rechazo(400, 'Una respuesta trae un identificador raro.');", ''],
    ['la pregunta de una respuesta no se revisa', "if (!RE_PREGUNTA.test(k)) throw new Rechazo(400, 'Una respuesta trae una pregunta rara.');", ''],
    ['los textos largos no se recortan', "return s.length > max ? s.slice(0, max) + ' […recortado]' : s;", 'return s;'],
    ['no se exige el tamaño del envío', "if (!Number.isFinite(largo) || largo <= 0) throw new Rechazo(411, 'Falta el tamaño del envío.');", ''],
    ['no se reintenta cuando la ficha del robot vence', "if (r.status === 401 && intento === 0) continue;", ''],
    ['el robot entra en cada envío', 'if (!forzar && fichaRobot && fichaRobot.vence > Date.now() + 60000) return fichaRobot.token;', ''],
    ['un id de lista vigente no se revisa', "      if (!RE_RESPUESTA.test(String(id))) throw new Rechazo(400, 'Una respuesta trae un identificador raro.');\n", ''],
    ['un valor que no es texto se acepta', "if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') throw new Rechazo(400, 'Un valor no es texto.');", ''],
  ];
  let vivos = 0;
  for (const [nombre, a, b] of MUT) {
    if (fuente.split(a).length !== 2) { console.log(`  ? ${nombre}: no encontré el texto`); vivos++; continue; }
    const tmp = path.join(AQUI, '..', 'worker-gforms', '.mutante.js');
    fs.writeFileSync(tmp, fuente.replace(a, b));
    try {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, WORKER_RUTA: tmp }, encoding: 'utf8' });
      const notada = r.status !== 0;
      if (!notada) vivos++;
      console.log(`  ${notada ? '✓' : '✗'} ${nombre}: ${notada ? 'detectado' : '¡NADIE LO NOTÓ!'}`);
    } finally { fs.rmSync(tmp, { force: true }); }
  }
  console.log(`\nmutantes vivos: ${vivos}`);
  process.exit(vivos ? 1 : 0);
}

// -------------------------------------------------------------- pruebas
const W = await import(pathToFileURL(process.env.WORKER_RUTA || ORIGINAL).href);
const CLAVE = 'k'.repeat(40);
const FORM_ID = '1ZwYffa5Ql29NuKWGZJ177ArhQXLpbzUHJykrcUnBHok';
const ENV = {
  CLAVE_FIRMA: CLAVE, FIREBASE_DB: 'https://base.prueba', FIREBASE_API_KEY: 'clave-publica',
  ROBOT_CORREO: 'robot-gforms@alcaldia.com', ROBOT_CLAVE: 'secreta',
  FORMULARIOS: JSON.stringify({ [FORM_ID]: 'terraza-hugo-chavez-2026' })
};
const AHORA = 1789800000000;

// Red falsa: el inicio de sesión del robot y la base.
let red, estadoBase, entradas;
function reiniciarRed({ base = [200], login = 200 } = {}) {
  red = []; entradas = 0; estadoBase = [...base];
  W.olvidarRobot();
  globalThis.fetch = async (url, op = {}) => {
    const u = String(url);
    if (u.startsWith('https://identitytoolkit.googleapis.com/')) {
      entradas++;
      const cuerpo = JSON.parse(op.body);
      if (login !== 200 || cuerpo.password !== 'secreta') return new Response('{"error":{}}', { status: 400 });
      return new Response(JSON.stringify({ idToken: 'ficha-' + entradas, expiresIn: '3600' }), { status: 200 });
    }
    red.push({ url: u, metodo: op.method, datos: op.body ? JSON.parse(op.body) : null });
    const st = estadoBase.length > 1 ? estadoBase.shift() : estadoBase[0];
    return new Response('{}', { status: st });
  };
}

async function envio(cuerpoObj, { clave = CLAVE, momento = AHORA, firma, ruta = '/recibir', metodo = 'POST', sinLargo = false, largo, env = ENV, texto } = {}) {
  const cuerpo = texto ?? JSON.stringify(cuerpoObj);
  const f = firma ?? await W.firmar(clave, momento + '.' + cuerpo);
  const h = { 'X-Momento': String(momento), 'X-Firma': f };
  if (!sinLargo) h['Content-Length'] = String(largo ?? Buffer.byteLength(cuerpo));
  const req = new Request('https://formularios-google.alcaldiadecharallave.com' + ruta,
    metodo === 'POST' ? { method: 'POST', headers: h, body: cuerpo } : { method: metodo, headers: h });
  let r;
  try { r = await W.atender(req, env, AHORA); }
  catch (e) { if (e instanceof W.Rechazo) return { estado: e.estado, error: e.message }; throw e; }
  return { estado: r.status, cuerpo: await r.text() };
}

let ok = 0, mal = 0;
async function prueba(nombre, fn) {
  try { await fn(); ok++; console.log('  ✓', nombre); }
  catch (e) { mal++; console.log('  ✗', nombre, '→', e.message); }
}
function igual(a, b, que) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${que}: esperaba ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }
function cierto(c, que) { if (!c) throw new Error(que); }

const ESTRUCTURA = { form_id: FORM_ID, tipo: 'estructura', titulo: 'CARACTERIZACIÓN', descripcion: 'x', preguntas: [
  { id: 101, titulo: 'JEFE DE FAMILIA', tipo: 'TEXT', obligatoria: true },
  { id: 102, titulo: 'SEXO', tipo: 'MULTIPLE_CHOICE', opciones: ['FEMENINA', 'MASCULINO'], otro: false },
  { id: 103, titulo: 'CUADRÍCULA', tipo: 'GRID', filas: ['a', 'b'], columnas: ['1', '2'] }] };
const RESP = (id = 'ACYDBNj', extra = {}) => ({ id, enviada: AHORA - 5000, v: { 101: 'Ana Pérez', 102: 'FEMENINA', 103: ['1', '2'] }, ...extra });

console.log('\nFirma y hora');
await prueba('sin la hora del envío no entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { momento: '' }); igual(r.estado, 401, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('sin firma no entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { firma: '' }); igual(r.estado, 401, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('con otra clave no entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { clave: 'z'.repeat(40) }); igual(r.estado, 401, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('la firma de otro contenido no sirve', async () => {
  reiniciarRed();
  const bueno = JSON.stringify({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] });
  const f = await W.firmar(CLAVE, AHORA + '.' + bueno);
  const r = await envio(null, { texto: bueno.replace('Ana', 'Eva'), firma: f });
  igual(r.estado, 401, 'estado'); igual(red.length, 0, 'escrituras');
});
await prueba('un envío de hace 11 minutos no entra (no se puede repetir uno viejo)', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { momento: AHORA - 11 * 60000 }); igual(r.estado, 401, 'estado'); });
await prueba('un envío de 11 minutos en el futuro no entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { momento: AHORA + 11 * 60000 }); igual(r.estado, 401, 'estado'); });
await prueba('un envío de hace 9 minutos sí entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { momento: AHORA - 9 * 60000 }); igual(r.estado, 200, 'estado'); });
await prueba('si el intermediario no tiene su clave, rechaza todo', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { env: { ...ENV, CLAVE_FIRMA: '' } }); igual(r.estado, 500, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('comparar firmas: iguales sí, distintas o de otro largo no', async () => { cierto(W.igualesSeguro('abc', 'abc'), 'iguales'); cierto(!W.igualesSeguro('abc', 'abd'), 'distintas'); cierto(!W.igualesSeguro('abc', 'abcd'), 'largo'); cierto(!W.igualesSeguro(null, 'a'), 'nulo'); });

console.log('\nPuerta de entrada');
await prueba('GET / responde que está en línea', async () => { reiniciarRed(); const r = await envio(null, { ruta: '/', metodo: 'GET' }); igual(r.estado, 200, 'estado'); });
await prueba('otra dirección no existe', async () => { reiniciarRed(); const r = await envio({}, { ruta: '/otra' }); igual(r.estado, 404, 'estado'); });
await prueba('GET /recibir no se acepta', async () => { reiniciarRed(); const r = await envio(null, { metodo: 'GET' }); igual(r.estado, 405, 'estado'); });
await prueba('sin tamaño del envío no entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { sinLargo: true }); igual(r.estado, 411, 'estado'); });
await prueba('un envío de más de 8 MB no entra', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID }, { largo: 9 * 1024 * 1024 }); igual(r.estado, 413, 'estado'); });
await prueba('un formulario que no está en la lista no entra', async () => { reiniciarRed(); const r = await envio({ form_id: '1OtroFormularioQueNoEstaConectado123456', tipo: 'respuestas', respuestas: [RESP()] }); igual(r.estado, 403, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('si la lista de formularios está mal escrita, no se guarda nada', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }, { env: { ...ENV, FORMULARIOS: '{"x": "../operadores"}' } }); igual(r.estado, 500, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('un tipo de envío desconocido no se acepta', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'borrar' }); igual(r.estado, 400, 'estado'); igual(red.length, 0, 'escrituras'); });

console.log('\nEstructura (las preguntas)');
await prueba('se guarda en UNA escritura, con el robot, en gforms/<clave>', async () => {
  reiniciarRed(); const r = await envio(ESTRUCTURA); igual(r.estado, 200, 'estado');
  igual(red.length, 1, 'escrituras'); igual(red[0].metodo, 'PATCH', 'método');
  cierto(red[0].url.startsWith('https://base.prueba/gforms/terraza-hugo-chavez-2026.json?auth=ficha-1'), 'dirección ' + red[0].url);
  igual(red[0].datos.estructura.orden, ['101', '102', '103'], 'orden');
  igual(red[0].datos.estructura.preguntas['102'].opciones, ['FEMENINA', 'MASCULINO'], 'opciones');
  igual(red[0].datos['meta/titulo'], 'CARACTERIZACIÓN', 'título'); igual(red[0].datos['meta/form_id'], FORM_ID, 'form_id');
});
await prueba('una pregunta de tipo desconocido se rechaza', async () => { reiniciarRed(); const r = await envio({ ...ESTRUCTURA, preguntas: [{ id: 1, titulo: 'x', tipo: 'SCRIPT' }] }); igual(r.estado, 400, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('una pregunta con identificador raro se rechaza', async () => { reiniciarRed(); const r = await envio({ ...ESTRUCTURA, preguntas: [{ id: '1/../x', titulo: 'x', tipo: 'TEXT' }] }); igual(r.estado, 400, 'estado'); });
await prueba('una pregunta repetida se rechaza', async () => { reiniciarRed(); const r = await envio({ ...ESTRUCTURA, preguntas: [{ id: 1, titulo: 'x', tipo: 'TEXT' }, { id: 1, titulo: 'y', tipo: 'TEXT' }] }); igual(r.estado, 400, 'estado'); });

console.log('\nRespuestas');
await prueba('un lote se guarda con su lista de vigentes y la hora de llegada', async () => {
  reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA1'), RESP('BBBBB2')] });
  igual(r.estado, 200, 'estado'); igual(red.length, 1, 'escrituras');
  const d = red[0].datos;
  igual(d['respuestas/AAAAA1'].v['101'], 'Ana Pérez', 'valor'); igual(d['respuestas/AAAAA1'].v['103'], ['1', '2'], 'cuadrícula');
  igual(d['vigentes/BBBBB2'], true, 'vigente'); igual(d['meta/ultima_llegada'], AHORA, 'llegada');
});
await prueba('un identificador con "/" (para escribir en otra parte) se rechaza', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA/../../operadores')] }); igual(r.estado, 400, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('una respuesta a una pregunta rara se rechaza', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA1', { v: { 'x/y': 'a' } })] }); igual(r.estado, 400, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('un valor que es un objeto se rechaza', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA1', { v: { 101: { rol: 'admin' } } })] }); igual(r.estado, 400, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('un texto de más de 20.000 letras se recorta y lo dice', async () => {
  reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA1', { v: { 101: 'a'.repeat(25000) } })] });
  igual(r.estado, 200, 'estado'); const t = red[0].datos['respuestas/AAAAA1'].v['101'];
  cierto(t.length < 20100 && t.endsWith('[…recortado]'), 'recorte');
});
await prueba('lo que no es de una respuesta no se guarda', async () => {
  reiniciarRed(); await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA1', { rol: 'admin', borrar: true })] });
  igual(Object.keys(red[0].datos['respuestas/AAAAA1']).sort(), ['enviada', 'v'], 'campos');
});
await prueba('una fecha de envío rara se rechaza', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP('AAAAA1', { enviada: 'ayer' })] }); igual(r.estado, 400, 'estado'); });
await prueba('un lote vacío o de más de 500 se rechaza', async () => {
  reiniciarRed(); igual((await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [] })).estado, 400, 'vacío');
  const muchas = Array.from({ length: 501 }, (_, i) => RESP('AAAAA' + i));
  igual((await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: muchas })).estado, 400, '501');
});

console.log('\nLista de vigentes');
await prueba('se guarda la lista con su hora en una sola escritura', async () => {
  reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'vigentes', ids: ['AAAAA1', 'BBBBB2'], hasta: AHORA - 1000 });
  igual(r.estado, 200, 'estado'); igual(red.length, 1, 'escrituras');
  igual(red[0].datos.vigentes, { AAAAA1: true, BBBBB2: true }, 'lista'); igual(red[0].datos['meta/vigentes_hasta'], AHORA - 1000, 'hasta'); igual(red[0].datos['meta/total_google'], 2, 'total');
});
await prueba('si en Google ya no queda ninguna, la lista se vacía', async () => { reiniciarRed(); await envio({ form_id: FORM_ID, tipo: 'vigentes', ids: [], hasta: AHORA }); igual(red[0].datos.vigentes, null, 'lista'); });
await prueba('un id raro en la lista se rechaza', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'vigentes', ids: ['a/b/c/d/e'], hasta: AHORA }); igual(r.estado, 400, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('una hora de lista inválida se rechaza', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'vigentes', ids: [], hasta: 'mañana' }); igual(r.estado, 400, 'estado'); });

console.log('\nEl robot y la base');
await prueba('el robot entra una sola vez para varios envíos', async () => {
  reiniciarRed(); await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }); await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] });
  igual(entradas, 1, 'entradas');
});
await prueba('si la ficha del robot venció, entra otra vez y guarda', async () => {
  reiniciarRed({ base: [401, 200] }); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] });
  igual(r.estado, 200, 'estado'); igual(entradas, 2, 'entradas'); igual(red.length, 2, 'intentos');
});
await prueba('si la base falla, avisa con 502 (el formulario reintenta después)', async () => { reiniciarRed({ base: [500] }); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }); igual(r.estado, 502, 'estado'); });
await prueba('si el robot no puede entrar, avisa con 502', async () => { reiniciarRed({ login: 400 }); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }); igual(r.estado, 502, 'estado'); igual(red.length, 0, 'escrituras'); });
await prueba('la respuesta del intermediario no devuelve datos de personas', async () => { reiniciarRed(); const r = await envio({ form_id: FORM_ID, tipo: 'respuestas', respuestas: [RESP()] }); cierto(!r.cuerpo.includes('Ana'), 'eco de datos'); });

console.log(`\n${mal ? '✗' : '✓'} ${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
