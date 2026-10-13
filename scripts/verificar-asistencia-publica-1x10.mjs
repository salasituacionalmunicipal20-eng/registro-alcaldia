// Verificación local del enlace público de asistencia 1x10, del panel
// actualizado y de las reglas del archivo. No toca la base de producción.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function comprobarSintaxis(html, archivo) {
  const js = [...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  assert.ok(js.trim(), archivo + ': no se encontró el módulo');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voto-1x10-sintaxis-'));
  const temporal = path.join(dir, 'pagina.mjs');
  fs.writeFileSync(temporal, js);
  const r = spawnSync(process.execPath, ['--check', temporal], { encoding: 'utf8', windowsHide: true });
  fs.unlinkSync(temporal); fs.rmdirSync(dir);
  assert.equal(r.status, 0, archivo + ': ' + r.stderr);
}

const publica = fs.readFileSync(new URL('../1x10-asistencia-publica.html', import.meta.url), 'utf8');
assert(publica.includes('directorio_1x10/'), 'La página pública debe buscar en directorio_1x10.');
assert(publica.includes('asistencia_centros/'), 'La página pública debe escribir en asistencia_centros.');
assert(publica.includes("actualizado_por: 'publico'"), 'El marcado público debe identificarse como público.');
assert(!publica.includes('firebase-auth'), 'La página pública no debe depender de autenticación.');
assert(publica.includes('autofresh.js'), 'La página pública debe incluir autofresh.js.');
assert(publica.includes('16px'), 'Los inputs deben tener letra de 16 px para el teléfono.');
comprobarSintaxis(publica, '1x10-asistencia-publica.html');

const panel = fs.readFileSync(new URL('../1x10-asistencia.html', import.meta.url), 'utf8');
assert(panel.includes('1x10-asistencia-publica.html'), 'El panel debe enlazar la página pública.');
assert(panel.includes('Votación por comuna y comunidad'), 'El panel debe tener la sección por comuna y comunidad.');
assert(panel.includes('id="modalPersonas"'), 'El panel debe tener la ventana emergente.');
assert(panel.includes('pintarTerritorio()'), 'El panel debe pintar el resumen territorial.');
assert(panel.includes('sincronizarDirectorio()'), 'El panel debe sincronizar el directorio público.');
assert(panel.includes('asistencia_centros/${fecha}/${id}'), 'El panel conserva el marcado por jornada.');
comprobarSintaxis(panel, '1x10-asistencia.html');

const reglas = JSON.parse(fs.readFileSync(new URL('../firebase-rules.json', import.meta.url), 'utf8')).rules;
const persona = reglas.asistencia_centros.$fecha.$persona;
assert.equal(persona['.read'], 'auth == null', 'Lectura pública del marcado propio.');
assert(persona['.write'].includes("'no_asistio'"), 'Escritura pública limitada a asistio/no_asistio.');
assert(persona['.write'].includes('newData.exists()'), 'La escritura pública no puede borrar.');
assert(persona.actualizado_por['.validate'].includes("'publico'"), 'El marcado público debe permitir actualizado_por público.');
const dir = reglas.directorio_1x10;
assert.equal(dir['.read'], true, 'El directorio es de lectura pública.');
assert.equal(dir['.write'].includes('carlos.admin@alcaldia.com'), true, 'El directorio solo lo escribe un administrador.');
assert.equal(dir.$persona['.validate'].includes('[VE]_'), true, 'Las claves del directorio siguen el patrón nacionalidad_cedula.');
assert.equal(reglas.pc_educacion ? 1 : 0, 1, 'Debe conservarse el nodo pc_educacion de ProtCivil.');

const sincronizador = fs.readFileSync(new URL('./sincronizar-directorio-1x10.mjs', import.meta.url), 'utf8');
assert(sincronizador.includes('consolidarPersonas'), 'El sincronizador debe usar el consolidador oficial.');
assert(sincronizador.includes('assert.'), 'El sincronizador debe verificar lo escrito.');

console.log('Verificado: página pública, panel con resumen territorial y modal, reglas del directorio y del marcado público, y sintaxis de ambos módulos.');
