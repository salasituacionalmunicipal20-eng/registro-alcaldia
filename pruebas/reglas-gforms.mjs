/* Pruebas de las reglas de Firebase que protegen:
     · los formularios de Google (gforms, gforms_lectores), y
     · los nodos que antes leía cualquier cuenta (encuestas, operadores,
       configuración, tickets, historial de sesiones).

   Corre contra la base REAL o contra el emulador:
       node pruebas/reglas-gforms.mjs                      base real
       node pruebas/reglas-gforms.mjs --emulador 127.0.0.1:9000
   En la base real solo LEE datos reales; lo único que escribe son claves
   "prueba-reglas-…" que se borran al final pase lo que pase.

   Necesita la clave de servicio de Firebase (carpeta BDD) y, para el robot,
   su clave en la bóveda de Windows. */
import fs from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const SA = 'C:/Users/carlo/Documents/Alcaldia BDD/alcaldia-admin-firebase-adminsdk-fbsvc-207472a5bd.json';
const API_KEY = 'AIzaSyCEqiu5ypPSGbS6nzju6VZtd2RIRYRDmGU';           // pública, la misma de las páginas
const ROBOT_CORREO = 'robot-gforms@alcaldia.com';
const i = process.argv.indexOf('--emulador');
const EMU = i > 0 ? process.argv[i + 1] : null;
const DB = EMU ? `http://${EMU}` : 'https://alcaldia-admin-default-rtdb.firebaseio.com';
const NS = EMU ? '?ns=alcaldia-admin-default-rtdb' : '';
if (EMU) process.env.FIREBASE_DATABASE_EMULATOR_HOST = EMU;

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(SA, 'utf8'))), databaseURL: EMU ? `http://${EMU}?ns=alcaldia-admin-default-rtdb` : DB });
const auth = getAuth(), db = getDatabase();
const MARCA = 'prueba-reglas-' + Date.now();
const FORM = MARCA;                       // clave de formulario de prueba (cumple ^[a-z0-9-]{3,60}$)
const OTRO_FORM = MARCA + '-otro';
const creados = [];                        // cuentas a borrar al final
let ok = 0, mal = 0;

function veredicto(nombre, paso) { paso ? ok++ : mal++; console.log(`  ${paso ? '✓' : '✗'} ${nombre}`); }

async function tokenDeCorreo(correo, clave) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: correo, password: clave, returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error('no entró ' + correo + ': ' + (j.error?.message || '?'));
  return j.idToken;
}
async function tokenDeUid(uid) {
  const ct = await auth.createCustomToken(uid);
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ct, returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error('token de ' + uid + ': ' + (j.error?.message || '?'));
  return j.idToken;
}
async function cuentaNueva() {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MARCA + '-' + creados.length + '@example.com', password: 'X' + Math.random().toString(36).slice(2) + 'y9', returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error('no se pudo crear la cuenta de afuera');
  creados.push(j.localId); return j.idToken;
}
const url = (ruta, tk, extra = '') => `${DB}/${ruta}.json${NS ? NS + '&' : '?'}auth=${tk}${extra}`;
async function lee(ruta, tk) { const r = await fetch(url(ruta, tk, '&shallow=true')); return r.status === 200; }
async function escribe(ruta, tk, valor) { const r = await fetch(url(ruta, tk), { method: 'PUT', body: JSON.stringify(valor) }); return r.status === 200; }

const EXPUESTOS = ['operadores', 'config', 'tickets', 'encuestas_consulta_popular', 'encuestas_reorganizacion_gobierno', 'encuestas_percepcion_gestion'];

