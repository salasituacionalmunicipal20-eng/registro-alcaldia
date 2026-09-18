/* Prueba de las pruebas: rompe a propósito cada candado de las reglas, lo
   carga en el EMULADOR de Firebase (nunca en la base real) y exige que
   pruebas/reglas-gforms.mjs lo note. Si alguna mutación pasa en verde,
   esa prueba no vale.

   Antes, en otra terminal (con Java):
       firebase emulators:start --only database --project alcaldia-admin
   Luego:
       node pruebas/mutar-reglas-gforms.mjs [127.0.0.1:9000] */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const EMU = process.argv[2] || '127.0.0.1:9000';
// Sin los \r de Windows, para que los textos a romper coincidan.
const REGLAS = fs.readFileSync(new URL('../firebase-rules.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const OP = "auth != null && (auth.token.email === 'carlos.admin@alcaldia.com' || root.child('operadores').child(auth.uid).exists())";

const MUTANTES = [
  ['la encuesta pública la lee cualquiera', `"encuestas_consulta_popular": {\n      ".read": "${OP}"`, `"encuestas_consulta_popular": {\n      ".read": "auth != null"`],
  ['la lista de operadores la lee cualquiera', `"operadores": {\n      ".read": "${OP}"`, `"operadores": {\n      ".read": "auth != null"`],
  ['cualquiera crea tickets', `"$ticketId": {\n        ".write": "${OP}"`, `"$ticketId": {\n        ".write": "auth != null"`],
  ['cualquiera escribe el historial de sesiones', `"historial_sesiones": {\n      ".read": "auth.token.email === 'carlos.admin@alcaldia.com'",\n      "$id": {\n        ".write": "${OP}"`,
                                               `"historial_sesiones": {\n      ".read": "auth.token.email === 'carlos.admin@alcaldia.com'",\n      "$id": {\n        ".write": "auth != null"`],
  ['cualquiera escribe respuestas', /("\$form": \{\n\s*"\.read": "[^"]*",\n\s*"\.write": )"auth != null && auth\.uid === '[^']+'"/, '$1"auth != null"'],
  ['cualquiera lee un formulario', /("\$form": \{\n\s*)"\.read": "auth != null && root\.child\('gforms_lectores'\)[^"]*"/, '$1".read": "auth != null"'],
  ['cualquiera lee la lista de formularios', /("gforms": \{\n\s*)"\.read": "[^"]*"/, '$1".read": "auth != null"'],
  ['el robot escribe en cualquier clave', /,\n\s*"\.validate": "\$form\.matches\([^"]*"/, ''],
  ['cualquiera lee la ficha de un lector', `"$uid": {\n        ".read": "auth != null && auth.uid === $uid"`, `"$uid": {\n        ".read": "auth != null"`],
  ['el lector se vuelve a pedir cambio de clave', "auth.uid === $uid && newData.val() === false)", 'auth.uid === $uid)'],
  ['el lector se da acceso a otros formularios', `"$uid": {\n        ".read": "auth != null && auth.uid === $uid",\n        ".write": "auth.token.email === 'carlos.admin@alcaldia.com'"`,
                                               `"$uid": {\n        ".read": "auth != null && auth.uid === $uid",\n        ".write": "auth != null && auth.uid === $uid"`],
];

async function cargar(texto) {
  const r = await fetch(`http://${EMU}/.settings/rules.json?ns=alcaldia-admin-default-rtdb`, {
    method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: texto });
  if (r.status !== 200) throw new Error('el emulador no aceptó las reglas: ' + (await r.text()).slice(0, 300));
}
function correrPruebas() {
  const r = spawnSync(process.execPath, [new URL('./reglas-gforms.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), '--emulador', EMU],
    { encoding: 'utf8', env: process.env });
  return { verde: r.status === 0, salida: (r.stdout || '') + (r.stderr || '') };
}

let vivos = 0, roto = null;
try {
  await cargar(REGLAS);
  const base = correrPruebas();
  if (!base.verde) { console.log(base.salida); throw new Error('con las reglas buenas las pruebas ya fallan en el emulador'); }
  console.log('reglas buenas: todas las pruebas en verde\n');
  for (const [nombre, de, a] of MUTANTES) {
    const mut = typeof de === 'string' ? (REGLAS.split(de).length === 2 ? REGLAS.replace(de, a) : null) : (de.test(REGLAS) ? REGLAS.replace(de, a) : null);
    if (!mut || mut === REGLAS) { console.log(`  ? ${nombre}: no encontré el texto a romper`); vivos++; continue; }
    JSON.parse(mut);
    await cargar(mut);
    const r = correrPruebas();
    if (r.verde) vivos++;
    const fallas = (r.salida.match(/✗ .*/g) || []).slice(0, 2).join(' | ');
    console.log(`  ${r.verde ? '✗' : '✓'} ${nombre}: ${r.verde ? '¡NADIE LO NOTÓ!' : 'detectado (' + fallas + ')'}`);
  }
} catch (e) {
  roto = e;                       // un error nunca cuenta como éxito
  console.log('✗ la prueba de mutación se cortó:', e.message);
} finally {
  await cargar(REGLAS).catch(() => {});
  console.log(`\nmutaciones vivas: ${vivos}${roto ? ' (y la corrida se cortó)' : ''}`);
  process.exit(vivos || roto ? 1 : 0);
}
