import fs from 'node:fs';import assert from 'node:assert/strict';
const {ordenarInscripciones}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../caminata-orden.js',import.meta.url),'utf8')).toString('base64'));
const datos=[{id:'ultima',fecha_registro:40,numero_inscripcion:5,despues_de:'referencia'},{id:'otra',fecha_registro:30},{id:'referencia',fecha_registro:20},{id:'anterior',fecha_registro:10}];
const antes=JSON.stringify(datos),lista=ordenarInscripciones(datos);assert.deepEqual(lista.map(r=>r.id),['otra','referencia','ultima','anterior']);assert.equal(JSON.stringify(datos),antes);assert.equal(lista[2].numero_inscripcion,5);assert.equal(lista[2].fecha_registro,40);
assert.deepEqual(ordenarInscripciones(datos.filter(r=>r.id!=='referencia')).map(r=>r.id),['ultima','otra','anterior']);
console.log('OK: queda inmediatamente después de la referencia, sin alterar fechas, números ni demás participantes.');
