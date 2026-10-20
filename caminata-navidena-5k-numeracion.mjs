const API='https://admin.alcaldiadecharallave.com/api/caminata-navidad/numeracion';
export async function confirmarNumeracion(grupo,comprobante,hacerFetch=fetch){
 const ids=grupo.map(p=>p.clave||p.registro.cedula);
 const r=await hacerFetch(API,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,comprobante}),signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw new Error('No se pudo confirmar la numeración');const d=await r.json();
 if(!d.ok||!Array.isArray(d.participantes)||d.participantes.length!==ids.length||new Set(d.participantes.map(p=>p.id)).size!==ids.length)throw new Error('Numeración incompleta');
 const numeros=grupo.map((p,i)=>{const a=d.participantes.find(a=>a.id===ids[i]);if(!a||a.modalidad!==p.registro.modalidad||!Number.isSafeInteger(a.numero_inscripcion)||a.numero_inscripcion<1)throw new Error('Número no válido');return a.numero_inscripcion;});
 for(let i=0;i<grupo.length;i++)grupo[i].registro.numero_inscripcion=numeros[i];
}
