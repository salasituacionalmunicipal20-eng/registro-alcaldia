import assert from 'node:assert/strict';
import { edadEn, resumirRegistro, sumarFilas, CONFLICTO } from '../1x10-seguimiento-datos.mjs';
const corte = '2026-09-30';
assert.equal(edadEn('2011-09-30',corte),15);
assert.equal(edadEn('2011-10-01',corte),14);
assert.equal(edadEn('1991-09-30',corte),35);
assert.equal(edadEn('1990-09-30',corte),36);
assert.equal(edadEn('2000-02-29',corte),26);
assert.equal(edadEn('2001-02-29',corte),null);
assert.equal(edadEn('2027-01-01',corte),null);
assert.equal(edadEn('1990-09-30','2026-02-30'),null);
const jefes = {
  '90000001': {cedula:'90000001', circuito:'Comuna A',centro_electoral:'Centro A',fecha_nacimiento:'1990-09-30'},
  '90000002': {cedula:'90000002', circuito:'Comuna B',centro_electoral:'Centro B'}
};
const afines = {
  '90000001': {
    '90000002':{cedula:'90000002'}, // También es jefe: su ubicación propia prevalece.
    '90000003':{cedula:'90000003',fecha_nacimiento:'1991-09-30'},
    '90000004':{cedula:'90000004',fecha_nacimiento:'2011-09-30'},
    '90000005':{cedula:'90000005',fecha_nacimiento:'2011-10-01'},
    '-idCon123peroSinCedula':{},
    '90000006':{cedula:'90000006',fecha_nacimiento:'2001-02-29'}
  },
  '90000002': {
    '90000003':{cedula:'90000003',fecha_nacimiento:'1992-09-30'}, // Conflicto de ubicación y fecha.
    '90000007':{cedula:'E-90000007',fecha_nacimiento:'1990-09-30'}
  },
  'jefe-no-registrado':{'90000008':{cedula:'90000008'}}
};
const cargas = {a:{comuna:'Comuna A',centro:'Centro A',jovenes:3,adultos:2,menores:1,sinEdad:4},invalida:{comuna:'A',centro:'B',jovenes:-1,adultos:0,menores:0,sinEdad:0}};
const resultado = resumirRegistro(jefes,afines,{},corte,cargas);
assert.deepEqual(resultado.diagnostico,{relaciones:11,personas:8,duplicados:2,sinIdentidad:1,huerfanos:1,ubicacionesEnConflicto:1,fechasEnConflicto:1,cargasInvalidas:1});
const totales = sumarFilas(resultado.filas);
assert.equal(totales.base,8); assert.equal(totales.adicionales,10); assert.equal(totales.total,18);
assert.equal(totales.jovenes+totales.adultos+totales.menores+totales.sinEdad,totales.total);
assert.equal(resultado.filas.find(f=>f.comuna===CONFLICTO).total,1);
assert.equal(resultado.filas.find(f=>f.comuna==='Comuna B').base,2);
const nacionalidades=resumirRegistro({'90000009':{cedula:'90000009'}},{'90000009':{otro:{cedula:'E-90000009'}}},{},corte);
assert.equal(nacionalidades.diagnostico.personas,2);
assert.equal(sumarFilas(resumirRegistro({}, {}, {}, corte).filas).total,0);
const variantes=resumirRegistro({'90000010':{cedula:'90000010',circuito:'comuna   Á',centro_electoral:'Centro BÁSICO'}},{'90000010':{'90000011':{cedula:'90000011',comuna:'COMUNA A',centro_electoral:'CENTRO BASICO'}}},{a:{circuito_comunal:'COMUNA A',centro_electoral:'CENTRO BÁSICO'}},corte);
assert.equal(variantes.filas.length,1); assert.equal(variantes.filas[0].total,2);
console.log('Verificado: límites de edad, fechas inválidas, cédulas únicas, nacionalidades, conflictos, afines sin jefe y cargas adicionales.');
