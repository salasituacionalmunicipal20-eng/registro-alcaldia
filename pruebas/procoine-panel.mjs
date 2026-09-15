/* PRUEBAS DEL PANEL DE PROCOINE (clasificación, filtros, PDF, Excel)
   ==================================================================
   Abre la página REAL procoine-resultados.html en un navegador, pero con
   Firebase REEMPLAZADO por uno de mentira: la prueba no puede leer datos
   de personas reales ni escribir nada en la base de verdad. Los datos son
   inventados (o, si se pasa PROCOINE_VALORES, grados/edades/planteles
   reales SIN nombres ni cédulas).

       npm i --no-save puppeteer-core xlsx      (o PRUEBAS_MODULOS=carpeta con esos módulos)
       node pruebas/procoine-panel.mjs
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const req = createRequire(process.env.PRUEBAS_MODULOS ? path.join(process.env.PRUEBAS_MODULOS, 'x.js') : import.meta.url);
const puppeteer = req('puppeteer-core');
const XLSX = req('xlsx');
const C = createRequire(import.meta.url)('../procoine-clasificacion.js');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BAJADAS = path.join(RAIZ, 'pruebas', 'bajadas-procoine');

let ok = 0, mal = 0;
const fallos = [];
const prueba = (n, cond, det = '') => { if (cond) { ok++; console.log('  OK    ' + n); } else { mal++; fallos.push(n + '  ' + det); console.log('  FALLA ' + n + '   ' + String(det).slice(0, 300)); } };
const seccion = (t) => console.log('\n--- ' + t + ' ---');
const espera = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- datos de mentira ---------- */
let base;
if (process.env.PROCOINE_VALORES && fs.existsSync(process.env.PROCOINE_VALORES)) {
    base = JSON.parse(fs.readFileSync(process.env.PROCOINE_VALORES, 'utf8'));
} else {
    const combos = [
        ['1ER AÑO', 12, 'UEE CARMEN RUIZ', 'UEN CREACION CHARALLAVE', 'UENB CREACIÓN CHARALLAVE'], ['1er Año', 11, 'Carmen Ruiz', 'UEE CARMEN RUIZ', ''],
        ['3ER GRADO', 8, 'EBN PITAHAYA', 'EBE POLICARPO FARRERA', 'POLICARPO'], ['3er grado', 9, 'CHILE', 'POLICARPO FARRERA', ''],
        ['2D0 GRADO', 7, 'EXT / CHILE', 'CEIN ALI PRIMERA', ''], ['1ER GRUPO INICIAL', 3, '', 'CEIN CREACION CHARALLAVE', ''],
        ['5TO AÑO', 16, 'UEP NTRA. SRA, DE COROMOTO', 'UEN CECILIO ACOSTA', 'Liceo Cecilio Acosta'], ['9no', null, 'CARACAS', 'CREACION CHARALLAVE', ''],
        ['6TO GRADO', 11, 'UEE CARMEN RUIZ', 'UEN TERESA DE BOLIVAR I', 'UEN TERESA DE BOLIVAR GRUPO'], ['NO ESCOLARIZADO', 7, '', 'UEE CARMEN RUIZ', '']
    ];
    base = [];
    for (let i = 0; i < 60; i++) { const c = combos[i % combos.length]; base.push({ g: c[0], e: c[1], ie: c[2], c1: c[3], c2: c[4], c3: '', x: i % 7 === 0 ? 'Sí' : 'No', fr: Date.parse('2026-09-10T12:00:00Z') + i * 3600000 }); }
}
const FIXTURE = {};
base.forEach((v, i) => {
    FIXTURE['-zzz' + String(i).padStart(16, '0')] = {
        rep_nombre: 'Representante ' + i, rep_cedula: String(90000000 + i), rep_telefono: '0000-0000000',
        est_nombre: 'Estudiante de prueba ' + i, est_grado: v.g, est_edad: v.e, est_fecha_nac: v.fn || null,
        est_institucion_estudia: v.ie, est_institucion_requiere: v.c1 || '', est_institucion_requiere_2: v.c2 || '', est_institucion_requiere_3: v.c3 || '',
        est_extranjero: v.x || 'No', fecha_registro: v.fr || (Date.parse('2026-09-10T12:00:00Z') + i * 60000), atendido: i % 5 === 0
    };
});
const REGS = Object.values(FIXTURE);
const TODO = C.clasificar(REGS, Date.now(), C.indiceDe(REGS));

