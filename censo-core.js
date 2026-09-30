/* Estructura civil: una ficha responsable y hasta cien fichas vinculadas. */
(function (g) {
  const F = g.Formularios;
  const campos = [...F.identidad(), F.campo('fecha','Fecha de nacimiento',{rol:'fecha_nacimiento'}), F.campo('lista','Género declarado',{rol:'genero',opciones:'|Hombre|Mujer|Otro|Prefiero no indicar|'}), ...F.territorio(), F.campo('telefono','Teléfono',{rol:'telefono'}), F.campo('parrafo','Necesidad u observación',{rol:'necesidad'})];
  const nombre = p => ['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido'].map(k=>p?.[k]||'').filter(Boolean).join(' ');
  const documento = p => (p?.nacionalidad||'')+'-'+(p?.cedula||'');
  const clave = n => 'p'+String(n).padStart(3,'0');
  function edad(fecha, hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Caracas'})) {
    if(!fecha||F.validarValor(F.campo('fecha','Fecha de nacimiento'),fecha))return null;
    const [a,m,d]=fecha.split('-').map(Number),[aa,mm,dd]=hoy.split('-').map(Number);const n=aa-a-(mm<m||mm===m&&dd<d?1:0);return n>=0&&n<=120?n:null;
  }
  function validarPersona(p) { for(const c of campos) { const err=F.validarValor(c,p[c.rol]??''); if(err) throw new Error(err); } if(p.fecha_nacimiento&&edad(p.fecha_nacimiento)===null)throw new Error('Revisa la fecha de nacimiento: debe corresponder a una edad entre 0 y 120 años.'); }
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
  function filtrar(rows,{buscar='',parroquia='',comuna='',comunidad='',responsable='',estado='',genero='',edad_min='',edad_max=''}={}) {const q=F.normalizar(buscar);return rows.filter(r=>{const n=edad(r.persona.fecha_nacimiento);return (!q||F.normalizar([...Object.values(r.persona),nombre(r.responsable),documento(r.responsable)].join(' ')).includes(q))&&(!parroquia||r.persona.parroquia===parroquia)&&(!comuna||r.persona.comuna===comuna)&&(!comunidad||r.persona.comunidad===comunidad)&&(!responsable||r.id===responsable)&&(!genero||(genero==='sin_dato'?!r.persona.genero:r.persona.genero===genero))&&(!estado||(estado==='pendiente'?!r.estado:r.estado===estado))&&(edad_min===''||n!==null&&n>=Number(edad_min))&&(edad_max===''||n!==null&&n<=Number(edad_max));});}
  function resumen(rows) {
    const grupos=new Map(),comunidades=new Set(),personas=new Set(),territorio=new Map();let hombres=0,mujeres=0,otros=0,sinGenero=0,sinEdad=0,menores=0,adultos=0,mayores=0;
    rows.forEach(r=>{grupos.set(r.id,r.cantidad);const p=r.persona,k=JSON.stringify([p.parroquia,p.comuna,p.comunidad]);comunidades.add(k);personas.add(documento(p));if(!territorio.has(k))territorio.set(k,{parroquia:p.parroquia,comuna:p.comuna,comunidad:p.comunidad,total:0,responsables:new Set(),si:0,no:0,pendiente:0});const t=territorio.get(k);t.total++;t.responsables.add(r.id);t[r.estado==='Sí'?'si':r.estado==='No'?'no':'pendiente']++;if(p.genero==='Hombre')hombres++;else if(p.genero==='Mujer')mujeres++;else if(p.genero)otros++;else sinGenero++;const n=edad(p.fecha_nacimiento);if(n===null)sinEdad++;else if(n<18)menores++;else if(n<60)adultos++;else mayores++;});
    const vinculadas=[...grupos.values()].reduce((a,b)=>a+b,0);
    return {total:rows.length,responsables:grupos.size,vinculadas,promedio:grupos.size?vinculadas/grupos.size:0,alMaximo:[...grupos.values()].filter(n=>n===100).length,comunidades:comunidades.size,unicas:personas.size,hombres,mujeres,otros,sinGenero,sinEdad,menores,adultos,mayores,si:rows.filter(r=>r.estado==='Sí').length,no:rows.filter(r=>r.estado==='No').length,pendiente:rows.filter(r=>!r.estado).length,territorio:[...territorio.values()].map(t=>({...t,responsables:t.responsables.size})).sort((a,b)=>b.total-a.total||a.comuna.localeCompare(b.comuna,'es'))};
  }
  const csv = tabla => '\ufeff'+[tabla.encabezados,...tabla.filas].map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');
  const valor = (c,p) => !p[c.rol]?'':c.tipo==='fecha'?F.mostrar(c,p[c.rol]):p[c.rol];
  function tabla(rows, etiqueta, modo) {return {encabezados:['Grupo',...campos.map(c=>'Responsable: '+c.etiqueta),'Edad del responsable',...campos.map(c=>(modo==='grupos'?'Ficha: ':'Persona: ')+c.etiqueta),'Edad de la ficha',etiqueta,'Personas del grupo','Registrado el'],filas:rows.map(r=>[r.id,...campos.map(c=>valor(c,r.responsable)),edad(r.responsable.fecha_nacimiento)??'Sin dato',...campos.map(c=>valor(c,r.persona)),edad(r.persona.fecha_nacimiento)??'Sin dato',r.estado||'Sin marcar',r.cantidad,new Date(r.creado_en).toLocaleString('es-VE',{timeZone:'America/Caracas'})])};}
  g.Censo={campos,nombre,documento,clave,edad,resumen,csv,validarPersona,validarGrupo,filas,filtrar,tabla};
  if(typeof module!=='undefined')module.exports=g.Censo;
})(typeof window==='undefined'?globalThis:window);
