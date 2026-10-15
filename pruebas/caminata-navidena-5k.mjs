import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chromium} from 'file:///C:/Users/carlo/node_modules/playwright/index.mjs';
import {EVENTO} from '../caminata-navidena-5k-datos.mjs';
const raiz=path.resolve(import.meta.dirname,'..'),salida=path.join(raiz,'output/navidad-5k-pruebas');fs.mkdirSync(salida,{recursive:true});
for(const archivo of ['caminata-navidena-5k.html','caminata-navidena-5k-resultados.html']){
 const html=fs.readFileSync(path.join(raiz,archivo),'utf8');assert(!/caminata_nocturna_5k|Santa Rosa|caminata5kcharallave/.test(html));
 const js=[...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');const temporal=path.join(raiz,'tmp/navidad-validacion.mjs');fs.writeFileSync(temporal,js);const r=spawnSync('node',['--check',temporal],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
}
const base={},escrituras=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const contexto=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
 await contexto.addInitScript(()=>{window.print=()=>{window.__impresiones=(window.__impresiones||0)+1;};});
 await contexto.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='www.gstatic.com'){
   const n=u.pathname.split('/').pop();
   const fuente=n==='firebase-app.js'?'export const initializeApp=()=>({});':n==='firebase-auth.js'?`export const getAuth=()=>({});export const onAuthStateChanged=(a,cb)=>setTimeout(()=>cb({uid:'prueba-navidad',email:'prueba@ejemplo.local'}),0);export const signOut=async()=>{};`:`export const getDatabase=()=>({});export const ref=(d,p='')=>p;export const child=(p,c)=>c;const leer=async p=>{const r=await fetch('/__datos?path='+encodeURIComponent(p));const v=await r.json();return {val:()=>v,exists:()=>v!==null}};export const get=leer;export const onValue=(p,cb)=>{leer(p).then(cb);return ()=>{}};export const update=async(p,v)=>{const r=await fetch('/__datos',{method:'POST',body:JSON.stringify(v)});if(!r.ok)throw Error('No se pudo registrar');};export const remove=()=>{throw Error('Borrado no permitido en esta prueba')};`;
   return route.fulfill({contentType:'application/javascript',body:fuente});
  }
  if(u.pathname==='/__datos'){
   if(route.request().method()==='POST'){const cambios=JSON.parse(route.request().postData());escrituras.push(cambios);for(const [p,v]of Object.entries(cambios)){const [n,id]=p.split('/');base[n]??={};base[n][id]=v;}return route.fulfill({contentType:'application/json',body:'{}'});}
   const p=u.searchParams.get('path');let v=p===`config/${EVENTO.nodo}/abierta`?true:p?.startsWith('operadores/')?{rol:'admin'}:null;
   if(v===null&&p){const partes=p.split('/');v=partes.reduce((dato,k)=>dato?.[k],base)??null;}
   return route.fulfill({contentType:'application/json',body:JSON.stringify(v)});
  }
  if(u.hostname.endsWith('supabase.co')||u.pathname.includes('cne')){
   if(u.pathname.endsWith('.js'))return route.fulfill({contentType:'application/javascript',body:''});
   return route.fulfill({contentType:'application/json',body:JSON.stringify({error:true,data:false})});
  }
  if(u.hostname==='salasituacional.alcaldiadecharallave.com'){
   const fichero=path.join(raiz,u.pathname.slice(1));if(fs.existsSync(fichero)&&fs.statSync(fichero).isFile())return route.fulfill({contentType:/\.(js|mjs)$/.test(fichero)?'application/javascript':fichero.endsWith('.html')?'text/html':'image/png',body:fs.readFileSync(fichero)});
   return route.fulfill({status:404,body:''});
  }
  if(u.hostname==='api.qrserver.com')return route.fulfill({status:200,body:''});
  return route.continue();
 });
 const page=await contexto.newPage(),errores=[];page.on('pageerror',e=>errores.push(e.message));
 await page.goto(EVENTO.enlace);await page.waitForFunction(()=>!document.querySelector('#enviar').disabled);
 await page.screenshot({path:path.join(salida,'formulario-escritorio.png')});
 await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(salida,'formulario-movil.png')});await page.setViewportSize({width:1280,height:900});
 const rellenar=async(id,valor)=>{await page.locator('#'+id).fill(valor);};
 for(const [id,v]of Object.entries({cedula:'9999999991',nombre:'PRUEBA LIDER NAVIDAD',telefono:'0000000000',fechaNacimiento:'1980-12-05',direccion:'DIRECCION FICTICIA PARA VERIFICACION',municipio:'MUNICIPIO DE PRUEBA'}))await rellenar(id,v);
 for(const [id,v]of Object.entries({sexo:'Hombre',modalidad:'Carrera',talla:'M',discapacidad:'No'}))await page.selectOption('#'+id,v);
 await page.check('input[name="enfermedad"][value="No"]');await page.check('input[name="medicamento"][value="No"]');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=100;const x=c.getContext('2d');x.fillStyle='#145c3d';x.fillRect(0,0,80,100);return c.toDataURL('image/png').split(',')[1];});
 await page.setInputFiles('#foto1',{name:'prueba.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>document.querySelector('#prev1').naturalWidth>0);
 await page.click('#agregarFamiliar');
 const familia=page.locator('[data-familiar]').first();
 async function llenarFamiliar(caja,campos){for(const [k,v]of Object.entries(campos)){const e=caja.locator(`[data-campo="${k}"]`);if(await e.evaluate(e=>e.tagName)==='SELECT')await e.selectOption(v);else await e.fill(v);}}
 await llenarFamiliar(familia,{parentesco:'Hija',cedula:'9999999991',nombre:'PRUEBA HIJA NAVIDAD',nacimiento:'2012-01-01',sexo:'Mujer',modalidad:'Caminata',talla:'Infantil 14',discapacidad:'Sí',enfermedad:'No',medicamento:'No'});
 await page.click('#enviar');assert.equal(escrituras.length,0);assert((await page.locator('#msg').innerText()).includes('cédula diferente'));
 await familia.locator('[data-campo="cedula"]').fill('9999999992');
 await familia.locator('[data-campo="foto"]').setInputFiles({name:'familiar.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>document.querySelector('.estado-foto').textContent.includes('preparada'));
 await page.click('#agregarFamiliar');
 await llenarFamiliar(page.locator('[data-familiar]').nth(1),{parentesco:'Padre',cedula:'9999999993',nombre:'PRUEBA ABUELO NAVIDAD',nacimiento:'1950-01-01',sexo:'Hombre',modalidad:'Carrera',talla:'Otra',otraTalla:'4XL',discapacidad:'No',enfermedad:'Sí',detalleEnfermedad:'CONDICION FICTICIA',medicamento:'Sí',detalleMedicamento:'MEDICAMENTO FICTICIO'});
 await page.locator('#familiares').screenshot({path:path.join(salida,'grupo-familiar.png')});
 await page.click('#enviar');await page.locator('#ok').waitFor({state:'visible'});
 assert.equal(escrituras.length,1);const grupo=Object.values(base[EVENTO.nodo]);assert.equal(grupo.length,3);assert.deepEqual(grupo.map(r=>r.es_lider),[true,false,false]);assert(grupo.every(r=>r.lider_cedula==='9999999991'));assert.equal(grupo[1].persona_con_discapacidad,'Sí');assert.equal(grupo[2].talla_camisa,'Otra: 4XL');assert.equal(Object.keys(base[EVENTO.nodo+'_fotos']).length,2);assert(escrituras[0]&&!Object.keys(escrituras[0]).some(k=>k.startsWith('caminata_nocturna')));
 await page.click('#imprimir');await page.waitForFunction(()=>window.__impresiones===1);assert.equal(await page.locator('.hoja-grupo').count(),3);assert.equal(await page.locator('.hoja-grupo [id]').count(),0);assert.equal(await page.locator('.hoja-grupo [data-notas-evento] p').count(),6);
 await page.pdf({path:path.join(salida,'planillas-grupo-ficticio.pdf'),preferCSSPageSize:true,printBackground:true});
 const panel=await contexto.newPage();panel.on('pageerror',e=>errores.push(e.message));await panel.goto(EVENTO.enlace.replace('.html','-resultados.html'));await panel.waitForFunction(()=>document.querySelectorAll('#tbody tr').length===3);
 assert((await panel.locator('#tbody tr').first().innerText()).includes('PRUEBA LIDER NAVIDAD'));
 await panel.selectOption('#fModalidad','Carrera');assert.equal(await panel.locator('#tbody tr').count(),2);await panel.selectOption('#fModalidad','');await panel.selectOption('#fDiscapacidad','Sí');assert.equal(await panel.locator('#tbody tr').count(),1);await panel.click('#limpiar');
 const excelEvento=panel.waitForEvent('download');await panel.click('#excel');const excel=await excelEvento;await excel.saveAs(path.join(salida,'grupo-ficticio.xlsx'));
 const pdfEvento=panel.waitForEvent('download');await panel.click('#pdf');await(await pdfEvento).saveAs(path.join(salida,'informe-ficticio.pdf'));
 await panel.locator('.ver').first().click();await panel.waitForFunction(()=>document.getElementById('pdfFicha'));
 const fichaEvento=panel.waitForEvent('download');await panel.click('#pdfFicha');await(await fichaEvento).saveAs(path.join(salida,'ficha-lider-ficticio.pdf'));
 await panel.click('#cerrarModal');await panel.setViewportSize({width:375,height:812});assert(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await panel.screenshot({path:path.join(salida,'panel-movil.png')});assert.deepEqual(errores,[]);
 fs.writeFileSync(path.join(salida,'grupo-ficticio.json'),JSON.stringify(base,null,2));
 console.log(JSON.stringify({personas:3,lideres:1,familiares:2,envioAtomico:true,duplicadosBloqueados:true,filtros:true,planillas:3,excel:true,pdf:true,errores,salida}));
} finally {await browser.close();}