try {
  // En el emulador la base está vacía: se siembran datos de mentira.
  if (EMU) {
    await db.ref().update({
      [`operadores/${MARCA}-admin`]: { rol: 'admin', nombre: 'Admin de mentira' },
      [`operadores/${MARCA}-oper`]: { rol: 'operador', nombre: 'Operador de mentira' },
      'habitantes/h1': { nombre: 'x' }, 'config/x': 1, 'tickets/t1': { t: 'x' },
      'encuestas_consulta_popular/V1': { nombres: 'x' }, 'encuestas_reorganizacion_gobierno/V1': { nombres: 'x' },
      'encuestas_percepcion_gestion/V1': { nombres: 'x' }
    });
    creados.push(`${MARCA}-admin`, `${MARCA}-oper`);
  }
  // Operadores reales para probar LECTURAS (no se escribe nada a su nombre).
  const ops = (await db.ref('operadores').once('value')).val() || {};
  const uidAdmin = Object.keys(ops).find(u => ops[u] && ops[u].rol === 'admin');
  const uidOper = Object.keys(ops).find(u => ops[u] && ops[u].rol !== 'admin');
  if (!uidAdmin || !uidOper) throw new Error('hace falta al menos un operador admin y uno no admin para probar');
  const uidLector = MARCA + '-lector';
  creados.push(uidLector);
  await db.ref('gforms_lectores/' + uidLector).set({ nombre: 'Prueba de reglas', formularios: { [FORM]: true }, cambio_obligatorio: true });
  await db.ref('gforms/' + FORM + '/meta').set({ titulo: 'Prueba de reglas' });
  await db.ref('gforms/' + OTRO_FORM + '/meta').set({ titulo: 'Otro formulario de prueba' });

  console.log('\nAlguien de afuera (se crea una cuenta con la clave pública)');
  const afuera = await cuentaNueva();
  for (const n of EXPUESTOS) veredicto(`no lee ${n}`, !(await lee(n, afuera)));
  veredicto('no lee habitantes (el censo)', !(await lee('habitantes', afuera)));
  veredicto('no lee los formularios de Google', !(await lee('gforms', afuera)));
  veredicto('no lee un formulario en particular', !(await lee('gforms/' + FORM, afuera)));
  veredicto('no lee la lista de lectores', !(await lee('gforms_lectores', afuera)));
  veredicto('no lee la ficha de un lector', !(await lee('gforms_lectores/' + uidLector, afuera)));
  veredicto('no crea tickets', !(await escribe('tickets/' + MARCA, afuera, { t: 'x' })));
  veredicto('no escribe el historial de sesiones', !(await escribe('historial_sesiones/' + MARCA, afuera, { t: 'x' })));
  veredicto('no escribe respuestas de formularios', !(await escribe(`gforms/${FORM}/respuestas/x`, afuera, { t: 'x' })));
  veredicto('no se anota como lector', !(await escribe('gforms_lectores/' + creados[creados.length - 1], afuera, { formularios: { [FORM]: true } })));

  console.log('\nOperador que no es administrador (solo lecturas)');
  const oper = await tokenDeUid(uidOper);
  for (const n of EXPUESTOS) veredicto(`sigue leyendo ${n}`, await lee(n, oper));
  veredicto('sigue leyendo habitantes', await lee('habitantes', oper));
  veredicto('NO lee los formularios de Google', !(await lee('gforms', oper)));
  veredicto('NO lee un formulario de Google', !(await lee('gforms/' + FORM, oper)));

  console.log('\nAdministrador (solo lecturas)');
  const adm = await tokenDeUid(uidAdmin);
  for (const n of EXPUESTOS) veredicto(`sigue leyendo ${n}`, await lee(n, adm));
  veredicto('lee la lista de formularios de Google', await lee('gforms', adm));
  veredicto('lee la lista de lectores', await lee('gforms_lectores', adm));
  veredicto('no escribe respuestas (eso es solo del robot)', !(await escribe(`gforms/${FORM}/respuestas/x`, adm, { t: 'x' })));

  console.log('\nRobot de los formularios');
  const { leerSecreto } = await import('file:///C:/Users/carlo/Documents/admin-alcaldia/scripts/boveda.mjs');
  const robot = await tokenDeCorreo(ROBOT_CORREO, leerSecreto('firebase-sala', ROBOT_CORREO));
  veredicto('escribe una respuesta en un formulario', await escribe(`gforms/${FORM}/respuestas/r1`, robot, { enviada: 1 }));
  veredicto('no escribe en una clave de formulario inválida', !(await escribe('gforms/MAL_Formado/respuestas/r1', robot, { enviada: 1 })));
  veredicto('no lee los formularios (solo escribe)', !(await lee('gforms', robot)));
  for (const n of EXPUESTOS) veredicto(`no lee ${n}`, !(await lee(n, robot)));
  veredicto('no lee habitantes', !(await lee('habitantes', robot)));
  veredicto('no escribe tickets', !(await escribe('tickets/' + MARCA, robot, { t: 'x' })));
  veredicto('no se anota lectores', !(await escribe('gforms_lectores/' + MARCA + '-x', robot, { formularios: { [FORM]: true } })));

  console.log('\nLector de formularios (usuario aparte)');
  const lector = await tokenDeUid(uidLector);
  veredicto('lee SU formulario', await lee('gforms/' + FORM, lector));
  veredicto('no lee otro formulario', !(await lee('gforms/' + OTRO_FORM, lector)));
  veredicto('no lee la lista de todos los formularios', !(await lee('gforms', lector)));
  veredicto('lee su propia ficha de lector', await lee('gforms_lectores/' + uidLector, lector));
  veredicto('no lee la lista de lectores', !(await lee('gforms_lectores', lector)));
  for (const n of EXPUESTOS) veredicto(`no lee ${n}`, !(await lee(n, lector)));
  veredicto('no lee habitantes (el censo)', !(await lee('habitantes', lector)));
  veredicto('no escribe respuestas', !(await escribe(`gforms/${FORM}/respuestas/x`, lector, { t: 'x' })));
  veredicto('no se da acceso a otro formulario', !(await escribe(`gforms_lectores/${uidLector}/formularios/${OTRO_FORM}`, lector, true)));
  veredicto('no se vuelve a pedir cambio de clave (solo puede quitarlo)', !(await escribe(`gforms_lectores/${uidLector}/cambio_obligatorio`, lector, true)));
  veredicto('marca que ya cambió su clave', await escribe(`gforms_lectores/${uidLector}/cambio_obligatorio`, lector, false));
} catch (e) {
  mal++; console.log('✗ la prueba se cortó:', e.message);
} finally {
  // Limpieza: TODO lo que empiece por la marca de esta corrida.
  await db.ref('gforms/' + FORM).remove();
  await db.ref('gforms/' + OTRO_FORM).remove();
  await db.ref('gforms/MAL_Formado').remove();
  for (const n of ['tickets', 'historial_sesiones']) await db.ref(n + '/' + MARCA).remove();
  const lec = (await db.ref('gforms_lectores').once('value')).val() || {};
  for (const k of Object.keys(lec)) if (k.startsWith(MARCA) || creados.includes(k)) await db.ref('gforms_lectores/' + k).remove();
  for (const uid of creados) await auth.deleteUser(uid).catch(() => {});
  console.log(`\n${mal ? '✗' : '✓'} ${ok} bien, ${mal} mal · limpieza hecha`);
  process.exit(mal ? 1 : 0);
}
