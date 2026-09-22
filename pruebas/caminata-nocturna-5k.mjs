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

for (const texto of ['Descargar Excel', 'Descargar PDF', 'Fotografías', 'Actualización en tiempo real', 'caminata5kcharallave']) {
    assert.ok(resultados.includes(texto), `El panel debe incluir: ${texto}`);
}
assert.ok(reglas.rules.caminata_nocturna_5k, 'Faltan reglas para las inscripciones');
assert.ok(reglas.rules.caminata_nocturna_5k_fotos, 'Faltan reglas para las fotografías');
assert.equal(reglas.rules.caminata_nocturna_5k_fotos.$cedula.$other['.validate'], false, 'Las fotos deben rechazar campos inesperados');

const columnasExcel = 15;
assert.match(resultados, /A1:O1/);
assert.match(resultados, /A3:O\$\{datos\.length\}/);
assert.equal(columnasExcel, 15, 'El Excel debe conservar 15 columnas alineadas');

console.log('OK: formulario, fotos, reglas, panel, Excel y PDF de Caminata Nocturna 5K verificados.');
