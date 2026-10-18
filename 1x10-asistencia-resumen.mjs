// Resumen agregado: no contiene nombres, teléfonos ni cédulas.
export function resumirAsistenciaPrensa(personas,estados={}){
  const unicas=new Map(personas.filter(p=>p.id).map(p=>[p.id,p]));
  const grupos={comunas:new Map(),comunidades:new Map(),centros:new Map()};
  const total={total:0,asistio:0,no_asistio:0,pendiente:0};
  for(const [id,p]of unicas){
    const comuna=p.comuna||'Sin comuna registrada',comunidad=p.comunidad||'Sin comunidad registrada',centro=p.centro||'Sin centro registrado';
    const estado=['asistio','no_asistio'].includes(estados[id]?.estado)?estados[id].estado:'pendiente';
    total.total++;total[estado]++;
    for(const [tipo,clave,datos]of [['comunas',comuna,{comuna}],['comunidades',JSON.stringify([comuna,comunidad]),{comuna,comunidad}],['centros',centro,{centro}]]){
      const mapa=grupos[tipo];if(!mapa.has(clave))mapa.set(clave,{...datos,total:0,asistio:0,no_asistio:0,pendiente:0});
      const g=mapa.get(clave);g.total++;g[estado]++;
    }
  }
  const salida={total,marcajesSinRegistro:Object.entries(estados).filter(([id,e])=>e?.estado==='asistio'&&!unicas.has(id)).length};
  for(const tipo of Object.keys(grupos))salida[tipo]=[...grupos[tipo].values()].sort((a,b)=>[a.comuna,a.comunidad,a.centro].join(' ').localeCompare([b.comuna,b.comunidad,b.centro].join(' '),'es'));
  return salida;
}
export function textoAsistenciaPrensa(r,fecha,actualizado){
  const lineas=['ASISTENCIA 1x10 · '+fecha,'Actualizado: '+actualizado,r.total.asistio+' personas distintas marcadas como Asistió/Votó de '+r.total.total+' registradas.'];
  for(const [tipo,titulo]of [['comunas','POR COMUNA'],['comunidades','POR COMUNA Y COMUNIDAD'],['centros','POR CENTRO ELECTORAL']]){
    lineas.push('',titulo);for(const g of r[tipo])lineas.push([g.comuna,g.comunidad,g.centro].filter(Boolean).join(' / ')+': '+g.asistio+' asistieron/votaron de '+g.total+' personas registradas.');
  }
  if(r.marcajesSinRegistro)lineas.push('',r.marcajesSinRegistro+' marcajes de asistencia sin persona vinculada al padrón actual; no incluidos en la suma.');
  return lineas.join('\n');
}
