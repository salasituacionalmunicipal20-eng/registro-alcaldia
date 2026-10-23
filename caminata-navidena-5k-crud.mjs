import {NODO,PARENTESCOS,calcularEdad,planificarGuardado,planificarEliminacion} from './caminata-navidena-5k-crud-datos.mjs?v=20261023-crud2';
const API='https://admin.alcaldiadecharallave.com/api/caminata-navidad/admin-numeracion';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const igual=(a,b)=>JSON.stringify(ordenar(a))===JSON.stringify(ordenar(b));
function ordenar(v){return v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;}
const fechaLocal=t=>{const d=new Date(Number(t));return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=[...a].map(v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
async function comprimir(file){
 if(!file?.type.startsWith('image/'))throw Error('Selecciona una fotografía válida.');
 const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();const escala=Math.min(1,1000/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*escala);c.height=Math.round(img.height*escala);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const foto=c.toDataURL('image/jpeg',.66);if(foto.length>800000)throw Error('La fotografía es demasiado grande. Usa otra imagen.');return foto;}
 finally{URL.revokeObjectURL(url);}
}
export function iniciarCrudNavidad({auth,database,ref,get,update,obtenerRegistros,abrirFicha,cerrarFicha}){
 const estado=document.getElementById('estadoCrud'),anunciar=t=>{estado.textContent=t;};
 async function numerar(ids){
  if(!ids.length)return;
  const token=await auth.currentUser?.getIdToken();if(!token)throw Error('Vuelve a iniciar sesión para confirmar los números.');
  const r=await fetch(API,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({ids}),signal:AbortSignal.timeout(60000)}),d=await r.json();
  if(!r.ok||!d.ok)throw Error(d.error||'No se pudo confirmar la numeración.');
  if(ids.some(id=>!d.participantes?.some(p=>p.id===id)))throw Error('La numeración no está completa. Reintenta.');
 }
 async function editar(id=null){
  if(!auth.currentUser)return anunciar('Vuelve a iniciar sesión.');
  const usuario=auth.currentUser.uid;
  let original=null,fotosOriginales={};
  try{if(id){original=(await get(ref(database,NODO+'/'+id))).val();if(!original)throw Error('La inscripción ya no existe.');fotosOriginales=(await get(ref(database,NODO+'_fotos/'+id))).val()||{};}}
  catch(e){anunciar('No se pudo abrir la edición: '+e.message);return;}
  const r=original||{cedula:'',nombre_apellido:'',telefono:'',fecha_nacimiento:'',edad:'',sexo:'',municipio:'',direccion_habitacion:'',modalidad:'Caminata',talla_camisa:'',persona_con_discapacidad:'No',es_lider:true,lider_cedula:'',parentesco:'Líder familiar',padece_enfermedad:'No',enfermedad_detalle:'',toma_medicamento:'No',medicamento_detalle:'',fecha_registro:Date.now()};
  let fotos={...fotosOriginales},cargandoFotos=0,ocupado=false,guardado=false,nuevoId=id,pendientes=[];
  const dialogo=document.createElement('dialog');dialogo.id='editorInscripcion';dialogo.className='editor-navidad';
  function campo(c,t,tipo='text',max=200){return `<label>${t}<input data-campo="${c}" type="${tipo}" ${tipo==='text'?`maxlength="${max}"`:''} value="${esc(c==='fecha_registro'?fechaLocal(r[c]):r[c])}" ${c==='cedula'||c==='lider_cedula'?'inputmode="numeric"':''} ${c==='edad'?'readonly':''} /></label>`;}
  function select(c,t,lista){const valor=c==='sexo'?({Masculino:'Hombre',Femenino:'Mujer'}[r[c]]||r[c]):r[c];return `<label>${t}<select data-campo="${c}">${lista.map(([v,n])=>`<option value="${esc(v)}" ${String(v)===String(valor)?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;}
  const siNo=[['No','No'],['Sí','Sí']];
  dialogo.innerHTML=`<form id="formEditarInscripcion" novalidate><div class="editor-cabecera"><h2>${id?'Editar inscripción':'Nueva inscripción'}</h2><button type="button" data-cerrar-editor aria-label="Cerrar edición">×</button></div><div class="editor-cuerpo"><p>Modifica los datos y guarda al terminar. Si cambias la modalidad o la cédula, se confirma el número correspondiente sin duplicar inscripciones.</p><div class="editor-campos">
   ${campo('nombre_apellido','Nombre y apellido')}${select('es_lider','Integrante del grupo',[['true','Líder familiar'],['false','Familiar']])}
   <label class="editor-check"><input type="checkbox" data-sin-cedula ${r.sin_cedula?'checked':''} /> Menor sin cédula</label>${campo('cedula','Cédula','text',10)}
   ${campo('lider_cedula','Cédula del líder familiar','text',10)}${select('parentesco','Parentesco con el líder',PARENTESCOS.map(p=>[p,p]))}
   ${campo('fecha_nacimiento','Fecha de nacimiento','date')}${campo('edad','Edad (calculada)','number')}
   ${select('sexo','Sexo',[['','Selecciona'],['Hombre','Hombre'],['Mujer','Mujer']])}${campo('telefono','Teléfono','text',30)}
   ${campo('municipio','Municipio','text',120)}${campo('direccion_habitacion','Dirección de habitación','text',400)}
   ${select('modalidad','Modalidad',[['Caminata','Caminata'],['Carrera','Carrera']])}${campo('talla_camisa','Talla de camisa (puedes escribir otra talla)','text',36)}
   ${select('persona_con_discapacidad','Persona con discapacidad',siNo)}${campo('fecha_registro','Fecha y hora de inscripción','datetime-local')}
   ${select('padece_enfermedad','¿Padece alguna enfermedad?',siNo)}${campo('enfermedad_detalle','Enfermedad o condición','text',500)}
   ${select('toma_medicamento','¿Toma algún medicamento?',siNo)}${campo('medicamento_detalle','Medicamento','text',500)}
  </div><datalist id="crudLideres">${Object.entries(obtenerRegistros()).filter(([clave,v])=>v.es_lider&&clave!==id).map(([clave,v])=>`<option value="${esc(clave)}">${esc(v.nombre_apellido)}</option>`).join('')}</datalist><p>El número se administra automáticamente según la modalidad. Al cambiar la cédula del líder, sus familiares y fotografías permanecen vinculados al grupo. Para trasladar todo un grupo, cambia a su líder a «Familiar» y selecciona el nuevo responsable.</p><h3>Fotografías</h3><div class="editor-fotos">${[1,2,3].map(i=>`<div><img data-prev="foto${i}" alt="Fotografía ${i}" ${fotos['foto'+i]?`src="${esc(fotos['foto'+i])}"`:'hidden'} /><label>Fotografía ${i}<input type="file" data-foto="foto${i}" accept="image/*" /></label><button type="button" data-quitar="foto${i}">Quitar fotografía ${i}</button></div>`).join('')}</div><p data-estado-editor role="status" aria-live="polite"></p><div class="editor-acciones"><button type="submit" data-guardar>Guardar inscripción</button><button type="button" data-reintentar hidden>Reintentar numeración</button><button type="button" data-cerrar-editor>Cerrar</button></div></div></form>`;
  const form=dialogo.querySelector('form'),mensaje=dialogo.querySelector('[data-estado-editor]'),boton=dialogo.querySelector('[data-guardar]');
  const input=c=>form.querySelector(`[data-campo="${c}"]`),sinCedula=form.querySelector('[data-sin-cedula]');
  input('lider_cedula').setAttribute('list','crudLideres');
  function condicionales(){const lider=input('es_lider').value==='true';input('lider_cedula').disabled=lider;input('parentesco').disabled=lider;if(lider){sinCedula.checked=false;input('lider_cedula').value=input('cedula').value;input('parentesco').value='Líder familiar';}if(!lider&&input('parentesco').value==='Líder familiar')input('parentesco').value='Otro';sinCedula.disabled=lider;input('cedula').disabled=sinCedula.checked;for(const [c,d]of [['padece_enfermedad','enfermedad_detalle'],['toma_medicamento','medicamento_detalle']])input(d).disabled=input(c).value==='No';}
  for(const c of ['es_lider','cedula','padece_enfermedad','toma_medicamento'])input(c).addEventListener('change',condicionales);sinCedula.addEventListener('change',condicionales);
  input('fecha_nacimiento').addEventListener('change',()=>{input('edad').value=calcularEdad(input('fecha_nacimiento').value)??'';});
  condicionales();
  for(const b of dialogo.querySelectorAll('[data-cerrar-editor]'))b.onclick=()=>{if(!ocupado&&!cargandoFotos)dialogo.close();};
  dialogo.addEventListener('cancel',e=>{if(ocupado||cargandoFotos)e.preventDefault();});dialogo.addEventListener('close',()=>dialogo.remove(),{once:true});
  for(const f of dialogo.querySelectorAll('[data-foto]'))f.addEventListener('change',async()=>{if(!f.files?.[0])return;cargandoFotos++;boton.disabled=true;try{const foto=await comprimir(f.files[0]);fotos[f.dataset.foto]=foto;const img=dialogo.querySelector(`[data-prev="${f.dataset.foto}"]`);img.src=foto;img.hidden=false;mensaje.textContent='Fotografía preparada. Guarda la inscripción para aplicar el cambio.';}catch(e){mensaje.textContent=e.message;}finally{cargandoFotos--;f.value='';boton.disabled=ocupado||guardado||cargandoFotos>0;}});
  for(const b of dialogo.querySelectorAll('[data-quitar]'))b.onclick=()=>{delete fotos[b.dataset.quitar];const img=dialogo.querySelector(`[data-prev="${b.dataset.quitar}"]`);img.hidden=true;img.removeAttribute('src');mensaje.textContent='Fotografía retirada de esta edición. Guarda para aplicar el cambio.';};
  async function terminarNumeracion(){
   ocupado=true;dialogo.querySelector('[data-reintentar]').disabled=true;
   try{await numerar(pendientes);anunciar('Inscripción guardada y número confirmado.');ocupado=false;dialogo.close();cerrarFicha();await abrirFicha(nuevoId);}
   catch(e){mensaje.textContent='La inscripción ya está guardada. '+e.message;dialogo.querySelector('[data-reintentar]').hidden=false;}
   finally{ocupado=false;dialogo.querySelector('[data-reintentar]').disabled=false;}
  }
  dialogo.querySelector('[data-reintentar]').onclick=terminarNumeracion;
  form.addEventListener('submit',async evento=>{
   evento.preventDefault();if(ocupado||guardado||cargandoFotos)return;ocupado=true;boton.disabled=true;mensaje.textContent='Comprobando y guardando…';
   try{
    if(auth.currentUser?.uid!==usuario)throw Error('La sesión cambió. Vuelve a abrir la edición.');
    const actuales=(await get(ref(database,NODO))).val()||{};
    if(id&&!igual(actuales[id],original))throw Error('La inscripción cambió mientras la editabas. Cierra y vuelve a abrir para revisar la versión actual.');
    if(id){const actualesFotos=(await get(ref(database,NODO+'_fotos/'+id))).val()||{};if(!igual(actualesFotos,fotosOriginales))throw Error('Las fotografías cambiaron mientras editabas. Cierra y vuelve a abrir la ficha.');}
    const valores=Object.fromEntries([...form.querySelectorAll('[data-campo]')].map(e=>[e.dataset.campo,e.value.trim()]));
    const datos={...valores,es_lider:valores.es_lider==='true',sin_cedula:sinCedula.checked,cedula:sinCedula.checked?'':valores.cedula,edad:original&&valores.fecha_nacimiento===original.fecha_nacimiento?original.edad:calcularEdad(valores.fecha_nacimiento),fecha_registro:original&&valores.fecha_registro===fechaLocal(original.fecha_registro)?original.fecha_registro:new Date(valores.fecha_registro).getTime(),fecha_evento:'2026-12-05'};
    if(datos.padece_enfermedad==='No')datos.enfermedad_detalle='';if(datos.toma_medicamento==='No')datos.medicamento_detalle='';
    const identificador=uuid();if(!original){datos.registrado_por=auth.currentUser.email;datos.comprobante_token=identificador;}
    const otrasFotos={};
    if(original?.es_lider&&(!datos.es_lider||datos.cedula!==id))await Promise.all(Object.entries(actuales).filter(([clave,v])=>clave!==id&&v.lider_cedula===id&&v.tiene_fotos).map(async([clave])=>{otrasFotos[clave]=(await get(ref(database,NODO+'_fotos/'+clave))).val()||{};if(!Object.values(otrasFotos[clave]).some(Boolean))throw Error('No se pudieron cargar todas las fotos del grupo. No se guardó ningún cambio.');}));
    const plan=planificarGuardado({registros:actuales,idAnterior:id,registro:datos,fotos,fotosAnteriores:otrasFotos,uuid:identificador});
    await update(ref(database),plan.actualizaciones);guardado=true;nuevoId=plan.id;pendientes=plan.numerar;
    boton.hidden=true;for(const e of form.querySelectorAll('input,select,[data-quitar]'))e.disabled=true;
    await terminarNumeracion();
   }catch(e){mensaje.textContent='No se guardó la inscripción: '+e.message;}
   finally{ocupado=false;boton.disabled=guardado||cargandoFotos>0;}
  });
  document.body.append(dialogo);dialogo.showModal();input('nombre_apellido').focus();
 }
 async function eliminar(id,grupoCompleto=false){
  try{
   const actuales=(await get(ref(database,NODO))).val()||{},plan=planificarEliminacion(actuales,id,grupoCompleto);
   if(!confirm(`¿Eliminar definitivamente ${plan.ids.length===1?'esta inscripción':las(plan.ids.length)} y sus fotografías? Esta acción no se puede deshacer.`))return;
   await update(ref(database),plan.actualizaciones);cerrarFicha();anunciar(plan.ids.length===1?'Inscripción eliminada.':'Grupo familiar eliminado.');
  }catch(e){anunciar('No se pudo eliminar: '+e.message);alert('No se pudo eliminar: '+e.message);}
 }
 function las(n){return 'las '+n+' inscripciones del grupo familiar';}
 document.getElementById('nuevaInscripcion').onclick=()=>editar();
 document.getElementById('completarNumeros').onclick=async()=>{try{const ids=Object.entries(obtenerRegistros()).filter(([id,r])=>!Number.isInteger(r.numero_inscripcion)).slice(0,150).map(([id])=>id);if(!ids.length)return anunciar('Todas las inscripciones tienen número.');anunciar('Completando números…');await numerar(ids);anunciar('Números confirmados.');}catch(e){anunciar(e.message);}};
 document.addEventListener('click',e=>{const b=e.target.closest('.editar-inscripcion');if(b)editar(b.dataset.id);});
 return {editar,eliminar};
}
