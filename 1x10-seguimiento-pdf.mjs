import { dibujarHeaderPDF, dibujarFooterPDF } from './pdf-header.js';
import { sumarFilas } from './1x10-seguimiento-datos.mjs?v=20261010-centros-arichuna-jabillito';

export function crearInforme(jsPDF, filas, { fecha, filtros, calidad, generado, comunidades=[] }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const numero = n => n.toLocaleString('es-VE');
  const columnas = ['base','adicionales','jovenes','adultos','menores','sinEdad','total'];
  const encabezados = ['En el 1x10','Fuera del 1x10','15–35','36+','Menores de 15','Sin edad','Total'];
  const subtitulo = 'Edades al ' + fecha;
  const encabezado = () => dibujarHeaderPDF(doc, { titulo:'Seguimiento de registros 1x10', subtitulo });
  const y = encabezado();
  doc.setFontSize(9);
  const lineas = doc.splitTextToSize(filtros, 265);
  doc.text(lineas, 14, y + 5);
  const totales = sumarFilas(filas);
  doc.text(`En el 1x10: ${numero(totales.base)}  |  Fuera del 1x10: ${numero(totales.adicionales)}  |  Total informado: ${numero(totales.total)}`, 14, y + 11 + lineas.length * 4);
  const grupos = new Map();
  for (const fila of filas) {
    if (!grupos.has(fila.comuna)) grupos.set(fila.comuna, []);
    grupos.get(fila.comuna).push(fila);
  }
  const tabla = {
    margin:{left:14,right:14,top:58,bottom:20},
    styles:{fontSize:8,cellPadding:2,overflow:'linebreak'},
    headStyles:{fillColor:[10,35,81]},
    showHead:'everyPage',
    rowPageBreak:'avoid',
    willDrawPage: () => encabezado()
  };
  doc.autoTable({ ...tabla, startY:y + 19 + lineas.length * 4,
    head:[['Comuna', ...encabezados]],
    body:[...[...grupos].map(([comuna, grupo]) => [comuna, ...columnas.map(k => numero(sumarFilas(grupo)[k]))]), ['TOTAL', ...columnas.map(k => numero(totales[k]))]],
    columnStyles:{0:{cellWidth:73}}
  });
  doc.addPage();
  doc.autoTable({ ...tabla, startY:58,
    head:[['Comuna','Centro electoral', ...encabezados]],
    body:[...filas.map(f => [f.comuna,f.centro,...columnas.map(k => numero(f[k]))]), ['TOTAL','',...columnas.map(k => numero(totales[k]))]],
    columnStyles:{0:{cellWidth:46},1:{cellWidth:70}}
  });
  if(comunidades.length) {
    doc.addPage();
    doc.autoTable({...tabla,startY:58,head:[['Comunidades de cada comuna','Registrados']],
      body:comunidades.flatMap(g=>[
        [{content:g.comuna+' · Total registrado: '+numero(g.total),colSpan:2,styles:{fillColor:[10,35,81],textColor:[255,255,255],fontStyle:'bold'} }],
        ...g.comunidades.map(c=>[c.comunidad,numero(c.total)])
      ]),columnStyles:{0:{cellWidth:235},1:{cellWidth:34,halign:'right'}}});
  }
  doc.addPage();
  let posicion = dibujarHeaderPDF(doc, { titulo:'Método y calidad de los registros', subtitulo }) + 6;
  const notas = [
    'Generado el ' + generado + '.', filtros, calidad,
    'Las cantidades adicionales son declaradas, no verificadas por cédula. El total informado combina todos los registros de jefes y afines de las siete variantes del 1x10 y cantidades adicionales. Las repeticiones y los registros sin cédula se incluyen; no equivale a personas únicas.',
    'Las ubicaciones pueden ser heredadas del jefe o del catálogo territorial. No confirman el centro electoral individual.',
    'El detalle de comunidades cuenta todos los registros del 1x10. Incluye las comunidades del catálogo con cero registros. Las cargas adicionales solo tienen comuna y centro; no se asignan a comunidades. Los registros sin comunidad se muestran aparte dentro de su comuna.',
    'Se agrupan diferencias de mayúsculas, espacios y tildes en comunas y centros. Los nombres que difieren en otras letras se conservan en filas distintas.',
    'Las cargas por rangos de edad corresponden al momento en que fueron declaradas. Cambiar la fecha solo recalcula las edades del 1x10.',
    'Los registros sin fecha de nacimiento válida se incluyen en Sin edad. Los menores de 15 se muestran aparte y están incluidos en el total.'
  ];
  doc.setFontSize(10);
  for (const nota of notas) {
    const renglones = doc.splitTextToSize(nota, 265);
    const alto = renglones.length * 5 + 7;
    if (posicion + alto > 188) { doc.addPage(); posicion = encabezado() + 6; doc.setFontSize(10); }
    doc.text(renglones, 14, posicion); posicion += alto;
  }
  // El helper utiliza el número total de páginas; se ajusta la leyenda a cada hoja.
  const paginas = doc.internal.getNumberOfPages();
  for (let pagina=1; pagina<=paginas; pagina++) {
    doc.setPage(pagina);
    dibujarFooterPDF(doc);
    doc.setFillColor(255,255,255); doc.rect(256,200,30,6,'F');
    doc.setTextColor(120,120,120); doc.setFontSize(8);
    doc.text(`Página ${pagina} de ${paginas}`,283,203,{align:'right'});
  }
  return doc;
}
