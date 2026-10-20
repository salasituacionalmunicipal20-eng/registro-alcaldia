export const EVENTO = Object.freeze({
  nombre: 'Caminata y Carrera Navideña 5K',
  fecha: '2026-12-05',
  fechaVisible: 'sábado 5 de diciembre de 2026 · 05/12/2026',
  nodo: 'caminata_navidena_5k_2026',
  enlace: 'https://salasituacional.alcaldiadecharallave.com/caminata-navidena-5k.html'
});
export const NOTAS = [
  'Para realizar el chequeo antes de la competencia, debes llevar la planilla impresa y tu cédula laminada. Sin estos documentos no podrás completar el registro. Para los menores inscritos sin cédula, lleva su planilla y la cédula del responsable para la verificación de sus datos.',
  'Para participar en la carrera debes registrarte previamente y únicamente a través del enlace de inscripción. Si no te registras, solo podrás sumarte a la caminata al llegar al punto de chequeo y verificación.'
];
export const TALLAS = ['Infantil 2','Infantil 4','Infantil 6','Infantil 8','Infantil 10','Infantil 12','Infantil 14','Infantil 16','XS','S','M','L','XL','XXL','XXXL','Otra'];
export const PARENTESCOS = ['Madre','Padre','Hija','Hijo','Cónyuge o pareja','Hermana','Hermano','Abuela','Abuelo','Nieta','Nieto','Otro'];
export const ETIQUETAS_EVENTO = ['Fecha del evento','Participación','Talla de camisa','Persona con discapacidad','Rol familiar','Parentesco','Cédula del líder'];
export function documentoParticipante(r) { return r.sin_cedula ? 'Menor sin cédula' : r.cedula || '—'; }
export function numeroParticipante(r) { return Number.isSafeInteger(r.numero_inscripcion)&&r.numero_inscripcion>0 ? `${r.modalidad} ${r.numero_inscripcion}` : 'Pendiente de asignación'; }
export function filasEvento(r) {
  return ETIQUETAS_EVENTO.map((nombre,i)=>[nombre,[EVENTO.fechaVisible,r.modalidad,r.talla_camisa,r.persona_con_discapacidad,r.es_lider?'Líder o responsable':'Familiar',r.parentesco,r.lider_cedula][i] ?? '—']);
}
export function rellenarCamposEvento(id, r, clase) {
  const destino=typeof id==='string'?document.getElementById(id):id;
  destino.replaceChildren();
  for(const [nombre,valor] of filasEvento(r)) {
    const caja=document.createElement('div'),etiqueta=document.createElement('b'),dato=document.createElement('span');
    caja.className=clase;etiqueta.textContent=nombre;dato.textContent=valor;caja.append(etiqueta,dato);destino.append(caja);
  }
}
export function ordenarGrupos(registros) {
  const fechas=new Map();
  for(const r of registros) {const lider=r.lider_cedula||r.cedula;fechas.set(lider,Math.min(fechas.get(lider)??Infinity,Number(r.fecha_registro)||0));}
  return [...registros].sort((a,b)=>{
    const ga=a.lider_cedula||a.cedula,gb=b.lider_cedula||b.cedula;
    return fechas.get(ga)-fechas.get(gb)||String(ga).localeCompare(String(gb))||Number(b.es_lider)-Number(a.es_lider)||(a.orden_familiar||0)-(b.orden_familiar||0);
  });
}
export function rellenarNotas() {
  for(const destino of document.querySelectorAll('[data-notas-evento]')) {
    destino.replaceChildren();
    for(const nota of NOTAS) {const p=document.createElement('p');p.textContent=nota;destino.append(p);}
  }
}
