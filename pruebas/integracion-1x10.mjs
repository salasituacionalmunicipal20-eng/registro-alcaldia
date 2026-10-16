import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chromium} from 'file:///C:/Users/carlo/node_modules/playwright/index.mjs';
import {SISTEMAS_1X10,consolidarPersonas} from '../asistencia-centros-datos.mjs';
import {resumirRegistro} from '../1x10-seguimiento-datos.mjs';
import {normalizarFicha1x10,resumirVariante1x10} from '../1x10-integracion-datos.mjs';
import {combinarResultados1x10,rutasRegistro1x10,coincideBusqueda1x10} from '../1x10-resultados-fuentes.mjs';
const raiz=path.resolve(import.meta.dirname,'..'),origen='https://salasituacional.alcaldiadecharallave.com';
const paginas=['1x10-resultados.html','1x10-empleados-resultados.html','1x10-cristianos-resultados.html','1x10-abuelos-resultados.html','1x10-cristianos-abuelos-resultados.html','1x10-salud-resultados.html','1x10-educacion-resultados.html','1x10-sectores.html','1x10-seguimiento.html','1x10-asistencia.html','asistencia-centros.html'];
const datos={},sistemas=[];
paginas.push('empleados-sin-1x10.html','equipos-sin-1x10.html');
for(const [i,sufijo] of SISTEMAS_1X10.entries()){
 const cedula=String(100001+i),j={cedula,nombres:'JEFE FICTICIO',apellidos:'DE PRUEBA',circuito:'FLOR DEL ARANGUEY',comunidad_nombre:'EL MILAGRO DE DIOS I',centro_electoral:'AGRARIO LAS TORRES',fecha_nacimiento:'1980-01-01',genero:'M'};
 const jefes={[cedula]:j},afines={[cedula]:{200001:{cedula:'200001',nombres:'PERSONA FICTICIA',fecha_nacimiento:'2000-01-01'}}};
 if(i===0)afines.sinFicha={300001:{cedula:'300001',nombres:'AFÍN SIN FICHA',comuna:'INDIOS CHARAVARES',comunidad_nombre:'COMUNIDAD FICTICIA',centro_electoral:'CENTRO FICTICIO'}};
 datos['jefes_1x10'+sufijo]=jefes;datos['afines_1x10'+sufijo]=afines;sistemas.push({sufijo,jefes,afines});
}
const consolidado=consolidarPersonas(sistemas),seguimiento=resumirRegistro({},{},{},'2026-10-16',{},sistemas);
assert.equal(consolidado.diagnostico.registros,15);assert.equal(consolidado.diagnostico.personas,9);
datos.directorio_1x10=Object.fromEntries(consolidado.personas.slice(0,-2).map(p=>[p.id,Object.fromEntries(['nombre','comuna','comunidad','centro'].map(k=>[k,p[k]]))]));
assert.equal(seguimiento.diagnostico.personas,consolidado.diagnostico.personas);
const marginal=[{jefes:{'E-00012345':{nombre:'FICTICIO',comuna:'A',comunidad:'UNO'}},afines:{x:{'V-12345':{nombre:'OTRO FICTICIO'},otro:{cedula:'12345',nacionalidad:'X'}}}}];
assert.equal(resumirRegistro({},{},{},'2026-10-16',{},marginal).diagnostico.personas,consolidarPersonas(marginal).diagnostico.personas);
assert.equal(resumirVariante1x10(sistemas[0].jefes,sistemas[0].afines).afines,2);
assert.equal(resumirVariante1x10(sistemas[0].jefes,sistemas[0].afines).huerfanos,1);
assert.equal(normalizarFicha1x10(sistemas[0].jefes['100001']).circuito,'FLOR DEL ARAGUANEY');
const colision=combinarResultados1x10([{sufijo:'',jefes:{123456:{nombres:'GENERAL'}},afines:{}},{sufijo:'_empleados',jefes:{123456:{nombres:'EMPLEADOS'}},afines:{123456:{654321:{nombres:'AFIN'}}}}]);
assert.equal(Object.keys(colision.jefes).length,2);
assert.equal(colision.jefes['general::123456'].cedula,'123456');
assert.equal(colision.jefes['_empleados::123456'].nombres,'EMPLEADOS');
assert.equal(rutasRegistro1x10(colision.jefes['_empleados::123456'],'654321').afin,'afines_1x10_empleados/123456/654321');
assert.equal(rutasRegistro1x10(colision.jefes['general::123456']).jefe,'jefes_1x10/123456');
assert.throws(()=>rutasRegistro1x10({...colision.jefes['general::123456'],_idJefe1x10:'otro/registro'}));
assert.throws(()=>rutasRegistro1x10({...colision.jefes['general::123456'],_sector1x10:'_inventado'}));
assert(coincideBusqueda1x10({cedula:'123456'},'V-123.456'));
const temporal=fs.mkdtempSync(path.join(os.tmpdir(),'integracion-1x10-'));
try{
 for(const f of [...paginas,'1x10-identidad.mjs','1x10-integracion-datos.mjs','1x10-vinculos.mjs','1x10-resultados-fuentes.mjs']){
  const fuente=fs.readFileSync(path.join(raiz,f),'utf8');
  const codigo=f.endsWith('.html')?[...fuente.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'):fuente;
  const archivo=path.join(temporal,'verificar.mjs');fs.writeFileSync(archivo,codigo);
  const r=spawnSync(process.execPath,['--check',archivo],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,f+': '+r.stderr);
 }
}finally{fs.unlinkSync(path.join(temporal,'verificar.mjs'));fs.rmdirSync(temporal);}
const browser=await chromium.launch({channel:'chrome',headless:true}),resumen=[];
try{
 for(const archivo of paginas){
  const page=await browser.newPage(),errores=[],dialogos=[];let paginasEmpleados=0;page.on('pageerror',e=>errores.push(e.message));page.on('dialog',d=>{dialogos.push(d.message());d.dismiss();});
  await page.addInitScript(d=>{window.__datos1x10=d;window.__listeners1x10={};window.__errores1x10={};window.__retener1x10='afines_1x10_educacion';window.__liberar1x10=()=>{window.__retener1x10=null;for(const cb of window.__listeners1x10.afines_1x10_educacion||[])cb();};},datos);
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='www.gstatic.com'){
    const n=u.pathname.split('/').pop();
    const snap=`const snapshot=v=>({val:()=>v,exists:()=>v!=null,forEach:cb=>Object.entries(v||{}).forEach(([key,value])=>cb({...snapshot(value),key}))});`;
    const codigo=n==='firebase-app.js'?'export const initializeApp=()=>({}),getApp=()=>({});':n==='firebase-auth.js'?`export const getAuth=()=>({}),signOut=async()=>{},onAuthStateChanged=(a,cb)=>{setTimeout(()=>cb({uid:'ficticio',email:'carlos.admin@alcaldia.com'}),0);return ()=>{}};`:
    `${snap}export const getDatabase=()=>({}),ref=(db,p='')=>p,child=(p,c)=>c,get=async p=>snapshot(p==='directorio_1x10'?window.__datos1x10[p]:'admin'),serverTimestamp=()=>0;
    export const onValue=(p,cb,err)=>{let activo=true;const ejecutar=()=>{if(activo)cb(snapshot(p==='.info/connected'?!!window.__conectado1x10:window.__datos1x10[p]||{}))};(window.__listeners1x10[p]??=[]).push(ejecutar);if(err)(window.__errores1x10[p]??=[]).push(err);if(p!==window.__retener1x10)setTimeout(ejecutar,10);return ()=>activo=false};
    export const set=()=>{throw Error('Escritura no autorizada en prueba')},update=set,remove=set;
    export const runTransaction=async(p,fn)=>{if(!p.startsWith('directorio_1x10/'))throw Error('Ruta de escritura inesperada');const id=p.split('/')[1],d=window.__datos1x10.directorio_1x10,v=fn(d[id]||null);if(v===undefined)return {committed:false,snapshot:snapshot(d[id])};d[id]=v;(window.__escrituras1x10??=[]).push(p);return {committed:true,snapshot:snapshot(v)}};`;
    return route.fulfill({contentType:'application/javascript',body:codigo});
   }
   if(u.hostname.endsWith('supabase.co')){
    paginasEmpleados++;
    const lote=Number(u.searchParams.get('offset'))===0?[{cedula:'200001',nombres:'PERSONA FICTICIA',activo:true},...Array.from({length:498},(_,i)=>({cedula:String(800000+i),nombres:'INACTIVO FICTICIO',activo:false})),{cedula:'',nombres:'SIN IDENTIDAD FICTICIA',activo:true}]:[{cedula:'900001',nombres:'OTRA FICTICIA',telefono:'04141234567',activo:true}];
    return route.fulfill({contentType:'application/json',body:JSON.stringify(lote)});
   }
   if(u.origin===origen&&/\.(html|mjs|js)$/.test(u.pathname)&&!u.pathname.includes('autofresh')){
    const f=path.join(raiz,path.basename(u.pathname));return route.fulfill({contentType:f.endsWith('.html')?'text/html':'application/javascript',body:fs.readFileSync(f)});
   }
   return route.fulfill({body:''});
  });
  await page.goto(origen+'/'+archivo);
  await page.locator('#vinculos1x10').waitFor();
  assert.equal(await page.locator('#vinculos1x10').getAttribute('data-listo'),'false');
  assert((await page.locator('#totalesVinculados1x10').innerText()).includes('—'));
  if(archivo==='1x10-sectores.html')assert(await page.locator('#btnExcel').isDisabled());
  if(archivo==='1x10-educacion-resultados.html')assert(await page.locator('#btnExportarExcel').isDisabled());
  if(archivo.endsWith('sin-1x10.html'))assert.equal(await page.locator('#stHechos').innerText(),'—');
  await page.evaluate(()=>window.__liberar1x10());
  await page.waitForFunction(()=>document.querySelector('#vinculos1x10')?.dataset.listo==='true');
  assert.equal(await page.locator('#vinculos1x10').getAttribute('data-registros'),'15');
  assert.equal(await page.locator('#vinculos1x10').getAttribute('data-personas'),'9');
  if(archivo==='1x10-resultados.html'){
   await page.evaluate(()=>{window.__conectado1x10=true;for(const cb of window.__listeners1x10['.info/connected'])cb();});
   await page.waitForFunction(()=>document.querySelector('#directorioVinculado1x10')?.dataset.estado==='actualizado');
   assert.equal(await page.evaluate(()=>window.__escrituras1x10.length),2);
   assert.equal(await page.evaluate(()=>Object.keys(window.__datos1x10.directorio_1x10).length),9);
   assert.equal(await page.locator('#kpiTotal').innerText(),'15');assert.equal(await page.locator('#kpiAfines').innerText(),'8');
   assert((await page.locator('#integridadVariante1x10').innerText()).includes('1 afines sin ficha'));
   assert((await page.locator('#tbodyJefes').innerText()).includes('MILAGRO DE DIOS I'));
   assert.equal(await page.locator('#filtroCircuito option[value="FLOR DEL ARAGUANEY"]').count(),1);
  }
  await page.locator('#buscarGlobal1x10').fill('100.002');
  assert((await page.locator('#resultadoBusquedaGlobal1x10').innerText()).includes('Empleados'));
  assert((await page.locator('#resumenBusquedaGlobal1x10').innerText()).includes('1 registros'));
  await page.locator('#buscarGlobal1x10').fill('200001');
  assert((await page.locator('#resumenBusquedaGlobal1x10').innerText()).includes('7 registros'));
  if(archivo.includes('resultados.html')){
   assert.equal(await page.locator('#filtroSector1x10').inputValue(),'todos');
   await page.locator('#filtroBusqueda').fill('100002');
   assert((await page.locator('#tbodyJefes').innerText()).includes('Empleados'));
   const btn=page.locator('#tbodyJefes button[data-action="ver"]').first();
   assert.equal(await btn.getAttribute('data-ced'),'_empleados::100002');
   await btn.click();assert((await page.locator('#modalCaja').innerText()).includes('200001'),archivo+' modal: '+await page.locator('#modalCaja').innerText()+' errores: '+JSON.stringify(errores)+' avisos: '+JSON.stringify(dialogos));
   await page.locator('#btnCerrarModal').click();
   await page.locator('#filtroSector1x10').selectOption('');
   assert((await page.locator('#tbodyJefes').innerText()).includes('No hay jefes'));
   assert((await page.locator('#resultadoBusquedaGlobal1x10').innerText()).includes('Empleados'));
   await page.locator('#btnLimpiarFiltros').click();
   assert.equal(await page.locator('#filtroSector1x10').inputValue(),'todos');
   await page.addScriptTag({path:'C:/Users/carlo/node_modules/xlsx/dist/xlsx.full.min.js'});
   await page.evaluate(()=>{const crear=XLSX.utils.book_new;XLSX.utils.book_new=()=>{const w=crear();window.__excelGlobal1x10=w;return w;};});
   await page.locator('#btnExportarExcel').click();
   const hojas=await page.evaluate(()=>['Jefes 1x10','Afines'].map(n=>{const h=window.__excelGlobal1x10.Sheets[n];return{nombre:n,anchos:h['!cols'].length,filas:XLSX.utils.sheet_to_json(h,{header:1,defval:''})};}));
   for(const h of hojas){assert.equal(h.filas[0].at(-1),'Sector',archivo+' '+h.nombre);assert.equal(h.anchos,h.filas[0].length);assert(h.filas.slice(1).every(f=>f.length===h.filas[0].length));assert(h.filas.slice(1).some(f=>f.at(-1)==='Empleados'));}
   assert.equal(hojas[0].filas.length,8);assert.equal(hojas[1].filas.length,8);
   await page.evaluate(()=>{window.__csvGlobal1x10=null;const crear=URL.createObjectURL;URL.createObjectURL=b=>{if(b.type.startsWith('text/csv'))window.__csvGlobal1x10=b;return crear(b);};});
   await page.locator('#btnCsv').click();
   const csv=await page.evaluate(async()=>await window.__csvGlobal1x10.text());
   assert(csv.split('\r\n')[0].endsWith(',sector'));assert(csv.includes(',Empleados'));
  }
  await page.locator('#buscarGlobal1x10').fill('100002');
  if(archivo==='1x10-sectores.html')assert.equal(await page.locator('#totales .tot b').first().innerText(),'15');
  if(archivo==='empleados-sin-1x10.html'){assert.equal(paginasEmpleados,2);assert.equal(await page.locator('#stTotal').innerText(),'3');assert.equal(await page.locator('#stHechos').innerText(),'1');assert.equal(await page.locator('#stFaltan').innerText(),'1');assert((await page.locator('#empleadosSinIdentidad').innerText()).includes('1 empleados sin cédula'));assert.equal(await page.locator('#tbody [data-e164="584141234567"]').count(),1);}
  await page.evaluate(()=>{window.__datos1x10.afines_1x10['100001']['400001']={cedula:'400001',nombre:'NUEVA PERSONA FICTICIA'};for(const cb of window.__listeners1x10.afines_1x10)cb();});
  await page.waitForFunction(()=>document.querySelector('#vinculos1x10')?.dataset.registros==='16');
  if(archivo==='1x10-resultados.html'){
   await page.waitForFunction(()=>window.__escrituras1x10?.length===3);
   assert.equal(await page.evaluate(()=>Object.keys(window.__datos1x10.directorio_1x10).length),10);
  }
  await page.setViewportSize({width:375,height:812});
  const ancho=await page.locator('#vinculos1x10').evaluate(e=>({ancho:e.getBoundingClientRect().width,scroll:e.scrollWidth,cliente:e.clientWidth}));
  assert(ancho.scroll<=ancho.cliente+1,archivo+' enlaces desbordados');
  if(archivo==='1x10-resultados.html'){
   fs.mkdirSync(path.join(raiz,'output/integracion-1x10'),{recursive:true});
   await page.locator('#vinculos1x10').screenshot({path:path.join(raiz,'output/integracion-1x10/movil.png')});
   await page.setViewportSize({width:1280,height:900});await page.locator('#vinculos1x10').screenshot({path:path.join(raiz,'output/integracion-1x10/escritorio.png')});
  }
  await page.evaluate(()=>{for(const cb of window.__errores1x10.afines_1x10_educacion)cb({message:'Error ficticio de lectura'});});
  await page.waitForFunction(()=>document.querySelector('#vinculos1x10')?.dataset.listo==='false');
  assert((await page.locator('#totalesVinculados1x10').innerText()).includes('—'));
  if(archivo.endsWith('sin-1x10.html'))assert.equal(await page.locator('#stHechos').innerText(),'—');
  assert.deepEqual(errores,[],archivo);resumen.push({pagina:archivo,conteoCompleto:true,cambioEnVivo:true,sinErrores:true});await page.close();
 }
 console.log(JSON.stringify({casosIdentidad:true,afinesSinJefeIncluidos:true,equivalenciasConservadas:true,paginas:resumen}));
}finally{await browser.close();}
