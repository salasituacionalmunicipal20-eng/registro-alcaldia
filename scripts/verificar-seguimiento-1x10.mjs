import assert from 'node:assert/strict';
import { edadEn, resumirRegistro, sumarFilas, agruparComunidades, SISTEMAS_1X10 } from '../1x10-seguimiento-datos.mjs';
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
assert.equal(totales.base,11); assert.equal(totales.adicionales,10); assert.equal(totales.total,21);
assert.equal(totales.jovenes+totales.adultos+totales.menores+totales.sinEdad,totales.total);
assert.equal(resultado.filas.find(f=>f.comuna==='Sin comuna asignada').base,1);
assert.equal(resultado.filas.find(f=>f.comuna==='Comuna B').base,3);
const nacionalidades=resumirRegistro({'90000009':{cedula:'90000009'}},{'90000009':{otro:{cedula:'E-90000009'}}},{},corte);
assert.equal(nacionalidades.diagnostico.personas,2);
assert.equal(sumarFilas(resumirRegistro({}, {}, {}, corte).filas).total,0);
const variantes=resumirRegistro({'90000010':{cedula:'90000010',circuito:'comuna   Á',centro_electoral:'Centro BÁSICO'}},{'90000010':{'90000011':{cedula:'90000011',comuna:'COMUNA A',centro_electoral:'CENTRO BASICO'}}},{a:{circuito_comunal:'COMUNA A',centro_electoral:'CENTRO BÁSICO'}},corte);
assert.equal(variantes.filas.length,1); assert.equal(variantes.filas[0].total,2);
console.log('Verificado: límites de edad, fechas inválidas, cédulas únicas, nacionalidades, conflictos, afines sin jefe y cargas adicionales.');

