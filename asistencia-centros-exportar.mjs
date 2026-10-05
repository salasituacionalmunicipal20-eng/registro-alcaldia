import {dibujarHeaderPDF,dibujarFooterPDF} from './pdf-header.js';
import {CABECERAS,filasExportacion,contarAsistencia,cedulaVisible,ESTADOS} from './asistencia-centros-datos.mjs?v=20261006-comunidades';
const numero=n=>n.toLocaleString('es-VE');
export function fechaLarga(fecha){return new Date(fecha+'T12:00:00Z').toLocaleDateString('es-VE',{timeZone:'America/Caracas',weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+fecha.split('-').reverse().join('/');}
function nombreArchivo(personas,fecha,extension){const centros=[...new Set(personas.map(p=>p.centro))];const nombre=centros.length===1?centros[0]:'Todos_los_centros';return 'Asistencia_'+nombre.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,65)+'_'+fecha+'.'+extension;}
function grupos(personas){const mapa=new Map();for(const p of personas){if(!mapa.has(p.centro))mapa.set(p.centro,[]);mapa.get(p.centro).push(p);}return [...mapa].sort((a,b)=>a[0].localeCompare(b[0],'es'));}

export function crearPDF(jsPDF,personas,{fecha,filtros}) {
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const gruposCentro=grupos(personas);
  for(const [indice,[centro,filas]] of gruposCentro.entries()) {
    if(indice)doc.addPage();
    const c=contarAsistencia(filas);
    const encabezado=()=>{
      const y=dibujarHeaderPDF(doc,{titulo:'Lista de asistencia por centro electoral',subtitulo:'Jornada: '+fechaLarga(fecha)});
      doc.setTextColor(23,44,72);doc.setFontSize(10);doc.setFont('helvetica','bold');
      const lineas=doc.splitTextToSize(centro,269);doc.text(lineas,14,y+5);doc.setFont('helvetica','normal');doc.setFontSize(8);
      const siguiente=y+8+lineas.length*4;
      doc.text(`Lista: ${numero(c.total)}  |  Sí: ${numero(c.asistio)}  |  No: ${numero(c.no_asistio)}  |  Pendientes: ${numero(c.pendiente)}`,14,siguiente);
      return siguiente+5;
    };
    const y=encabezado();
    doc.autoTable({startY:y,margin:{left:14,right:14,top:y,bottom:21},styles:{fontSize:8,cellPadding:1.7,overflow:'linebreak'},headStyles:{fillColor:[10,35,81]},showHead:'everyPage',rowPageBreak:'avoid',willDrawPage:encabezado,
      head:[['N.º','Cédula','Nombre y apellido','Comuna','Comunidad','Asistencia']],
      body:filas.map((p,i)=>[i+1,cedulaVisible(p),p.nombre,p.comuna,p.comunidad,p.id ? ESTADOS[p.estado]||ESTADOS.pendiente : 'C\u00e9dula por corregir']),
      columnStyles:{0:{cellWidth:8},1:{cellWidth:25},2:{cellWidth:68},3:{cellWidth:54},4:{cellWidth:80},5:{cellWidth:34}}
    });
  }
  const paginas=doc.internal.getNumberOfPages();
  for(let n=1;n<=paginas;n++) {
    doc.setPage(n);dibujarFooterPDF(doc);doc.setFillColor(255,255,255);doc.rect(250,199,38,8,'F');doc.setTextColor(82,100,122);doc.setFontSize(8);doc.text(`Página ${n} de ${paginas}`,283,203,{align:'right'});
    doc.setFontSize(7);const nota='Filtros: '+filtros;
    doc.text(doc.splitTextToSize(nota,269).slice(0,2),14,190);
  }
  return doc;
}
export function descargarPDF(personas,opciones){if(!window.jspdf?.jsPDF)throw Error('No se cargó el generador PDF. Recarga la página.');crearPDF(window.jspdf.jsPDF,personas,opciones).save(nombreArchivo(personas,opciones.fecha,'pdf'));}

export function crearExcel(XLSX,personas,{fecha,filtros}) {
  const c=contarAsistencia(personas),generado=new Date().toLocaleString('es-VE',{timeZone:'America/Caracas'});
  const datos=[['Lista de asistencia · '+fechaLarga(fecha)],['Generado el '+generado+' · '+filtros],CABECERAS,...filasExportacion(personas)];
  const hoja=XLSX.utils.aoa_to_sheet(datos);
  hoja['!cols']=[{wch:7},{wch:18},{wch:40},{wch:42},{wch:42},{wch:65},{wch:19}];
  hoja['!merges']=[{s:{r:0,c:0},e:{r:0,c:6}},{s:{r:1,c:0},e:{r:1,c:6}}];
  hoja['!autofilter']={ref:`A3:G${datos.length}`};
  for(let i=0;i<CABECERAS.length;i++){hoja[XLSX.utils.encode_cell({r:2,c:i})].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'0A2351'}},alignment:{wrapText:true,vertical:'center'}};}
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,hoja,'Asistencia');
  const resumen=XLSX.utils.aoa_to_sheet([['Resumen de asistencia · '+fechaLarga(fecha)],['Generado el '+generado],['Centro electoral','Total','Sí asistieron','No asistieron','Pendientes'],...grupos(personas).map(([centro,filas])=>{const r=contarAsistencia(filas);return [centro,r.total,r.asistio,r.no_asistio,r.pendiente];}),['TOTAL',c.total,c.asistio,c.no_asistio,c.pendiente]]);
  resumen['!cols']=[{wch:65},{wch:15},{wch:18},{wch:18},{wch:18}];resumen['!autofilter']={ref:`A3:E${grupos(personas).length+4}`};
  XLSX.utils.book_append_sheet(wb,resumen,'Resumen');return wb;
}
function guardarXlsx(XLSX,wb,nombre) {
  const filas=wb.SheetNames.map(n=>Number(/^[A-Za-z]+(\d+)/.exec(wb.Sheets[n]['!autofilter'].ref)[1]));
  const cfb=XLSX.CFB.read(new Uint8Array(XLSX.write(wb,{bookType:'xlsx',type:'array'})),{type:'array'});let modificadas=0;
  cfb.FullPaths.forEach((ruta,i)=>{
    const m=/\/xl\/worksheets\/sheet(\d+)\.xml$/.exec(ruta);if(!m)return;
    const fila=filas[Number(m[1])-1],e=cfb.FileIndex[i],celda='A'+(fila+1);
    const panel=`<pane ySplit="${fila}" topLeftCell="${celda}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="${celda}" sqref="${celda}"/>`;
    const xml=new TextDecoder().decode(new Uint8Array(e.content));const nuevo=xml.replace(/(<sheetView[^>]*?)\/>/,'$1>'+panel+'</sheetView>');
    if(nuevo===xml)throw Error('No se pudo congelar el encabezado del Excel.');e.content=new TextEncoder().encode(nuevo);e.size=e.content.length;modificadas++;
  });
  if(modificadas!==wb.SheetNames.length)throw Error('No se completó el formato del Excel.');
  const blob=new Blob([XLSX.CFB.write(cfb,{type:'array',fileType:'zip'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}
export function descargarExcel(personas,opciones){if(!window.XLSX)throw Error('No se cargó el generador Excel. Recarga la página.');guardarXlsx(window.XLSX,crearExcel(window.XLSX,personas,opciones),nombreArchivo(personas,opciones.fecha,'xlsx'));}
