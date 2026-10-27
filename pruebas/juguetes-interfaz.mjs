// Prueba aislada con datos ficticios y Firebase simulado; no accede a producción.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'file:///C:/Users/carlo/node_modules/playwright/index.mjs';
const raiz=path.resolve(import.meta.dirname,'..');
const servidor=http.createServer((req,res)=>{
  const p=path.resolve(raiz,'.'+new URL(req.url,'http://localhost').pathname);
  if(!p.startsWith(raiz+path.sep)){res.writeHead(403).end();return;}
  try {res.setHeader('Content-Type',p.endsWith('.mjs')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}
  catch {res.writeHead(404).end();}
});
await new Promise(r=>servidor.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+servidor.address().port;
let navegador;
try {
  navegador=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for (const ancho of [1280,375]) {
    const pagina=await navegador.newPage({viewport:{width:ancho,height:850}});
    const errores=[];pagina.on('pageerror',e=>errores.push(e.message));
    await pagina.addInitScript(()=>{
      window.pruebaDB={
        habitantes:{
          n1:{nombre:'Ana',apellido:'Prueba',sexo:'femenino',fecha_nacimiento:'2020-01-02',comuna:'Comuna A',comunidad:'La Chivera',calle:'Calle Uno',numero_casa:'1'},
          n2:{nombre:'Luis',apellido:'Prueba',sexo:'masculino',fecha_nacimiento:'2023-01-02',comuna:'Comuna A',comunidad:'La Chivera',calle:'Calle Dos',numero_casa:'2'},
          adulto:{nombre:'Adulto',apellido:'Prueba',sexo:'femenino',fecha_nacimiento:'1980-01-02',comuna:'Comuna A',comunidad:'La Chivera'},
          pendiente:{nombre:'Fecha',apellido:'Pendiente',fecha_nacimiento:'',comuna:'Comuna A',comunidad:'La Chivera'}
        },
        filtros_territoriales:{'Comuna A':['La Chivera']},
        juguetes_municipio:{},operadores:{admin:{rol:'admin'}}
      };
      window.pruebaOyentes=[];window.pruebaSecuencia=0;
    });
    await pagina.route('https://www.gstatic.com/firebasejs/10.14.1/**',async route=>{
      const url=route.request().url();let body='';
      if(url.endsWith('firebase-app.js'))body='export const initializeApp=x=>x;';
      if(url.endsWith('firebase-auth.js'))body=`export const getAuth=()=>({});export const onAuthStateChanged=(_,fn)=>fn({uid:'admin',email:'admin@alcaldia.com'});`;
      if(url.endsWith('firebase-database.js'))body=`
        export const getDatabase=()=>({});
        export const ref=(_,p)=>p;
        const valor=p=>p.split('/').reduce((a,k)=>a?.[k],window.pruebaDB);
        const snap=v=>({val:()=>v,exists:()=>v!=null});
        export const get=async p=>snap(valor(p));
        export const onValue=(p,fn)=>{window.pruebaOyentes.push(fn);fn(snap(valor(p)))};
        export const push=()=>({key:'m'+(++window.pruebaSecuencia)});
        export const runTransaction=async(p,fn)=>{const v=fn(structuredClone(valor(p)||null));if(v===undefined)return {committed:false};window.pruebaDB[p]=v;for(const f of window.pruebaOyentes)f(snap(v));return {committed:true};};`;
      await route.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body});
    });
    await pagina.goto(base+'/juguetes-municipio.html');
    await pagina.waitForSelector('#aplicacion:not([hidden])');
    await pagina.screenshot({path:'output/juguetes-vista-'+ancho+'.png',fullPage:true});
    assert.equal(await pagina.locator('#total-ninos').innerText(),'2');
    assert.equal(await pagina.locator('#total-fechas').innerText(),'1');
    assert.equal(await pagina.locator('#lista-ninos tr').count(),2);
    await pagina.selectOption('#f-sexo','femenino');
    assert.equal(await pagina.locator('#lista-ninos tr').count(),1);
    await pagina.locator('[data-regalo]').click();
    await pagina.locator('#form-regalo [name=cantidad]').fill('2');
    await pagina.locator('#form-regalo [name=descripcion]').fill('Muñeca');
    await pagina.locator('#form-regalo button[type=submit]').click();
    await pagina.waitForFunction(()=>!document.querySelector('#dialogo-regalo').open);
    assert.match(await pagina.locator('#lista-ninos').innerText(),/2 · Muñeca/);
    await pagina.locator('[data-vista=movimientos]').click();
    for(const [campo,valor] of Object.entries({codigo:'MU-1',descripcion:'Muñeca',cantidad:'2',responsable:'Responsable',telefono_responsable:'123',dueno:'Dueño',telefono_dueno:'456'})) await pagina.locator('#form-movimiento [name='+campo+']').fill(valor);
    await pagina.locator('#form-movimiento button[type=submit]').click();
    await pagina.waitForFunction(()=>document.querySelector('#mensaje-movimiento').textContent.includes('correctamente'));
    assert.match(await pagina.locator('#lista-existencias').innerText(),/MU-1/);
    await pagina.selectOption('#form-movimiento [name=tipo]','salida');
    for(const [campo,valor] of Object.entries({codigo:'MU-1',descripcion:'Muñeca',cantidad:'1',responsable:'Responsable',telefono_responsable:'123',dueno:'Dueño',telefono_dueno:'456'})) await pagina.locator('#form-movimiento [name='+campo+']').fill(valor);
    await pagina.selectOption('#form-movimiento [name=comuna]','Comuna A');
    await pagina.selectOption('#form-movimiento [name=comunidad]','La Chivera');
    await pagina.locator('#form-movimiento button[type=submit]').click();
    await pagina.waitForFunction(()=>document.querySelectorAll('#lista-movimientos tr').length===2,null,{timeout:5000}).catch(async e=>{
      console.error('Estado del formulario:',await pagina.locator('#mensaje-movimiento').innerText(),'errores:',errores,'fixture:',await pagina.evaluate(()=>({inventario:window.pruebaDB.juguetes_municipio.inventario,descripcion:document.querySelector('#form-movimiento [name=descripcion]').value})));
      throw e;
    });
    assert.match(await pagina.locator('#lista-entregas').innerText(),/La Chivera/);
    assert.match(await pagina.locator('#lista-entregas').innerText(),/Muñeca/);
    assert.deepEqual(errores,[]);
    console.log('Interfaz ficticia: filtros, asignación, recepción y salida correctos a '+ancho+' px.');
    await pagina.close();
  }
} finally {if(navegador)await navegador.close();servidor.close();}
