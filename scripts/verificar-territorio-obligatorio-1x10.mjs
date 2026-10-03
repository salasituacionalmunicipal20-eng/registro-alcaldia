import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {territorioValido,camposTerritoriales,prepararCatalogo1x10,comunaCorregida} from '../1x10-territorio-validacion.mjs';
const base=new URL('../',import.meta.url),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('territorio-data.js',base),'utf8'),sandbox);
const original=sandbox.window.TERRITORIO;
const catalogo=prepararCatalogo1x10(original);
const comunas=new Set(Object.values(catalogo.comunidades).map(c=>c.circuito_comunal));
for(const nombre of ['LA IMPERIAL','COMUNA SOCIALISTA ARAÑERO DE SABANETA','COMUNA AGRARIA SOCIALISTA EL PARAISO DE CHARALLAVE','FLOR DEL ARAGUANEY','OCTAVA ESTRELLA SUEÑOS DE BOLIVAR']) assert(comunas.has(nombre));
for(const c of Object.values(catalogo.comunidades)) {
 assert(!/^otros?$/i.test(c.nombre)); assert(!/^otros?$/i.test(c.circuito_comunal));
 assert.equal(c.circuito_comunal,comunaCorregida(c.circuito_comunal));
}
assert.equal(comunaCorregida('IMPERIAL'),'LA IMPERIAL');
for(const nombre of ['Otro','Otros',' OTRO ']) {
 const generico={comunidades:{x:{activo:true,nombre,parroquia:'CHARALLAVE',circuito_comunal:'LA IMPERIAL'}}};
 assert.equal(territorioValido(generico,'CHARALLAVE','LA IMPERIAL','x'),false);
 assert.equal(Object.keys(prepararCatalogo1x10(generico).comunidades).length,0);
 assert.equal(territorioValido({comunidades:{x:{activo:true,nombre:'REAL',parroquia:'CHARALLAVE',circuito_comunal:nombre}}},'CHARALLAVE',nombre,'x'),false);
}
const [slug,comunidad]=Object.entries(catalogo.comunidades).find(([,c])=>c.activo);
const par=comunidad.parroquia,com=comunidad.circuito_comunal;
assert(territorioValido(catalogo,par,com,slug));
for(const args of [['',com,slug],[par,'',slug],[par,com,''],[par,'Otra comuna',slug],['Otra parroquia',com,slug],[par,com,'no_existe']]){
 assert.equal(territorioValido(catalogo,...args),false);
 assert.throws(()=>camposTerritoriales(catalogo,...args));
}
const payload=camposTerritoriales(catalogo,par,com,slug);
assert.equal(payload.circuito,com);assert.equal(payload.comunidad_slug,slug);assert.equal(payload.comunidad_nombre,comunidad.nombre);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
for(const nombre of ['1x10','1x10-empleados','1x10-cristianos','1x10-abuelos','1x10-cristianos-abuelos','1x10-salud','1x10-educacion']){
 const html=fs.readFileSync(new URL(nombre+'.html',base),'utf8');
 assert(html.includes('const TERRITORIO = prepararCatalogo1x10('));
 assert(html.includes("$('jefe_circuito').value = comunaCorregida(data.circuito || '');"));
 assert(html.includes('selCirc.value = comunaCorregida(datos.circuito);'));
 const catalogoPagina=prepararCatalogo1x10(JSON.parse(/const TERRITORIO = prepararCatalogo1x10\((\{[^\n]+\})\);/.exec(html)[1]));
 assert.deepEqual(Object.entries(catalogoPagina.comunidades).map(([slug,c])=>[slug,c.nombre,c.parroquia,c.circuito_comunal]),Object.entries(catalogo.comunidades).map(([slug,c])=>[slug,c.nombre,c.parroquia,c.circuito_comunal]));
 assert.equal((html.match(/required aria-required="true"/g)||[]).length,6);
 assert(html.includes('Object.assign(payloadAfin, camposTerritoriales'));
 const cuerpo=/\$\('btnGuardar'\)\.addEventListener\('click', async \(\) => \{([\s\S]*?)\n        \}\);/.exec(html)?.[1];assert(cuerpo);
 const fn=new AsyncFunction('limpiarMensaje','territorioValido','TERRITORIO','estado','mostrarPaso','mostrarMensaje','obtenerIdsBloques','v','$',cuerpo);
 let mensaje='',paso=0;
 await fn(()=>{},territorioValido,catalogo,{jefe:{parroquia:par,circuito:'',comunidad_slug:slug}},n=>paso=n,m=>mensaje=m,()=>[],()=>'',()=>null);
 assert.equal(paso,2);assert.match(mensaje,/comuna y la comunidad/);
 for(const faltante of ['parroquia','circuito','comunidad']){
  mensaje='';const valores={afin_parroquia_1:par,afin_circuito_1:com,afin_comunidad_1:slug};valores['afin_'+faltante+'_1']='';
  await fn(()=>{},territorioValido,catalogo,{jefe:{cedula:'9999999997',parroquia:par,circuito:com,comunidad_slug:slug}},()=>{},m=>mensaje=m,()=>['1'],id=>valores[id]||'',id=>({value:id==='afin_cedula_1'?'9999999996':'',focus(){},reportValidity(){}}));
  assert.match(mensaje,/Afín #1: selecciona su comuna y su comunidad/);
 }
 const js=[...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 const temp=new URL(nombre+'.sintaxis.mjs',new URL('file:///C:/Users/carlo/AppData/Local/Temp/'));fs.writeFileSync(temp,js);
 const {execFileSync}=await import('node:child_process');execFileSync('node',['--check',temp.pathname.replace(/^\/([A-Za-z]:)/,'$1')],{windowsHide:true,stdio:'pipe'});
}
console.log('Verificadas las siete variantes: territorio obligatorio, comunidad correspondiente, rechazo antes de enviar y ubicación explícita en el payload.');
