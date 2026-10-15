import {dibujarHeaderPDF,dibujarFooterPDF} from './pdf-header.js?v=20261016-vertical';

export {seccionesPorTerritorio} from './consulta-popular-grupos.mjs?v=20261016';

// La paginación del PDF reserva márgenes físicos; no depende de la tabla HTML.
export function crearPDFConsulta({tipo,titulo,jornada,filtros,resumen,encabezados,filas,secciones}) {
  if(!window.jspdf?.jsPDF)throw Error('No se pudo cargar el generador de PDF. Recarga la página y vuelve a intentar.');
  const doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
  if(typeof doc.autoTable!=='function')throw Error('No se pudo cargar la tabla del PDF. Recarga la página y vuelve a intentar.');
  const ancho=doc.internal.pageSize.getWidth(),alto=doc.internal.pageSize.getHeight(),margen=15,util=ancho-2*margen;
  const conFirma=tipo!=='territorio';
  let subtitulo=titulo,y,seccionActual;
  const cabecera=()=>{
    let cursor=dibujarHeaderPDF(doc,{titulo:'Consulta Popular 18 de Octubre',subtitulo,margenExterior:margen})+4;
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(23,36,59);
    for(const [etiqueta,valor] of [['Comuna',seccionActual?.comuna],['Comunidad',seccionActual?.comunidad]]){
      if(!valor)continue;
      const lineas=doc.splitTextToSize(`${etiqueta}: ${valor}`,util-2);
      doc.text(lineas,margen,cursor);cursor+=lineas.length*4.3+1;
    }
    if(conFirma){
      cursor+=2;doc.setFontSize(8.5);doc.text('Datos del jefe o responsable de la planilla',margen,cursor);cursor+=5.5;doc.setFont('helvetica','normal');
      doc.setDrawColor(100,116,139);doc.setLineWidth(.2);
      const campo=(etiqueta,x,inicio,fin)=>{doc.text(etiqueta,margen+x,cursor);doc.line(margen+inicio,cursor+.5,margen+fin,cursor+.5);};
      campo('Nombres y apellidos:',0,30,util);
      cursor+=6.5;campo('Cédula:',0,12,55);campo('Teléfono:',62,77,123);campo('Sexo:',130,139,153);campo('Edad:',159,168,util);
      cursor+=6.5;campo('Firma del jefe o responsable:',0,42,util);cursor+=4.5;
    }
    return cursor;
  };
  const texto=(etiqueta,valor)=>{
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(30,41,59);
    const lineas=doc.splitTextToSize(etiqueta?`${etiqueta}: ${valor}`:String(valor),util-2);
    doc.text(lineas,margen,y);y+=lineas.length*4.3+2;
  };
  const anchos=conFirma?[11,util-130,25,25,19,11,39]:[40,55,18,18,20,17,util-168];
  const columnas=Object.fromEntries(anchos.map((ancho,i)=>[i,{cellWidth:ancho}]));
  const titulos=conFirma?[...encabezados,'Firma']:encabezados;
  const bloques=secciones?.length?secciones:[{filas}];
  for(const [indice,bloque] of bloques.entries()){
    if(indice>0)doc.addPage();
    seccionActual=bloque;
    subtitulo=bloque.titulo?`${titulo} · ${bloque.titulo}`:titulo;
    const primeraPagina=doc.internal.getCurrentPageInfo().pageNumber,inicio=cabecera();y=inicio;
    texto('Jornada',jornada);texto('Filtros',filtros);texto('',resumen);
    if(bloque.titulo)texto('Sección',`${bloque.titulo} · ${bloque.filas.length.toLocaleString('es-VE')} registros`);
    doc.autoTable({startY:y+2,margin:{top:inicio+1,bottom:30,left:margen,right:margen},tableWidth:util,
    head:[titulos],body:bloque.filas.length?bloque.filas.map(f=>conFirma?[...f,'']:f):[[ {content:'No hay registros con estos filtros.',colSpan:titulos.length} ]],
    theme:'grid',showHead:'everyPage',rowPageBreak:'avoid',
    styles:{font:'helvetica',fontSize:9,cellPadding:conFirma?1.4:2.2,overflow:'linebreak',valign:'top',lineColor:[183,193,204],lineWidth:0.15,textColor:[23,36,59]},
    headStyles:{fillColor:[10,35,81],textColor:255,fontStyle:'bold',fontSize:8.5},
    alternateRowStyles:{fillColor:[246,248,250]},columnStyles:columnas,
    bodyStyles:conFirma?{minCellHeight:7.5}:{},
    didParseCell:celda=>{
      if(conFirma&&celda.section==='body'&&celda.column.index===titulos.length-1)celda.cell.styles.fillColor=[255,255,255];
    },
    willDrawPage:()=>{if(doc.internal.getCurrentPageInfo().pageNumber>primeraPagina)cabecera();}
  });
  }
  const paginas=doc.internal.getNumberOfPages();
  for(let i=1;i<=paginas;i++){
    doc.setPage(i);dibujarFooterPDF(doc,{margen,distanciaInferior:20,pagina:i,total:paginas,separarPaginacion:true});
  }
  doc.setProperties({title:`Consulta Popular · ${titulo}`,subject:'Papel carta vertical · márgenes de 15 mm',author:'Sala Situacional · Alcaldía de Cristóbal Rojas'});
  return doc;
}

export function mostrarPDFConsulta(doc,nombre) {
  document.getElementById('vistaPDFConsulta')?.close();
  const url=URL.createObjectURL(doc.output('blob')),modal=document.createElement('dialog');
  modal.id='vistaPDFConsulta';modal.className='visor-pdf-consulta';modal.setAttribute('aria-labelledby','tituloPDFConsulta');
  modal.innerHTML='<div class="visor-pdf-barra"><h2 id="tituloPDFConsulta">PDF listo para imprimir</h2><button type="button" data-imprimir>Imprimir PDF</button><a class="boton secundario" data-descargar>Descargar PDF</a><button type="button" class="secundario" data-cerrar>Cerrar</button></div><p>Papel carta vertical (21,59 × 27,94 cm), con márgenes de 15 mm. Al imprimir, selecciona tamaño real o escala 100 %.</p><iframe title="Vista previa del PDF de Consulta Popular"></iframe>';
  const enlace=modal.querySelector('[data-descargar]');enlace.href=url;enlace.download=nombre;
  const marco=modal.querySelector('iframe');marco.src=url;
  modal.querySelector('[data-cerrar]').onclick=()=>modal.close();
  modal.querySelector('[data-imprimir]').onclick=()=>{try{marco.contentWindow.focus();marco.contentWindow.print();}catch{enlace.click();}};
  const anterior=document.activeElement;
  modal.addEventListener('close',()=>{modal.remove();URL.revokeObjectURL(url);anterior?.focus();},{once:true});
  document.body.append(modal);modal.showModal();
}
