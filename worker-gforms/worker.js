/* Intermediario de los formularios de Google → Sala Situacional.

   El programa que vive DENTRO del formulario de Google (Apps Script, ver
   apps-script.gs) manda cada respuesta aquí en el momento en que llega, y
   una vez por hora manda todo otra vez por si alguna se perdió. Este Worker
   comprueba la firma y guarda en Firebase, en gforms/<clave>/…, entrando con
   la cuenta robot, que por las reglas SOLO puede escribir ahí.

   Qué se exige a cada envío (POST /recibir):
     X-Momento: milisegundos del envío (máximo 10 minutos de diferencia)
     X-Firma:   HMAC-SHA256 en hexadecimal de  "<X-Momento>.<cuerpo>"
                con la clave CLAVE_FIRMA (secreto; la otra copia está en las
                Propiedades del script del formulario, nunca en el código)
     cuerpo:    JSON con form_id de un formulario de la lista FORMULARIOS y
                tipo "estructura" | "respuestas" | "vigentes".

   Nada de lo que llega se escribe en los registros del Worker: son datos de
   personas (cédula, salud, voto). */

const MAX_CUERPO = 8 * 1024 * 1024;          // un lote grande de respuestas
const VENTANA_MS = 10 * 60 * 1000;
const MAX_TEXTO = 20000;                     // lo que pase de aquí se recorta y se avisa
const MAX_RESPUESTAS_LOTE = 500;
const MAX_VIGENTES = 50000;
const MAX_PREGUNTAS = 300;
const TIPOS = new Set(['TEXT', 'PARAGRAPH_TEXT', 'MULTIPLE_CHOICE', 'CHECKBOX', 'LIST', 'SCALE', 'GRID',
  'CHECKBOX_GRID', 'DATE', 'DATETIME', 'TIME', 'DURATION', 'FILE_UPLOAD', 'RATING', 'PAGE_BREAK',
  'SECTION_HEADER', 'IMAGE', 'VIDEO', 'OTRO']);   // OTRO: un tipo nuevo de Google que todavía no conocemos
const RE_CLAVE_FORM = /^[a-z0-9-]{3,60}$/;
const RE_FORM_ID = /^[A-Za-z0-9_-]{20,80}$/;
const RE_RESPUESTA = /^[A-Za-z0-9_-]{5,200}$/;
const RE_PREGUNTA = /^[0-9]{1,20}$/;

export class Rechazo extends Error {
  constructor(estado, mensaje) { super(mensaje); this.estado = estado; }
}

function json(estado, datos) {
  return new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

// ------------------------------------------------------------------ firma
const cod = new TextEncoder();
function aHex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }

