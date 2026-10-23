import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/carlo/node_modules/playwright/index.mjs';
const raiz=path.resolve('C:/Users/carlo/Documents/alcaldia-admin'),origen='https://salasituacional.alcaldiadecharallave.com',N='caminata_navidena_5k_2026',uuid='11111111-1111-4111-8111-111111111111';
const lider={cedula:'11111',nombre_apellido:'Responsable de prueba',telefono:'04120000000',fecha_nacimiento:'1990-01-01',edad:36,sexo:'Mujer',municipio:'Cristóbal Rojas',direccion_habitacion:'Dirección de prueba',modalidad:'Caminata',talla_camisa:'M',persona_con_discapacidad:'No',es_lider:true,lider_cedula:'11111',parentesco:'Líder familiar',orden_familiar:0,sin_cedula:false,padece_enfermedad:'No',enfermedad_detalle:'',toma_medicamento:'No',medicamento_detalle:'',fecha_registro:Date.now(),fecha_evento:'2026-12-05',tiene_fotos:false,numero_inscripcion:1,comprobante_token:uuid};
const menor={...lider,cedula:'',nombre_apellido:'Menor de prueba',fecha_nacimiento:'2022-01-01',edad:4,es_lider:false,sin_cedula:true,parentesco:'Hija',orden_familiar:1,modalidad:'Carrera'};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:375,height:812}}),page=await ctx.newPage(),errores=[];
 page.on('pageerror',e=>errores.push(e.message));page.on('dialog',d=>d.accept());
 await ctx.addInitScript(({N,lider,menor,uuid})=>{
  window.__datos={[N]:{'11111':lider,['menor_11111_'+uuid]:menor},[N+'_fotos']:{}};window.__listeners=[];window.__fallarNumero=false;window.__contadores={Caminata:1,Carrera:1};window.__escrituras=0;
  window.__auth={currentUser:{uid:'admin-ficticio',email:'carlos.admin@alcaldia.com',getIdToken:async()=>'sesion-ficticia'}};
 },{N,lider,menor,uuid});
 await ctx.route(origen+'/**',async route=>{
  const url=new URL(route.request().url()),f=path.resolve(raiz,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!f.startsWith(raiz+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:/\.(mjs|js)$/.test(f)?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':'image/jpeg',body:fs.readFileSync(f)});
 });
 await ctx.route('https://www.gstatic.com/firebasejs/9.23.0/**',async route=>{
  const f=new URL(route.request().url()).pathname.split('/').pop();let body;
  if(f==='firebase-app.js')body='export const initializeApp=()=>({});';
  else if(f==='firebase-auth.js')body='export const getAuth=()=>window.__auth;export const onAuthStateChanged=(a,fn)=>setTimeout(()=>fn(a.currentUser),0);export const signOut=async()=>{};';
  else if(f==='firebase-database.js')body=`import {validarRegistro,NODO} from '${origen}/caminata-navidena-5k-crud-datos.mjs';export const getDatabase=()=>({});export const ref=(d,p='')=>p;export const child=(p,c)=>p+'/'+c;const valor=p=>p.split('/').filter(Boolean).reduce((a,k)=>a?.[k],window.__datos);const snap=p=>({val:()=>structuredClone(valor(p)??null),exists:()=>valor(p)!=null});export const get=async p=>snap(p);export const onValue=(p,fn)=>{window.__listeners.push([p,fn]);fn(snap(p));};export const update=async(p,cambios)=>{const copia=structuredClone(window.__datos);for(const[r,v]of Object.entries(cambios)){const partes=r.split('/');let x=copia;for(const k of partes.slice(0,-1))x=x[k]??={};if(v===null)delete x[partes.at(-1)];else x[partes.at(-1)]=structuredClone(v);}for(const r of Object.values(copia[NODO]||{}))validarRegistro(r);window.__datos=copia;window.__escrituras++;for(const[r,f]of window.__listeners)f(snap(r));};`;
  else return route.abort();
  return route.fulfill({contentType:'application/javascript',body});
 });
 await ctx.route('https://admin.alcaldiadecharallave.com/api/caminata-navidad/admin-numeracion',async route=>{
  const d=route.request().postDataJSON(),respuesta=await page.evaluate(({ids,N})=>{
   if(window.__fallarNumero){window.__fallarNumero=false;return {status:503,datos:{error:'Numeración temporalmente no disponible.'}};}
   const participantes=ids.map(id=>{const r=window.__datos[N][id];if(!r.numero_inscripcion)r.numero_inscripcion=++window.__contadores[r.modalidad];return {id,modalidad:r.modalidad,numero_inscripcion:r.numero_inscripcion};});
   for(const[p,f]of window.__listeners)f({val:()=>structuredClone(window.__datos[p]||null),exists:()=>true});
   return {status:200,datos:{ok:true,participantes}};
  },{ids:d.ids,N});
  return route.fulfill({status:respuesta.status,headers:{'Access-Control-Allow-Origin':origen},contentType:'application/json',body:JSON.stringify(respuesta.datos)});
 });
 await page.goto(origen+'/caminata-navidena-5k-resultados.html');await page.locator('.editar-inscripcion[data-id="11111"]').first().waitFor();
 const campo=c=>page.locator('#editorInscripcion [data-campo="'+c+'"]');
 await page.locator('.editar-inscripcion[data-id="11111"]').first().click();await campo('nombre_apellido').fill('Responsable corregido');await campo('cedula').fill('33333');await campo('telefono').fill('04120000001');await campo('direccion_habitacion').fill('Dirección corregida para la prueba');await campo('modalidad').selectOption('Carrera');await campo('talla_camisa').fill('XL');
 const medidas=await page.locator('#editorInscripcion').evaluate(e=>({ancho:e.scrollWidth,visible:e.clientWidth,campos:[...e.querySelectorAll('input:not([type="checkbox"]),select')].map(c=>({alto:c.getBoundingClientRect().height,letra:parseFloat(getComputedStyle(c).fontSize)}))}));assert(medidas.ancho<=medidas.visible+1);assert(medidas.campos.every(c=>c.alto>=44&&c.letra>=16));
 await page.screenshot({path:raiz+'/tmp/editor-navidad-movil.png'});
 await page.click('#editorInscripcion [data-guardar]');await page.locator('#editorInscripcion').waitFor({state:'detached'});
 let datos=await page.evaluate(N=>window.__datos[N],N);assert(!datos['11111']);assert.equal(datos['33333'].nombre_apellido,'Responsable corregido');assert.equal(datos['33333'].fecha_registro,lider.fecha_registro);assert.equal(datos['33333'].edad,lider.edad);assert.equal(datos['menor_33333_'+uuid].lider_cedula,'33333');assert.equal(datos['33333'].modalidad,'Carrera');assert.notEqual(datos['33333'].numero_inscripcion,datos['menor_33333_'+uuid].numero_inscripcion);
 await page.click('#cerrarModal');await page.locator('.editar-inscripcion[data-id="menor_33333_'+uuid+'"]').first().click();await page.locator('[data-sin-cedula]').uncheck();await campo('cedula').fill('44444');await campo('modalidad').selectOption('Caminata');await campo('padece_enfermedad').selectOption('Sí');await campo('enfermedad_detalle').fill('Condición ficticia de prueba');
 await page.locator('[data-foto="foto1"]').setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a80sAAAAASUVORK5CYII=','base64')});
 await page.locator('#editorInscripcion [data-guardar]:not([disabled])').waitFor();await page.click('#editorInscripcion [data-guardar]');await page.locator('#editorInscripcion').waitFor({state:'detached'});
 datos=await page.evaluate(N=>window.__datos[N],N);assert.equal(datos['44444'].modalidad,'Caminata');assert.equal(datos['44444'].edad,4);assert.equal(datos['44444'].sin_cedula,false);assert.equal(datos['44444'].padece_enfermedad,'Sí');assert(datos['44444'].tiene_fotos);assert(!datos['menor_33333_'+uuid]);
 await page.click('#cerrarModal');await page.locator('.editar-inscripcion[data-id="44444"]').first().click();await campo('cedula').fill('33333');await page.click('#editorInscripcion [data-guardar]');await page.waitForFunction(()=>document.querySelector('[data-estado-editor]').textContent.includes('Ya existe'));await page.click('#editorInscripcion [data-cerrar-editor]');
 await page.click('#nuevaInscripcion');for(const [c,v]of Object.entries({nombre_apellido:'Nueva persona de prueba',cedula:'55555',fecha_nacimiento:'1990-01-01',telefono:'04120000000',municipio:'Cristóbal Rojas',direccion_habitacion:'Dirección nueva de prueba',talla_camisa:'S'}))await campo(c).fill(v);await campo('sexo').selectOption('Mujer');await page.evaluate(()=>window.__fallarNumero=true);await page.click('#editorInscripcion [data-guardar]');await page.locator('[data-reintentar]').waitFor({state:'visible'});assert(await page.locator('[data-guardar]').isHidden());
 await page.click('[data-reintentar]');await page.locator('#editorInscripcion').waitFor({state:'detached'});datos=await page.evaluate(N=>window.__datos[N],N);assert(datos['55555']?.numero_inscripcion);assert.equal(Object.keys(datos).length,3);
 await page.click('#cerrarModal');await page.locator('.editar-inscripcion[data-id="55555"]').first().click();await page.evaluate(N=>window.__datos[N]['55555'].telefono='04120000009',N);await campo('nombre_apellido').fill('Cambio que debe rechazarse');await page.click('#editorInscripcion [data-guardar]');await page.waitForFunction(()=>document.querySelector('[data-estado-editor]').textContent.includes('cambió mientras'));await page.click('#editorInscripcion [data-cerrar-editor]');assert.equal((await page.evaluate(N=>window.__datos[N]['55555'],N)).nombre_apellido,'Nueva persona de prueba');
 await page.locator('.ver[data-id="33333"]').click();await page.click('#eliminar');assert((await page.evaluate(N=>window.__datos[N],N))['33333']);await page.click('#eliminarGrupo');await page.locator('#modal').waitFor({state:'hidden'});datos=await page.evaluate(N=>window.__datos[N],N);assert.deepEqual(Object.keys(datos),['55555']);assert.equal(Object.keys(await page.evaluate(N=>window.__datos[N+'_fotos'],N)).length,0);
 assert.equal(errores.length,0,errores.join('; '));console.log('Navegador móvil: alta, edición, reidentificación de líder/menor, modalidad, salud, foto, duplicados, numeración fallida/reintento, conflicto concurrente y borrado seguro verificados sin datos reales.');
}finally{await browser.close();}