/* ---------- Firebase de mentira ---------- */
const STUBS = {
    'firebase-app.js': 'export const initializeApp = () => ({});',
    'firebase-auth.js': `export const getAuth = () => ({});
        export const onAuthStateChanged = (a, cb) => { setTimeout(() => cb({ email: 'carlos.admin@alcaldia.com', uid: 'prueba' }), 0); return () => {}; };
        export const signOut = async () => {};`,
    'firebase-database.js': `export const getDatabase = () => ({});
        export const ref = (db, ruta) => ({ ruta: ruta || '' });
        export const child = (r, ruta) => ({ ruta });
        export const get = async () => ({ exists: () => false, val: () => null });
        export const onValue = (r, cb) => { setTimeout(() => cb({ val: () => window.__FIXTURE }), 0); return () => {}; };
        export const remove = async (r) => { (window.__ESCRITURAS = window.__ESCRITURAS || []).push(['remove', r.ruta]); };
        export const update = async (r, d) => { (window.__ESCRITURAS = window.__ESCRITURAS || []).push(['update', r.ruta]); };`
};

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const servidor = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
});
await new Promise(r => servidor.listen(0, r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

fs.rmSync(BAJADAS, { recursive: true, force: true }); fs.mkdirSync(BAJADAS, { recursive: true });
const nav = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const errores = [];
let ventanasAbiertas = 0;
/* La ventana de imprimir se cuenta y se cierra enseguida: con el diálogo de impresión
   abierto, el navegador sin pantalla se queda esperando y congela la prueba. */
let paginaPrincipal = null;
nav.on('targetcreated', async t => {
    if (t.type() !== 'page') return;
    const pg = await t.page().catch(() => null);
    if (!pg || !paginaPrincipal || pg === paginaPrincipal) return;   /* la principal se crea antes de conocerla */
    ventanasAbiertas++;
    pg.close().catch(() => { });
});

try {
    const p = await nav.newPage();
    paginaPrincipal = p;
    p.on('pageerror', e => errores.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errores.push(m.text()); });
    await p.setRequestInterception(true);
    p.on('request', r => {
        const u = r.url();
        const m = u.match(/^https:\/\/www\.gstatic\.com\/firebasejs\/9\.23\.0\/(firebase-(?:app|auth|database)\.js)$/);
        /* los módulos de otro dominio necesitan permiso CORS, si no el navegador no los ejecuta */
        if (m) return r.respond({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: STUBS[m[1]] });
        if (/api\.qrserver\.com/.test(u)) return r.respond({ status: 200, contentType: 'image/png', body: '' });
        r.continue();
    });
    await p.evaluateOnNewDocument((f) => { window.__FIXTURE = f; }, FIXTURE);
    const cdp = await p.createCDPSession();
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: BAJADAS });
    await p.setViewport({ width: 1366, height: 900 });
    await p.goto(BASE + '/procoine-resultados.html', { waitUntil: 'networkidle2' });
    await p.waitForFunction(() => document.querySelectorAll('#tablaGrado tr').length > 1, { timeout: 20000 });

    const esperaArchivo = async (re, ms = 20000) => {
        const hasta = Date.now() + ms;
        while (Date.now() < hasta) { const f = fs.readdirSync(BAJADAS).filter(x => re.test(x) && !x.endsWith('.crdownload')); if (f.length) { await espera(400); return f[0]; } await espera(250); }
        return null;
    };
    const info = () => p.$eval('#filtroInfo', e => e.textContent);
    const filasLista = async () => Number(((await info()).match(/Mostrando (?:las )?(\d+)/) || [])[1]);

    seccion('1. La clasificación sale con todo');
    prueba('la tarjeta de clasificación está', !!(await p.$('#cardClasificacion')));
    const nivelesPantalla = await p.$$eval('#tablaGrado tr.nivel', trs => trs.map(t => [t.dataset.valor, Number(t.children[1].textContent)]));
    prueba('los niveles y sus totales son los que calcula la clasificación', JSON.stringify(nivelesPantalla) === JSON.stringify(TODO.niveles.map(n => [n.clave, n.total])), JSON.stringify(nivelesPantalla));
    prueba('la suma de los niveles da el total de inscripciones', nivelesPantalla.reduce((a, n) => a + n[1], 0) === REGS.length);
    prueba('hay tabla por edad con sus rangos', (await p.$$('#tablaEdad tr.nivel')).length === TODO.porRango.length);
    prueba('hay tabla por colegio con un renglón por grupo', (await p.$$('#tablaEstudia tbody tr')).length === TODO.porEstudia.length);
    prueba('hay tabla por institución del cupo', (await p.$$('#tablaCupo tbody tr')).length === TODO.porCupo.length);
    const primeraCupo = await p.$eval('#tablaCupo tbody tr', tr => [tr.children[0].firstChild.textContent.trim(), Number(tr.children[1].textContent), Number(tr.children[2].textContent)]);
    prueba('la institución más pedida y sus números cuadran', primeraCupo[1] === TODO.porCupo[0].total && primeraCupo[2] === TODO.porCupo[0].primera, JSON.stringify(primeraCupo));
    prueba('los grupos con varias formas de escribirse lo muestran', (await p.$$('#cardClasificacion details.variantes')).length > 0);

    seccion('2. Tocar una fila filtra');
    const primaria = TODO.niveles.find(n => n.clave === 'primaria');
    await p.click('#tablaGrado tr.nivel[data-valor="primaria"]');
    await espera(200);
    prueba('tocar "Primaria" filtra la lista a los de primaria', (await filasLista()) === primaria.total, await info());
    prueba('queda puesto en el filtro Nivel', (await p.$eval('#fNivel', e => e.value)) === 'primaria');
    prueba('aparece el chip "Nivel: Primaria"', /Nivel: Primaria/.test(await p.$eval('#chipsFiltro', e => e.textContent)));
    prueba('el filtro Grado ya solo ofrece grados de primaria', (await p.$$eval('#fGrado option', os => os.slice(1).every(o => o.value.startsWith('primaria|')))));
    prueba('la clasificación también se filtró (solo el nivel primaria)', (await p.$$eval('#tablaGrado tr.nivel', trs => trs.map(t => t.dataset.valor))).join() === 'primaria');

    const g3 = TODO.porGrado.find(g => g.clave === 'primaria|3');
    await p.click('#tablaGrado tr[data-valor="primaria|3"]');
    await espera(200);
    prueba('tocar "3er grado" filtra a los de 3er grado (incluye "3er grado" y "3ER GRADO")', (await filasLista()) === g3.total, await info());

    seccion('3. Los filtros de edad, colegio e institución');
    await p.click('#btnLimpiar'); await espera(150);
    prueba('limpiar vuelve a todas', (await filasLista()) === REGS.length);
    await p.select('#fEdad', 'r:6-11'); await espera(150);
    const deRango = REGS.filter(r => { const e = C.edadDe(r).edad; return e != null && e >= 6 && e <= 11; }).length;
    prueba('edad 6 a 11 años', (await filasLista()) === deRango, `${await info()} vs ${deRango}`);
    await p.select('#fEdad', 'e:sin'); await espera(150);
    prueba('sin edad', (await filasLista()) === TODO.sinEdad, await info());
    await p.select('#fEdad', ''); await espera(100);

    const colegio = TODO.porEstudia[0];
    await p.select('#fEstudia', colegio.clave); await espera(150);
    prueba(`colegio "${colegio.nombre}" (junta sus ${colegio.variantes.length} formas)`, (await filasLista()) === colegio.total, await info());
    await p.select('#fEstudia', ''); await espera(100);

    const inst = TODO.porCupo[0];
    await p.select('#fInstitucion', inst.clave); await espera(150);
    prueba(`institución del cupo "${inst.nombre}" (en cualquier opción)`, (await filasLista()) === inst.total, await info());

    const chip = await p.$('#chipsFiltro [data-quitar="fInstitucion"]');
    await chip.click(); await espera(150);
    prueba('tocar el chip quita ese filtro', (await p.$eval('#fInstitucion', e => e.value)) === '' && (await filasLista()) === REGS.length);

    seccion('4. Imprimir y descargar con el filtro');
    await p.click('#tablaGrado tr.nivel[data-valor="primaria"]'); await espera(200);
    await p.click('#chkListaEnPdf');
    await p.click('#btnClasifPdf');
    const pdf = await esperaArchivo(/procoine_clasificacion_.*\.pdf$/);
    prueba('descarga el PDF de la clasificación', !!pdf, fs.readdirSync(BAJADAS).join());
    if (pdf) {
        const txt = fs.readFileSync(path.join(BAJADAS, pdf)).toString('latin1');
        prueba('es un PDF de verdad', txt.startsWith('%PDF-'));
        prueba('dice qué filtro tiene ("Nivel: Primaria")', txt.includes('Nivel: Primaria'));
        prueba('trae las cuatro clasificaciones', ['Por nivel y grado', 'Por edad', 'Por colegio donde estudia', 'Por institucion donde requiere el cupo'].every(t => txt.includes(t)));
        prueba('trae la lista de estudiantes al final (casilla marcada)', txt.includes('Estudiantes incluidos'));
        prueba('y solo los de primaria (no aparece ninguno de media)', !REGS.filter(r => C.clasificarGrado(r.est_grado).nivel === 'media').some(r => txt.includes('(' + r.est_nombre + ')')));
    }

    await p.click('#btnExcel');
    const xls = await esperaArchivo(/procoine_.*\.xlsx$/);
    prueba('descarga el Excel', !!xls);
    if (xls) {
        const wb = XLSX.read(fs.readFileSync(path.join(BAJADAS, xls)));
        prueba('trae la lista y las 4 hojas de clasificación', ['Inscripciones', 'Por grado', 'Por edad', 'Por colegio', 'Por institución del cupo'].every(h => wb.SheetNames.includes(h)), wb.SheetNames.join());
        const filas = XLSX.utils.sheet_to_json(wb.Sheets['Por grado'], { header: 1 });
        prueba('la hoja por grado dice el filtro en la segunda fila', /Nivel: Primaria/.test(filas[1][0]), filas[1][0]);
        const total = filas.slice(3).filter(f => f[1] === 'Total del nivel').reduce((a, f) => a + f[2], 0);
        prueba('y sus totales dan los de primaria', total === primaria.total, `${total} vs ${primaria.total}`);
        const anchoOk = ['Por grado', 'Por edad', 'Por colegio', 'Por institución del cupo'].every(h => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[h], { header: 1 });
            return rows.slice(2).every(r => r.length <= rows[2].length);
        });
        prueba('ninguna fila tiene más columnas que su encabezado (Excel cuadrado)', anchoOk);
    }
    await p.click('#btnResumenPdf');
    const lista = await esperaArchivo(/procoine_resumen_.*\.pdf$/);
    prueba('la lista (PDF) también sale y dice el filtro', !!lista && fs.readFileSync(path.join(BAJADAS, lista)).toString('latin1').includes('Nivel: Primaria'));

    const antes = ventanasAbiertas;
    await p.click('#btnClasifImprimir'); await espera(1500);
    prueba('"Imprimir clasificación" abre el PDF listo para imprimir', ventanasAbiertas > antes);

    seccion('5. En un teléfono');
    await p.setViewport({ width: 375, height: 800, isMobile: true });
    await espera(400);
    const ancho = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    prueba('la página no se arrastra de lado (las tablas anchas se deslizan dentro de su caja)', ancho[0] <= ancho[1] + 1, JSON.stringify(ancho));

    seccion('6. Seguridad de la prueba');
    prueba('no se intentó escribir nada en la base', (await p.evaluate(() => (window.__ESCRITURAS || []).length)) === 0);
    prueba('la página no lanzó errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
} catch (e) {
    mal++; fallos.push('EXCEPCIÓN: ' + e.message); console.log('\n  EXCEPCIÓN: ' + (e.stack || e.message));
    if (errores.length) console.log('  Errores de la página: ' + errores.slice(0, 5).join(' | '));
} finally {
    await nav.close(); servidor.close();
    fs.rmSync(BAJADAS, { recursive: true, force: true });
}

console.log('\n' + '='.repeat(64));
if (mal) { console.log(`FALLARON ${mal} de ${ok + mal}`); fallos.forEach(f => console.log('   - ' + f)); process.exit(1); }
console.log(`Pasaron las ${ok} pruebas del panel de PROCOINE.`);
