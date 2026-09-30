/* Estructura civil: una ficha responsable y hasta cien fichas vinculadas. */
(function (g) {
  const F = g.Formularios;
  const campos = [...F.identidad(), ...F.territorio(), F.campo('telefono','Teléfono',{rol:'telefono'}), F.campo('parrafo','Necesidad u observación',{rol:'necesidad'})];
  const nombre = p => ['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido'].map(k=>p?.[k]||'').filter(Boolean).join(' ');
  const documento = p => (p?.nacionalidad||'')+'-'+(p?.cedula||'');
  const clave = n => 'p'+String(n).padStart(3,'0');
  function validarPersona(p) { for(const c of campos) { const err=F.validarValor(c,p[c.rol]??''); if(err) throw new Error(err); } }
  function validarGrupo(responsable, personas) {
    validarPersona(responsable);
    if(personas.length<1||personas.length>100) throw new Error('Agrega entre 1 y 100 personas.');
    const vistos=new Set([documento(responsable)]);
    personas.forEach((p,i)=>{try{validarPersona(p);}catch(e){throw new Error('Persona '+(i+1)+': '+e.message);}const d=documento(p);if(vistos.has(d))throw new Error('La cédula '+d+' se repite dentro del grupo. Revisa la persona '+(i+1)+'.');vistos.add(d);});
    return Object.fromEntries(personas.map((p,i)=>[clave(i+1),p]));
  }
  function filas(grupos, seguimiento, modo='personas') {
    const estado=(id,k,p)=>seguimiento?.[id]?.[k]?.documento===documento(p)?seguimiento[id][k].valor||'':'';
    return Object.entries(grupos||{}).flatMap(([id,r])=>modo==='grupos'?[{id,persona:r.responsable,responsable:r.responsable,cantidad:r.cantidad,creado_en:r.creado_en,estado:estado(id,'responsable',r.responsable),personaId:'responsable'}]:Object.entries(r.personas||{}).map(([personaId,persona])=>({id,personaId,persona,responsable:r.responsable,cantidad:r.cantidad,creado_en:r.creado_en,estado:estado(id,personaId,persona)})));
  }
  function filtrar(rows,{buscar='',parroquia='',comuna='',comunidad='',responsable='',estado=''}={}) {const q=F.normalizar(buscar);return rows.filter(r=>(!q||F.normalizar([...Object.values(r.persona),nombre(r.responsable),documento(r.responsable)].join(' ')).includes(q))&&(!parroquia||r.persona.parroquia===parroquia)&&(!comuna||r.persona.comuna===comuna)&&(!comunidad||r.persona.comunidad===comunidad)&&(!responsable||r.id===responsable)&&(!estado||(estado==='pendiente'?!r.estado:r.estado===estado)));}
  function tabla(rows, etiqueta, modo) {return {encabezados:['Grupo',...campos.map(c=>'Responsable: '+c.etiqueta),...campos.map(c=>(modo==='grupos'?'Ficha: ':'Persona: ')+c.etiqueta),etiqueta,'Personas del grupo','Registrado el'],filas:rows.map(r=>[r.id,...campos.map(c=>r.responsable[c.rol]||''),...campos.map(c=>r.persona[c.rol]||''),r.estado||'Sin marcar',r.cantidad,new Date(r.creado_en).toLocaleString('es-VE',{timeZone:'America/Caracas'})])};}
  g.Censo={campos,nombre,documento,clave,validarPersona,validarGrupo,filas,filtrar,tabla};
  if(typeof module!=='undefined')module.exports=g.Censo;
})(typeof window==='undefined'?globalThis:window);
