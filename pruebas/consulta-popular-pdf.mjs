import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import { chromium } from 'file:///C:/Users/carlo/node_modules/playwright/index.mjs';
import { nombreTerritorial } from '../1x10-nombres-territoriales.mjs';
import {seccionesPorTerritorio} from '../consulta-popular-grupos.mjs';
const casos=[
 {comuna:'Comuna B',comunidad:'Comunidad 1',grupo:'jovenes',nombre:'Z'},
 {comuna:'Comuna A',comunidad:'Comunidad 2',grupo:'adultos',nombre:'B'},
 {comuna:'Comuna A',comunidad:'Comunidad 1',grupo:'adultos',nombre:'A'},
 {comuna:'Comuna A',comunidad:'Comunidad 2',grupo:'jovenes',nombre:'C'},
 {comuna:'Comuna A',comunidad:'Comunidad 2',grupo:'sinEdad',nombre:'D'},
 {comuna:'Comuna B',comunidad:'Comunidad 1',grupo:'menores',nombre:'E'},
 {grupo:'sinEdad',nombre:'F'}];
const agrupados=seccionesPorTerritorio(casos,casos.map((p,i)=>[i,p.nombre]),p=>p.grupo);
assert.deepEqual(agrupados.map(s=>[s.comuna,s.comunidad,s.titulo]),[
 ['Comuna A','Comunidad 1','Adultos (36 años en adelante)'],
 ['Comuna A','Comunidad 2','Jóvenes (15 a 35 años)'],['Comuna A','Comunidad 2','Adultos (36 años en adelante)'],['Comuna A','Comunidad 2','Edad no registrada'],
 ['Comuna B','Comunidad 1','Jóvenes (15 a 35 años)'],['Comuna B','Comunidad 1','Menores de 15 años'],
 ['Sin comuna registrada','Sin comunidad registrada','Edad no registrada']]);
assert.deepEqual(agrupados.flatMap(s=>s.filas.map(f=>f[0])),[1,2,3,4,5,6,7]);
const responsables=[{cedula:'900001',nombre:'Jefe A'},{cedula:'900002',nombre:'Jefe B'}];
const personasResponsables=[0,1,0].map((j,i)=>({nombre:'Persona '+i,comuna:'COMUNA',comunidad:'COMUNIDAD',jefe:responsables[j]}));
const planillasResponsables=seccionesPorTerritorio(personasResponsables,personasResponsables.map((p,i)=>[i,p.nombre]),()=> 'adultos');
assert.deepEqual(planillasResponsables.map(s=>[s.jefe.cedula,s.filas.map(f=>f[1])]),[['900001',['Persona 0','Persona 2']],['900002',['Persona 1']]]);
const mixtos=[0,1,0,1].map((j,i)=>({nombre:'Persona '+i,comuna:'COMUNA',comunidad:'COMUNIDAD',jefe:responsables[j],grupo:i<2?'jovenes':'adultos'}));
assert.deepEqual(seccionesPorTerritorio(mixtos,mixtos.map((p,i)=>[i,p.nombre]),p=>p.grupo).map(s=>[s.jefe.cedula,s.titulo]),[
 ['900001','Jóvenes (15 a 35 años)'],['900001','Adultos (36 años en adelante)'],['900002','Jóvenes (15 a 35 años)'],['900002','Adultos (36 años en adelante)']]);
