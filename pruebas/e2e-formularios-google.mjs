/* Prueba de punta a punta del tablero de formularios de Google en Chrome,
   contra la base REAL, con cuentas temporales que se borran al final.

   Antes: servir la carpeta en http://localhost:8123 (python -m http.server 8123).
       node pruebas/e2e-formularios-google.mjs
   Deja capturas y descargas en pruebas/.e2e-gforms/ (no se sube al repositorio). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAL = path.join(AQUI, '.e2e-gforms'); fs.rmSync(SAL, { recursive: true, force: true }); fs.mkdirSync(SAL, { recursive: true });
const BASE = 'http://localhost:8123';
const FORM = 'terraza-hugo-chavez-2026';
initializeApp({ credential: cert(JSON.parse(fs.readFileSync('C:/Users/carlo/Documents/Alcaldia BDD/alcaldia-admin-firebase-adminsdk-fbsvc-207472a5bd.json', 'utf8'))),
  databaseURL: 'https://alcaldia-admin-default-rtdb.firebaseio.com' });
const auth = getAuth(), db = getDatabase();
const MARCA = 'e2e-gforms-' + Date.now();
const clave = () => 'P' + crypto.randomBytes(9).toString('base64url') + '7';
const cuentas = [];
async function cuenta(tipo, extra) {
  const usuario = `${MARCA}-${tipo}`, pw = clave();
  const u = await auth.createUser({ email: usuario + '@alcaldia.com', password: pw });
  cuentas.push(u.uid);
  if (tipo === 'lector') await db.ref('gforms_lectores/' + u.uid).set({ nombre: 'Lector de prueba', formularios: { [FORM]: true }, cambio_obligatorio: true });
  else await db.ref('operadores/' + u.uid).set({ nombre: 'Prueba ' + tipo, rol: extra.rol, cambio_obligatorio: false, comunas_asignadas: ['TODAS'] });
  return { usuario, pw, uid: u.uid };
}
/** Lector que entra con un correo completo (como la cuenta de Google de una sala), sin cambio de clave. */
async function cuentaConCorreo() {
  const correo = `${MARCA}-correo@example.com`, pw = clave();
  const u = await auth.createUser({ email: correo, password: pw });
  cuentas.push(u.uid);
  await db.ref('gforms_lectores/' + u.uid).set({ nombre: 'Sala de prueba', formularios: { [FORM]: true }, cambio_obligatorio: false });
  return { usuario: correo.toUpperCase(), pw, uid: u.uid };
}

let ok = 0, mal = 0;
function veredicto(nombre, paso, detalle = '') { paso ? ok++ : mal++; console.log(`  ${paso ? '✓' : '✗'} ${nombre}${!paso && detalle ? ' → ' + detalle : ''}`); }
const esperar = ms => new Promise(r => setTimeout(r, ms));

const nav = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-first-run'] });
const errores = [], avisos = [];
async function paginaNueva(ancho = 1280) {
  const ctx = await nav.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: ancho, height: 900 });
  p.on('pageerror', e => errores.push(String(e)));
  p.on('dialog', d => { avisos.push(d.message()); d.accept(); });
  const cdp = await p.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: SAL });
  return p;
}
async function entrar(p, c) {
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle2' });
  await p.type('#username', c.usuario); await p.type('#password', c.pw);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null), p.click('#loginForm [type=submit], #loginForm button')]);
  await esperar(2500);
}
async function descarga(p, boton, patron, ms = 30000) {
  const antes = new Set(fs.readdirSync(SAL));
  await p.click(boton);
  for (let t = 0; t < ms; t += 500) {
    await esperar(500);
    const nuevo = fs.readdirSync(SAL).find(f => !antes.has(f) && patron.test(f) && !f.endsWith('.crdownload'));
    if (nuevo) return path.join(SAL, nuevo);
  }
  return null;
}

