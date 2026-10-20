import assert from 'node:assert/strict';
import {confirmarNumeracion} from '../caminata-navidena-5k-numeracion.mjs';
import {numeroParticipante} from '../caminata-navidena-5k-datos.mjs';
const grupo=()=>[{registro:{cedula:'999991',modalidad:'Caminata'}},{clave:'menor_999991_11111111-1111-4111-8111-111111111111',registro:{cedula:'',sin_cedula:true,modalidad:'Carrera'}}];
const g=grupo();let solicitud;
await confirmarNumeracion(g,'11111111-1111-4111-8111-111111111111',async(url,opciones)=>{solicitud=JSON.parse(opciones.body);assert.equal(opciones.credentials,'omit');return Response.json({ok:true,participantes:[{id:solicitud.ids[1],modalidad:'Carrera',numero_inscripcion:2},{id:solicitud.ids[0],modalidad:'Caminata',numero_inscripcion:5}]});});
assert.equal(g[0].registro.numero_inscripcion,5);assert.equal(g[1].registro.numero_inscripcion,2);assert.equal(numeroParticipante(g[0].registro),'Caminata 5');assert.equal(numeroParticipante(g[1].registro),'Carrera 2');
assert.equal(solicitud.ids.length,2);assert(!JSON.stringify(solicitud).includes('nombre_apellido'));
for(const datos of [{ok:true,participantes:[]},{ok:true,participantes:[{id:'999991',modalidad:'Carrera',numero_inscripcion:5},{id:g[1].clave,modalidad:'Carrera',numero_inscripcion:2}]},{ok:true,participantes:[{id:'999991',modalidad:'Caminata',numero_inscripcion:0},{id:g[1].clave,modalidad:'Carrera',numero_inscripcion:2}]}]){const intento=grupo();await assert.rejects(confirmarNumeracion(intento,'prueba',async()=>Response.json(datos)));assert(intento.every(p=>p.registro.numero_inscripcion===undefined));}
await assert.rejects(confirmarNumeracion(grupo(),'prueba',async()=>new Response('',{status:503})));
assert.equal(numeroParticipante({}),'Pendiente de asignación');console.log('OK: números por modalidad, menor con clave propia, respuesta desordenada, incompleta, modalidad incorrecta, número inválido y fallo de servicio.');