for (const nombre of ['MILAGRO DE DIO I','EL MILAGRO DE DIOS I','MILAGRO DE DIOS I']) assert.equal(nombreTerritorial(nombre,'comunidad'),'MILAGRO DE DIOS I');
assert.equal(nombreTerritorial('MILAGRO DE DIOS II','comunidad'),'MILAGRO DE DIOS II');
const raiz=path.resolve(import.meta.dirname,'..');
// Los nuevos parámetros del encabezado son opcionales: las salidas previas conservan sus coordenadas.
function instrucciones(fuente){
  const llamadas=[],contexto={LOGO_CRISTOBAL_ROJAS:'logo1',LOGO_YUHISMAR:'logo2',LOGO_PSUV:'logo3'};
  const doc=new Proxy({internal:{pageSize:{getWidth:()=>279.4,getHeight:()=>215.9},getNumberOfPages:()=>2}},{get:(o,k)=>k in o?o[k]:(...args)=>llamadas.push([k,...args])});
  vm.createContext(contexto);vm.runInContext(fuente.replace(/^import .*;$/m,'').replaceAll('export function','function'),contexto);
  contexto.dibujarHeaderPDF(doc,{titulo:'Prueba',subtitulo:'Sin cambios'});contexto.dibujarFooterPDF(doc);
  return JSON.parse(JSON.stringify(llamadas.filter(([k,args])=>!(k==='text'&&String(args).startsWith('Generado el')))));
}
const anterior=execFileSync('git',['show','4a71531:pdf-header.js'],{cwd:raiz,encoding:'utf8',windowsHide:true});
assert.deepEqual(instrucciones(fs.readFileSync(path.join(raiz,'pdf-header.js'),'utf8')),instrucciones(anterior));
const salida=path.join(raiz,'output/consulta-popular-pdf');fs.mkdirSync(salida,{recursive:true});
const origen='https://salasituacional.alcaldiadecharallave.com';
const jefes={},estados={};
for(let i=0;i<150;i++) {
  const cedula=String(100001+i);
  jefes[cedula]={cedula,nombre:`Persona ${String(i).padStart(3,'0')}`+(i===149?' <img src=x onerror=alert(1)>':''),telefono:'0000000000',fecha_nacimiento:i%2?'1980-01-01':'2000-01-01',comuna:i<100?'Comuna de prueba':'Comuna Z de prueba',comunidad_nombre:i<100?(i%2?'MILAGRO DE DIO I':'EL MILAGRO DE DIOS I'):'MILAGRO DE DIOS II',centro_electoral:i%2?'Centro B':'Centro A'};
  if(i<149)jefes[cedula].genero=i%2?'Masculino':'Femenino';
  estados['V_'+cedula]={estado:i%3===0?'asistio':i%3===1?'no_asistio':'pendiente'};
}
jefes['100001'].fecha_nacimiento='2000-12-31';
jefes['100051'].genero='Masculino';
jefes['100101'].telefono='0000000010';
const lideres=Object.fromEntries(['100001','100051','100101'].map(id=>[id,jefes[id]])),afines={};
for(const [id,p] of Object.entries(jefes)){
  if(lideres[id])continue;
  const jefe=Number(id)<100051?'100001':Number(id)<100101?'100051':'100101';
  (afines[jefe]??={})[id]=p;
}
const datos={jefes_1x10:lideres,afines_1x10:afines,afines_1x10_empleados:{100001:{duplicado:{...jefes['100001']}}}};
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errores=[];page.on('pageerror',e=>errores.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('directorio1x10_actualizado',String(Date.now()));window.print=()=>window.dispatchEvent(new Event('beforeprint'));});
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='cdnjs.cloudflare.com')return route.continue();
    if(u.hostname==='www.gstatic.com') {
      const nombre=u.pathname.split('/').pop();
      const js=nombre==='firebase-app.js'?'export const initializeApp=()=>({});':nombre==='firebase-auth.js'?`export const getAuth=()=>({});export const onAuthStateChanged=(a,cb)=>setTimeout(()=>cb({uid:'prueba',email:'prueba@ejemplo.local'}),0);`:`const datos=${JSON.stringify(datos)},estados=${JSON.stringify(estados)};export const getDatabase=()=>({});export const ref=(d,p='')=>p;export const child=(p,c)=>c;export const get=async()=>({val:()=> 'admin'});export const onValue=(p,cb)=>{setTimeout(()=>cb({val:()=>p.startsWith('asistencia_centros/')?estados:datos[p]||{}}),0);return ()=>{}};export const set=()=>{throw Error('Escritura prohibida en prueba')};export const update=set,runTransaction=set,serverTimestamp=()=>0;`;
      return route.fulfill({contentType:'application/javascript',body:js});
    }
    if(u.origin===origen && /\.(html|mjs|js)$/.test(u.pathname) && !u.pathname.includes('autofresh')) return route.fulfill({contentType:u.pathname.endsWith('.html')?'text/html':'application/javascript',body:fs.readFileSync(path.join(raiz,path.basename(u.pathname)))});
    return route.fulfill({status:200,body:''});
  });
  await page.goto(origen+'/1x10-asistencia.html');
  await page.locator('#imprimirLista').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#imprimirLista').disabled);
  async function imprimirLista(grupo){
    const actual=await page.locator('#edadFiltro').inputValue();
    await page.click('#imprimirLista');await page.locator('#filtroImpresion').waitFor({state:'visible'});
    assert.equal(await page.locator('#edadImpresion').inputValue(),actual);
    if(grupo!==undefined)await page.selectOption('#edadImpresion',grupo);
    await page.click('#generarImpresion');
  }
  async function descargar(nombre){
    await page.locator('#vistaPDFConsulta').waitFor({state:'visible'});
    assert(await page.evaluate(()=>{const d=document.getElementById('vistaPDFConsulta');return document.documentElement.scrollWidth<=innerWidth&&d.scrollWidth<=d.clientWidth;}),'El visor debe caber en la pantalla');
    const evento=page.waitForEvent('download');await page.locator('#vistaPDFConsulta [data-descargar]').click();await(await evento).saveAs(path.join(salida,nombre));
    await page.locator('#vistaPDFConsulta [data-cerrar]').click();
  }
  assert.equal(await page.locator('#filas tr').count(),75);
  await page.click('#siguiente');
  await page.click('#imprimirLista');await page.selectOption('#edadImpresion','adultos');
  await page.locator('#filtroImpresion').screenshot({path:path.join(salida,'filtro-escritorio.png')});
  await page.setViewportSize({width:375,height:812});
  assert(await page.evaluate(()=>{const d=document.getElementById('filtroImpresion');return document.documentElement.scrollWidth<=innerWidth&&d.scrollWidth<=d.clientWidth;}));
  await page.locator('#filtroImpresion').screenshot({path:path.join(salida,'filtro-movil.png')});
  await page.click('#cancelarImpresion');assert.equal(await page.locator('#edadFiltro').inputValue(),'');assert.equal(await page.locator('#vistaPDFConsulta').count(),0);
  await page.setViewportSize({width:1280,height:900});
  await imprimirLista();
  await descargar('lista-completa-carta.pdf');
  assert.equal(await page.locator('#reporteImpresion tbody tr').count(),151);
  assert((await page.locator('#reporteImpresion').innerText()).includes('150 personas distintas'));
  assert.equal(await page.locator('#reporteImpresion img').count(),0);
  assert.equal(await page.locator('#reporteImpresion button').count(),0);
  await imprimirLista('adultos');assert.equal(await page.locator('#reporteImpresion tbody tr').count(),75);await descargar('adultos-carta.pdf');
  await imprimirLista('jovenes');assert.equal(await page.locator('#reporteImpresion tbody tr').count(),76);await descargar('jovenes-carta.pdf');
  fs.mkdirSync(path.join(raiz,'output'),{recursive:true});
  await page.selectOption('#centro','Centro A');await page.selectOption('#estadoFiltro','asistio');await page.selectOption('#edadFiltro','jovenes');
  await imprimirLista();
  await descargar('lista-filtrada-carta.pdf');
  assert.equal(await page.locator('#reporteImpresion tbody tr').count(),26);
  await page.fill('#buscarPersona','Persona 006');await imprimirLista();
  await descargar('busqueda-carta.pdf');
  assert.equal(await page.locator('#reporteImpresion tbody tr').count(),1);
  assert((await page.locator('#reporteImpresion').innerText()).includes('1 personas distintas'));
  await page.fill('#buscarPersona','sin coincidencias');await imprimirLista();
  await descargar('sin-resultados-carta.pdf');
  assert((await page.locator('#reporteImpresion').innerText()).includes('No hay registros con estos filtros.'));
  await page.fill('#buscarPersona','');await page.selectOption('#centro','');await page.selectOption('#estadoFiltro','');
  const comunidad=page.locator('#territorioFilas tr[data-comunidad="MILAGRO DE DIOS I"]');
  assert.equal(await comunidad.count(),1);
  await comunidad.click();
  await page.locator('#modalFiltros button[data-mfiltro="faltan"]').click();
  const personas=await page.locator('#modalFilas tr').count();
  await page.click('#imprimirComunidad');
  await descargar('comunidad-carta.pdf');
  assert.equal(await page.locator('#reporteImpresion tbody tr').count(),personas);
  assert((await page.locator('#reporteImpresion').innerText()).includes('Solo las que faltan'));
  await page.click('#modalCerrar');await page.click('#imprimirTerritorio');
  await descargar('territorio-carta.pdf');
  assert.equal(await page.locator('#reporteImpresion tbody tr').count(),await page.locator('#territorioFilas tr[data-comuna]').count());
  await page.setViewportSize({width:375,height:812});
  const ancho=await page.evaluate(()=>({pantalla:innerWidth,contenido:document.documentElement.scrollWidth}));
  assert(ancho.contenido<=ancho.pantalla);
  assert.deepEqual(errores,[]);
  await page.evaluate(async()=>{
    const {crearPDFConsulta,mostrarPDFConsulta}=await import('/consulta-popular-pdf.mjs');
    const filas=Array.from({length:85},(_,i)=>['COMUNA DE PRUEBA CON NOMBRE LARGO '+i,'COMUNIDAD DE PRUEBA CON NOMBRE LARGO '+i,i,i,1,i+1,2*i+1]);
    mostrarPDFConsulta(crearPDFConsulta({tipo:'territorio',titulo:'Resumen por comuna y comunidad',jornada:'domingo 18 de octubre de 2026 · 18/10/2026',filtros:'Grupo de edad: Todos',resumen:'85 comunidades ficticias para revisar saltos de página',encabezados:['Comuna','Comunidad','Votaron','No votaron','Pendientes','Faltan','Total'],filas}),'territorio-extenso.pdf');
  });
  await descargar('territorio-extenso-carta.pdf');
  await page.evaluate(async()=>{
    const {crearPDFConsulta,mostrarPDFConsulta}=await import('/consulta-popular-pdf.mjs');
    const filas=Array.from({length:110},(_,i)=>[i+1,'PERSONA FICTICIA DE NOMBRE Y APELLIDO LARGOS '+i,'V-999'+String(i).padStart(7,'0')+'\nTipo: Afín\nLista: General','0000000000',(i%2?'Masculino':'Femenino')+'\n25 años','CENTRO ELECTORAL DE PRUEBA '+i]);
    mostrarPDFConsulta(crearPDFConsulta({tipo:'comunidad',titulo:'Personas por comunidad',jornada:'domingo 18 de octubre de 2026 · 18/10/2026',filtros:'Comuna: Comunidad de prueba · Estado: Todas',resumen:'110 personas ficticias para verificar distribución',encabezados:['N.º','Nombres y apellidos','Cédula / Tipo / Lista','Teléfono','Sexo / Edad','Centro electoral'],filas}),'comunidad-extensa.pdf');
  });
  await descargar('comunidad-extensa-carta.pdf');
  console.log(JSON.stringify({impresionCompleta:151,filasVisiblesPorPagina:75,cuatroFiltrosCombinados:1,modalFiltrado:personas,jefesCorrectos:true,comunidadUnificada:true,sectorIIConservado:true,encabezadoAnteriorConservado:true,errores,ancho,salida}));
} finally {await browser.close();}
