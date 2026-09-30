import { db, ref, push, get, set, onValue, serverTimestamp, sesion, administrador, idFormulario, mensaje } from './formularios-firebase.js';
const $=id=>document.getElementById(id);
let def, id, pendiente=null, enviando=false, usuario=null, renderizado=false;
function actualizar(d) {
  def=d;$('carga').hidden=true;
  if(!d||!d.publicado){$('contenido').hidden=true;mensaje('Este formulario no está disponible. Revisa el enlace con quien te lo envió.','error');return;}
  document.title=d.titulo+' · Sala Situacional';
  if(!d.activo){$('contenido').hidden=true;mensaje('La recepción de «'+d.titulo+'» está cerrada.','');return;}
  if(d.acceso==='administradores'&&!usuario){$('contenido').hidden=true;mensaje('Este formulario requiere una sesión administrativa. Entra desde el panel de Sala Situacional y vuelve a abrir este enlace.','');return;}
  if(!renderizado){window.FormulariosRender.renderizar($('registro'),d);renderizado=true;}
  if($('gracias').hidden)$('contenido').hidden=false;
  mensaje('');
}
$('registro').onsubmit=async ev=>{
  ev.preventDefault();if(enviando)return;
  try{
    if(!def?.activo)throw new Error('La recepción de este formulario está cerrada.');
    if(def.acceso==='administradores'&&!usuario)throw new Error('Necesitas una sesión administrativa.');
    const valores=window.FormulariosRender.recoger($('registro'),def);
    // Una misma clave se conserva para reintentar sin crear dos registros por una conexión incierta.
    pendiente ||= push(ref(db,'formularios_respuestas/'+id)).key;
    const registro={creado_en:serverTimestamp(),valores,version:1};
    enviando=true;$('enviar').disabled=true;$('enviar').textContent='Enviando…';
    await set(ref(db,'formularios_respuestas/'+id+'/'+pendiente),registro);
    $('contenido').hidden=true;$('gracias').hidden=false;$('texto-gracias').textContent=def.mensaje;$('referencia').textContent='Comprobante: '+pendiente;pendiente=null;mensaje('');
  }catch(err){mensaje(err.code==='PERMISSION_DENIED'?'No se pudo guardar. La recepción puede haberse cerrado. Conserva tus datos y consulta al responsable.': 'No se pudo enviar: '+err.message+'. Tus datos siguen en pantalla.','error');}
  finally{enviando=false;const b=$('enviar');if(b){b.disabled=false;b.textContent='Enviar registro';}}
};
$('otro').onclick=()=>{$('gracias').hidden=true;renderizado=false;actualizar(def);};
try{id=idFormulario();const user=await sesion();usuario=await administrador(user)?user:null;onValue(ref(db,'formularios_definiciones/'+id),s=>actualizar(s.val()),err=>{$('carga').hidden=true;$('contenido').hidden=true;mensaje('No se pudo abrir el formulario. Revisa el enlace o intenta de nuevo cuando tengas conexión.','error');});}
catch(err){$('carga').hidden=true;mensaje(err.message,'error');}
