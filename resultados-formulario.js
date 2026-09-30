import { db, ref, get, set, onValue, serverTimestamp, sesion, SUPER, administrador, idFormulario, mensaje, enlace } from './formularios-firebase.js';
import { dibujarHeaderPDF, dibujarFooterPDF } from './pdf-header.js';
const F=window.Formularios,e=F.escapar,$=id=>document.getElementById(id);
let def,id,registros=[],originales=[],seguimiento={},usuario,seleccion=[],pagina=0,filtroConstruido=false;
const TAM=25;
function badge(c,v){return c.tipo==='sino'?`<span class="${v==='Sí'?'badge-si':v==='No'?'badge-no':'badge-vacio'}">${e(F.mostrar(c,v))}</span>`:e(F.mostrar(c,v));}
function construirFiltros() {
  $('filtros').innerHTML=F.campos(def).filter(([,c])=>c.filtro).map(([id,c])=>{
    const atr=`data-filtro="${id}" id="filtro-${id}"`;
    let control;
    if(['numero','fecha'].includes(c.tipo))control=`<div class="rango"><input data-rango="${id}" data-lado="min" aria-label="${e(c.etiqueta)} desde" type="${c.tipo==='numero'?'number':'date'}" placeholder="Desde" step="any"><input data-rango="${id}" data-lado="max" aria-label="${e(c.etiqueta)} hasta" type="${c.tipo==='numero'?'number':'date'}" placeholder="Hasta" step="any"></div>`;
    else if(['texto','parrafo','nombre','cedula','telefono','correo'].includes(c.tipo)) control=`<input ${atr} type="search" placeholder="Buscar ${e(c.etiqueta.toLowerCase())}">`;
    else control=`<select ${atr}><option value="">Todas las respuestas</option></select>`;
    return `<div><label ${['numero','fecha'].includes(c.tipo)?'':'for="filtro-'+id+'"'}>${e(c.etiqueta)}</label>${control}</div>`;
  }).join('');
  $('filtros').querySelectorAll('input,select').forEach(el=>el.oninput=()=>{pagina=0;pintar();});filtroConstruido=true;
}
function actualizarOpciones() {
  $('filtros').querySelectorAll('select[data-filtro]').forEach(el=>{
    const c=def.campos[el.dataset.filtro],antes=el.value;
    const ops=c.tipo==='sino'?['Sí','No']:c.tipo==='lista'?F.opciones(c):[...new Set(registros.map(r=>r.valores[el.dataset.filtro]).filter(v=>v!==''&&v!=null))].sort((a,b)=>String(a).localeCompare(String(b),'es'));
    el.innerHTML='<option value="">Todas las respuestas</option>'+ops.map(v=>'<option value="'+e(v)+'">'+e(v)+'</option>').join('')+'<option value="__sin_respuesta__">Sin respuesta</option>';
    if([...el.options].some(o=>o.value===antes))el.value=antes;
  });
}
function filtros() {
  const f={};$('filtros').querySelectorAll('[data-filtro]').forEach(el=>f[el.dataset.filtro]=el.value);
  $('filtros').querySelectorAll('[data-rango]').forEach(el=>{const k=el.dataset.rango;f[k]||={min:'',max:''};f[k][el.dataset.lado]=el.type==='number'&&el.value!==''?Number(el.value):el.value;});return f;
}
function pintar(){
  seleccion=F.filtrar(registros,def,filtros(),$('buscar').value,$('desde').value,$('hasta').value);
  const paginas=Math.max(1,Math.ceil(seleccion.length/TAM));pagina=Math.min(pagina,paginas-1);
  const cs=F.campos(def);
  $('resumen').innerHTML=`<div class="bloque"><span class="contador">${seleccion.length}</span><small>En la selección</small></div><div class="bloque"><span class="contador">${registros.length}</span><small>Registros totales</small></div>`+cs.filter(([,c])=>c.tipo==='sino').map(([id,c])=>`<div class="bloque"><strong>${e(c.etiqueta)}</strong><small><span class="badge-si">Sí: ${seleccion.filter(r=>r.valores[id]==='Sí').length}</span> <span class="badge-no">No: ${seleccion.filter(r=>r.valores[id]==='No').length}</span> · Sin respuesta: ${seleccion.filter(r=>!r.valores[id]).length}</small></div>`).join('');
  const activos=Object.values(filtros()).filter(v=>typeof v==='object'?(v.min!==''||v.max!==''):v!=='').length+['buscar','desde','hasta'].filter(k=>$(k).value).length;
  $('seleccion-descripcion').textContent=activos?`Hay ${activos} filtros o búsquedas activos. Excel y PDF incluirán los ${seleccion.length} registros de esta selección.`:`Sin filtros: Excel y PDF incluirán todos los ${seleccion.length} registros.`;
  $('tabla').innerHTML=seleccion.length?'<table><thead><tr><th>Registro</th><th>Fecha de registro</th>'+cs.map(([,c])=>'<th>'+e(c.etiqueta)+(c.uso==='panel'?'<br><small>Seguimiento administrativo</small>':'')+'</th>').join('')+'</tr></thead><tbody>'+seleccion.slice(pagina*TAM,(pagina+1)*TAM).map(r=>'<tr><td><button data-ficha="'+e(r.id)+'">Ver ficha</button></td><td>'+e(new Date(r.creado_en).toLocaleString('es-VE',{timeZone:'America/Caracas'}))+'</td>'+cs.map(([id,c])=>'<td>'+badge(c,r.valores[id])+(c.uso==='panel'?`<select data-seguimiento="${r.id}" data-campo="${id}" aria-label="${e(c.etiqueta)} del registro ${e(r.id)}" style="margin-top:7px"><option value="" ${r.valores[id]===''?'selected':''}>Sin respuesta</option><option value="Sí" ${r.valores[id]==='Sí'?'selected':''}>Sí</option><option value="No" ${r.valores[id]==='No'?'selected':''}>No</option></select>`:'')+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<div class="vacio"><h3>'+(!registros.length?'Todavía no hay respuestas':'Ningún registro coincide')+'</h3><p>'+(!registros.length?'Comparte el enlace para empezar a recibir registros.':'Prueba con otros filtros o limpia la selección.')+'</p></div>';
  $('pagina-texto').textContent=`Página ${pagina+1} de ${paginas} · ${TAM} registros por página`;$('anterior').disabled=pagina===0;$('siguiente').disabled=pagina>=paginas-1;
  $('excel').disabled=$('pdf').disabled=!seleccion.length;
  $('tabla').querySelectorAll('[data-ficha]').forEach(b=>b.onclick=()=>ficha(b.dataset.ficha));
  $('tabla').querySelectorAll('[data-seguimiento]').forEach(el=>el.onchange=async()=>{el.disabled=true;try{await set(ref(db,'formularios_seguimiento/'+id+'/'+el.dataset.seguimiento+'/'+el.dataset.campo),{valor:el.value,actualizado_en:serverTimestamp(),por:usuario.uid});mensaje('Seguimiento guardado.','exito');}catch(err){mensaje('No se guardó el seguimiento: '+err.message,'error');pintar();}});
}
function combinar(){registros=originales.map(r=>({...r,valores:{...r.valores,...Object.fromEntries(Object.entries(seguimiento[r.id]||{}).map(([k,v])=>[k,v.valor]))}}));actualizarOpciones();pintar();}
function ficha(rid){const r=registros.find(x=>x.id===rid);if(!r)return;$('ficha').hidden=false;$('ficha').innerHTML='<div class="barra"><h2>Ficha del registro</h2><button id="cerrar-ficha">Cerrar ficha</button></div><p class="muted">'+e(new Date(r.creado_en).toLocaleString('es-VE',{timeZone:'America/Caracas'}))+'</p><dl>'+F.campos(def).map(([id,c])=>'<dt>'+e(c.etiqueta)+'</dt><dd>'+badge(c,r.valores[id])+'</dd>').join('')+'</dl>';$('cerrar-ficha').onclick=()=>$('ficha').hidden=true;$('ficha').scrollIntoView({behavior:'smooth',block:'start'});}
function nombreArchivo(ext){return 'formulario-'+F.normalizar(def.titulo).replace(/[^a-z0-9]+/g,'-').slice(0,70)+'-'+new Date().toISOString().slice(0,10)+'.'+ext;}
function descripcionFiltros(){const f=filtros();return ['buscar','desde','hasta'].filter(k=>$(k).value).map(k=>({buscar:'Búsqueda',desde:'Registrado desde',hasta:'Registrado hasta'}[k])+': '+$(k).value).concat(Object.entries(f).filter(([,v])=>typeof v==='object'?v.min!==''||v.max!=='':v!=='').map(([id,v])=>def.campos[id].etiqueta+': '+(typeof v==='object'?(v.min||'Sin mínimo')+' a '+(v.max||'Sin máximo'):v==='__sin_respuesta__'?'Sin respuesta':v))).join(' · ')||'Sin filtros';}
async function excel(){
  if(!window.XLSX||!window.JSZip)throw new Error('No se cargó la biblioteca de Excel. Revisa la conexión y recarga.');
  const t=F.tabla(def,seleccion),n=t.encabezados.length;
  const ws=XLSX.utils.aoa_to_sheet([[def.titulo],['Generado el '+new Date().toLocaleString('es-VE',{timeZone:'America/Caracas'})+' · '+seleccion.length+' registros · '+descripcionFiltros()],t.encabezados,...t.filas]);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:n-1}},{s:{r:1,c:0},e:{r:1,c:n-1}}];ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:2,c:0},e:{r:t.filas.length+2,c:n-1}})};ws['!cols']=t.encabezados.map(()=>({wch:27}));
  t.encabezados.forEach((_,i)=>{ws[XLSX.utils.encode_cell({r:2,c:i})].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'173954'}},alignment:{wrapText:true}};});
  // Todas las respuestas se fuerzan a texto; un signo = inicial no ejecuta fórmulas.
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Respuestas');const zip=await JSZip.loadAsync(XLSX.write(wb,{bookType:'xlsx',type:'array'}));const ruta='xl/worksheets/sheet1.xml';let xml=await zip.file(ruta).async('string');const pane='<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';xml=xml.includes('<sheetViews>')?xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/,pane):xml.replace(/(<sheetData[ >])/,pane+'$1');zip.file(ruta,xml);const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});descargar(blob,nombreArchivo('xlsx'));
}
function descargar(blob,nombre){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nombre;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function pdf(){
  if(!window.jspdf?.jsPDF)throw new Error('No se cargó la biblioteca de PDF. Revisa la conexión y recarga.');
  const doc=new jspdf.jsPDF({format:'letter',unit:'mm'}),cs=F.campos(def),h=doc.internal.pageSize.getHeight();
  const encabezado=()=>dibujarHeaderPDF(doc,{titulo:'Resultados del formulario',subtitulo:'Registros completos · '+seleccion.length+' en la selección'});
  const fechaLarga=ms=>new Date(ms).toLocaleDateString('es-VE',{timeZone:'America/Caracas',weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+new Date(ms).toLocaleString('es-VE',{timeZone:'America/Caracas'});
  const top=encabezado()+7;doc.setFontSize(9);const intro=def.titulo+'\nGenerado el '+fechaLarga(Date.now())+'\n'+descripcionFiltros();const lineas=doc.splitTextToSize(intro,185);doc.text(lineas,14,top);let y=top+lineas.length*4+6;
  seleccion.forEach((r,i)=>{if(y>h-60){doc.addPage();encabezado();y=top;}doc.autoTable({startY:y,head:[['Registro '+(i+1)+' · '+fechaLarga(r.creado_en),'Respuesta']],body:cs.map(([id,c])=>[c.etiqueta,F.mostrar(c,r.valores[id])]),margin:{top,bottom:20,left:14,right:14},styles:{fontSize:9,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[23,57,84]},columnStyles:{0:{cellWidth:60},1:{cellWidth:127.9}},didParseCell:data=>{if(data.section==='body'){const c=cs[data.row.index]?.[1],v=data.cell.raw;if(data.column.index===1&&c?.tipo==='sino'){if(v==='Sí'){data.cell.styles.textColor=[12,96,49];data.cell.styles.fillColor=[220,245,229];}if(v==='No'){data.cell.styles.textColor=[148,30,37];data.cell.styles.fillColor=[252,228,231];}}}},didDrawPage:data=>{if(data.pageNumber>1)encabezado();}});y=doc.lastAutoTable.finalY+10;});
  const paginas=doc.internal.getNumberOfPages();for(let p=1;p<=paginas;p++){doc.setPage(p);dibujarFooterPDF(doc);doc.setFillColor(255,255,255);doc.rect(177,h-10,27,5,'F');doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text('Página '+p+' de '+paginas,doc.internal.pageSize.getWidth()-14,h-7,{align:'right'});}doc.save(nombreArchivo('pdf'));
}
['buscar','desde','hasta'].forEach(k=>$(k).oninput=()=>{pagina=0;pintar();});
$('limpiar').onclick=()=>{['buscar','desde','hasta'].forEach(k=>$(k).value='');$('filtros').querySelectorAll('input,select').forEach(el=>el.value='');pagina=0;pintar();};
$('anterior').onclick=()=>{pagina--;pintar();};$('siguiente').onclick=()=>{pagina++;pintar();};
for(const [id,fn] of [['excel',excel],['pdf',pdf]])$(id).onclick=async()=>{const b=$(id);b.disabled=true;try{await fn();}catch(err){mensaje(err.message,'error');}finally{b.disabled=!seleccion.length;}};
$('compartir-enlace').onclick=async()=>{const url=enlace('formulario.html',id);try{await navigator.clipboard.writeText(url);mensaje('Enlace copiado.','exito');}catch{mensaje('Enlace del formulario: '+url);}};
try{
  id=idFormulario();const user=await sesion();usuario=user;if(!user){location.href='index.html';}else{
    const snap=await get(ref(db,'formularios_definiciones/'+id));def=snap.val();if(!def)throw new Error('No se encontró el formulario.');
    if(user.email!==SUPER&&(def.lectura!=='administradores'||!await administrador(user)))throw new Error('No tienes permiso para ver las respuestas de este formulario.');
    $('carga').hidden=true;$('contenido').hidden=false;$('titulo').textContent=def.titulo;$('descripcion').textContent=def.descripcion;document.title=def.titulo+' · Resultados';construirFiltros();
    onValue(ref(db,'formularios_respuestas/'+id),s=>{originales=Object.entries(s.val()||{}).map(([id,r])=>({id,...r})).sort((a,b)=>b.creado_en-a.creado_en);combinar();},err=>mensaje('No se pudieron cargar las respuestas: '+err.message,'error'));
    onValue(ref(db,'formularios_seguimiento/'+id),s=>{seguimiento=s.val()||{};combinar();},err=>mensaje('No se pudo cargar el seguimiento: '+err.message,'error'));
    onValue(ref(db,'.info/connected'),s=>{$('en-vivo').textContent=s.val()?'En vivo':'Sin conexión · datos de la última carga';$('en-vivo').className='estado '+(s.val()?'activo':'cerrado');});
  }
}catch(err){$('carga').hidden=true;mensaje(err.message,'error');}
