import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {getDatabase,ref,get,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import {getApp} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {SISTEMAS_1X10,consolidarPersonas} from './asistencia-centros-datos.mjs?v=20261016-integracion';

const enlaces=[['1x10-sectores.html','Todos los sectores'],['1x10-seguimiento.html','Seguimiento territorial'],['1x10-asistencia.html','Consulta Popular'],['asistencia-centros.html','Asistencia por centro'],['1x10-resultados.html','General'],['1x10-empleados-resultados.html','Empleados'],['1x10-cristianos-resultados.html','Cristianos'],['1x10-abuelos-resultados.html','Abuelos'],['1x10-cristianos-abuelos-resultados.html','Cristianos y abuelos'],['1x10-salud-resultados.html','Salud'],['1x10-educacion-resultados.html','Educación']];
const campos=['nombre','comuna','comunidad','centro'];
enlaces.push(['empleados-sin-1x10.html','Cruce de empleados'],['equipos-sin-1x10.html','Cruce de equipos']);
const numero=n=>n.toLocaleString('es-VE');
const iguales=(a,b)=>!!a&&campos.every(k=>a[k]===b[k]);
const app=getApp(),auth=getAuth(app),db=getDatabase(app);
let detener=[],temporizador,version=0,enCurso=false,pendiente=false,conectado=false,permiso=false;
let sistemas=[],listos=new Set(),errores=new Set(),panel,estado,totales,sincronizacion;

function montar(){
  const contenido=document.getElementById('contenido');if(!contenido)return false;
  panel=document.createElement('section');panel.id='vinculos1x10';panel.setAttribute('aria-label','Módulos vinculados del 1x10');
  panel.style.cssText='background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin:12px 0 18px;overflow-wrap:anywhere;font:14px/1.5 Arial,sans-serif';
  const titulo=document.createElement('strong');titulo.textContent='1x10 · Base registrada de los siete sectores';panel.append(titulo);
  totales=document.createElement('p');totales.id='totalesVinculados1x10';totales.style.margin='6px 0';panel.append(totales);
  estado=document.createElement('p');estado.id='estadoVinculado1x10';estado.setAttribute('role','status');estado.style.margin='6px 0';panel.append(estado);
  sincronizacion=document.createElement('p');sincronizacion.id='directorioVinculado1x10';sincronizacion.style.margin='6px 0';panel.append(sincronizacion);
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Navegar por el 1x10');nav.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
  for(const [url,texto] of enlaces){const a=document.createElement('a');a.href=url;a.textContent=texto;a.style.cssText='display:inline-flex;align-items:center;min-height:44px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;color:#123b66;text-decoration:none;box-sizing:border-box';if(location.pathname.endsWith('/'+url)){a.setAttribute('aria-current','page');a.style.fontWeight='bold';}nav.append(a);}
  panel.append(nav);contenido.prepend(panel);return true;
}
function pintar(){
  const listo=listos.size===14&&!errores.size;
  panel.dataset.listo=String(listo);panel.dataset.conectado=String(conectado);
  estado.textContent=errores.size?'No se pudieron leer todas las fuentes. Los totales no están disponibles.':!listo?'Cargando las siete variantes completas…':conectado?'En vivo · la asistencia se comparte por persona y fecha.':'Sin conexión · se muestra la última carga recibida.';
  if(!listo){totales.textContent='Registros: — · Personas únicas: —';return;}
  const r=consolidarPersonas(sistemas,window.TERRITORIO?.comunidades||{}),d=r.diagnostico;
  totales.textContent=`${numero(d.registros)} registros · ${numero(d.personas)} personas únicas · ${numero(d.repetidos)} registros repetidos, incluidos · ${numero(d.sinIdentidad)} sin identidad válida, incluidos. Los totales de cada sector corresponden a su propia lista; los filtros afectan su detalle.`;
  panel.dataset.registros=String(d.registros);panel.dataset.personas=String(d.personas);
  if(conectado){pendiente=true;clearTimeout(temporizador);temporizador=setTimeout(sincronizar,1200);}
}
async function sincronizar(){
  if(enCurso||!pendiente||!permiso||!conectado||listos.size!==14||errores.size)return;
  enCurso=true;pendiente=false;const revision=version;
  try{
    const r=consolidarPersonas(sistemas,window.TERRITORIO?.comunidades||{}),esperado=new Map(r.personas.map(p=>[p.id,Object.fromEntries(campos.map(k=>[k,p[k]]))]));
    const actual=(await get(ref(db,'directorio_1x10'))).val()||{};
    if(revision!==version){pendiente=true;return;}
    let cambios=0,conflictos=0,invalidos=0;
    for(const [id,dato] of esperado){
      if(campos.some(k=>!dato[k]||dato[k].length>160)){invalidos++;continue;}
      if(iguales(actual[id],dato))continue;
      if(revision!==version){pendiente=true;break;}
      const previo=actual[id]||null;
      // Actualizo únicamente la ficha que no cambió desde la lectura; nunca borro personas.
      const res=await runTransaction(ref(db,'directorio_1x10/'+id),actualizado=>{
        if(revision!==version)return;
        if(JSON.stringify(actualizado??null)!==JSON.stringify(previo)&&!iguales(actualizado,dato))return;
        return dato;
      },{applyLocally:false});
      if(res.committed&&iguales(res.snapshot.val(),dato))cambios++;else conflictos++;
    }
    const verificado=(await get(ref(db,'directorio_1x10'))).val()||{};
    const diferentes=[...esperado].filter(([id,dato])=>!iguales(verificado[id],dato)).length;
    const sobrantes=Object.keys(verificado).filter(id=>!esperado.has(id)).length;
    const revisar=invalidos||conflictos||diferentes||sobrantes||revision!==version;
    sincronizacion.textContent=revisar?`Directorio público: ${diferentes} fichas pendientes de sincronizar; ${sobrantes} fichas anteriores por revisar. No se eliminan registros automáticamente.`:`Directorio público comprobado: ${numero(esperado.size)} personas vinculadas con la base registrada.`;
    sincronizacion.dataset.estado=revisar?'revisar':'actualizado';
    if(conflictos)pendiente=true;
  }catch(e){sincronizacion.textContent='No se pudo comprobar el directorio público. Se reintentará al recibir cambios o recuperar la conexión.';sincronizacion.dataset.estado='error';console.error('Directorio público 1x10:',e.code||e.message);}
  finally{enCurso=false;if(pendiente&&conectado)temporizador=setTimeout(sincronizar,3000);}
}
onAuthStateChanged(auth,async user=>{
  version++;clearTimeout(temporizador);for(const stop of detener)stop();detener=[];panel?.remove();permiso=false;
  if(!user)return;const revision=version;
  const permitido=user.email==='carlos.admin@alcaldia.com'||(await get(ref(db,'operadores/'+user.uid+'/rol')).catch(()=>null))?.val()==='admin';
  if(!permitido||revision!==version||!montar())return;permiso=true;
  sistemas=SISTEMAS_1X10.map(sufijo=>({sufijo,jefes:{},afines:{}}));listos=new Set();errores=new Set();conectado=false;
  detener.push(onValue(ref(db,'.info/connected'),s=>{conectado=s.val()===true;pintar();}));
  sistemas.forEach(s=>{for(const tipo of ['jefes','afines']){const nodo=tipo+'_1x10'+s.sufijo;detener.push(onValue(ref(db,nodo),snap=>{s[tipo]=snap.val()||{};version++;listos.add(nodo);errores.delete(nodo);pintar();},()=>{version++;errores.add(nodo);listos.delete(nodo);pintar();}));}});
  pintar();
});