export async function firmar(clave, texto) {
  const k = await crypto.subtle.importKey('raw', cod.encode(clave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return aHex(await crypto.subtle.sign('HMAC', k, cod.encode(texto)));
}

/** Compara sin cortar en la primera diferencia (no delata cuánto se acertó). */
export function igualesSeguro(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function comprobarFirma(env, momentoTxt, firma, cuerpo, ahora) {
  if (!env.CLAVE_FIRMA || env.CLAVE_FIRMA.length < 32) throw new Rechazo(500, 'El intermediario no tiene su clave de firma.');
  if (!/^[0-9]{10,16}$/.test(momentoTxt || '')) throw new Rechazo(401, 'Falta la hora del envío.');
  if (!/^[0-9a-f]{64}$/.test(firma || '')) throw new Rechazo(401, 'Falta la firma.');
  if (Math.abs(ahora - Number(momentoTxt)) > VENTANA_MS) throw new Rechazo(401, 'El envío es demasiado viejo o viene del futuro.');
  const esperada = await firmar(env.CLAVE_FIRMA, momentoTxt + '.' + cuerpo);
  if (!igualesSeguro(esperada, firma)) throw new Rechazo(401, 'La firma no coincide.');
}

// ------------------------------------------------------------ validación
function texto(v, max = MAX_TEXTO) {
  if (v == null) return '';
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') throw new Rechazo(400, 'Un valor no es texto.');
  const s = String(v);
  return s.length > max ? s.slice(0, max) + ' […recortado]' : s;
}
function listaDeTextos(v, maxItems, maxLargo) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > maxItems) throw new Rechazo(400, 'Una lista no es válida.');
  return v.map(x => texto(x, maxLargo));
}

export function clavesDeFormularios(env) {
  let mapa;
  try { mapa = JSON.parse(env.FORMULARIOS || '{}'); } catch { throw new Rechazo(500, 'La lista de formularios está mal escrita.'); }
  for (const [id, clave] of Object.entries(mapa)) {
    if (!RE_FORM_ID.test(id) || !RE_CLAVE_FORM.test(clave)) throw new Rechazo(500, 'La lista de formularios está mal escrita.');
  }
  return mapa;
}

export function limpiarEstructura(d) {
  if (!Array.isArray(d.preguntas) || d.preguntas.length > MAX_PREGUNTAS) throw new Rechazo(400, 'Las preguntas no son válidas.');
  const orden = [], preguntas = {};
  for (const p of d.preguntas) {
    if (!p || typeof p !== 'object') throw new Rechazo(400, 'Una pregunta no es válida.');
    const id = String(p.id);
    if (!RE_PREGUNTA.test(id)) throw new Rechazo(400, 'Una pregunta trae un identificador raro.');
    if (!TIPOS.has(p.tipo)) throw new Rechazo(400, 'Una pregunta es de un tipo desconocido.');
    if (preguntas[id]) throw new Rechazo(400, 'Una pregunta viene repetida.');
    const q = { titulo: texto(p.titulo, 500), tipo: p.tipo, obligatoria: p.obligatoria === true };
    if (p.ayuda) q.ayuda = texto(p.ayuda, 2000);
    if (p.opciones != null) q.opciones = listaDeTextos(p.opciones, 500, 500);
    if (p.otro === true) q.otro = true;
    if (p.filas != null) q.filas = listaDeTextos(p.filas, 200, 500);
    if (p.columnas != null) q.columnas = listaDeTextos(p.columnas, 200, 500);
    if (p.escala && typeof p.escala === 'object') {
      q.escala = { min: Number(p.escala.min) || 0, max: Number(p.escala.max) || 0,
                   izq: texto(p.escala.izq, 200), der: texto(p.escala.der, 200) };
    }
    orden.push(id); preguntas[id] = q;
  }
  return { titulo: texto(d.titulo, 300), descripcion: texto(d.descripcion, 5000), orden, preguntas };
}

/** Un valor de respuesta: texto, lista de textos (casillas) o lista de listas (cuadrícula). */
function valor(v) {
  if (Array.isArray(v)) {
    if (v.length > 500) throw new Rechazo(400, 'Una respuesta trae demasiadas opciones.');
    return v.map(x => Array.isArray(x) ? listaDeTextos(x, 500, 2000) : texto(x, 2000));
  }
  return texto(v);
}

export function limpiarRespuesta(r) {
  if (!r || typeof r !== 'object') throw new Rechazo(400, 'Una respuesta no es válida.');
  if (!RE_RESPUESTA.test(String(r.id || ''))) throw new Rechazo(400, 'Una respuesta trae un identificador raro.');
  const enviada = Number(r.enviada);
  if (!Number.isFinite(enviada) || enviada < 1.5e12 || enviada > 4e12) throw new Rechazo(400, 'Una respuesta trae una fecha rara.');
  if (!r.v || typeof r.v !== 'object' || Array.isArray(r.v)) throw new Rechazo(400, 'Una respuesta no trae sus valores.');
  const v = {};
  for (const [k, x] of Object.entries(r.v)) {
    if (!RE_PREGUNTA.test(k)) throw new Rechazo(400, 'Una respuesta trae una pregunta rara.');
    v[k] = valor(x);
  }
  const limpia = { enviada, v };
  if (r.correo) limpia.correo = texto(r.correo, 200);
  return limpia;
}

// -------------------------------------------------------------- Firebase
let fichaRobot = null;                 // { token, vence } — dura una hora; se guarda en memoria

async function tokenRobot(env, forzar = false) {
  if (!forzar && fichaRobot && fichaRobot.vence > Date.now() + 60000) return fichaRobot.token;
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + env.FIREBASE_API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.ROBOT_CORREO, password: env.ROBOT_CLAVE, returnSecureToken: true })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.idToken) throw new Rechazo(502, 'El robot no pudo entrar a la base.');
  fichaRobot = { token: j.idToken, vence: Date.now() + (Number(j.expiresIn) || 3600) * 1000 };
  return fichaRobot.token;
}

export function olvidarRobot() { fichaRobot = null; }

async function escribir(env, metodo, ruta, datos) {
  for (let intento = 0; intento < 2; intento++) {
    const tk = await tokenRobot(env, intento > 0);
    const r = await fetch(`${env.FIREBASE_DB}/${ruta}.json?auth=${encodeURIComponent(tk)}`, { method: metodo, body: JSON.stringify(datos) });
    if (r.ok) return;
    if (r.status === 401 && intento === 0) continue;       // la ficha venció: se entra otra vez
    throw new Rechazo(502, 'La base no aceptó el guardado (' + r.status + ').');
  }
  throw new Rechazo(502, 'La base no aceptó al robot.');
}