try {
  const lector = await cuenta('lector');
  const admin = await cuenta('admin', { rol: 'admin' });
  const oper = await cuenta('oper', { rol: 'operador' });
  const total = Object.keys((await db.ref(`gforms/${FORM}/vigentes`).once('value')).val() || {}).length;

  console.log('\nLector nuevo (teléfono de 375 px)');
  let p = await paginaNueva(375);
  await entrar(p, lector);
  veredicto('la primera vez lo manda a cambiar la clave', p.url().endsWith('/password.html'), p.url());
  const nueva = clave();
  await p.type('#newPw', nueva); await p.type('#confirmPw', nueva);
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null), p.click('#pwForm [type=submit], #pwForm button')]);
  await esperar(1500);
  veredicto('después de cambiarla va directo a su tablero', p.url().includes('/formularios-google.html'), p.url());
  veredicto('en la base quedó que ya cambió la clave', (await db.ref(`gforms_lectores/${lector.uid}/cambio_obligatorio`).once('value')).val() === false);
  await p.waitForFunction(() => !document.getElementById('contenido').classList.contains('hidden') && document.getElementById('kTotal').textContent !== '—', { timeout: 30000 }).catch(() => null);
  const kTotal = await p.$eval('#kTotal', e => e.textContent.trim());
  veredicto(`muestra las ${total} respuestas vigentes`, kTotal === String(total), 'mostró ' + kTotal);
  veredicto('dice quién está conectado y que es solo lectura', /solo lectura/.test(await p.$eval('#quien', e => e.textContent)));
  veredicto('no ve el botón del panel de administración', await p.$eval('#btnPanel', e => e.classList.contains('hidden')));
  veredicto('muestra «La comunidad en números»', await p.$eval('#cardPerfil', e => !e.classList.contains('hidden')));
  const preguntas = await p.$$eval('#preguntas .pregunta', x => x.length);
  veredicto('una tarjeta por cada una de las 27 preguntas', preguntas === 27, 'hay ' + preguntas);
  veredicto('la tabla tiene una fila por respuesta', (await p.$$eval('#tbody tr', x => x.length)) === Math.min(total, 30));
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  veredicto('en el teléfono nada se sale de la pantalla', desborde <= 0, desborde + ' px de más');
  const chicos = await p.evaluate(() => [...document.querySelectorAll('button, a, input, select')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 36).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)));
  veredicto('botones y campos del tamaño de un dedo', !chicos.length, chicos.slice(0, 5).join(', '));
  await p.screenshot({ path: path.join(SAL, 'lector-375.png'), fullPage: true });

  // Filtrar tocando una opción del gráfico (SEXO)
  const sexoBtn = await p.$$eval('#preguntas .barra', bs => { const b = bs.find(x => /FEMENIN/.test(x.dataset.valor)); return b ? b.dataset.valor : null; });
  if (sexoBtn) {
    const esperado = await p.$$eval('#preguntas .barra', (bs, v) => { const b = bs.find(x => x.dataset.valor === v); return Number(b.querySelector('.cnt').textContent.split('·')[0].replace(/\D/g, '')); }, sexoBtn);
    await p.$$eval('#preguntas .barra', (bs, v) => bs.find(x => x.dataset.valor === v).click(), sexoBtn);
    await esperar(500);
    veredicto('tocar «FEMENINA» deja en la tabla solo a esas personas', (await p.$$eval('#tbody tr', x => x.length)) === esperado, `esperaba ${esperado}`);
    veredicto('aparece el filtro para quitarlo', (await p.$$eval('#chips .chip', x => x.length)) === 1);
    await p.click('#chips .chip'); await esperar(400);
    veredicto('al quitarlo vuelven todas', (await p.$$eval('#tbody tr', x => x.length)) === Math.min(total, 30));
  }
  // Buscar
  await p.type('#fBuscar', 'zzzz-no-existe'); await esperar(400);
  veredicto('buscar algo que no está deja la tabla vacía', /Sin respuestas/.test(await p.$eval('#tbody', e => e.textContent)));
  await p.click('#btnLimpiar'); await esperar(400);
  // Ficha
  await p.click('#tbody .btn-ver'); await esperar(500);
  const filasFicha = await p.$$eval('#modal .fila', x => x.length);
  veredicto('la ficha muestra las 27 preguntas', filasFicha === 27, 'mostró ' + filasFicha);
  await p.screenshot({ path: path.join(SAL, 'ficha-375.png') });
  await p.keyboard.press('Escape'); await esperar(300);
  veredicto('la ficha se cierra con Escape', !(await p.$eval('#modalBg', e => e.classList.contains('show'))));

  console.log('\nDescargas');
  const xlsx = await descarga(p, '#btnExcel', /\.xlsx$/);
  veredicto('baja el Excel', !!xlsx);
  const pdf1 = await descarga(p, '#btnPdf', /^formulario_.*\d\.pdf$/);
  veredicto('baja el PDF de resumen y listado', !!pdf1);
  const pdf2 = await descarga(p, '#btnPdfFichas', /_fichas_.*\.pdf$/);
  veredicto('baja el PDF de fichas', !!pdf2);
  const avisosMalos = avisos.filter(a => !/actualizada/i.test(a));
  veredicto('las descargas no mostraron ningún aviso de error', !avisosMalos.length, avisosMalos.join(' | '));
  fs.writeFileSync(path.join(SAL, 'descargas.json'), JSON.stringify({ xlsx, pdf1, pdf2, total }));

  console.log('\nComputadora (1280 px)');
  await p.setViewport({ width: 1280, height: 900 }); await esperar(600);
  await p.screenshot({ path: path.join(SAL, 'lector-1280.png'), fullPage: true });
  veredicto('en computadora tampoco se sale nada', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);

  console.log('\nLector que entra con su correo completo (como el de Google)');
  const conCorreo = await cuentaConCorreo();
  p = await paginaNueva(375);
  await entrar(p, conCorreo);
  veredicto('escribiendo el correo completo (aunque sea en mayúsculas) entra directo a su tablero', p.url().includes('/formularios-google.html'), p.url());
  await p.waitForFunction(() => document.getElementById('kTotal') && document.getElementById('kTotal').textContent !== '—', { timeout: 30000 }).catch(() => null);
  veredicto('ve el formulario con sus respuestas', (await p.$eval('#kTotal', e => e.textContent.trim())) === String(total));

  console.log('\nAdministrador');
  p = await paginaNueva(1280);
  await entrar(p, admin);
  veredicto('entra a su panel como siempre', p.url().endsWith('/admin.html'), p.url());
  veredicto('el panel tiene la tarjeta de Formularios de Google', await p.evaluate(() => !!document.querySelector(".card-gforms")));
  await p.goto(BASE + '/formularios-google.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction(() => document.getElementById('kTotal') && document.getElementById('kTotal').textContent !== '—', { timeout: 30000 }).catch(() => null);
  veredicto('ve el tablero con los mismos números', (await p.$eval('#kTotal', e => e.textContent.trim())) === String(total));
  veredicto('tiene el botón para volver al panel', !(await p.$eval('#btnPanel', e => e.classList.contains('hidden'))));

  console.log('\nOperador que no es administrador');
  p = await paginaNueva(1280);
  await entrar(p, oper);
  veredicto('sigue entrando a su registro como siempre', p.url().endsWith('/registro.html'), p.url());
  await p.goto(BASE + '/formularios-google.html', { waitUntil: 'networkidle2' }); await esperar(3000);
  veredicto('en el tablero de formularios le dice «Acceso restringido»', await p.$eval('#acceso-restringido', e => !e.classList.contains('hidden')));
  veredicto('y no le muestra ningún dato', await p.$eval('#contenido', e => e.classList.contains('hidden')));

  const propios = errores.filter(e => !/favicon|ERR_BLOCKED_BY_CLIENT/.test(e));
  veredicto('ninguna página soltó un error', !propios.length, propios.slice(0, 3).join(' | '));
} catch (e) {
  mal++; console.log('✗ la prueba se cortó:', e.stack || e.message);
} finally {
  await nav.close().catch(() => {});
  for (const uid of cuentas) {
    await db.ref('gforms_lectores/' + uid).remove(); await db.ref('operadores/' + uid).remove(); await db.ref('presencia/' + uid).remove();
    await auth.deleteUser(uid).catch(() => {});
  }
  console.log(`\n${mal ? '✗' : '✓'} ${ok} bien, ${mal} mal · cuentas temporales borradas (${cuentas.length})`);
  process.exit(mal ? 1 : 0);
}
