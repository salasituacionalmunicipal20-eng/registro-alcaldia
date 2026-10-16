import {SISTEMAS_1X10,consolidarPersonas} from './asistencia-centros-datos.mjs?v=20261016-integracion';
import {normalizarFicha1x10} from './1x10-integracion-datos.mjs?v=20261016-integracion';
export {SISTEMAS_1X10};
export const SECTORES_1X10={'':'General',_empleados:'Empleados',_cristianos:'Cristianos',_abuelos:'Abuelos',_cristianos_abuelos:'Cristianos y abuelos',_salud:'Salud',_educacion:'Educación'};
export const nombreSector1x10=s=>SECTORES_1X10[s]||'Sector no registrado';
const claveValida=s=>typeof s==='string'&&s.length>0&&!/[.#$\[\]/\u0000-\u001f]/.test(s);
export function rutasRegistro1x10(ficha,afin){
 if(!ficha||!SISTEMAS_1X10.includes(ficha._sector1x10)||!claveValida(ficha._idJefe1x10))throw Error('No se pudo identificar la lista de origen del registro.');
 const jefe=ficha._idJefe1x10,s=ficha._sector1x10;
 if(afin!==undefined&&!claveValida(afin))throw Error('No se pudo identificar el registro del afín.');
 return{jefe:`jefes_1x10${s}/${jefe}`,afines:`afines_1x10${s}/${jefe}`,...(afin===undefined?{}:{afin:`afines_1x10${s}/${jefe}/${afin}`})};
}
// Cada inscripción conserva su sector y su clave original, incluso si la
// misma persona tiene otra lista. Las claves compuestas existen solo en memoria.
export function combinarResultados1x10(sistemas,catalogo={},sector='todos'){
 const jefes={},afines={};
 for(const s of sistemas){
  if(!SISTEMAS_1X10.includes(s.sufijo)||sector!=='todos'&&s.sufijo!==sector)continue;
  const clave=id=>`${s.sufijo||'general'}::${id}`;
  for(const[id,j]of Object.entries(s.jefes||{}))jefes[clave(id)]={...normalizarFicha1x10(j,catalogo),cedula:j.cedula||id,_sector1x10:s.sufijo,_idJefe1x10:id,_clave1x10:clave(id)};
  for(const[id,g]of Object.entries(s.afines||{}))afines[clave(id)]=Object.fromEntries(Object.entries(g||{}).map(([aid,a])=>[aid,{...normalizarFicha1x10(a,catalogo),cedula:a.cedula||aid,_sector1x10:s.sufijo,_idJefe1x10:id,_claveAfin1x10:aid}]));
 }
 return{jefes,afines};
}
const normalizar=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es');
export function coincideBusqueda1x10(persona,busqueda){
 const q=normalizar(busqueda).trim();if(!q)return true;
 const campos=[persona.cedula,persona.nacionalidad,persona.nombres,persona.apellidos,persona.nombre,persona.telefono,persona.comuna,persona.comunidad,persona.comunidad_nombre,persona.centro,persona.centro_electoral,persona.nombreJefe,nombreSector1x10(persona.sufijo??persona._sector1x10)].join(' ');
 const digitos=q.replace(/\D/g,'');
 return normalizar(campos).includes(q)||(/^[ve\s.\-\d]+$/i.test(q)&&digitos.length>=4&&String(persona.cedula||'').replace(/\D/g,'').includes(digitos));
}
export function buscarEnSistemas1x10(sistemas,catalogo,busqueda){
 return consolidarPersonas(sistemas,catalogo).registrosLista.filter(p=>coincideBusqueda1x10(p,busqueda));
}
