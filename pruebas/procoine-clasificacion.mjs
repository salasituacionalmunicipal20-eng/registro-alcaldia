/* PRUEBAS DE LA CLASIFICACIÓN DE PROCOINE (grado, edad, planteles)
   ================================================================
   Carga el archivo REAL procoine-clasificacion.js (el mismo que usa la página).

       node pruebas/procoine-clasificacion.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../procoine-clasificacion.js');

let ok = 0, mal = 0;
const fallos = [];
const prueba = (n, cond, det = '') => {
    if (cond) { ok++; console.log('  OK    ' + n); } else { mal++; fallos.push(n + '  ' + det); console.log('  FALLA ' + n + '   ' + det); }
};
const seccion = (t) => console.log('\n--- ' + t + ' ---');
const grado = (t) => C.clasificarGrado(t).clave;

console.log('='.repeat(64));
console.log('PROCOINE: CLASIFICACIÓN');
console.log('='.repeat(64));

seccion('Grado: las mil formas de escribir lo mismo');
for (const t of ['1ER AÑO', '1er Año', '1° AÑO', '1 año', '1. Año', '1 ER AÑO', '1ER  AÑO']) prueba(`"${t}" es 1er año de media`, grado(t) === 'media|1', grado(t));
for (const t of ['3ER GRADO', '3er grado', '3GRADO', '3rr grado', '3er grtado', '3TO GRADO', '3CER GRADO']) prueba(`"${t}" es 3er grado de primaria`, grado(t) === 'primaria|3', grado(t));
prueba('"2D0 GRADO" (cero en vez de O) es 2do grado', grado('2D0 GRADO') === 'primaria|2', grado('2D0 GRADO'));
prueba('"4T0 GRADO" es 4to grado', grado('4T0 GRADO') === 'primaria|4', grado('4T0 GRADO'));
prueba('"5 BGRADO" es 5to grado', grado('5 BGRADO') === 'primaria|5');
for (const t of ['1ER GRUPO INICIAL', '1ER NIVEL', 'I NIVEL INICIAL', 'INICIAL I GRUPO', '1er Nivel De Inicial', '1ER NIVEL PREES'])
    prueba(`"${t}" es 1er grupo de inicial`, grado(t) === 'inicial|1', grado(t));
prueba('"INICIAL III GRUPO" es 3er grupo', grado('INICIAL III GRUPO') === 'inicial|3');
prueba('"II GRUPO" es 2do grupo', grado('II GRUPO') === 'inicial|2');
prueba('"PREESCOLAR" sin número queda como inicial sin grupo', grado('PREESCOLAR') === 'inicial|sin_numero');
prueba('"NO ESCOLARIZADO" tiene su propia categoría', grado('NO ESCOLARIZADO') === 'no_escolarizado');
prueba('"ESPECIAL" es educación especial', grado('ESPECIAL') === 'especial');

seccion('Grado: lo que NO se adivina');
for (const t of ['TEL', 'ESTO', 'ECER'])
    prueba(`"${t}" queda sin clasificar`, C.clasificarGrado(t).nivel === 'sin_clasificar', grado(t));
prueba('"4 Años" (una edad, sin aclarar) no es un grado', C.clasificarGrado('4 Años').nivel === 'sin_clasificar');
prueba('otro texto con dos números ("1ER o 2° GRADO") sigue sin clasificar', C.clasificarGrado('1ER o 2° GRADO').nivel === 'sin_clasificar');
prueba('"8VO AÑO" no existe en media: sin clasificar', C.clasificarGrado('8VO AÑO').nivel === 'sin_clasificar');

seccion('Grado: lo que aclaró el usuario (15/09/2026)');
prueba('"1ER ALO" es 1er año (aclarado)', grado('1ER ALO') === 'media|1', grado('1ER ALO'));
prueba('"9no" es 9no grado, en media, sin convertirlo a año', grado('9no') === 'media|9g' && C.nombreGrado('media|9g') === '9no grado (sistema anterior)', grado('9no'));
prueba('"7MO GRADO" y "8vo" son grados del sistema anterior', grado('7MO GRADO') === 'media|7g' && grado('8vo') === 'media|8g');
prueba('"5TO" y "5 Años" son 5to año (aclarado)', grado('5TO') === 'media|5' && grado('5 Años') === 'media|5', grado('5TO') + ' ' + grado('5 Años'));
prueba('"ECER AÑO" es 3er año (aclarado)', grado('ECER AÑO') === 'media|3', grado('ECER AÑO'));
prueba('"3ER o 4°G GRADO" va en primaria, en su propia fila, sin escoger uno', grado('3ER o 4°G GRADO') === 'primaria|3o4' &&
    C.nombreGrado('primaria|3o4') === '3er o 4to grado (lo escribieron así)', grado('3ER o 4°G GRADO'));
prueba('"TEL" se deja sin clasificar (el usuario no sabe qué es)', C.clasificarGrado('TEL').nivel === 'sin_clasificar');
prueba('la fila "3er o 4to grado" se ordena después del 3er grado y antes del 4to', (() => { const c = C.clasificar([{ est_grado: '4TO GRADO' }, { est_grado: '3ER o 4°G GRADO' }, { est_grado: '3ER o 4°G GRADO' }, { est_grado: '3ER GRADO' }]); return c.porGrado.map(g => g.clave).join() === 'primaria|3,primaria|3o4,primaria|4'; })());
prueba('el 9no grado va después del 5to año al ordenar', (() => { const c = C.clasificar([{ est_grado: '9no' }, { est_grado: '5TO AÑO' }, { est_grado: '1ER AÑO' }]); return c.porGrado.map(g => g.clave).join() === 'media|1,media|5,media|9g'; })());
prueba('"6TO AÑO" no existe en media: sin clasificar', C.clasificarGrado('6TO AÑO').nivel === 'sin_clasificar');
prueba('vacío: "No indicó el grado"', grado('') === 'sin_clasificar|vacio' && C.nombreGrado('sin_clasificar|vacio') === 'No indicó el grado');
prueba('el nombre bonito de primaria|3 es "3er grado"', C.nombreGrado('primaria|3') === '3er grado');

seccion('Planteles: se une solo el mismo nombre');
const idx = C.indicePlanteles(['UEE CARMEN RUIZ', 'Carmen Ruiz', 'U.E.E. carmen ruiz', 'UEN TERESA DE BOLIVAR I', 'TERESA DE BOLIVAR 1',
    'UEN TERESA DE BOLIVAR GRUPO', 'GE TERESA DE BOLIVAR', 'POLICARPO', 'EBE POLICARPO FARRERA', 'CEIN CREACION CHARALLAVE',
    'UEN CREACION CHARALLAVE', 'CREACION CHARALLAVE', 'EXT / CHILE', 'CHILE', 'EXT TERESA DE BOLIVAR', 'UEP NTRA. SRA, DE COROMOTO',
    'UEP NUESTRA SENORA DE COROMOTO', 'EB DR. CARLOS AROCHA LUNA', 'CARLOS AROCHA LUNA', 'CEIE ESTE NIÑO DON SIMON', 'CEIN ESTE NIÑO DON SIMÓN', '']);
const k = (t) => idx(t).clave;
prueba('"UEE CARMEN RUIZ" = "Carmen Ruiz" = "U.E.E. carmen ruiz"', k('UEE CARMEN RUIZ') === k('Carmen Ruiz') && k('Carmen Ruiz') === k('U.E.E. carmen ruiz'));
prueba('"TERESA DE BOLIVAR I" = "TERESA DE BOLIVAR 1"', k('UEN TERESA DE BOLIVAR I') === k('TERESA DE BOLIVAR 1'));
prueba('"TERESA DE BOLIVAR I" ≠ "TERESA DE BOLIVAR GRUPO"', k('UEN TERESA DE BOLIVAR I') !== k('UEN TERESA DE BOLIVAR GRUPO'));
prueba('"GE" (Grupo Escolar) no se borra: queda aparte', k('GE TERESA DE BOLIVAR') !== k('UEN TERESA DE BOLIVAR I') && k('GE TERESA DE BOLIVAR').includes('GE TERESA'));
prueba('"POLICARPO" ≠ "POLICARPO FARRERA" (no se adivina)', k('POLICARPO') !== k('EBE POLICARPO FARRERA'));
prueba('un preescolar (CEIN) NO se une con el liceo del mismo nombre', k('CEIN CREACION CHARALLAVE') !== k('UEN CREACION CHARALLAVE'));
prueba('sin tipo, y ese nombre existe como preescolar y como liceo: queda aparte', idx('CREACION CHARALLAVE').sinTipo === true &&
    k('CREACION CHARALLAVE') !== k('UEN CREACION CHARALLAVE') && k('CREACION CHARALLAVE') !== k('CEIN CREACION CHARALLAVE'));
prueba('CEIE y CEIN son los dos preescolar: sí se unen', k('CEIE ESTE NIÑO DON SIMON') === k('CEIN ESTE NIÑO DON SIMÓN'));
prueba('"EXT / CHILE" = "CHILE" = en el exterior', k('EXT / CHILE') === 'exterior|CHILE' && k('CHILE') === 'exterior|CHILE' && idx('CHILE').etiqueta === 'En el exterior: Chile');
prueba('"EXT TERESA DE BOLIVAR" es una extensión, no el exterior', k('EXT TERESA DE BOLIVAR').includes('EXTENSION TERESA DE BOLIVAR'));
prueba('abreviaturas: "NTRA. SRA," = "NUESTRA SEÑORA"', k('UEP NTRA. SRA, DE COROMOTO') === k('UEP NUESTRA SENORA DE COROMOTO'));
prueba('el título "DR." no separa: "EB DR. CARLOS AROCHA LUNA" = "CARLOS AROCHA LUNA"', k('EB DR. CARLOS AROCHA LUNA') === k('CARLOS AROCHA LUNA'));
prueba('vacío es "vacio"', k('') === 'vacio');

seccion('Edad');
prueba('se usa la edad escrita', C.edadDe({ est_edad: 12 }).edad === 12);
const calc = C.edadDe({ est_fecha_nac: '2014-09-20', fecha_registro: Date.parse('2026-09-15T12:00:00') });
prueba('sin edad, se calcula de la fecha de nacimiento al día que se inscribió (cumple el 20: tiene 11)', calc.edad === 11 && calc.calculada, JSON.stringify(calc));
prueba('sin edad ni fecha: no se inventa', C.edadDe({}).edad === null);
prueba('rangos: 6 es primaria, 12 es media, 5 es inicial', C.rangoDe(6).clave === '6-11' && C.rangoDe(12).clave === '12-17' && C.rangoDe(5).clave === '3-5');

seccion('Contar');
const regs = [
    { est_grado: '1ER AÑO', est_edad: 12, est_institucion_estudia: 'UEE CARMEN RUIZ', est_institucion_requiere: 'UEN CREACION CHARALLAVE', est_institucion_requiere_2: 'UENB CREACIÓN CHARALLAVE' },
    { est_grado: '1er año', est_edad: 11, est_institucion_estudia: 'Carmen Ruiz', est_institucion_requiere: 'EBE POLICARPO FARRERA', est_institucion_requiere_2: 'UEN CREACION CHARALLAVE' },
    { est_grado: '3er grado', est_edad: 8, est_institucion_estudia: 'CHILE', est_institucion_requiere: 'POLICARPO FARRERA' },
    { est_grado: 'TEL', est_institucion_estudia: '' }
];
const c = C.clasificar(regs, Date.now());
const g1 = c.porGrado.find(g => g.clave === 'media|1');
prueba('1er año cuenta 2, con edades de 11 a 12 y promedio 11,5', g1 && g1.total === 2 && g1.edadMin === 11 && g1.edadMax === 12 && g1.edadPromedio === 11.5, JSON.stringify(g1 && { t: g1.total, a: g1.edadMin, b: g1.edadMax, p: g1.edadPromedio }));
prueba('y guarda las dos formas en que lo escribieron', g1 && g1.variantes.length === 2);
prueba('niveles: 1 primaria, 2 media, 1 sin clasificar', JSON.stringify(c.niveles.map(n => [n.clave, n.total])) === JSON.stringify([['primaria', 1], ['media', 2], ['sin_clasificar', 1]]), JSON.stringify(c.niveles));
prueba('sin edad: 1', c.sinEdad === 1);
const creacion = c.porCupo.find(g => g.nombre.includes('CREACION CHARALLAVE'));
prueba('la misma escuela en dos opciones del mismo estudiante cuenta UNA vez', creacion && creacion.total === 2, JSON.stringify(creacion && creacion.total));
prueba('"1ª opción" cuenta solo la primera', creacion && creacion.primera === 1);
const policarpo = c.porCupo.find(g => g.nombre.includes('POLICARPO'));
prueba('"EBE POLICARPO FARRERA" y "POLICARPO FARRERA" suman juntas: 2', policarpo && policarpo.total === 2);
prueba('colegio: "UEE CARMEN RUIZ" suma 2 y el nombre es la forma más usada', c.porEstudia[0].total === 2 && /CARMEN RUIZ/i.test(c.porEstudia[0].nombre));
prueba('el exterior se nombra como tal', c.porEstudia.some(g => g.nombre === 'En el exterior: Chile'));
prueba('"no indicó" va al final de la lista de colegios', c.porEstudia[c.porEstudia.length - 1].clave === 'vacio');
const suma = c.porGrado.reduce((a, g) => a + g.total, 0);
prueba('la suma por grado da el total', suma === c.total);
prueba('la suma por rango de edad da el total', c.porRango.reduce((a, r) => a + r.total, 0) === c.total);
prueba('la suma por colegio da el total', c.porEstudia.reduce((a, r) => a + r.total, 0) === c.total);

console.log('\n' + '='.repeat(64));
if (mal) { console.log(`FALLARON ${mal} de ${ok + mal}`); fallos.forEach(f => console.log('   - ' + f)); process.exit(1); }
console.log(`Pasaron las ${ok} pruebas de la clasificación.`);
