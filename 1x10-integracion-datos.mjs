import {nombreTerritorial} from './1x10-nombres-territoriales.mjs?v=20261015-milagro-i';
import {consolidarPersonas} from './asistencia-centros-datos.mjs?v=20261016-integracion';

// Normalizo únicamente valores registrados o su entrada exacta del catálogo.
// No modifico la base ni deduzco datos personales.
export function normalizarFicha1x10(persona={},catalogo={}) {
  const c=catalogo[persona.comunidad_slug]||{},p={...persona};
  const comuna=nombreTerritorial(p.comuna||p.circuito||c.circuito_comunal||'','comuna');
  if(comuna){p.comuna=comuna;p.circuito=comuna;}
  const comunidad=nombreTerritorial(p.comunidad_nombre||p.comunidad||c.nombre||'','comunidad');
  if(comunidad)p.comunidad_nombre=comunidad;
  const centro=nombreTerritorial(p.centro_electoral||c.centro_electoral||'','centro');
  if(centro)p.centro_electoral=centro;
  return p;
}
export function resumirVariante1x10(jefes={},afines={},catalogo={}) {
  const r=consolidarPersonas([{jefes,afines}],catalogo);
  const sinJefe=Object.entries(afines).filter(([id])=>!Object.hasOwn(jefes,id));
  return {...r,jefes:Object.keys(jefes).length,afines:Object.values(afines).reduce((n,g)=>n+Object.keys(g||{}).length,0),
    huerfanos:sinJefe.reduce((n,[,g])=>n+Object.keys(g||{}).length,0)};
}
