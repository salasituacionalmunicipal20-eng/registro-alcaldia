// pdf-header.js
// Helper unico para que TODOS los PDFs del proyecto tengan el mismo cintillo
// institucional con los 3 logos (Cristobal Rojas, Yuhismar, PSUV).
//
// Uso:
//   import { dibujarHeaderPDF } from './pdf-header.js';
//   const doc = new jsPDF();
//   const yInicio = dibujarHeaderPDF(doc, {
//     titulo: 'Reporte de Asistencia',
//     subtitulo: 'Periodo 01-mar a 31-mar 2026'
//   });
//   autoTable(doc, { startY: yInicio + 4, head: [...], body: [...] });
import { LOGO_CRISTOBAL_ROJAS, LOGO_YUHISMAR, LOGO_PSUV } from './logos-base64.js';

/**
 * Dibuja el cintillo institucional en la pagina actual y devuelve la Y donde
 * el cuerpo del documento puede empezar a escribir (en mm).
 *
 * @param {jsPDF} doc - instancia de jsPDF
 * @param {Object} opts
 * @param {string} opts.titulo    - titulo principal grande
 * @param {string} [opts.subtitulo] - linea opcional debajo del titulo
 * @param {number} [opts.margenExterior=0] - margen físico alrededor del cintillo, en mm
 * @returns {number} y en mm donde el cuerpo puede comenzar
 */
export function dibujarHeaderPDF(doc, { titulo, subtitulo, margenExterior = 0 } = {}) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const escala = (pageWidth - 2 * margenExterior) / pageWidth;
    const x = valor => margenExterior + valor * escala;
    const y = valor => margenExterior + valor * escala;
    const medida = valor => valor * escala;
    const orientation = doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight() ? 'landscape' : 'portrait';

    // Margen y banda azul institucional arriba
    doc.setFillColor(10, 35, 81);   // #0a2351
    doc.rect(x(0), y(0), medida(pageWidth), medida(6), 'F');

    // Logo Cristobal Rojas (izquierda)
    try { doc.addImage(LOGO_CRISTOBAL_ROJAS, 'PNG', x(14), y(10), medida(22), medida(22)); } catch (_) {}

    // Logo PSUV (derecha)
    try { doc.addImage(LOGO_PSUV, 'PNG', x(pageWidth - 50), y(12), medida(36), medida(18)); } catch (_) {}

    // Texto institucional centrado
    doc.setTextColor(10, 35, 81);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(medida(11));
    doc.text('ALCALDIA DEL MUNICIPIO CRISTOBAL ROJAS', x(pageWidth / 2), y(16), { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(medida(8));
    doc.setTextColor(80, 80, 80);
    doc.text('Republica Bolivariana de Venezuela - Estado Miranda - Despacho de la Alcaldesa', x(pageWidth / 2), y(21), { align: 'center' });

    // Logo Yuhismar (texto, debajo del titulo institucional)
    try { doc.addImage(LOGO_YUHISMAR, 'PNG', x(pageWidth / 2 - 22), y(23), medida(44), medida(8)); } catch (_) {}

    // Linea separadora dorada delgada
    doc.setDrawColor(212, 160, 23); // #d4a017 dorado oxido
    doc.setLineWidth(0.7);
    doc.line(x(14), y(35), x(pageWidth - 14), y(35));

    let cursorY = 41;

    // Titulo del documento
    if (titulo) {
        doc.setTextColor(10, 35, 81);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(medida(14));
        doc.text(titulo, x(14), y(cursorY));
        cursorY += 5;
    }

    if (subtitulo) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(medida(10));
        doc.setTextColor(100, 116, 139);
        doc.text(subtitulo, x(14), y(cursorY));
        cursorY += 5;
    }

    // Fecha de generacion (siempre)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(medida(8));
    doc.setTextColor(140, 140, 140);
    const ahora = new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Generado el ${ahora}`, x(pageWidth - 14), y(cursorY), { align: 'right' });

    // Reset estilos antes de devolver
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    return y(cursorY + 2);
}

/**
 * Pie de pagina con leyenda institucional + paginacion. Llamar al final
 * (despues de autoTable) o en cada cambio de pagina via didDrawPage.
 */
export function dibujarFooterPDF(doc, { margen = 14, distanciaInferior = 7, pagina, total, separarPaginacion = false } = {}) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(10, 35, 81);
    doc.setLineWidth(0.3);
    doc.line(margen, pageH - distanciaInferior - 5, pageW - margen, pageH - distanciaInferior - 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Despacho de la Alcaldesa Yuhismar Hernandez - Municipio Cristobal Rojas - Sala Situacional', pageW / 2, pageH - distanciaInferior, { align: 'center' });
    const numero = pagina ?? doc.internal.getNumberOfPages();
    doc.text(total ? `Página ${numero} de ${total}` : `Pagina ${numero}`, pageW - margen, pageH - distanciaInferior + (separarPaginacion ? 4 : 0), { align: 'right' });
}
