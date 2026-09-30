/* Comprueba los exportadores reales con cien fichas sintéticas. */
const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const raiz=path.resolve(__dirname,'..'),deps=[raiz,'C:/Users/carlo/Documents/admin-alcaldia'];const modulo=n=>require(require.resolve(n,{paths:deps}));
globalThis.Formularios=require('../formularios-core.js');const C=require('../censo-core.js'),{jsPDF}=modulo('jspdf');modulo('jspdf-autotable');const XLSX=modulo('xlsx');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'censo-exportadores-')),codigo=fs.readFileSync(path.join(raiz,'censo-panel.js'),'utf8'),logoCtx={};
vm.runInNewContext(fs.readFileSync(path.join(raiz,'logos-base64.js'),'utf8').replace(/export const /g,'var '),logoCtx);vm.runInNewContext(fs.readFileSync(path.join(raiz,'pdf-header.js'),'utf8').replace(/^import .*$/m,'').replace(/export function /g,'function '),logoCtx);
const p=i=>({nacionalidad:'V',cedula:String(90000000+i),primer_nombre:'Persona',segundo_nombre:'',primer_apellido:'Sintética',segundo_apellido:'',fecha_nacimiento:i%2?'2000-02-29':'',genero:i%2?'Mujer':'Hombre',telefono:'',parroquia:'Parroquia de prueba',comuna:'Comuna de prueba',comunidad:'Comunidad de prueba',necesidad:'Necesidad sintética '+i});
const seleccion=Array.from({length:100},(_,i)=>({id:'grupo-sintetico',personaId:C.clave(i+1),persona:p(i+1),responsable:p(0),cantidad:100,estado:i%2?'Sí':'No',creado_en:Date.now()}));
seleccion[0].persona.necesidad='Observación extensa de prueba. '.repeat(95);
const def={titulo:'Prueba de exportación completa del censo',seguimiento:'Contactado'},error=t=>{throw new Error(t);};
const body=codigo.match(/function pdf\(\)\{([^\n]*)\}\n/)[1].replace("doc.save('censo-'+modo+'.pdf');",'return doc;');
const doc=new Function('def','seleccion','C','modo','jspdf','dibujarHeaderPDF','dibujarFooterPDF','contexto','mensaje','window',body)(def,seleccion,C,'personas',{jsPDF},logoCtx.dibujarHeaderPDF,logoCtx.dibujarFooterPDF,()=> 'Sin filtros',error,{Formularios:globalThis.Formularios});
fs.writeFileSync(path.join(scratch,'censo.pdf'),Buffer.from(doc.output('arraybuffer')));console.log('PDF: cien personas con todos los datos del responsable; '+doc.internal.getNumberOfPages()+' páginas.');
(async()=>{const existente=fs.readdirSync(os.tmpdir()).filter(d=>d.startsWith('sala-exportadores-')).map(d=>path.join(os.tmpdir(),d,'jszip.cjs')).find(p=>fs.existsSync(p));let zipPath=existente;if(!zipPath){const r=await fetch('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');assert.ok(r.ok);zipPath=path.join(scratch,'jszip.cjs');fs.writeFileSync(zipPath,await r.text());}const JSZip=require(zipPath);let salida;
 const excelBody=codigo.match(/async function excel\(\)\{([^\n]*)\}\n/)[1];
 const grupo={responsable:p(0),personas:Object.fromEntries(seleccion.map(r=>[r.personaId,r.persona])),cantidad:100,creado_en:Date.now()},grupos={'grupo-sintetico':grupo};
 const I=require('../censo-informes.js').crear({C,XLSX,JSZip,jspdf:{jsPDF},dibujarHeaderPDF:logoCtx.dibujarHeaderPDF,dibujarFooterPDF:logoCtx.dibujarFooterPDF});
 const op={def,filas:seleccion,modo:'personas',grupos,seguimiento:{},contexto:'Sin filtros'};
 const fn=new Function('informes','opcionesInforme','descargar','mensaje','modo','return (async()=>{'+excelBody+'})();');
 await fn(()=>I,()=>op,blob=>{salida=blob;},error,'personas');
 assert.ok(salida);const bytes=await salida.arrayBuffer();fs.writeFileSync(path.join(scratch,'censo.xlsx'),Buffer.from(bytes));const wb=XLSX.read(bytes,{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets.Personas,{header:1,defval:''}),zip=await JSZip.loadAsync(bytes);assert.equal(wb.SheetNames.length,3);assert.equal(rows.length,103);assert.ok(rows.slice(2).every(r=>r.length===32));assert.ok(rows.at(-1).includes('90000100'));for(let i=1;i<=3;i++)assert.ok((await zip.file('xl/worksheets/sheet'+i+'.xml').async('string')).includes('ySplit="3"'));console.log('Excel: 100 personas, 32 columnas, responsables y resumen territorial; tres hojas congeladas.');
 for(const [nombre,metodo] of [['resumen','resumenPdf'],['firmas','asistenciaPdf'],['fichas','fichasPdf']]){const pdf=I[metodo](op);fs.writeFileSync(path.join(scratch,nombre+'.pdf'),Buffer.from(pdf.output('arraybuffer')));console.log('PDF '+nombre+': '+pdf.internal.getNumberOfPages()+' páginas.');}
 const csv=C.csv(C.tabla(seleccion,def.seguimiento,'personas'));assert.ok(csv.includes('90000100'));fs.writeFileSync(path.join(scratch,'censo.csv'),csv);console.log('CSV completo verificado.');console.log('ARTEFACTOS '+scratch);
})().catch(err=>{console.error(err);process.exitCode=1;});
