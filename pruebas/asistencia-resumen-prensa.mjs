import assert from 'node:assert/strict';import {resumirAsistenciaPrensa,textoAsistenciaPrensa} from '../1x10-asistencia-resumen.mjs';
const personas=[{id:'uno',comuna:'A',comunidad:'Centro',centro:'Escuela 1'},{id:'uno',comuna:'A',comunidad:'Centro',centro:'Escuela 1'},{id:'dos',comuna:'A',comunidad:'Centro',centro:'Escuela 2'},{id:'tres',comuna:'B',comunidad:'Centro',centro:'Escuela 1'},{id:'cuatro'},{nombre:'Sin identidad'}];
let r=resumirAsistenciaPrensa(personas,{uno:{estado:'asistio'},dos:{estado:'no_asistio'},tres:{estado:'asistio'},huérfano:{estado:'asistio'}});
assert.deepEqual(r.total,{total:4,asistio:2,no_asistio:1,pendiente:1});assert.equal(r.marcajesSinRegistro,1);assert.equal(r.comunidades.length,3);
for(const tipo of ['comunas','comunidades','centros']){assert.equal(r[tipo].reduce((s,g)=>s+g.total,0),4);assert.equal(r[tipo].reduce((s,g)=>s+g.asistio,0),2);}
assert.equal(r.centros.find(x=>x.centro==='Escuela 1').asistio,2);
const t=textoAsistenciaPrensa(r,'18/10/2026','12:00');assert.ok(t.includes('POR CENTRO ELECTORAL'));assert.ok(!t.includes('Sin identidad'));assert.ok(!t.includes('huérfano'));
r=resumirAsistenciaPrensa(personas,{uno:{estado:'no_asistio'}});assert.equal(r.total.asistio,0);assert.equal(r.total.no_asistio,1);
assert.equal(resumirAsistenciaPrensa([],{}).total.total,0);console.log('Resumen de prensa verificado: personas únicas, totales conciliados, comunidades homónimas, cambios de estado y salida sin datos personales.');
