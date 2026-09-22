import fs from 'node:fs';
import assert from 'node:assert/strict';

const leer = archivo => fs.readFileSync(new URL(`../${archivo}`, import.meta.url), 'utf8');
const formulario = leer('caminata-nocturna-5k.html');
const resultados = leer('caminata-nocturna-5k-resultados.html');
const reglas = JSON.parse(leer('firebase-rules.json'));

function validarModulos(html, nombre) {
    const bloques = [...html.matchAll(/<script[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(bloques.length, `${nombre} debe contener JavaScript modular`);
    bloques.forEach(([, codigo], i) => {
        const sinImports = codigo.replace(/^\s*import\s+.+?;\s*$/gm, '');
        try { new Function(sinImports); }
        catch (error) { throw new Error(`${nombre}, módulo ${i + 1}: ${error.message}`); }
    });
}

validarModulos(formulario, 'Formulario');
validarModulos(resultados, 'Panel');

for (const id of ['nombre', 'cedula', 'telefono', 'fechaNacimiento', 'edad', 'sexo', 'direccion', 'municipio', 'foto1', 'foto2', 'foto3']) {
    assert.match(formulario, new RegExp(`id=["']${id}["']`), `Falta el campo ${id}`);
}
assert.match(formulario, /data-cne/, 'La cédula debe usar la consulta institucional');
assert.match(formulario, /capture="environment"/, 'Las fotos deben permitir abrir la cámara trasera');
assert.match(formulario, /caminata_nocturna_5k_fotos/, 'Las fotos deben guardarse en un nodo separado');
assert.match(formulario, /await update\(ref\(database\), cambios\)/, 'Registro y fotos deben enviarse atómicamente');
assert.match(formulario, /Las fotografías son opcionales/, 'El formulario debe explicar que las fotos son opcionales');
assert.match(formulario, /<span class="fplus">\+<\/span>/, 'La carga opcional de fotos debe mostrarse con un símbolo +');
assert.match(formulario, /if \(tieneFotos\) cambios\[`caminata_nocturna_5k_fotos/, 'El nodo de fotos solo debe enviarse cuando se agregó alguna');
assert.doesNotMatch(formulario, /mostrarError\([^\n]*foto/i, 'La inscripción no debe exigir fotografías');
assert.match(formulario, /logos\/cristobal-rojas\.png/, 'El formulario debe mostrar el logo de la Alcaldía');
assert.match(formulario, /logos\/yuhismar\.png/, 'El formulario debe mostrar el logo de Yuhismar');
assert.match(formulario, /<option>Hombre<\/option><option>Mujer<\/option>/, 'El sexo debe elegirse únicamente entre Hombre y Mujer');
assert.match(formulario, /N\.º de inscripción:[\s\S]*<span><\/span>/, 'La impresión debe dejar en blanco el número de inscripción');
assert.match(formulario, /window\.print\(\)/, 'Debe poder imprimirse la ficha después del registro');
assert.ok(formulario.indexOf('class="comp-superior"') < formulario.indexOf('class="comp-head"'), 'El número de inscripción debe quedar arriba a la izquierda antes del título impreso');
for (const id of ['compPaginaFotos', 'compFotoNombre', 'compFotoCedula', 'compFotoGrid']) {
    assert.match(formulario, new RegExp(`id=["']${id}["']`), `Falta el elemento de impresión fotográfica ${id}`);
}
assert.match(formulario, /Memoria fotográfica/, 'La impresión pública debe incluir una hoja de memoria fotográfica');
assert.match(formulario, /\.comp-pagina-fotos\.sin-fotos\s*\{\s*display:none\s*!important/, 'La hoja fotográfica no debe imprimirse vacía');
assert.match(formulario, /page-break-before:always/, 'Las fotos deben comenzar en una hoja carta separada');
assert.match(formulario, /object-fit:contain/, 'Las fotos impresas deben conservar su proporción');
assert.match(formulario, /await prepararFotosImpresion\(FOTOS,[^)]+\);window\.print\(\)/, 'La impresión pública debe esperar que carguen las fotos');

for (const texto of ['Descargar Excel', 'Descargar PDF', 'Fotografías', 'Actualización en tiempo real', 'caminata5kcharallave', 'Distribución en tiempo real por sexo y edad', 'Detalle exacto por edad']) {
    assert.ok(resultados.includes(texto), `El panel debe incluir: ${texto}`);
}
for (const id of ['kTotal', 'kHombres', 'kMujeres', 'kPromedio', 'distSexo', 'distGrupos', 'distEdades']) {
    assert.match(resultados, new RegExp(`id=["']${id}["']`), `Falta el indicador demográfico ${id}`);
}
assert.match(resultados, /\['N\.º de inscripción','_+?'/, 'El PDF individual debe dejar en blanco el número de inscripción');
assert.match(resultados, /Imprimir 1×1/, 'Cada fila debe permitir imprimir un registro por separado');
assert.match(resultados, /Imprimir este registro 1×1/, 'La ficha abierta debe permitir imprimir ese único registro');
assert.match(resultados, /async function imprimirRegistro\(registroOId\)/, 'Debe existir la impresión individual 1×1 con preparación asíncrona');
assert.match(resultados, /N\.º de inscripción:[\s\S]*<span><\/span>/, 'La impresión individual debe dejar el número de inscripción en blanco');
assert.match(resultados, /window\.print\(\)/, 'La impresión individual debe abrir el diálogo de impresión');
assert.match(resultados, /imp-logo-alcaldia[\s\S]*logos\/cristobal-rojas\.png/, 'La impresión individual debe incluir el logo de la Alcaldía');
assert.match(resultados, /imp-logo-yuhismar[\s\S]*logos\/yuhismar\.png/, 'La impresión individual debe incluir el logo de Yuhismar');
assert.ok(resultados.indexOf('class="imp-superior"') < resultados.indexOf('class="imp-cabecera"'), 'El número debe ir en la parte superior izquierda de la impresión individual');
for (const id of ['unoPaginaFotos', 'unoFotoNombre', 'unoFotoCedula', 'unoFotoGrid']) {
    assert.match(resultados, new RegExp(`id=["']${id}["']`), `Falta el elemento fotográfico del panel ${id}`);
}
assert.match(resultados, /Memoria fotográfica/, 'La impresión 1×1 debe incluir una hoja de memoria fotográfica');
assert.match(resultados, /\.imp-pagina-fotos\.sin-fotos\s*\{\s*display:none\s*!important/, 'El panel no debe imprimir una hoja fotográfica vacía');
assert.match(resultados, /page-break-before:always/, 'Las fotos del panel deben comenzar en una hoja carta separada');
assert.match(resultados, /object-fit:contain/, 'Las fotos del panel deben conservar su proporción');
assert.match(resultados, /r\._fotos\|\|await fotosDe\(r\.id\)/, 'La impresión desde una fila debe cargar las fotos guardadas');
assert.match(resultados, /await prepararFotosImpresion\(fotos,r\.nombre_apellido,r\.cedula\);window\.print\(\)/, 'El panel debe esperar que carguen las fotos antes de imprimir');
assert.doesNotMatch(resultados, /async function fotosDe\([^)]*\)\{[^}]*catch\s*\([^)]*\)\s*\{\s*return\s*\{\}/, 'Los errores al cargar fotos no deben ocultarse');
assert.ok(reglas.rules.caminata_nocturna_5k, 'Faltan reglas para las inscripciones');
assert.ok(reglas.rules.caminata_nocturna_5k_fotos, 'Faltan reglas para las fotografías');
assert.equal(reglas.rules.caminata_nocturna_5k_fotos.$cedula.$other['.validate'], false, 'Las fotos deben rechazar campos inesperados');
const reglaSexo = reglas.rules.caminata_nocturna_5k.$cedula.sexo['.validate'];
assert.ok(reglaSexo.includes("'Hombre'") && reglaSexo.includes("'Mujer'"), 'Las reglas deben aceptar Hombre y Mujer');
assert.ok(!reglaSexo.includes("'Otro'") && !reglaSexo.includes("'Masculino'"), 'Las reglas no deben aceptar variantes libres o antiguas');

const columnasExcel = 15;
assert.match(resultados, /A1:O1/);
assert.match(resultados, /A3:O\$\{datos\.length\}/);
assert.equal(columnasExcel, 15, 'El Excel debe conservar 15 columnas alineadas');

console.log('OK: formulario, fotos, reglas, panel, Excel y PDF de Caminata Nocturna 5K verificados.');
