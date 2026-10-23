export const NODO='caminata_navidena_5k_2026';
export const PARENTESCOS=['Líder familiar','Madre','Padre','Hija','Hijo','Cónyuge o pareja','Hermana','Hermano','Abuela','Abuelo','Nieta','Nieto','Otro'];
const claveCedula=/^\d{5,10}$/;
const claveMenor=/^menor_\d{5,10}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function calcularEdad(fecha,hoy=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha||''))return null;
 const d=new Date(fecha+'T12:00:00');if(Number.isNaN(d.getTime())||d>hoy||d.getFullYear()!==Number(fecha.slice(0,4))||d.getMonth()+1!==Number(fecha.slice(5,7))||d.getDate()!==Number(fecha.slice(8,10)))return null;
 let edad=hoy.getFullYear()-d.getFullYear();if(hoy.getMonth()<d.getMonth()||(hoy.getMonth()===d.getMonth()&&hoy.getDate()<d.getDate()))edad--;
 return edad>=0&&edad<=120?edad:null;
}
export function validarRegistro(r){
 const falla=m=>{throw Error(m);};
 const longitud=(c,min,max)=>{if(typeof r[c]!=='string'||r[c].trim().length<min||r[c].length>max)falla('Revisa '+({nombre_apellido:'el nombre y apellido',telefono:'el teléfono',direccion_habitacion:'la dirección',municipio:'el municipio',parentesco:'el parentesco'}[c]||c)+'.');};
 longitud('nombre_apellido',3,200);longitud('telefono',6,30);longitud('direccion_habitacion',5,400);longitud('municipio',2,120);
 if(!Number.isInteger(r.edad)||r.edad<0||r.edad>120||calcularEdad(r.fecha_nacimiento)===null)falla('Revisa la fecha de nacimiento.');
 if(!['Hombre','Mujer'].includes(r.sexo))falla('Selecciona el sexo.');
 if(!['Caminata','Carrera'].includes(r.modalidad))falla('Selecciona la modalidad.');
 if(typeof r.talla_camisa!=='string'||!r.talla_camisa.trim()||r.talla_camisa.length>36)falla('Indica la talla de camisa (hasta 36 caracteres).');
 if(!['Sí','No'].includes(r.persona_con_discapacidad))falla('Indica si tiene alguna discapacidad.');
 for(const [campo,detalle]of [['padece_enfermedad','enfermedad_detalle'],['toma_medicamento','medicamento_detalle']]){
  if(!['Sí','No'].includes(r[campo]))falla('Completa los datos de enfermedad y medicamentos.');
  if(typeof r[detalle]!=='string'||r[detalle].length>500||(r[campo]==='Sí'&&!r[detalle].trim()))falla('Completa el detalle de enfermedad o medicamento.');
 }
 if(r.sin_cedula){if(r.cedula!==''||r.edad>=18||r.es_lider)falla('Solo un menor que sea familiar puede registrarse sin cédula.');}
 else if(!claveCedula.test(r.cedula))falla('La cédula debe tener entre 5 y 10 dígitos.');
 if(r.es_lider&&r.edad<18)falla('El líder familiar debe ser mayor de edad.');
 if(!claveCedula.test(r.lider_cedula))falla('Selecciona un líder familiar válido.');
 if(r.es_lider&&(r.lider_cedula!==r.cedula||r.parentesco!=='Líder familiar'||r.orden_familiar!==0))falla('Revisa los datos del líder familiar.');
 if(!PARENTESCOS.includes(r.parentesco)||(!r.es_lider&&r.parentesco==='Líder familiar'))falla('Selecciona un parentesco válido.');
 if(!r.es_lider){if(!Number.isInteger(r.orden_familiar)||r.orden_familiar<1)falla('Revisa el orden familiar.');}
 if(!Number.isFinite(r.fecha_registro)||r.fecha_registro<=0)falla('Indica una fecha de inscripción válida.');
 if(r.fecha_evento!=='2026-12-05')falla('La inscripción corresponde al 5 de diciembre de 2026.');
 if(typeof r.tiene_fotos!=='boolean')falla('Revisa las fotografías.');
}
export function clavePara(r,anterior,uuid){
 if(!r.sin_cedula)return r.cedula;
 const sufijo=anterior?.match(/_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)?.[1]||uuid;
 const id='menor_'+r.lider_cedula+'_'+sufijo;if(!claveMenor.test(id))throw Error('No se pudo identificar la inscripción del menor.');return id;
}
export function planificarGuardado({registros,idAnterior=null,registro,fotos={},fotosAnteriores={},uuid}){
 const original=idAnterior?registros[idAnterior]:null;
 if(idAnterior&&!original)throw Error('La inscripción ya no existe. Actualiza el panel.');
 const nuevo={...(original||{}),...registro};delete nuevo.id;delete nuevo._fotos;
 nuevo.sin_cedula=nuevo.sin_cedula===true;nuevo.tiene_fotos=Object.values(fotos).some(Boolean);
 nuevo.es_lider=nuevo.es_lider===true;
 if(nuevo.es_lider){nuevo.lider_cedula=nuevo.cedula;nuevo.parentesco='Líder familiar';nuevo.orden_familiar=0;}
 else{
  const destino=registros[nuevo.lider_cedula];
  if(!destino?.es_lider||nuevo.lider_cedula===idAnterior)throw Error('Selecciona otro líder familiar existente.');
  const mismo=original&&!original.es_lider&&original.lider_cedula===nuevo.lider_cedula;
  nuevo.orden_familiar=mismo?original.orden_familiar:Math.max(0,...Object.values(registros).filter(r=>r.lider_cedula===nuevo.lider_cedula).map(r=>Number(r.orden_familiar)||0))+1;
 }
 validarRegistro(nuevo);
 const id=clavePara(nuevo,idAnterior,uuid);
 if(id!==idAnterior&&registros[id])throw Error('Ya existe una inscripción con esa cédula. No se reemplazó ningún registro.');
 const actualizaciones={},numerar=[],traslados=[];
 function poner(viejo,clave,r,imagenes){
  if(clave!==viejo&&registros[clave])throw Error('El cambio coincide con otra inscripción existente.');
  if(!original||clave!==viejo||r.modalidad!==registros[viejo]?.modalidad){delete r.numero_inscripcion;numerar.push(clave);}
  validarRegistro(r);
  if(viejo&&clave!==viejo){actualizaciones[NODO+'/'+viejo]=null;actualizaciones[NODO+'_fotos/'+viejo]=null;traslados.push({antes:viejo,despues:clave});}
  actualizaciones[NODO+'/'+clave]=r;
  actualizaciones[NODO+'_fotos/'+clave]=Object.values(imagenes||{}).some(Boolean)?imagenes:null;
 }
 poner(idAnterior,id,nuevo,fotos);
 // Al corregir la cédula del responsable, sus familiares siguen en el grupo.
 if(original?.es_lider&&(!nuevo.es_lider||id!==idAnterior)){
  let orden=nuevo.orden_familiar;
  for(const [clave,r]of Object.entries(registros).filter(([clave,r])=>clave!==idAnterior&&r.lider_cedula===idAnterior).sort((a,b)=>Number(a[1].orden_familiar)-Number(b[1].orden_familiar))){
   const cambio={...r,lider_cedula:nuevo.lider_cedula};
   if(!nuevo.es_lider)cambio.orden_familiar=++orden;
   const nuevaClave=clavePara(cambio,clave,uuid);
   poner(clave,nuevaClave,cambio,fotosAnteriores[clave]||{});
  }
 }
 return {id,actualizaciones,numerar,traslados};
}
export function planificarEliminacion(registros,id,grupoCompleto=false){
 const r=registros[id];if(!r)throw Error('La inscripción ya no existe.');
 const familiares=Object.entries(registros).filter(([clave,v])=>clave!==id&&v.lider_cedula===id);
 if(r.es_lider&&familiares.length&&!grupoCompleto)throw Error('Este líder tiene familiares inscritos. Reasigna primero el grupo a otro líder o elige eliminar todo el grupo familiar.');
 const ids=grupoCompleto&&r.es_lider?[id,...familiares.map(([clave])=>clave)]:[id],actualizaciones={};
 for(const clave of ids){actualizaciones[NODO+'/'+clave]=null;actualizaciones[NODO+'_fotos/'+clave]=null;}
 return {ids,actualizaciones};
}
