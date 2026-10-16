export function seccionesPorTerritorio(personas,filas,clasificarEdad) {
  const territorios=new Map();
  const edades=[['jovenes','Jóvenes (15 a 35 años)'],['adultos','Adultos (36 años en adelante)'],['menores','Menores de 15 años'],['sinEdad','Edad no registrada']];
  personas.forEach((persona,i)=>{
    const comuna=String(persona.comuna||'').trim()||'Sin comuna registrada';
    const comunidad=String(persona.comunidad||'').trim()||'Sin comunidad registrada';
    const clave=JSON.stringify([comuna,comunidad]);
    if(!territorios.has(clave))territorios.set(clave,{comuna,comunidad,jefes:new Map()});
    const jefe=persona.jefe||{cedula:persona.jefeId||'',nombre:persona.nombreJefe||''},claveJefe=JSON.stringify(jefe);
    const responsables=territorios.get(clave).jefes;
    if(!responsables.has(claveJefe))responsables.set(claveJefe,{jefe,grupos:new Map(edades.map(([k])=>[k,[]]))});
    const grupos=responsables.get(claveJefe).grupos,edad=clasificarEdad(persona);
    grupos.get(grupos.has(edad)?edad:'sinEdad').push({persona,fila:filas[i]});
  });
  const comparar=(a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'});
  const ordenados=[...territorios.values()].sort((a,b)=>comparar(a.comuna,b.comuna)||comparar(a.comunidad,b.comunidad));
  const secciones=[];let numero=0;
  for(const territorio of ordenados){
    for(const responsable of [...territorio.jefes.values()].sort((a,b)=>comparar(a.jefe.nombre||'',b.jefe.nombre||'')||comparar(a.jefe.cedula||'',b.jefe.cedula||'')))for(const [grupo,titulo] of edades){
      const integrantes=responsable.grupos.get(grupo);if(!integrantes.length)continue;
      integrantes.sort((a,b)=>comparar(a.persona.nombre||'',b.persona.nombre||''));
      secciones.push({titulo,comuna:territorio.comuna,comunidad:territorio.comunidad,jefe:responsable.jefe,
        filas:integrantes.map(({fila})=>[++numero,...fila.slice(1)])});
    }
  }
  return secciones;
}