// ------------------------------------------------------------ el pedido
export async function atender(req, env, ahora = Date.now()) {
  const url = new URL(req.url);
  if (url.pathname === '/' && req.method === 'GET') return new Response('Intermediario de formularios de Google: en línea.', { status: 200 });
  if (url.pathname !== '/recibir') throw new Rechazo(404, 'No existe.');
  if (req.method !== 'POST') throw new Rechazo(405, 'Solo se aceptan envíos.');

  const largo = Number(req.headers.get('Content-Length'));
  if (!Number.isFinite(largo) || largo <= 0) throw new Rechazo(411, 'Falta el tamaño del envío.');
  if (largo > MAX_CUERPO) throw new Rechazo(413, 'El envío es demasiado grande.');
  const cuerpo = await req.text();
  if (cod.encode(cuerpo).length > MAX_CUERPO) throw new Rechazo(413, 'El envío es demasiado grande.');

  await comprobarFirma(env, req.headers.get('X-Momento'), req.headers.get('X-Firma'), cuerpo, ahora);

  let d;
  try { d = JSON.parse(cuerpo); } catch { throw new Rechazo(400, 'El envío no es JSON.'); }
  if (!d || typeof d !== 'object') throw new Rechazo(400, 'El envío no es válido.');
  const clave = clavesDeFormularios(env)[d.form_id];
  if (!clave) throw new Rechazo(403, 'Ese formulario no está conectado con la Sala Situacional.');
  const base = 'gforms/' + clave;

  if (d.tipo === 'estructura') {
    const e = limpiarEstructura(d);
    // Una sola escritura: el tablero nunca ve preguntas nuevas con el título viejo.
    await escribir(env, 'PATCH', base, {
      estructura: { orden: e.orden, preguntas: e.preguntas },
      'meta/titulo': e.titulo, 'meta/descripcion': e.descripcion, 'meta/form_id': d.form_id, 'meta/estructura_en': ahora
    });
    return json(200, { ok: true, preguntas: e.orden.length });
  }
  if (d.tipo === 'respuestas') {
    if (!Array.isArray(d.respuestas) || !d.respuestas.length || d.respuestas.length > MAX_RESPUESTAS_LOTE) throw new Rechazo(400, 'El lote de respuestas no es válido.');
    const cambios = {};
    for (const r of d.respuestas) {
      const id = String(r && r.id);
      const limpia = limpiarRespuesta(r);
      cambios['respuestas/' + id] = limpia;
      cambios['vigentes/' + id] = true;
    }
    cambios['meta/ultima_llegada'] = ahora;
    await escribir(env, 'PATCH', base, cambios);
    return json(200, { ok: true, guardadas: d.respuestas.length });
  }
  if (d.tipo === 'vigentes') {
    // La lista completa de las respuestas que siguen en Google: las borradas
    // allá dejan de contarse aquí, pero no se borran (queda la constancia).
    if (!Array.isArray(d.ids) || d.ids.length > MAX_VIGENTES) throw new Rechazo(400, 'La lista de respuestas no es válida.');
    const hasta = Number(d.hasta);
    if (!Number.isFinite(hasta) || hasta < 1.5e12 || hasta > ahora + VENTANA_MS) throw new Rechazo(400, 'La hora de la lista no es válida.');
    const vigentes = {};
    for (const id of d.ids) {
      if (!RE_RESPUESTA.test(String(id))) throw new Rechazo(400, 'Una respuesta trae un identificador raro.');
      vigentes[id] = true;
    }
    // Lista y hora en una sola escritura: una respuesta que llegó DESPUÉS de
    // que Google armó la lista (enviada > vigentes_hasta) se sigue mostrando.
    await escribir(env, 'PATCH', base, {
      vigentes: d.ids.length ? vigentes : null,
      'meta/vigentes_hasta': hasta, 'meta/total_google': d.ids.length, 'meta/sincronizado_en': ahora
    });
    return json(200, { ok: true, vigentes: d.ids.length });
  }
  throw new Rechazo(400, 'Tipo de envío desconocido.');
}

export default {
  async fetch(req, env) {
    try {
      return await atender(req, env);
    } catch (e) {
      if (e instanceof Rechazo) return json(e.estado, { ok: false, error: e.message });
      return json(500, { ok: false, error: 'Falla inesperada del intermediario.' });
    }
  }
};
