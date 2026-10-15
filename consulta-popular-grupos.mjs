export function seccionesPorTerritorio(personas,filas,clasificarEdad) {
  const territorios=new Map();
  const edades=[['jovenes','Jóvenes (15 a 35 años)'],['adultos','Adultos (36 años en adelante)'],['menores','Menores de 15 años'],['sinEdad','Edad no registrada']];
  personas.forEach((persona,i)=>{
    const comuna=String(persona.comuna||'').trim()||'Sin comuna registrada';
    const comunidad=String(persona.comunidad||'').trim()||'Sin comunidad registrada';
    const clave=JSON.stringify([comuna,comunidad]);
    if(!territorios.has(clave))territorios.set(clave,{comuna,comunidad,grupos:new Map(edades.map(([k])=>[k,[]]))});
    const grupos=territorios.get(clave).grupos,edad=clasificarEdad(persona);
    grupos.get(grupos.has(edad)?edad:'sinEdad').push({persona,fila:filas[i]});
  });
  const comparar=(a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'});
  const ordenados=[...territorios.values()].sort((a,b)=>comparar(a.comuna,b.comuna)||comparar(a.comunidad,b.comunidad));
  const secciones=[];let numero=0;
  for(const territorio of ordenados)for(const [grupo,titulo] of edades){
    const integrantes=territorio.grupos.get(grupo);if(!integrantes.length)continue;
    integrantes.sort((a,b)=>comparar(a.persona.nombre||'',b.persona.nombre||''));
    secciones.push({titulo,comuna:territorio.comuna,comunidad:territorio.comunidad,
      filas:integrantes.map(({fila})=>[++numero,...fila.slice(1)])});
  }
  return secciones;
}
