// Prueba de lectura real: no crea usuarios ni modifica registros.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp,cert,deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'file:///C:/Users/carlo/node_modules/playwright/index.mjs';
const app=initializeApp({credential:cert(JSON.parse(fs.readFileSync('C:/Users/carlo/Documents/Alcaldia BDD/alcaldia-admin-firebase-adminsdk-fbsvc-207472a5bd.json','utf8')))});
let navegador;
try {
  const anonimo=await fetch('https://alcaldia-admin-default-rtdb.firebaseio.com/juguetes_municipio.json');
  assert.equal(anonimo.ok,false,'El nodo no debe ser legible anónimamente.');
  const usuario=await getAuth(app).getUserByEmail('carlos.admin@alcaldia.com');
  const token=await getAuth(app).createCustomToken(usuario.uid);
  navegador=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for(const ancho of [1280,375]) {
    const pagina=await navegador.newPage({viewport:{width:ancho,height:850}});
    const errores=[];pagina.on('pageerror',e=>errores.push(e.message));
    await pagina.goto('https://salasituacional.alcaldiadecharallave.com/index.html',{waitUntil:'domcontentloaded'});
    await pagina.evaluate(async token=>{
      const auth=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
      const app=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
      await auth.signInWithCustomToken(auth.getAuth(app.getApp()),token);
    },token);
    await pagina.goto('https://salasituacional.alcaldiadecharallave.com/juguetes-municipio.html',{waitUntil:'domcontentloaded'});
    await pagina.waitForSelector('#aplicacion:not([hidden])',{timeout:45000});
    const resumen=await pagina.evaluate(()=>({menores:document.querySelector('#total-ninos').textContent,fechas:document.querySelector('#total-fechas').textContent,registros:document.querySelectorAll('#lista-ninos tr').length,comunas:document.querySelector('#f-comuna').options.length}));
    assert.ok(Number(resumen.menores)>0 && resumen.registros>0 && resumen.comunas>1);
    assert.deepEqual(errores,[]);
    console.log('Producción '+ancho+' px:',JSON.stringify(resumen),'acceso anónimo bloqueado.');
    await pagina.close();
  }
} finally {if(navegador)await navegador.close();await deleteApp(app);}
