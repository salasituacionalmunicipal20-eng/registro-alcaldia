// Sincroniza el nodo directorio_1x10 (solo lectura pública) que usa
// 1x10-asistencia-publica.html para buscar personas por cédula.
// Lee las siete variantes del 1x10, consolida personas únicas y escribe solo
// las diferencias. Se puede correr cuantas veces haga falta.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { SISTEMAS_1X10 } from '../1x10-seguimiento-datos.mjs';
import { consolidarPersonas } from '../asistencia-centros-datos.mjs';

initializeApp({
  credential: cert(JSON.parse(fs.readFileSync('C:/Users/carlo/Documents/Alcaldia BDD/alcaldia-admin-firebase-adminsdk-fbsvc-207472a5bd.json', 'utf8'))),
  databaseURL: 'https://alcaldia-admin-default-rtdb.firebaseio.com'
});
const db = getDatabase();

const contexto = { window: {} };
vm.runInNewContext(fs.readFileSync('territorio-data.js', 'utf8'), contexto);
const catalogo = contexto.window.TERRITORIO.comunidades;

const sistemas = await Promise.all(SISTEMAS_1X10.map(async sufijo => {
  const [j, a] = await Promise.all([db.ref('jefes_1x10' + sufijo).get(), db.ref('afines_1x10' + sufijo).get()]);
  return { sufijo, jefes: j.val() || {}, afines: a.val() || {} };
}));
const { personas, diagnostico } = consolidarPersonas(sistemas, catalogo);

const CAMPOS = ['nombre', 'comuna', 'comunidad', 'centro'];
const esperado = new Map();
let omitidas = 0;
for (const p of personas) {
  if (!p.id) continue;
  const dato = { nombre: p.nombre, comuna: p.comuna, comunidad: p.comunidad, centro: p.centro };
  // Las reglas públicas exigen cadenas de 1 a 160 caracteres; nunca se recortan datos.
  if (CAMPOS.some(k => !dato[k] || String(dato[k]).length > 160)) { omitidas++; continue; }
  esperado.set(p.id, dato);
}

const actual = (await db.ref('directorio_1x10').get()).val() || {};
const cambios = [];
let nuevas = 0, actualizadas = 0;
for (const [id, dato] of esperado) {
  const previo = actual[id];
  if (!previo) { cambios.push(['directorio_1x10/' + id, dato]); nuevas++; }
  else if (CAMPOS.some(k => previo[k] !== dato[k])) { cambios.push(['directorio_1x10/' + id, dato]); actualizadas++; }
}
const obsoletos = Object.keys(actual).filter(id => !esperado.has(id));
for (const id of obsoletos) cambios.push(['directorio_1x10/' + id, null]);

for (let i = 0; i < cambios.length; i += 400) {
  await db.ref().update(Object.fromEntries(cambios.slice(i, i + 400)));
}

// Volver a leer y comparar: nunca se da por buena una escritura sin verificarla.
const verificacion = (await db.ref('directorio_1x10').get()).val() || {};
assert.equal(Object.keys(verificacion).length, esperado.size, 'La cantidad publicada no coincide con la esperada.');
for (const [id, dato] of esperado) assert.deepEqual(verificacion[id], dato, 'Diferencia publicada en ' + id);
assert.equal(obsoletos.filter(id => Object.hasOwn(verificacion, id)).length, 0, 'Quedaron claves obsoletas publicadas.');

console.log(JSON.stringify({
  registros_leidos: diagnostico.registros,
  personas_con_identidad: esperado.size,
  publicadas_nuevas: nuevas,
  actualizadas,
  obsoletas_retiradas: obsoletos.length,
  omitidas_por_dato_invalido: omitidas
}));
process.exit(0);
