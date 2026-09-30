import { auth, db, ref, get, set, update, onValue, serverTimestamp, sesion, SUPER, mensaje, enlace } from './formularios-firebase.js';
const F = window.Formularios, e = F.escapar, $ = id => document.getElementById(id);
const BORRADOR = 'sala-constructor-borrador-v1';
let lista = [], seleccionado = -1, actual = null, bloqueado = false, publicados = {}, sucio = false, guardando = false;
const textos = ['titulo','descripcion','acceso','lectura','mensaje'];
const ids = ['nombre-formulario','descripcion','acceso','lectura','confirmacion'];
function valores() { return Object.fromEntries(textos.map((k,i)=>[k,$(ids[i]).value.trim()])); }
function definicion() { return { ...valores(), campos: F.empaquetar(lista), publicado: true, activo: actual?.activo ?? true }; }
function recordar() {
  sucio = true;
  try { localStorage.setItem(BORRADOR, JSON.stringify({ lista, datos:valores(), id:actual?.id || null })); $('estado-editor').textContent = 'Borrador guardado en este equipo · ' + new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'}); }
  catch { $('estado-editor').textContent = 'No se pudo guardar el borrador local. Mantén esta pestaña abierta.'; }
}
function ver(id) { ['inicio','editor','preview-seccion','compartir-seccion'].forEach(x=>$(x).hidden=x!==id); mensaje(''); window.scrollTo({top:0}); }
function abrir(datos, campos, id=null, lock=false) {
  actual = id ? { ...datos, id } : null; lista = campos; bloqueado=lock; seleccionado=lista.length ? 0 : -1;
  ids.forEach((id,i)=>$(id).value=datos[textos[i]] || ({acceso:'publico',lectura:'carlos',mensaje:'Tu registro se guardó correctamente. Gracias por participar.'}[textos[i]] || ''));
  $('titulo-editor').textContent=actual ? 'Editar formulario' : 'Nuevo formulario'; $('publicar').textContent=actual ? 'Guardar cambios' : 'Publicar formulario'; $('estructura-aviso').hidden=!lock;
  document.querySelectorAll('[data-tipo],[data-bloque]').forEach(b=>b.disabled=lock);
  ver('editor'); pintarCampos(); sucio=false;
}
function pintarCampos() {
  $('total-campos').textContent=lista.length+' / '+F.MAX;
  $('campos').innerHTML=lista.length ? lista.map((c,i)=>`<article class="fila-campo ${i===seleccionado?'seleccionado':''}"><div class="fila-superior"><button data-seleccionar="${i}" style="text-align:left;flex:1;justify-content:flex-start">${e(c.etiqueta || 'Campo sin nombre')}</button><div class="acciones"><button data-mover="${i}" data-dir="-1" aria-label="Subir ${e(c.etiqueta)}" ${bloqueado||i===0?'disabled':''}>↑</button><button data-mover="${i}" data-dir="1" aria-label="Bajar ${e(c.etiqueta)}" ${bloqueado||i===lista.length-1?'disabled':''}>↓</button><button data-quitar="${i}" class="peligro" ${bloqueado?'disabled':''}>Quitar</button></div></div><small>${e(F.TIPOS[c.tipo])}${c.obligatorio?' · Obligatorio':' · Opcional'}${c.filtro?' · Genera filtro':''}${c.seccion?' · '+e(c.seccion):''}</small></article>`).join('') : '<div class="vacio"><h3>Tu formulario empieza aquí</h3><p>Agrega el bloque de identidad o elige tus primeras preguntas en la biblioteca.</p></div>';
  $('campos').querySelectorAll('[data-seleccionar]').forEach(b=>b.onclick=()=>{seleccionado=Number(b.dataset.seleccionar);pintarCampos();});
  $('campos').querySelectorAll('[data-mover]').forEach(b=>b.onclick=()=>{let i=Number(b.dataset.mover), j=i+Number(b.dataset.dir);[lista[i],lista[j]]=[lista[j],lista[i]];seleccionado=j;recordar();pintarCampos();});
  $('campos').querySelectorAll('[data-quitar]').forEach(b=>b.onclick=()=>{lista.splice(Number(b.dataset.quitar),1);seleccionado=Math.min(seleccionado,lista.length-1);recordar();pintarCampos();});
  pintarPropiedades();
}
function pintarPropiedades() {
  const c=lista[seleccionado];
  if(!c){$('propiedades').innerHTML='<p class="muted">Selecciona una pregunta para configurar su nombre y su filtro.</p>';return;}
  $('propiedades').innerHTML=`<p class="muted">${e(F.TIPOS[c.tipo])}</p><div class="detalle-props"><div class="campo"><label for="prop-etiqueta">Nombre de la pregunta</label><input id="prop-etiqueta" maxlength="100" value="${e(c.etiqueta)}"></div><div class="campo"><label for="prop-ayuda">Ayuda debajo del campo</label><textarea id="prop-ayuda" maxlength="300">${e(c.ayuda)}</textarea></div><div class="campo"><label for="prop-seccion">Sección (opcional)</label><input id="prop-seccion" maxlength="100" value="${e(c.seccion)}" placeholder="Ej. Datos de la persona"></div><div class="campo"><label class="check"><input id="prop-obligatorio" type="checkbox" ${c.obligatorio?'checked':''}>Respuesta obligatoria</label><label class="check"><input id="prop-filtro" type="checkbox" ${c.filtro?'checked':''}>Crear filtro en el tablero</label></div>${c.tipo==='lista'?`<div class="campo"><label for="prop-opciones">Opciones, una por línea</label><textarea id="prop-opciones" rows="6" maxlength="2500">${e(F.opciones(c).join('\n'))}</textarea><p class="ayuda">Hasta 30 opciones, de 100 caracteres cada una. No uses | dentro de una opción.</p></div>`:''}${c.tipo==='numero'?`<div class="campo"><label for="prop-minimo">Valor mínimo</label><input type="number" id="prop-minimo" step="any" value="${c.minimo}"><label for="prop-maximo" style="margin-top:12px">Valor máximo</label><input type="number" id="prop-maximo" step="any" value="${c.maximo}"></div>`:''}${c.tipo==='sino'?'<div class="mensaje"><span class="badge-si">Sí</span> <span class="badge-no">No</span><p class="ayuda">Así aparecerán las respuestas en el tablero. Si es opcional, también habrá «Sin respuesta».</p></div>':''}</div>`;
  $('propiedades').querySelectorAll('input,textarea').forEach(el=>{el.disabled=bloqueado;el.oninput=()=>{
    const k=el.id.replace('prop-','');
    if(k==='opciones'){c.opciones='|'+el.value.split('\n').map(x=>x.trim().replace(/\|/g,'')).filter(Boolean).join('|')+'|';}
    else c[k]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
    recordar(); const fila=$('campos').children[seleccionado];fila.querySelector('[data-seleccionar]').textContent=c.etiqueta||'Campo sin nombre';fila.querySelector('small').textContent=F.TIPOS[c.tipo]+(c.obligatorio?' · Obligatorio':' · Opcional')+(c.filtro?' · Genera filtro':'');
  };});
  if(c.tipo==='sino'){
    const div=document.createElement('div');div.className='campo';div.innerHTML='<label for="prop-uso">Quién responde este Sí / No</label><select id="prop-uso"><option value="formulario">La persona en el formulario</option><option value="panel">Yo desde el tablero (seguimiento)</option></select><p class="ayuda">El seguimiento aparece solo en el tablero. Puedes cambiarlo sin alterar las respuestas originales.</p>';
    $('propiedades').prepend(div);const el=$('prop-uso');el.value=c.uso;el.disabled=bloqueado;el.onchange=()=>{c.uso=el.value;if(c.uso==='panel')c.obligatorio=false;recordar();pintarCampos();};
    if(c.uso==='panel')$('prop-obligatorio').disabled=true;
  }
}
function agregar(cs) {
  if(bloqueado)return;
  if(lista.length+cs.length>F.MAX){mensaje('Puedes agregar hasta 40 campos.','error');return;}
  const roles=new Set(lista.map(c=>c.rol).filter(Boolean));
  if(cs.some(c=>c.rol&&roles.has(c.rol))){mensaje('Ese bloque ya está agregado. Edita sus campos en la lista.','error');return;}
  lista.push(...cs);seleccionado=lista.length-cs.length;recordar();pintarCampos();mensaje('');
}
async function editar(id, duplicar=false) {
  try{ const d=publicados[id]; if(!d)throw new Error('Este formulario ya no está disponible.');
    const resp=duplicar?null:await get(ref(db,'formularios_respuestas/'+id));
    abrir({...d,titulo:d.titulo+(duplicar?' (copia)':'')},F.campos(d).map(([,c])=>({...c})),duplicar?null:id,!!resp?.exists());
    if(duplicar)recordar();
  }catch(err){mensaje(err.message,'error');}
}
function pintarLista() {
  const forms=Object.entries(publicados).sort((a,b)=>b[1].creado_en-a[1].creado_en);
  $('mis-formularios').innerHTML=forms.length?'<div class="formularios-lista">'+forms.map(([id,d])=>`<article class="form-item"><div><h3>${e(d.titulo)}</h3><p class="muted">${F.campos(d).length} campos · ${d.lectura==='carlos'?'Respuestas solo para Carlos':'Resultados para administradores'}</p><span class="estado ${d.activo?'activo':'cerrado'}">${d.activo?'Abierto':'Cerrado'}</span></div><div class="acciones"><a class="boton" href="${e(enlace('resultados-formulario.html',id))}">Ver resultados</a><button data-compartir="${id}">Compartir</button><button data-editar="${id}">Editar</button><button data-duplicar="${id}">Duplicar</button><button data-estado="${id}">${d.activo?'Cerrar recepción':'Abrir recepción'}</button></div></article>`).join('')+'</div>':'<div class="vacio"><h3>Todo listo para tu primer formulario</h3><p>Publica tus preguntas y obtén un enlace para compartir y un tablero con filtros.</p><button id="primero" class="primario">Crear mi primer formulario</button></div>';
  $('primero')?.addEventListener('click',()=>$('nuevo').click());
  $('mis-formularios').querySelectorAll('[data-editar]').forEach(b=>b.onclick=()=>editar(b.dataset.editar));
  $('mis-formularios').querySelectorAll('[data-duplicar]').forEach(b=>b.onclick=()=>editar(b.dataset.duplicar,true));
  $('mis-formularios').querySelectorAll('[data-compartir]').forEach(b=>b.onclick=()=>compartir(b.dataset.compartir));
  $('mis-formularios').querySelectorAll('[data-estado]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await update(ref(db,'formularios_definiciones/'+b.dataset.estado),{activo:!publicados[b.dataset.estado].activo,actualizado_en:serverTimestamp()});mensaje('Estado de recepción actualizado.','exito');}catch(err){mensaje('No se pudo cambiar la recepción: '+err.message,'error');b.disabled=false;}});
}
async function copiar(url){try{await navigator.clipboard.writeText(url);mensaje('Enlace copiado.','exito');}catch{mensaje('Selecciona y copia el enlace que aparece abajo.','error');}}
function compartir(id) {
  const d=publicados[id], url=enlace('formulario.html',id), panel=enlace('resultados-formulario.html',id);
  ver('compartir-seccion');
  $('compartir').innerHTML=`<h2>${e(d.titulo)}</h2><div class="compartir"><div><h3>Enlace para llenar el formulario</h3><a class="enlace" href="${e(url)}" target="_blank" rel="noopener">${e(url)}</a><div class="acciones"><button id="copiar-publico" class="primario">Copiar enlace</button><a class="boton" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(d.titulo+'\n'+url)}">Compartir por WhatsApp</a><a class="boton" href="${e(url)}" target="_blank" rel="noopener">Abrir formulario</a></div><h3 style="margin-top:28px">Tablero de resultados y filtros</h3><a class="enlace" href="${e(panel)}">${e(panel)}</a><a class="boton" href="${e(panel)}">Abrir tablero</a><p class="ayuda">El tablero requiere sesión y respeta los permisos que elegiste. ${d.activo?'El formulario está abierto.':'La recepción está cerrada.'}</p></div><div><img alt="Código QR del formulario" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}"><a class="enlace" target="_blank" rel="noopener" href="https://api.qrserver.com/v1/create-qr-code/?size=600x600&download=1&data=${encodeURIComponent(url)}">Descargar QR</a></div></div>`;
  $('copiar-publico').onclick=()=>copiar(url);
}
ids.forEach(id=>$(id).addEventListener('input',recordar));
$('tipos').innerHTML=Object.entries(F.TIPOS).filter(([k])=>!['parroquia','comuna','comunidad','nacionalidad'].includes(k)).map(([k,v])=>`<button data-tipo="${k}">${e(v)}</button>`).join('');
document.querySelectorAll('[data-tipo]').forEach(b=>b.onclick=()=>agregar([F.campo(b.dataset.tipo,b.dataset.tipo==='sino'?'Tu pregunta de Sí / No':F.TIPOS[b.dataset.tipo],{rol:b.dataset.tipo==='cedula'?'cedula':''})]));
document.querySelectorAll('[data-bloque]').forEach(b=>b.onclick=()=>agregar(b.dataset.bloque==='identidad'?F.identidad():b.dataset.bloque==='territorio'?F.territorio():[F.campo('telefono','Teléfono'),F.campo('correo','Correo electrónico')]));
$('nuevo').onclick=()=>abrir({},[]);
$('volver-lista').onclick=()=>{ver('inicio');$('borrador-aviso').hidden=!localStorage.getItem(BORRADOR);};
$('cerrar-compartir').onclick=()=>ver('inicio');
$('vista-previa').onclick=()=>{window.FormulariosRender.renderizar($('preview'),definicion(),{preview:true});ver('preview-seccion');};
$('cerrar-preview').onclick=()=>ver('editor');
$('recuperar').onclick=async()=>{try{const b=JSON.parse(localStorage.getItem(BORRADOR));if(!b||!Array.isArray(b.lista))throw new Error('No hay un borrador válido.'); if(b.id){await editar(b.id);if(!bloqueado){lista=b.lista;ids.forEach((id,i)=>$(id).value=b.datos[textos[i]]);pintarCampos();}}else abrir(b.datos,b.lista); }catch(err){mensaje(err.message,'error');}};
$('publicar').onclick=async()=>{
  if(guardando)return;
  try{const d=F.validarDefinicion(definicion());for(const [,c] of F.campos(d)){if(c.tipo==='lista'&&(F.opciones(c).length>30||F.opciones(c).some(x=>x.length>100)))throw new Error('Cada lista admite hasta 30 opciones de 100 caracteres.');}
    const id=actual?.id||('f-'+crypto.randomUUID());guardando=true;$('publicar').disabled=true;$('publicar').textContent='Guardando…';
    if(actual) await update(ref(db,'formularios_definiciones/'+id),{...d,actualizado_en:serverTimestamp()});
    else await set(ref(db,'formularios_definiciones/'+id),{...d,creado_en:serverTimestamp(),actualizado_en:serverTimestamp()});
    const comprobado=await get(ref(db,'formularios_definiciones/'+id));if(!comprobado.exists())throw new Error('No se pudo confirmar la publicación.');publicados[id]=comprobado.val();sucio=false;localStorage.removeItem(BORRADOR);$('borrador-aviso').hidden=true;compartir(id);
  }catch(err){mensaje('No se publicó: '+(err.code==='PERMISSION_DENIED'?'Los campos ya tienen respuestas o tu sesión no tiene permiso. Vuelve a abrir el formulario desde la lista.':err.message),'error');}
  finally{guardando=false;$('publicar').disabled=false;$('publicar').textContent=actual?'Guardar cambios':'Publicar formulario';}
};
window.addEventListener('beforeunload',ev=>{if(sucio){ev.preventDefault();ev.returnValue='';}});
try{const user=await sesion();if(!user){location.href='index.html';}else if(user.email!==SUPER){throw new Error('Esta herramienta está reservada a Carlos.');}else{$('carga').hidden=true;$('contenido').hidden=false;$('borrador-aviso').hidden=!localStorage.getItem(BORRADOR);onValue(ref(db,'formularios_definiciones'),s=>{publicados=s.val()||{};pintarLista();},err=>mensaje('No se pudieron cargar los formularios. '+err.message,'error'));}}catch(err){$('carga').hidden=true;mensaje(err.message,'error');}
