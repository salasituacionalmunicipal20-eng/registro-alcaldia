import {crearPlanillasPDF} from './caminata-navidena-5k-pdf.mjs?v=20261023-numero-grande';
const API='https://admin.alcaldiadecharallave.com/api/caminata-navidad/planillas';
export function iniciarConsultaPlanillas(){
 const $=id=>document.getElementById(id),form=$('consultaPlanillas'),buscar=$('buscarPlanillas'),descargar=$('descargarPlanillasConsultadas'),estado=$('estadoConsultaPlanillas');
 let participantes=[],revision=0;
 for(const id of ['consultaCedula','consultaTelefono'])$(id).addEventListener('input',()=>{
  revision++;participantes=[];descargar.hidden=true;estado.textContent='';
 });
 form.addEventListener('submit',async evento=>{
  evento.preventDefault();if(buscar.disabled)return;
  const cedula=$('consultaCedula').value.trim(),telefono=$('consultaTelefono').value.trim();
  if(!/^\d{5,10}$/.test(cedula)||telefono.replace(/\D/g,'').length<7){estado.textContent='Escribe una cédula válida y el teléfono registrado.';return;}
  const actual=++revision;participantes=[];descargar.hidden=true;buscar.disabled=true;buscar.textContent='Buscando…';estado.textContent='Comprobando tu inscripción…';
  try{
   const r=await fetch(API,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({cedula,telefono}),signal:AbortSignal.timeout(45000)});
   const d=await r.json();if(actual!==revision)return;
   if(!r.ok)throw Error(d.error||'No se pudo completar la búsqueda. Intenta de nuevo.');
   if(!d.ok||!Array.isArray(d.participantes)||!d.participantes.length)throw Error('La consulta no devolvió planillas. Intenta de nuevo.');
   participantes=d.participantes;estado.textContent=`Encontramos ${participantes.length===1?'tu planilla':participantes.length+' planillas de tu grupo familiar'}. Puedes descargarlas en un solo PDF.`;descargar.hidden=false;
  }catch(e){if(actual===revision)estado.textContent=e.name==='TimeoutError'?'La consulta tardó demasiado. Intenta de nuevo.':e.message==='Failed to fetch'?'No se pudo conectar. Revisa tu conexión e intenta de nuevo.':e.message;}
  finally{buscar.disabled=false;buscar.textContent='Buscar inscripción';}
 });
 descargar.addEventListener('click',()=>{
  if(!participantes.length)return;descargar.disabled=true;
  try{crearPlanillasPDF(participantes).save('mis_planillas_navidad_5k_2026.pdf');}
  catch{estado.textContent='No se pudo generar el PDF. Pulsa Descargar mis planillas PDF para reintentar.';}
  finally{descargar.disabled=false;}
 });
}
