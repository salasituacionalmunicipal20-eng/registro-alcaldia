import {dibujarHeaderPDF,dibujarFooterPDF} from './pdf-header.js?v=20261015-carta';

// La paginación del PDF reserva márgenes físicos; no depende de la tabla HTML.
export function crearPDFConsulta({tipo,titulo,jornada,filtros,resumen,encabezados,filas,secciones}) {
  if(!window.jspdf?.jsPDF)throw Error('No se pudo cargar el generador de PDF. Recarga la página y vuelve a intentar.');
  const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'letter'});
  if(typeof doc.autoTable!=='function')throw Error('No se pudo cargar la tabla del PDF. Recarga la página y vuelve a intentar.');
  const ancho=doc.internal.pageSize.getWidth(),alto=doc.internal.pageSize.getHeight(),margen=15,util=ancho-2*margen;
  let subtitulo=titulo,y;
  const cabecera=()=>dibujarHeaderPDF(doc,{titulo:'Consulta Popular 18 de Octubre',subtitulo,margenExterior:margen})+4;
  const texto=(etiqueta,valor)=>{
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(30,41,59);
    const lineas=doc.splitTextToSize(etiqueta?`${etiqueta}: ${valor}`:String(valor),util-2);
    doc.text(lineas,margen,y);y+=lineas.length*4.3+2;
  };
  const porcentajes=tipo==='lista'?[6,11,16,10,13,16,18,10]:tipo==='territorio'?[25,35,8,8,8,8,8]:[5,12,30,41,12];
  const columnas=Object.fromEntries(porcentajes.map((p,i)=>[i,{cellWidth:util*p/100}]));
  const bloques=secciones?.length?secciones:[{filas}];
  for(const [indice,bloque] of bloques.entries()){
    if(indice>0)doc.addPage();
    subtitulo=bloque.titulo?`${titulo} · ${bloque.titulo}`:titulo;
    const primeraPagina=doc.internal.getCurrentPageInfo().pageNumber,inicio=cabecera();y=inicio;
    texto('Jornada',jornada);texto('Filtros',filtros);texto('',resumen);
    if(bloque.titulo)texto('Sección',`${bloque.titulo} · ${bloque.filas.length.toLocaleString('es-VE')} registros`);
    doc.autoTable({startY:y+2,margin:{top:inicio+1,bottom:25,left:margen,right:margen},tableWidth:util,
    head:[encabezados],body:bloque.filas.length?bloque.filas:[[ {content:'No hay registros con estos filtros.',colSpan:encabezados.length} ]],
    theme:'grid',showHead:'everyPage',rowPageBreak:'avoid',
    styles:{font:'helvetica',fontSize:9,cellPadding:2.2,overflow:'linebreak',valign:'top',lineColor:[183,193,204],lineWidth:0.15,textColor:[23,36,59]},
    headStyles:{fillColor:[10,35,81],textColor:255,fontStyle:'bold',fontSize:8.5},
    alternateRowStyles:{fillColor:[246,248,250]},columnStyles:columnas,
    willDrawPage:()=>{if(doc.internal.getCurrentPageInfo().pageNumber>primeraPagina)cabecera();}
  });
  }
  const paginas=doc.internal.getNumberOfPages();
  for(let i=1;i<=paginas;i++){
    doc.setPage(i);dibujarFooterPDF(doc,{margen,distanciaInferior:16,pagina:i,total:paginas});
  }
  doc.setProperties({title:`Consulta Popular · ${titulo}`,subject:'Papel carta horizontal · márgenes de 15 mm',author:'Sala Situacional · Alcaldía de Cristóbal Rojas'});
  return doc;
}

export function mostrarPDFConsulta(doc,nombre) {
  document.getElementById('vistaPDFConsulta')?.close();
  const url=URL.createObjectURL(doc.output('blob')),modal=document.createElement('dialog');
  modal.id='vistaPDFConsulta';modal.className='visor-pdf-consulta';modal.setAttribute('aria-labelledby','tituloPDFConsulta');
  modal.innerHTML='<div class="visor-pdf-barra"><h2 id="tituloPDFConsulta">PDF listo para imprimir</h2><button type="button" data-imprimir>Imprimir PDF</button><a class="boton secundario" data-descargar>Descargar PDF</a><button type="button" class="secundario" data-cerrar>Cerrar</button></div><p>Papel carta horizontal (27,94 × 21,59 cm), con márgenes de 15 mm. Al imprimir, selecciona tamaño real o escala 100 %.</p><iframe title="Vista previa del PDF de Consulta Popular"></iframe>';
  const enlace=modal.querySelector('[data-descargar]');enlace.href=url;enlace.download=nombre;
  const marco=modal.querySelector('iframe');marco.src=url;
  modal.querySelector('[data-cerrar]').onclick=()=>modal.close();
  modal.querySelector('[data-imprimir]').onclick=()=>{try{marco.contentWindow.focus();marco.contentWindow.print();}catch{enlace.click();}};
  const anterior=document.activeElement;
  modal.addEventListener('close',()=>{modal.remove();URL.revokeObjectURL(url);anterior?.focus();},{once:true});
  document.body.append(modal);modal.showModal();
}
