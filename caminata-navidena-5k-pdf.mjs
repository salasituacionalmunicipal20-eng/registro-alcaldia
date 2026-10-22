import {dibujarHeaderPDF, dibujarFooterPDF} from './pdf-header.js';
import {EVENTO, NOTAS, filasEvento, documentoParticipante, numeroParticipante} from './caminata-navidena-5k-datos.mjs?v=20261020-numeros';

// Todas las medidas se calculan sobre carta, con 15 mm libres para la impresora.
export function crearPlanillasPDF(participantes) {
    const doc = new window.jspdf.jsPDF({orientation:'portrait', unit:'mm', format:'letter'});
    const margen=15, ancho=doc.internal.pageSize.getWidth()-2*margen;
    const limite=doc.internal.pageSize.getHeight()-25;
    const fecha=v=>v?new Date(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v).toLocaleDateString('es-VE',{dateStyle:'long'})+' · '+new Date(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v).toLocaleDateString('es-VE'):'—';
    for (const [indice, {registro:r, fotos={}}] of participantes.entries()) {
        if(indice) doc.addPage();
        const cabecera=()=>dibujarHeaderPDF(doc,{titulo:EVENTO.nombre,subtitulo:numeroParticipante(r),margenExterior:margen})+2;
        const inicio=cabecera();
        const filas=[['N.º de inscripción',numeroParticipante(r)],['Nombre y apellido',r.nombre_apellido],['Cédula',documentoParticipante(r)],['Teléfono',r.telefono],['Fecha de nacimiento',fecha(r.fecha_nacimiento)],['Edad / Sexo',`${r.edad ?? '—'} años · ${r.sexo||'—'}`],['Municipio',r.municipio],['Dirección de habitación',r.direccion_habitacion],['Padece alguna enfermedad',r.padece_enfermedad],['Enfermedad o condición',r.enfermedad_detalle||'No aplica'],['Toma algún medicamento',r.toma_medicamento],['Medicamento',r.medicamento_detalle||'No aplica'],['Fecha de inscripción',fecha(r.fecha_registro)],...filasEvento(r)];
        doc.autoTable({startY:inicio,body:filas.map(([k,v])=>[k,String(v??'—')]),theme:'grid',styles:{fontSize:7.5,cellPadding:1.1,overflow:'linebreak'},columnStyles:{0:{cellWidth:53,fontStyle:'bold',fillColor:[244,248,243]},1:{cellWidth:ancho-53}},margin:{left:margen,right:margen,top:inicio,bottom:27},willDrawPage:datos=>{if(datos.pageNumber>1)cabecera();}});
        let y=doc.lastAutoTable.finalY+4;
        doc.setFont('helvetica','normal');doc.setFontSize(7.5);
        const notas=doc.splitTextToSize(NOTAS.join('\n\n'),ancho);
        const altoNotas=notas.length*7.5*1.15*25.4/72;
        const nuevaPagina=()=>{doc.addPage();y=cabecera();};
        if(y+40+5+altoNotas>limite)nuevaPagina();
        const foto=Object.values(fotos).find(src=>typeof src==='string'&&src.startsWith('data:image/'));
        let x=margen;
        doc.setDrawColor(130);doc.setLineWidth(.25);
        if(foto){
            const prop=doc.getImageProperties(foto),escala=Math.min(26/prop.width,33/prop.height),w=prop.width*escala,h=prop.height*escala;
            doc.roundedRect(x,y,30,40,2,2);
            doc.addImage(foto,foto.startsWith('data:image/png')?'PNG':'JPEG',x+2+(26-w)/2,y+2+(33-h)/2,w,h,undefined,'FAST');
            doc.setFontSize(7);doc.text('Foto personal',x+15,y+38,{align:'center'});x+=35;
        }
        const firma=(margen+ancho-x-5)/2;
        for(const [i,titulo] of ['Firma del participante','Recibido por'].entries()){
            const izq=x+i*(firma+5);doc.roundedRect(izq,y,firma,40,2,2);doc.line(izq+5,y+30,izq+firma-5,y+30);doc.setFontSize(8);doc.text(titulo,izq+firma/2,y+35,{align:'center'});
        }
        y+=45;doc.setFontSize(7.5);
        const paso=7.5*1.15*25.4/72;
        for(const linea of notas){if(y+paso>limite)nuevaPagina();doc.text(linea,margen,y);y+=paso;}
    }
    const total=doc.internal.getNumberOfPages();
    for(let pagina=1;pagina<=total;pagina++){doc.setPage(pagina);dibujarFooterPDF(doc,{margen,distanciaInferior:21,pagina,total,separarPaginacion:true});}
    return doc;
}

export function mostrarPlanillasPDF(doc, nombre='planillas_navidad_5k_2026.pdf') {
    document.getElementById('vistaPlanillasPDF')?.remove();
    const url=URL.createObjectURL(doc.output('blob')),modal=document.createElement('dialog');
    modal.id='vistaPlanillasPDF';modal.style.cssText='width:min(1000px,96vw);height:94vh;max-width:96vw;max-height:94vh;margin:auto;padding:16px;border:0;border-radius:12px;color:#172033;';
    modal.innerHTML='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><strong style="flex:1">Planillas en hoja carta</strong><button data-imprimir>Imprimir PDF</button><button data-descargar>Descargar PDF</button><button data-cerrar>Cerrar</button></div><p style="margin:8px 0;font:14px Arial">Tamaño carta (21,59 × 27,94 cm), con márgenes de 15 mm. Al imprimir selecciona Carta y tamaño real (100 %).</p><iframe title="Vista previa de las planillas en carta" style="width:100%;height:calc(100% - 110px);border:1px solid #cbd5e1"></iframe>';
    for(const b of modal.querySelectorAll('button'))b.style.cssText='min-height:44px;padding:9px 14px;border:0;border-radius:7px;background:#075985;color:white;cursor:pointer;font:14px Arial';
    const marco=modal.querySelector('iframe');marco.src=url;
    modal.querySelector('[data-descargar]').onclick=()=>doc.save(nombre);
    modal.querySelector('[data-imprimir]').onclick=()=>{try{marco.contentWindow.focus();marco.contentWindow.print();}catch{doc.save(nombre);}};
    modal.querySelector('[data-cerrar]').onclick=()=>modal.close();
    modal.addEventListener('close',()=>{URL.revokeObjectURL(url);modal.remove();},{once:true});
    document.body.append(modal);modal.showModal();
}
