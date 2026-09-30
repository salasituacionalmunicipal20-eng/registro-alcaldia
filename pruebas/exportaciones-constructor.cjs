/* Ejecuta los exportadores reales con 27 registros y 40 campos (más de una página
   del tablero). Solo produce artefactos sintéticos en una carpeta temporal. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const raiz=path.resolve(__dirname,'..'),F=require('../formularios-core.js');
const dependencias=[raiz,'C:/Users/carlo/Documents/admin-alcaldia'];
const modulo=n=>require(require.resolve(n,{paths:dependencias}));
const {jsPDF}=modulo('jspdf');modulo('jspdf-autotable');const XLSX=modulo('xlsx');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'sala-exportadores-'));
const codigo=fs.readFileSync(path.join(raiz,'resultados-formulario.js'),'utf8');
const logoCtx={};
vm.runInNewContext(fs.readFileSync(path.join(raiz,'logos-base64.js'),'utf8').replace(/export const /g,'var '),logoCtx);
vm.runInNewContext(fs.readFileSync(path.join(raiz,'pdf-header.js'),'utf8').replace(/^import .*$/m,'').replace(/export function /g,'function '),logoCtx);
const def={titulo:'Verificación del formulario con todos sus campos',campos:F.empaquetar([F.campo('texto','Nombre de prueba'),F.campo('sino','¿Requiere transporte?'),F.campo('sino','Atendido',{uso:'panel'}),...Array.from({length:37},(_,i)=>F.campo(i%4===0?'parrafo':'texto','Pregunta de prueba '+(i+4)))])};
const seleccion=Array.from({length:27},(_,i)=>({creado_en:Date.now(),valores:Object.fromEntries(F.claves.map((k,j)=>[k,j===1?(i%2?'No':'Sí'):j===2?(i%3?'Sí':'No'):'Registro '+(i+1)+' · Respuesta '+(j+1)]))}));
const pdfBody=codigo.match(/function pdf\(\)\{([\s\S]*?)\n\}/)[1].replace("doc.save(nombreArchivo('pdf'));",'return doc;');
const fn=new Function('def','seleccion','F','jspdf','dibujarHeaderPDF','dibujarFooterPDF','window','descripcionFiltros','nombreArchivo',pdfBody);
const doc=fn(def,seleccion,F,{jsPDF},logoCtx.dibujarHeaderPDF,logoCtx.dibujarFooterPDF,{jspdf:{jsPDF}},()=> 'Sin filtros',()=> '');
fs.writeFileSync(path.join(scratch,'verificacion.pdf'),Buffer.from(doc.output('arraybuffer')));
console.log('PDF: 27 registros, 40 campos, '+doc.internal.getNumberOfPages()+' páginas.');
(async()=>{
  const r=await fetch('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');if(!r.ok)throw new Error('No se pudo cargar JSZip.');
  const zipPath=path.join(scratch,'jszip.cjs');fs.writeFileSync(zipPath,await r.text());const JSZip=require(zipPath);
  const excelBody=codigo.match(/async function excel\(\)\{([\s\S]*?)\n\}/)[1];let salida;
  const xf=new Function('def','seleccion','F','XLSX','JSZip','window','descripcionFiltros','nombreArchivo','descargar','return (async()=>{'+excelBody+'})();');
  await xf(def,seleccion,F,XLSX,JSZip,{XLSX,JSZip},()=> 'Sin filtros',()=> '',blob=>salida=blob);
  const array=await salida.arrayBuffer();fs.writeFileSync(path.join(scratch,'verificacion.xlsx'),Buffer.from(array));
  const zip=await JSZip.loadAsync(array),xml=await zip.file('xl/worksheets/sheet1.xml').async('string');
  const wb=XLSX.read(array,{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets.Respuestas,{header:1});
  if(rows.length!==30||rows.slice(2).some(r=>r.length!==41)||!xml.includes('ySplit="3"'))throw new Error('Exportación descuadrada o sin congelado.');
  if(rows.at(-1)[1]!=='Registro 27 · Respuesta 1')throw new Error('Falta el último registro en el Excel.');
  console.log('Excel: 27 registros completos, 41 columnas, filtros y tres filas congeladas.');console.log('ARTEFACTOS '+scratch);
})().catch(err=>{console.error('Falló verificación: '+err.message);process.exitCode=1;});
