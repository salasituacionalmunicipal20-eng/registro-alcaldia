import {initializeApp} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {getDatabase,ref,get,child,onValue,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import {SISTEMAS_1X10,consolidarPersonas,conAsistencia,filtrarPersonas,contarAsistencia,cedulaVisible,ESTADOS} from './asistencia-centros-datos.mjs?v=20261003f';
import {descargarPDF,descargarExcel} from './asistencia-centros-exportar.mjs?v=20261003f';

const app=initializeApp({apiKey:'AIzaSyCEqiu5ypPSGbS6nzju6VZtd2RIRYRDmGU',authDomain:'alcaldia-admin.firebaseapp.com',databaseURL:'https://alcaldia-admin-default-rtdb.firebaseio.com',projectId:'alcaldia-admin',storageBucket:'alcaldia-admin.firebasestorage.app',messagingSenderId:'945828226894',appId:'1:945828226894:web:0efeebeb270357e6f5201f'});
const auth=getAuth(app),database=getDatabase(app),$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numero=n=>n.toLocaleString('es-VE');
const sistemas=Object.fromEntries(SISTEMAS_1X10.map(s=>[s,{jefes:{},afines:{}}]));
const nodos=SISTEMAS_1X10.flatMap(s=>[['jefes_1x10'+s,v=>sistemas[s].jefes=v],['afines_1x10'+s,v=>sistemas[s].afines=v]]);
const listos=new Set(),guardando=new Set();
let usuario=null,personas=[],registrosLista=[],diagnostico=null,estados={},asistenciaLista=false,conectado=false,errorFuente=false,pagina=1,visibles=[],grupos=[],detener=[],detenerFecha=null,versionFecha=0;
const limite=60;
const partes=new Intl.DateTimeFormat('en-US',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
$('fecha').value=['year','month','day'].map(k=>partes.find(p=>p.type===k).value).join('-');
function fechaValida(){const v=$('fecha').value;const d=new Date(v+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;}
function listo(){return listos.size===nodos.length&&asistenciaLista&&!errorFuente&&fechaValida();}
function aviso(mensaje,error=false){$('mensaje').textContent=mensaje;$('mensaje').classList.toggle('oculto',!mensaje);$('mensaje').classList.toggle('error',error);}
function estadoConexion(){const completo=listo();$('conexion').textContent=errorFuente?'No se pudieron cargar todas las fuentes':!completo?'Cargando lista y asistencia…':conectado?'En vivo · asistencia sincronizada':'Sin conexión · última lista recibida';for(const id of ['pdf','excel'])$(id).disabled=!completo||!visibles.length;}
function opciones(id,valores,inicial){const anterior=$(id).value;$(id).replaceChildren(new Option(inicial,''),...[...new Set(valores)].sort((a,b)=>a.localeCompare(b,'es')).map(v=>new Option(v,v)));if(valores.includes(anterior))$(id).value=anterior;}
function actualizarFiltros(){
  opciones('comuna',listaBase().map(p=>p.comuna),'Todas las comunas');
  const porComuna=listaBase().filter(p=>!$('comuna').value||p.comuna===$('comuna').value);
  opciones('comunidad',porComuna.map(p=>p.comunidad),'Todas las comunidades');
  opciones('centro',porComuna.filter(p=>!$('comunidad').value||p.comunidad===$('comunidad').value).map(p=>p.centro),'Todos los centros');
}
function reconstruir(){
  if(listos.size!==nodos.length){estadoConexion();return;}
  const r=consolidarPersonas(Object.values(sistemas),window.TERRITORIO?.comunidades||{});personas=r.personas;registrosLista=r.registrosLista;diagnostico=r.diagnostico;actualizarFiltros();pintar();
}
function listaBase(){return $('vista').value==='personas'?personas:registrosLista;}
function filtros(){return {comuna:$('comuna').value,comunidad:$('comunidad').value,centro:$('centro').value,buscar:$('buscar').value,estado:$('estado').value};}
function textoFiltros(){return [$('comuna').value||'Todas las comunas',$('comunidad').value||'Todas las comunidades',$('centro').value||'Todos los centros',$('estado').value?ESTADOS[$('estado').value]:'Todos los estados',$('buscar').value.trim()?'Búsqueda: '+$('buscar').value.trim():''].filter(Boolean).join(' · ');}
function pintar(){
  estadoConexion();if(!listo()){for(const id of ['totalRegistros','totalPersonas','total','si','no','pendientes'])$(id).textContent='—';$('personasLista').replaceChildren();$('centrosLista').replaceChildren();return;}
  const sonRegistros=$('vista').value==='registros',unidad=sonRegistros?'registros':'personas únicas';
  $('totalRegistros').textContent=numero(diagnostico.registros);$('totalPersonas').textContent=numero(diagnostico.personas);
  $('etiquetaTotal').textContent=sonRegistros?'Registros en la lista':'Personas únicas en la lista';
  $('etiquetaSi').textContent=sonRegistros?'Registros con asistencia':'Sí asistieron';$('etiquetaNo').textContent=sonRegistros?'Registros sin asistencia':'No asistieron';
  visibles=filtrarPersonas(conAsistencia(listaBase(),estados),filtros());
  const c=contarAsistencia(visibles);for(const [id,k] of [['total','total'],['si','asistio'],['no','no_asistio'],['pendientes','pendiente']])$(id).textContent=numero(c[k]);
  const mapa=new Map();for(const p of visibles){if(!mapa.has(p.centro))mapa.set(p.centro,[]);mapa.get(p.centro).push(p);}grupos=[...mapa].sort((a,b)=>a[0].localeCompare(b[0],'es'));
  $('centrosLista').innerHTML=grupos.map(([nombre,filas],i)=>{const c=contarAsistencia(filas);return `<tr><td>${esc(nombre)}</td>${['total','asistio','no_asistio','pendiente'].map(k=>`<td class="numero">${numero(c[k])}</td>`).join('')}<td><div class="acciones"><button data-exportar="pdf" data-grupo="${i}" aria-label="PDF de ${esc(nombre)}">PDF</button><button data-exportar="excel" data-grupo="${i}" aria-label="Excel de ${esc(nombre)}">Excel</button></div></td></tr>`;}).join('')||'<tr><td colspan="6">No hay personas con estos filtros.</td></tr>';
  const paginas=Math.max(1,Math.ceil(visibles.length/limite));pagina=Math.min(pagina,paginas);const desde=(pagina-1)*limite;
  $('personasLista').innerHTML=visibles.slice(desde,desde+limite).map(p=>`<tr><td data-label="Cédula">${esc(cedulaVisible(p))}</td><td data-label="Nombre y apellido" class="nombre">${esc(p.nombre)}</td><td data-label="Comuna / Comunidad">${esc(p.comuna)}<span class="detalle">${esc(p.comunidad)}</span></td><td data-label="Centro electoral">${esc(p.centro)}</td><td data-label="Asistencia de la jornada"><div class="acciones">${!p.id?'<span class="detalle">C\u00e9dula por corregir en el 1x10</span>':[['asistio','Sí'],['no_asistio','No'],['pendiente','Pendiente']].map(([estado,t])=>`<button data-persona="${esc(p.id)}" data-estado="${estado}" aria-label="${esc(ESTADOS[estado]+' · '+p.nombre)}" aria-pressed="${p.estado===estado}" ${!conectado||guardando.has(p.id)?'disabled':''}>${t}</button>`).join('')}</div></td></tr>`).join('')||'<tr><td colspan="5">No hay personas en esta selección. Revisa los filtros.</td></tr>';
  $('pagina').textContent=`Página ${pagina} de ${paginas}`;$('anterior').disabled=pagina<=1;$('siguiente').disabled=pagina>=paginas;
  $('alcance').textContent=(sonRegistros?'Todos los registros · ':'Personas únicas · ')+textoFiltros();$('tituloLista').textContent=numero(visibles.length)+' '+unidad+' · jornada del '+$('fecha').value.split('-').reverse().join('/');
  $('calidad').textContent=`${numero(diagnostico.registros)} registros de las siete variantes; ${numero(diagnostico.personas)} personas en las listas; ${numero(diagnostico.repetidos)} registros repetidos agrupados; ${numero(diagnostico.sinIdentidad)} registros sin cédula válida, pendientes de corregir en el 1x10; ${numero(diagnostico.ubicacionesPorVerificar)} personas con ubicación por verificar.`;
  estadoConexion();
}
function escucharFecha(){
  versionFecha++;const version=versionFecha;if(detenerFecha)detenerFecha();detenerFecha=null;asistenciaLista=false;estados={};pagina=1;pintar();
  if(!fechaValida()){aviso('Selecciona una fecha válida para la jornada.',true);return;}
  aviso('');detenerFecha=onValue(ref(database,'asistencia_centros/'+$('fecha').value),s=>{if(version!==versionFecha)return;estados=s.val()||{};asistenciaLista=true;pintar();},err=>{if(version!==versionFecha)return;asistenciaLista=false;aviso('No se pudo cargar la asistencia: '+err.message,true);pintar();});
}
for(const id of ['comuna','comunidad','centro'])$(id).addEventListener('change',()=>{pagina=1;actualizarFiltros();pintar();});
$('vista').addEventListener('change',()=>{pagina=1;actualizarFiltros();pintar();});
for(const id of ['buscar','estado'])$(id).addEventListener(id==='buscar'?'input':'change',()=>{pagina=1;pintar();});
$('fecha').addEventListener('change',escucharFecha);
$('limpiar').addEventListener('click',()=>{for(const id of ['comuna','comunidad','centro','buscar','estado'])$(id).value='';pagina=1;actualizarFiltros();pintar();});
$('anterior').addEventListener('click',()=>{pagina--;pintar();});$('siguiente').addEventListener('click',()=>{pagina++;pintar();});
$('personasLista').addEventListener('click',async e=>{
  const boton=e.target.closest('[data-persona]');if(!boton||!listo()||!conectado)return;
  const id=boton.dataset.persona,nuevo=boton.dataset.estado;if(!id||!personas.some(p=>p.id===id)||guardando.has(id)||!Object.hasOwn(ESTADOS,nuevo))return;
  const fecha=$('fecha').value,version=versionFecha,previo=estados[id]||null,uid=usuario.uid;
  if((previo?.estado||'pendiente')===nuevo)return;
  guardando.add(id);pintar();aviso('Guardando asistencia…');
  try {
    const resultado=await runTransaction(ref(database,`asistencia_centros/${fecha}/${id}`),actual=>{
      if((actual?.actualizado_en||0)!==(previo?.actualizado_en||0)||(actual?.estado||'pendiente')!==(previo?.estado||'pendiente'))return;
      return {estado:nuevo,actualizado_en:serverTimestamp(),actualizado_por:uid};
    },{applyLocally:false});
    if(!resultado.committed)throw Error('Otro administrador cambió este registro. Revisa el estado actualizado y vuelve a marcarlo.');
    if(version===versionFecha)aviso('Asistencia guardada y sincronizada.');
  } catch(err){if(version===versionFecha)aviso('No se pudo guardar: '+err.message,true);}
  finally{guardando.delete(id);pintar();}
});
async function exportar(tipo,filas=visibles){
  if(!listo()||!filas.length)return;
  try {const opciones={fecha:$('fecha').value,filtros:($('vista').value==='registros'?'Todos los registros · ':'Personas únicas · ')+textoFiltros()};if(tipo==='pdf')descargarPDF(filas,opciones);else descargarExcel(filas,opciones);aviso('Lista completa preparada para descargar.');}
  catch(err){aviso('No se pudo generar el archivo: '+err.message,true);}
}
$('pdf').addEventListener('click',()=>exportar('pdf'));$('excel').addEventListener('click',()=>exportar('excel'));
$('centrosLista').addEventListener('click',e=>{const b=e.target.closest('[data-exportar]');if(b&&grupos[Number(b.dataset.grupo)])exportar(b.dataset.exportar,grupos[Number(b.dataset.grupo)][1]);});
onAuthStateChanged(auth,async user=>{
  for(const stop of detener)stop();detener=[];if(detenerFecha)detenerFecha();detenerFecha=null;versionFecha++;listos.clear();asistenciaLista=false;errorFuente=false;$('contenido').classList.add('oculto');
  if(!user){location.href='index.html';return;}
  let permitido=user.email==='carlos.admin@alcaldia.com';if(!permitido){try{const s=await get(child(ref(database),`operadores/${user.uid}/rol`));permitido=s.val()==='admin';}catch{permitido=false;}}
  $('cargando').classList.add('oculto');if(!permitido){$('restringido').classList.remove('oculto');return;}
  usuario=user;$('contenido').classList.remove('oculto');
  detener.push(onValue(ref(database,'.info/connected'),s=>{conectado=s.val()===true;pintar();}));
  for(const [nodo,poner] of nodos)detener.push(onValue(ref(database,nodo),s=>{poner(s.val()||{});listos.add(nodo);reconstruir();},err=>{errorFuente=true;aviso('No se pudo cargar el 1x10: '+err.message,true);pintar();}));
  escucharFecha();
});
