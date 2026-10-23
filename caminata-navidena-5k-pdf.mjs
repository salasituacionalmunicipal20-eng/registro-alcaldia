import {dibujarHeaderPDF, dibujarFooterPDF} from './pdf-header.js';
import {EVENTO, NOTAS, filasEvento, documentoParticipante, numeroParticipante} from './caminata-navidena-5k-datos.mjs?v=20261020-numeros';

// La fuente PDF estándar no representa emojis. Dibujo estas celdas con la
// fuente del navegador para conservar sus caracteres sin alterar lo registrado.
function celdaUnicode(texto,ancho){
    const escala=8,paso=7.5*25.4/72*1.2,canvas=document.createElement('canvas');
    canvas.width=Math.ceil(ancho*escala);canvas.height=1;
    let ctx=canvas.getContext('2d');const fuente=`${7.5*25.4/72*escala}px Arial, sans-serif`;ctx.font=fuente;
    const lineas=[];let linea='';
    for(const bloque of texto.split(/(\s+)/u)){
        if(ctx.measureText(linea+bloque).width>canvas.width&&linea){lineas.push(linea.trimEnd());linea='';}
        for(const caracter of bloque){
            if(ctx.measureText(linea+caracter).width>canvas.width&&linea){lineas.push(linea);linea='';}
            linea+=caracter;
        }
    }
    if(linea||!lineas.length)lineas.push(linea);
    const alto=lineas.length*paso;canvas.height=Math.ceil(alto*escala);ctx=canvas.getContext('2d');ctx.font=fuente;ctx.fillStyle='#111';ctx.textBaseline='top';
    lineas.forEach((l,i)=>ctx.fillText(l,0,i*paso*escala));
    return {imagen:canvas.toDataURL('image/png'),ancho,alto};
}

// Todas las medidas se calculan sobre carta, con 15 mm libres para la impresora.
export function crearPlanillasPDF(participantes, doc=null, finalizar=true) {
    const continuar=Boolean(doc);
    doc ||= new window.jspdf.jsPDF({orientation:'portrait', unit:'mm', format:'letter', compress:true});
    const margen=15, ancho=doc.internal.pageSize.getWidth()-2*margen;
    const limite=doc.internal.pageSize.getHeight()-25;
    const fecha=v=>v?new Date(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v).toLocaleDateString('es-VE',{dateStyle:'long'})+' · '+new Date(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v).toLocaleDateString('es-VE'):'—';
    for (const [indice, {registro:r, fotos={}}] of participantes.entries()) {
        if(indice||continuar) doc.addPage();
        const cabecera=()=>dibujarHeaderPDF(doc,{titulo:EVENTO.nombre,subtitulo:numeroParticipante(r),margenExterior:margen})+2;
        const inicio=cabecera();
        const filas=[['N.º de inscripción',numeroParticipante(r)],['Nombre y apellido',r.nombre_apellido],['Cédula',documentoParticipante(r)],['Teléfono',r.telefono],['Fecha de nacimiento',fecha(r.fecha_nacimiento)],['Edad / Sexo',`${r.edad ?? '—'} años · ${r.sexo||'—'}`],['Municipio',r.municipio],['Dirección de habitación',r.direccion_habitacion],['Padece alguna enfermedad',r.padece_enfermedad],['Enfermedad o condición',r.enfermedad_detalle||'No aplica'],['Toma algún medicamento',r.toma_medicamento],['Medicamento',r.medicamento_detalle||'No aplica'],['Fecha de inscripción',fecha(r.fecha_registro)],...filasEvento(r)];
        const cuerpo=filas.map(([k,v])=>{
            const texto=String(v??'—');
            if(!/[^\x00-\xff]/u.test(texto))return [k,texto];
            const dibujo=celdaUnicode(texto,ancho-53-2.2);
            return [k,{content:'',styles:{minCellHeight:dibujo.alto+2.2},dibujo}];
        });
        doc.autoTable({startY:inicio,body:cuerpo,theme:'grid',styles:{fontSize:7.5,cellPadding:1.1,overflow:'linebreak'},columnStyles:{0:{cellWidth:53,fontStyle:'bold',fillColor:[244,248,243]},1:{cellWidth:ancho-53}},margin:{left:margen,right:margen,top:inicio,bottom:27},willDrawPage:datos=>{if(datos.pageNumber>1)cabecera();},didDrawCell:datos=>{
            const dibujo=datos.cell.raw?.dibujo;
            if(dibujo)doc.addImage(dibujo.imagen,'PNG',datos.cell.x+1.1,datos.cell.y+1.1,dibujo.ancho,dibujo.alto);
        }});
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
    if(finalizar)finalizarPlanillasPDF(doc);
    return doc;
}

function finalizarPlanillasPDF(doc){
    const total=doc.internal.getNumberOfPages();
    for(let pagina=1;pagina<=total;pagina++){doc.setPage(pagina);dibujarFooterPDF(doc,{margen:15,distanciaInferior:21,pagina,total,separarPaginacion:true});}
}

export async function crearPlanillasPorLotes(registros,cargarFotos,progreso=()=>{},signal){
    if(!registros.length)throw new Error('No hay inscripciones para descargar.');
    let doc=null;
    async function preparar(registro){
        signal?.throwIfAborted();
        // Solo la primera foto se imprime. La reduzco a su tamaño de salida para
        // que cientos de planillas no acumulen las fotografías originales.
        const fotos=registro.tiene_fotos?await cargarFotos(registro.id):{};
        const src=Object.values(fotos).find(f=>typeof f==='string'&&f.startsWith('data:image/'));
        let reducida={};
        if(src){
            const img=new Image();img.src=src;await img.decode();
            const escala=Math.min(300/img.naturalWidth,400/img.naturalHeight,1),canvas=document.createElement('canvas');
            canvas.width=Math.max(1,Math.round(img.naturalWidth*escala));canvas.height=Math.max(1,Math.round(img.naturalHeight*escala));
            const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
            reducida={foto:canvas.toDataURL('image/jpeg',.8)};
        }
        return {registro,fotos:reducida};
    }
    for(let inicio=0;inicio<registros.length;inicio+=8){
        const lote=await Promise.all(registros.slice(inicio,inicio+8).map(preparar));
        for(const [indice,participante] of lote.entries()){
            signal?.throwIfAborted();
            doc=crearPlanillasPDF([participante],doc,false);
            progreso(inicio+indice+1,registros.length);
            await new Promise(resolve=>setTimeout(resolve,0));
        }
    }
    finalizarPlanillasPDF(doc);
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