// La misma cédula debe conservar cada registro y la ubicación de su variante.
const sistemas = SISTEMAS_1X10.map((sufijo,i) => ({
  jefes: {'90000001': {cedula:'90000001',comuna:'Comuna '+i,centro_electoral:'Centro '+i}},
  afines: {'90000001': {'90000002': {cedula:'90000002'},sinCedula:{}}}
}));
const completo = resumirRegistro({}, {}, {}, corte, cargas, sistemas);
const sumaCompleta = sumarFilas(completo.filas);
assert.equal(sumaCompleta.base,21);
assert.equal(sumaCompleta.adicionales,10);
assert.equal(sumaCompleta.total,31);
assert.equal(completo.diagnostico.personas,2);
assert.equal(completo.diagnostico.sinIdentidad,7);
assert.equal(completo.diagnostico.duplicados,12);
assert.equal(sumaCompleta.sinEdad,25);
for (let i=0;i<7;i++) assert.equal(completo.filas.find(f=>f.comuna==='Comuna '+i).base,3);
console.log('Verificado: siete variantes, claves repetidas, registros sin cédula y coherencia del total y desgloses.');
// Los nombres confirmados se agrupan también en las cargas adicionales.
const bicentenario='CENTRO DE EDUCACION INICIAL MUNICIPAL BICENTENARIO 5 DE JULIO DE 1811';
for (const [a,b,oficial] of [
  ['IMPERIAL','LA IMPERIAL','LA IMPERIAL'],
  ['ARAÑEROS DE SABANETA','SOCIALISTA EL ARAÑERO DE SABANETA EJE LA MATA','COMUNA SOCIALISTA ARAÑERO DE SABANETA'],
  ['INDIO CHARAVARE','INDIOS CHARAVARES','INDIO CHARAVARE'],
  ['8VA ESTRELLA EL SEUÑO DE BOLIVAR','OCTAVA ESTRELLA SUEÑOS DE BOLIVAR','OCTAVA ESTRELLA SUEÑOS DE BOLIVAR'],
  ['EZEQUIEL ZAMORA TIERRA DE HOMBRES Y MUJERES LIBRES','EZEQUIEL ZAMORA TIERRA DE MUJERES Y HOMBRES LIBRES','EZEQUIEL ZAMORA TIERRA DE HOMBRES Y MUJERES LIBRES'],
  ['GIGANTE DE LA PATRIA','EL GIGANTE DE LA PATRIA','GIGANTE DE LA PATRIA'],
  ['FLOR DEL ARAGUANEY','FLOR DEL ARANGUEY','FLOR DEL ARAGUANEY'],
  ['AGRARIA SOCIALISTA EL PARAISO DE CHARALLAVE','AGRARIO SOCIALISTA EL PARAISO','COMUNA AGRARIA SOCIALISTA EL PARAISO DE CHARALLAVE']
]) {
  const agrupado=resumirRegistro({}, {a:{'90000001':{comuna:a,centro_electoral:'CEIM BICENTENARIO 5 DE JULIO 1811'}},b:{'90000001':{comuna:b,centro_electoral:'CENTRO DE EDUCACIÓN INICIAL MUNICIPAL BICENTENARIO 5 DE JULIO DE 1811'}}}, {x:{circuito_comunal:b,centro_electoral:'CENTRO DE EDUCACIÓN INICIAL MUNICIPAL BICENTENARIO 5 DE JULIO DE 1811'}}, corte, {c:{comuna:b,centro:'CEIM BICENTENARIO 5 DE JULIO 1811',jovenes:1,adultos:0,menores:0,sinEdad:0}});
  assert.equal(agrupado.filas.length,1);
  assert.equal(agrupado.filas[0].comuna,oficial);
  assert.equal(agrupado.filas[0].centro,bicentenario);
  assert.equal(agrupado.filas[0].base,2);
  assert.equal(agrupado.filas[0].adicionales,1);
  assert.equal(agrupado.filas[0].total,3);
  assert.equal(agrupado.diagnostico.ubicacionesEnConflicto,0);
}
console.log('Verificado: nombres territoriales unificados, catálogo y cargas adicionales sin pérdida de registros.');
const catalogoComunidades={a:{nombre:'FLOR DEL ARAGUANEY',circuito_comunal:'LA IMPERIAL',centro_electoral:'Centro A'},b:{nombre:'Comunidad vacía',circuito_comunal:'LA IMPERIAL',centro_electoral:'Centro A'},c:{nombre:'Otra comunidad',circuito_comunal:'INDIO CHARAVARE',centro_electoral:'Centro B'}};
const territorial=resumirRegistro({}, {},catalogoComunidades,corte,cargas,[{jefes:{j:{comunidad_slug:'a'}},afines:{j:{hereda:{},propia:{comuna:'INDIOS CHARAVARES',comunidad_slug:'c'},otraComuna:{comuna:'INDIO CHARAVARE'},variante:{comuna:'IMPERIAL',comunidad_nombre:'FLOR DE ARANGUEY'},slugDesconocido:{comunidad_slug:'no-existe'}},huerfano:{sinDatos:{}}}}]);
const grupos=agruparComunidades(territorial.comunidades);
assert.equal(grupos.reduce((s,g)=>s+g.total,0),territorial.diagnostico.relaciones);
const imperial=grupos.find(g=>g.comuna==='LA IMPERIAL');assert.equal(imperial.total,4);
assert.equal(imperial.comunidades.find(c=>c.comunidad==='FLOR DEL ARAGUANEY').total,3);
assert.equal(imperial.comunidades.find(c=>c.comunidad==='Comunidad vacía').total,0);
assert.equal(imperial.comunidades.find(c=>c.comunidad==='Sin comunidad asignada').total,1);
assert.equal(grupos.find(g=>g.comuna==='INDIO CHARAVARE').comunidades.find(c=>c.comunidad==='Sin comunidad asignada').total,1);
for(const g of grupos)assert.equal(g.total,g.comunidades.reduce((s,c)=>s+c.total,0));
assert.equal(agruparComunidades(territorial.comunidades,{centro:'Centro B'}).reduce((s,g)=>s+g.total,0),territorial.filas.filter(f=>f.centro==='Centro B').reduce((s,f)=>s+f.base,0));
console.log('Verificado: comunidades completas con cero, equivalencias, herencia territorial, datos faltantes y sumas con filtros.');
