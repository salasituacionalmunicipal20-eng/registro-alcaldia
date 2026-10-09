// Este módulo produce cantidades; las identidades no salen en el resultado.
import { nombreTerritorial } from './1x10-nombres-territoriales.mjs?v=20261009-ciudad-dios';
export const SIN_COMUNA = 'Sin comuna asignada';
export const SIN_CENTRO = 'Sin centro asignado';
export const SIN_COMUNIDAD = 'Sin comunidad asignada';
export const CONFLICTO = 'Ubicación por verificar';
const texto = v => String(v ?? '').trim();
const claveTerritorial = v => texto(v).normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').toUpperCase();
export const SISTEMAS_1X10 = ['', '_empleados', '_cristianos', '_abuelos', '_cristianos_abuelos', '_salud', '_educacion'];
export function edadEn(fecha, corte) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(fecha));
  const c = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(corte));
  if (!m || !c) return null;
  const [a, mes, dia] = m.slice(1).map(Number);
  const fechaReal = new Date(Date.UTC(a, mes - 1, dia));
  if (fechaReal.getUTCFullYear() !== a || fechaReal.getUTCMonth() !== mes - 1 || fechaReal.getUTCDate() !== dia) return null;
  const [ac, mc, dc] = c.slice(1).map(Number);
  const corteReal = new Date(Date.UTC(ac, mc - 1, dc));
  if (corteReal.getUTCFullYear() !== ac || corteReal.getUTCMonth() !== mc - 1 || corteReal.getUTCDate() !== dc) return null;
  const edad = ac - a - (mc < mes || (mc === mes && dc < dia) ? 1 : 0);
  return edad >= 0 && edad <= 120 ? edad : null;
}
export function grupoEdad(edad) {
  return edad === null ? 'sinEdad' : edad < 15 ? 'menores' : edad <= 35 ? 'jovenes' : 'adultos';
}
export function resumirRegistro(jefes, afines, catalogo, corte, adicionales = {}, sistemas = [{ jefes, afines }]) {
  const personas = new Map();
  const registros = [];
  const comunasCanonicas = new Map(), centrosCanonicos = new Map(), comunidadesCanonicas = new Map();
  for (const c of Object.values(catalogo || {})) {
    const comuna = nombreTerritorial(texto(c.circuito_comunal),'comuna');
    const centro = nombreTerritorial(texto(c.centro_electoral),'centro');
    if (comuna) comunasCanonicas.set(claveTerritorial(comuna),comuna);
    if (centro) centrosCanonicos.set(claveTerritorial(centro),centro);
    const comunidad = nombreTerritorial(texto(c.nombre),'comunidad');
    if (comunidad) comunidadesCanonicas.set(claveTerritorial(comunidad),comunidad);
  }
  function canonico(valor, indice, vacio) {
    const limpio = nombreTerritorial(texto(valor).replace(/\s+/g,' '),indice === comunasCanonicas ? 'comuna' : indice === comunidadesCanonicas ? 'comunidad' : 'centro');
    if (!limpio) return vacio;
    const clave = claveTerritorial(limpio);
    if (!indice.has(clave)) indice.set(clave, limpio);
    return indice.get(clave);
  }
  let relaciones = 0, sinIdentidad = 0, huerfanos = 0;
  function agregar(id, p, j, esJefe) {
    relaciones++;
    const identificador = texto(p.cedula || (/^\d+$/.test(id) ? id : ''));
    const cedula = identificador.replace(/^[VEve][\s-]*/, '').replace(/[\s.-]/g, '');
    const nacionalidad = texto(p.nacionalidad || (/^E/i.test(identificador) ? 'E' : 'V')).toUpperCase();
    const clave = `${nacionalidad}:${cedula.replace(/^0+(?=\d)/, '')}`;
    const propia = catalogo[p.comunidad_slug] || {};
    const delJefe = catalogo[j.comunidad_slug] || {};
    const comuna = canonico(p.comuna || p.circuito || propia.circuito_comunal || j.comuna || j.circuito || delJefe.circuito_comunal, comunasCanonicas, SIN_COMUNA);
    const centro = canonico(p.centro_electoral || propia.centro_electoral || j.centro_electoral || delJefe.centro_electoral, centrosCanonicos, SIN_CENTRO);
    const comunaJefe = canonico(j.comuna || j.circuito || delJefe.circuito_comunal,comunasCanonicas,SIN_COMUNA);
    const propiaIndicada = p.comunidad_nombre || p.comunidad || p.comunidad_slug;
    const comunidad = canonico(p.comunidad_nombre || p.comunidad || propia.nombre || (!propiaIndicada && comuna===comunaJefe ? j.comunidad_nombre || j.comunidad || delJefe.nombre : ''),comunidadesCanonicas,SIN_COMUNIDAD);
    const dato = { comuna, centro, comunidad, fecha: texto(p.fecha_nacimiento), esJefe };
    registros.push(dato);
    if (!/^\d{4,10}$/.test(cedula)) { sinIdentidad++; return; }
    if (!personas.has(clave)) personas.set(clave, []);
    personas.get(clave).push(dato);
  }
  for (const sistema of sistemas) {
    for (const [id, jefe] of Object.entries(sistema.jefes || {})) agregar(id, jefe, jefe, true);
    for (const [jefeId, lista] of Object.entries(sistema.afines || {})) {
      const jefe = sistema.jefes?.[jefeId] || {};
      if (!sistema.jefes?.[jefeId]) huerfanos += Object.keys(lista || {}).length;
      for (const [id, afin] of Object.entries(lista || {})) agregar(id, afin, jefe, false);
    }
  }
  const filas = new Map();
  const comunidades = new Map();
  function comunidadFila(comuna,comunidad,centro) {
    const clave=JSON.stringify([comuna,comunidad,centro]);
    if(!comunidades.has(clave))comunidades.set(clave,{comuna,comunidad,centro,total:0});
    return comunidades.get(clave);
  }
  for(const c of Object.values(catalogo || {})) {
    if(!texto(c.nombre))continue;
    comunidadFila(canonico(c.circuito_comunal,comunasCanonicas,SIN_COMUNA),canonico(c.nombre,comunidadesCanonicas,SIN_COMUNIDAD),canonico(c.centro_electoral,centrosCanonicos,SIN_CENTRO));
  }
  const obtener = (comuna, centro) => {
    const clave = JSON.stringify([comuna, centro]);
    if (!filas.has(clave)) filas.set(clave, { comuna, centro, base: 0, adicionales: 0, jovenes: 0, adultos: 0, menores: 0, sinEdad: 0, total: 0 });
    return filas.get(clave);
  };
  let ubicacionesEnConflicto = 0, fechasEnConflicto = 0;
  for (const datos of personas.values()) {
    // La ubicación propia del jefe tiene prioridad sobre ubicaciones heredadas.
    const propios = datos.filter(p => p.esJefe);
    const ubicaciones = propios.length ? propios : datos;
    const comunas = [...new Set(ubicaciones.map(p => p.comuna).filter(c => c !== SIN_COMUNA))];
    const centros = [...new Set(ubicaciones.map(p => p.centro).filter(c => c !== SIN_CENTRO))];
    const conflicto = comunas.length > 1 || centros.length > 1;
    if (conflicto) ubicacionesEnConflicto++;
    const fechas = [...new Set(datos.map(p => p.fecha).filter(f => edadEn(f, corte) !== null))];
    if (fechas.length > 1) fechasEnConflicto++;
  }
  // Cada jefe y cada afin almacenado cuenta, incluso si se repite o no tiene cédula.
  for (const registro of registros) {
    const fila = obtener(registro.comuna, registro.centro);
    fila.base++; fila.total++; fila[grupoEdad(edadEn(registro.fecha, corte))]++;
    comunidadFila(registro.comuna,registro.comunidad,registro.centro).total++;
  }
  let cargasInvalidas = 0;
  for (const carga of Object.values(adicionales || {})) {
    const campos = ['jovenes', 'adultos', 'menores', 'sinEdad'];
    if (!texto(carga.comuna) || !texto(carga.centro) || !campos.every(k => Number.isSafeInteger(carga[k]) && carga[k] >= 0 && carga[k] <= 1000000)) { cargasInvalidas++; continue; }
    const fila = obtener(canonico(carga.comuna,comunasCanonicas,SIN_COMUNA), canonico(carga.centro,centrosCanonicos,SIN_CENTRO));
    for (const k of campos) { fila[k] += carga[k]; fila.adicionales += carga[k]; fila.total += carga[k]; }
  }
  return {
    comunidades: [...comunidades.values()],
    filas: [...filas.values()].sort((a,b) => a.comuna.localeCompare(b.comuna,'es') || a.centro.localeCompare(b.centro,'es')),
    diagnostico: { relaciones, personas: personas.size, duplicados: relaciones - sinIdentidad - personas.size, sinIdentidad, huerfanos, ubicacionesEnConflicto, fechasEnConflicto, cargasInvalidas }
  };
}
export function agruparComunidades(filas, {comuna='',centro=''}={}) {
  const grupos=new Map();
  for(const f of filas || []) {
    if((comuna && f.comuna!==comuna)||(centro && f.centro!==centro))continue;
    if(!grupos.has(f.comuna))grupos.set(f.comuna,new Map());
    const grupo=grupos.get(f.comuna);grupo.set(f.comunidad,(grupo.get(f.comunidad)||0)+f.total);
  }
  return [...grupos].sort(([a],[b])=>a.localeCompare(b,'es')).map(([comuna,grupo])=>({comuna,total:[...grupo.values()].reduce((a,b)=>a+b,0),comunidades:[...grupo].sort(([a],[b])=>a.localeCompare(b,'es')).map(([comunidad,total])=>({comunidad,total}))}));
}
export function sumarFilas(filas) {
  return filas.reduce((s,f) => { for (const k of ['base','adicionales','jovenes','adultos','menores','sinEdad','total']) s[k] += f[k]; return s; }, {base:0,adicionales:0,jovenes:0,adultos:0,menores:0,sinEdad:0,total:0});
}
