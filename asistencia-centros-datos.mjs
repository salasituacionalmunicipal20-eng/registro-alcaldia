import { SISTEMAS_1X10 } from './1x10-seguimiento-datos.mjs?v=20261003j';
import { nombreTerritorial } from './1x10-nombres-territoriales.mjs?v=20261003j';
export { SISTEMAS_1X10 };
export const ESTADOS = { pendiente:'Pendiente', asistio:'Sí asistió', no_asistio:'No asistió' };
const texto = v => String(v ?? '').trim().replace(/\s+/g,' ');
export const normalizar = v => texto(v).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleUpperCase('es');

export function identidad(id, p) {
  const original=texto(p.cedula || (/^[VE]?[-\s]?\d+$/i.test(id) ? id : ''));
  const cedula=original.replace(/^[VE][-\s]*/i,'').replace(/[.\s-]/g,'').replace(/^0+(?=\d)/,'');
  const nacionalidad=texto(p.nacionalidad || (/^E/i.test(original)?'E':'V')).toUpperCase();
  return /^\d{4,10}$/.test(cedula) && /^[VE]$/.test(nacionalidad) ? {id:nacionalidad+'_'+cedula,cedula,nacionalidad} : null;
}

export function consolidarPersonas(sistemas, catalogo={}) {
  const porPersona=new Map(), registrosLista=[], canonComunas=new Map(), canonComunidades=new Map();
  for (const c of Object.values(catalogo)) {
    if(c.circuito_comunal) canonComunas.set(normalizar(c.circuito_comunal),c.circuito_comunal);
    if(c.nombre) canonComunidades.set(normalizar(c.nombre),c.nombre);
  }
  let registros=0,sinIdentidad=0;
  function agregar(id,p,j,esJefe) {
    registros++;
    const quien=identidad(id,p);
    if(!quien)sinIdentidad++;
    const propia=catalogo[p.comunidad_slug]||{}, heredada=catalogo[j.comunidad_slug]||{};
    const comuna=texto(p.comuna||p.circuito||propia.circuito_comunal||j.comuna||j.circuito||heredada.circuito_comunal)||'Sin comuna registrada';
    const comunidad=texto(p.comunidad_nombre||propia.nombre||p.comunidad||j.comunidad_nombre||heredada.nombre||j.comunidad)||'Sin comunidad registrada';
    const centro=texto(p.centro_electoral||propia.centro_electoral||j.centro_electoral||heredada.centro_electoral)||'Sin centro registrado';
    const nombre=texto([p.nombres,p.apellidos].filter(Boolean).join(' '))||texto(p.nombre)||'Nombre no registrado';
    const dato={...(quien||{id:null,cedula:texto(p.cedula),nacionalidad:texto(p.nacionalidad)}),nombre,comuna:nombreTerritorial(canonComunas.get(normalizar(comuna))||comuna,'comuna'),comunidad:canonComunidades.get(normalizar(comunidad))||comunidad,centro:nombreTerritorial(centro,'centro'),esJefe};
    registrosLista.push(dato);
    if(!quien)return;
    if(!porPersona.has(quien.id))porPersona.set(quien.id,[]);
    porPersona.get(quien.id).push(dato);
  }
  for(const s of sistemas) {
    for(const [id,j] of Object.entries(s.jefes||{}))agregar(id,j,j,true);
    for(const [jefeId,grupo] of Object.entries(s.afines||{}))for(const [id,p] of Object.entries(grupo||{}))agregar(id,p,s.jefes?.[jefeId]||{},false);
  }
  let ubicacionesPorVerificar=0;
  const personas=[...porPersona.values()].map(datos=>{
    const propios=datos.filter(d=>d.esJefe), ubicaciones=propios.length?propios:datos;
    const lugares=[...new Map(ubicaciones.map(p=>[JSON.stringify([p.comuna,p.comunidad,p.centro]),p])).values()];
    const completos=lugares.filter(p=>p.comuna!=='Sin comuna registrada'&&p.comunidad!=='Sin comunidad registrada');
    const opciones=completos.length?completos:lugares;
    const conflicto=opciones.length>1;
    if(conflicto)ubicacionesPorVerificar++;
    const elegido=opciones[0];
    return {id:elegido.id,cedula:elegido.cedula,nacionalidad:elegido.nacionalidad,
      nombre:datos.find(p=>p.nombre!=='Nombre no registrado')?.nombre||elegido.nombre,
      comuna:conflicto?'Ubicación por verificar':elegido.comuna,
      comunidad:conflicto?'Ubicación por verificar':elegido.comunidad,
      centro:conflicto?'Centro por verificar':elegido.centro};
  }).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')||a.id.localeCompare(b.id));
  registrosLista.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')||String(a.id||'').localeCompare(String(b.id||'')));
  return {personas,registrosLista,diagnostico:{registros,personas:personas.length,repetidos:registros-sinIdentidad-personas.length,sinIdentidad,ubicacionesPorVerificar}};
}

export function filtrarPersonas(personas,{comuna='',comunidad='',centro='',buscar='',estado=''}={}) {
  const q=normalizar(buscar);
  return personas.filter(p=>(!comuna||p.comuna===comuna)&&(!comunidad||p.comunidad===comunidad)&&
    (!centro||p.centro===centro)&&
    (!estado||(p.estado||'pendiente')===estado)&&(!q||normalizar(p.nombre+' '+p.nacionalidad+p.cedula).includes(q)));
}

export function conAsistencia(personas,estados={}) {
  return personas.map(p=>({...p,estado:p.id ? estados[p.id]?.estado||'pendiente' : 'pendiente'}));
}

export function contarAsistencia(personas) {
  const resultado={total:personas.length,asistio:0,no_asistio:0,pendiente:0};
  for(const p of personas)resultado[Object.hasOwn(ESTADOS,p.estado)?p.estado:'pendiente']++;
  return resultado;
}

export function filasExportacion(personas) {
  return personas.map((p,i)=>[i+1,cedulaVisible(p),p.nombre,p.comuna,p.comunidad,p.centro,p.id ? ESTADOS[p.estado]||ESTADOS.pendiente : 'Cédula por corregir']);
}
export function cedulaVisible(p) { return p.cedula ? [p.nacionalidad,p.cedula].filter(Boolean).join('-') : 'Sin cédula registrada'; }
export const CABECERAS=['N.º','Cédula','Nombre y apellido','Comuna','Comunidad','Centro electoral','Asistencia'];
