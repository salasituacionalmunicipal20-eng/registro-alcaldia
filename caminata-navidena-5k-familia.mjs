import {EVENTO,TALLAS,PARENTESCOS} from './caminata-navidena-5k-datos.mjs?v=20261015';
export function iniciarFamiliares(calcularEdad,comprimir) {
  const contenedor=document.getElementById('familiares'),fotos=new Map();let secuencia=0;
  const opcion=v=>`<option>${v}</option>`;
  document.getElementById('agregarFamiliar').addEventListener('click',()=>{
    for(const d of contenedor.querySelectorAll('details'))d.open=false;
    const numero=++secuencia,id='familiar-'+numero,caja=document.createElement('details');caja.className='familiar';caja.open=true;caja.dataset.familiar=id;
    const campo=(clave,etiqueta,tipo='text',extra='')=>`<div><label for="${id}-${clave}">${etiqueta}</label><input id="${id}-${clave}" data-campo="${clave}" type="${tipo}" ${extra}></div>`;
    const selector=(clave,etiqueta,opciones)=>`<div><label for="${id}-${clave}">${etiqueta}</label><select id="${id}-${clave}" data-campo="${clave}"><option value="">Selecciona</option>${opciones.map(opcion).join('')}</select></div>`;
    caja.innerHTML=`<summary>Familiar ${secuencia}</summary><div class="familiar-contenido">
      ${selector('parentesco','Parentesco con el líder *',PARENTESCOS)}
      <div class="row2">${campo('cedula','Cédula del familiar *','text','inputmode="numeric" maxlength="10"')}${campo('nombre','Nombre y apellido *','text','maxlength="200"')}</div>
      <div class="row2">${campo('nacimiento','Fecha de nacimiento *','date',`max="${new Date().toISOString().slice(0,10)}"`)}${selector('sexo','Sexo *',['Hombre','Mujer'])}</div>
      <div class="row2">${selector('modalidad','Participación *',['Caminata','Carrera'])}${selector('talla','Talla de camisa *',TALLAS)}</div>
      <div data-otra-talla hidden>${campo('otraTalla','Indica la talla *','text','maxlength="30"')}</div>
      ${selector('discapacidad','¿Es una persona con discapacidad? *',['Sí','No'])}
      ${selector('enfermedad','¿Padece alguna enfermedad? *',['Sí','No'])}
      <div data-detalle-enfermedad hidden><label for="${id}-detalleEnfermedad">Indica cuál *</label><textarea id="${id}-detalleEnfermedad" data-campo="detalleEnfermedad" maxlength="500"></textarea></div>
      ${selector('medicamento','¿Toma algún medicamento? *',['Sí','No'])}
      <div data-detalle-medicamento hidden><label for="${id}-detalleMedicamento">Indica cuál *</label><textarea id="${id}-detalleMedicamento" data-campo="detalleMedicamento" maxlength="500"></textarea></div>
      ${campo('telefono','Otro teléfono de contacto (opcional)','tel','maxlength="30"')}
      <p class="hint">El teléfono y la dirección del líder serán el contacto del grupo. Puedes indicar otro teléfono para este familiar.</p>
      ${campo('foto','Foto personal (opcional)','file','accept="image/*"')}
      <img class="foto-familiar" alt="Vista previa de la fotografía del familiar" hidden><p class="estado-foto" role="status"></p>
      <button type="button" class="quitar-familiar">Quitar familiar</button></div>`;
    contenedor.append(caja);
    const valor=clave=>caja.querySelector(`[data-campo="${clave}"]`);
    valor('nombre').addEventListener('input',()=>{caja.querySelector('summary').textContent=`Familiar ${numero}: ${valor('nombre').value.trim()||'sin nombre'}`;});
    for(const [clave,selectorCaja,si] of [['talla','[data-otra-talla]','Otra'],['enfermedad','[data-detalle-enfermedad]','Sí'],['medicamento','[data-detalle-medicamento]','Sí']])valor(clave).addEventListener('change',()=>{caja.querySelector(selectorCaja).hidden=valor(clave).value!==si;});
    caja.querySelector('.quitar-familiar').addEventListener('click',()=>{fotos.delete(id);caja.remove();});
    valor('foto').addEventListener('change',async()=>{
      const estado=caja.querySelector('.estado-foto'),prev=caja.querySelector('img');
      estado.textContent='Preparando fotografía…';
      try{const foto=await comprimir(valor('foto').files?.[0]);fotos.set(id,foto);prev.src=foto;prev.hidden=false;estado.textContent='Fotografía preparada.';}
      catch(e){fotos.delete(id);prev.hidden=true;valor('foto').value='';estado.textContent=e.message;}
    });
    valor('parentesco').focus();
  });
  function recoger(lider) {
    return [...contenedor.querySelectorAll('[data-familiar]')].map((caja,i)=>{
      const campo=clave=>caja.querySelector(`[data-campo="${clave}"]`),valor=clave=>campo(clave).value.trim();
      const fallo=(mensaje,clave)=>{caja.open=true;throw Object.assign(new Error(`Familiar ${i+1}: ${mensaje}`),{campo:campo(clave).id});};
      const cedula=valor('cedula').replace(/\D/g,''),edad=calcularEdad(valor('nacimiento'));
      if(!/^\d{5,10}$/.test(cedula))fallo('escribe su cédula válida.','cedula');
      if(valor('nombre').length<3)fallo('escribe su nombre y apellido.','nombre');
      if(edad==='')fallo('selecciona una fecha de nacimiento válida.','nacimiento');
      for(const clave of ['parentesco','sexo','modalidad','talla','discapacidad','enfermedad','medicamento'])if(!valor(clave))fallo('completa '+campo(clave).labels[0].textContent.replace(' *','')+'.',clave);
      if(valor('talla')==='Otra'&&!valor('otraTalla'))fallo('indica la talla de camisa.','otraTalla');
      if(valor('enfermedad')==='Sí'&&!valor('detalleEnfermedad'))fallo('indica la enfermedad.','detalleEnfermedad');
      if(valor('medicamento')==='Sí'&&!valor('detalleMedicamento'))fallo('indica el medicamento.','detalleMedicamento');
      if(valor('telefono')&&valor('telefono').length<6)fallo('revisa el teléfono.','telefono');
      const foto=fotos.get(caja.dataset.familiar);
      return {registro:{...lider,cedula,nombre_apellido:valor('nombre'),telefono:valor('telefono')||lider.telefono,fecha_nacimiento:valor('nacimiento'),edad:Number(edad),sexo:valor('sexo'),modalidad:valor('modalidad'),talla_camisa:valor('talla')==='Otra'?'Otra: '+valor('otraTalla'):valor('talla'),persona_con_discapacidad:valor('discapacidad'),es_lider:false,lider_cedula:lider.cedula,parentesco:valor('parentesco'),orden_familiar:i+1,padece_enfermedad:valor('enfermedad'),enfermedad_detalle:valor('enfermedad')==='Sí'?valor('detalleEnfermedad'):'',toma_medicamento:valor('medicamento'),medicamento_detalle:valor('medicamento')==='Sí'?valor('detalleMedicamento'):'',tiene_fotos:Boolean(foto),fecha_evento:EVENTO.fecha},fotos:foto?{foto1:foto}:{}};
    });
  }
  return {recoger};
}
