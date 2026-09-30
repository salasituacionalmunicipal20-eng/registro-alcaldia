/* Genera una sola vez las reglas comunes. Los futuros formularios usan su definición
   para validar campos y permisos, sin desplegar reglas nuevas desde el navegador. */
const fs = require('node:fs');
const path = require('node:path');
const F = require('../formularios-core.js');
const ruta = path.join(__dirname, '..', 'firebase-rules.json');
const reglas = JSON.parse(fs.readFileSync(ruta, 'utf8'));
const superadmin = "auth != null && auth.token.email === 'carlos.admin@alcaldia.com'";
const admin = "auth != null && (auth.token.email === 'carlos.admin@alcaldia.com' || root.child('operadores').child(auth.uid).child('rol').val() === 'admin')";
const base = "root.child('formularios_definiciones').child($form)";
const schema = base + ".child('campos').child($campo)";
const atributos = Object.keys(F.vacio());
const inmutable = "!root.child('formularios_respuestas').child($form).exists() || (" + atributos.map(k => `newData.child('${k}').val() === data.child('${k}').val()`).join(' && ') + ')';
const tipos = "newData.val().matches(/^(vacio|texto|parrafo|cedula|nombre|telefono|correo|fecha|numero|lista|sino|parroquia|comuna|comunidad|nacionalidad)$/)";
reglas.rules.formularios_definiciones = {
  '.read': admin,
  '$form': {
    '.read': `${admin} || (data.child('publicado').val() === true && (data.child('acceso').val() === 'publico' || (${admin})))`,
    '.write': `${superadmin} && newData.exists() && $form.matches(/^[a-z0-9-]{3,60}$/)`,
    '.validate': "newData.hasChildren(['titulo','descripcion','campos','publicado','activo','acceso','lectura','mensaje','creado_en','actualizado_en'])",
    titulo: { '.validate': 'newData.isString() && newData.val().length > 0 && newData.val().length <= 120' },
    descripcion: { '.validate': 'newData.isString() && newData.val().length <= 1500' },
    mensaje: { '.validate': 'newData.isString() && newData.val().length > 0 && newData.val().length <= 300' },
    publicado: { '.validate': 'newData.val() === true' }, activo: { '.validate': 'newData.isBoolean()' },
    acceso: { '.validate': "newData.val() === 'publico' || newData.val() === 'administradores'" },
    lectura: { '.validate': "newData.val() === 'carlos' || newData.val() === 'administradores'" },
    creado_en: { '.validate': 'newData.isNumber() && ((!data.exists() && newData.val() === now) || newData.val() === data.val())' },
    actualizado_en: { '.validate': 'newData.isNumber() && newData.val() === now' },
    campos: {
      '.validate': 'newData.hasChildren(' + JSON.stringify(F.claves) + ')',
      '$campo': {
        '.validate': `$campo.matches(/^c(0[1-9]|[1-3][0-9]|40)$/) && newData.hasChildren(${JSON.stringify(atributos)}) && (${inmutable})`,
        tipo: { '.validate': 'newData.isString() && '+tipos },
        etiqueta: { '.validate': "newData.isString() && newData.val().length <= 100 && (newData.parent().child('tipo').val() === 'vacio' || newData.val().length > 0)" },
        ayuda: { '.validate': 'newData.isString() && newData.val().length <= 300' },
        seccion: { '.validate': 'newData.isString() && newData.val().length <= 100' },
        rol: { '.validate': "newData.isString() && (newData.val() === '' || newData.val().matches(/^(nacionalidad|cedula|primer_nombre|segundo_nombre|primer_apellido|segundo_apellido|parroquia|comuna|comunidad)$/))" },
        obligatorio: { '.validate': 'newData.isBoolean()' }, filtro: { '.validate': 'newData.isBoolean()' },
        uso: { '.validate': "newData.val() === 'formulario' || (newData.val() === 'panel' && newData.parent().child('tipo').val() === 'sino' && newData.parent().child('obligatorio').val() === false)" },
        opciones: { '.validate': "newData.isString() && newData.val().length <= 3032 && newData.val().beginsWith('|') && newData.val().endsWith('|')" },
        minimo: { '.validate': 'newData.isNumber() && newData.val() >= -1000000000000 && newData.val() <= 1000000000000' },
        maximo: { '.validate': "newData.isNumber() && newData.val() >= newData.parent().child('minimo').val() && newData.val() <= 1000000000000" },
        '$otro': { '.validate': false }
      }
    }, '$otro': { '.validate': false }
  }
};
const tipo = schema + ".child('tipo').val()";
const str = 'newData.isString() && newData.val().length <= 300';
const variantes = [
  `(${tipo} === 'numero' && newData.isNumber() && newData.val() >= ${schema}.child('minimo').val() && newData.val() <= ${schema}.child('maximo').val())`,
  `(${tipo} === 'parrafo' && newData.isString() && newData.val().length <= 3000)`,
  `(${tipo} === 'sino' && (newData.val() === 'Sí' || newData.val() === 'No'))`,
  `(${tipo} === 'nacionalidad' && (newData.val() === 'V' || newData.val() === 'E'))`,
  `(${tipo} === 'lista' && ${str} && !newData.val().contains('|') && ${schema}.child('opciones').val().contains('|' + newData.val() + '|'))`,
  `(${tipo} === 'cedula' && newData.isString() && newData.val().matches(/^[0-9]{5,10}$/))`,
  `(${tipo} === 'telefono' && newData.isString() && newData.val().matches(/^[+0-9 ()-]{7,25}$/))`,
  `(${tipo} === 'correo' && ${str} && newData.val().matches(/^[^ @]+@[^ @]+[.][^ @]+$/))`,
  `(${tipo} === 'fecha' && newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/))`,
  `(${tipo} !== 'vacio' && ${tipo}.matches(/^(texto|nombre|parroquia|comuna|comunidad)$/) && ${str})`
];
reglas.rules.formularios_respuestas = {
  '$form': {
    '.read': `${superadmin} || (${admin} && ${base}.child('lectura').val() === 'administradores')`,
    '.indexOn': ['creado_en'],
    '$registro': {
      '.write': `!data.exists() && newData.exists() && $registro.matches(/^[A-Za-z0-9_-]{20}$/) && ${base}.child('publicado').val() === true && ${base}.child('activo').val() === true && (${base}.child('acceso').val() === 'publico' || (${admin}))`,
      '.validate': "newData.hasChildren(['creado_en','valores','version'])",
      creado_en: { '.validate': 'newData.isNumber() && newData.val() === now' },
      version: { '.validate': 'newData.val() === 1' },
      valores: {
        // Las 40 posiciones existen incluso cuando no se utilizan. Así no puede omitirse
        // un campo obligatorio evitando la validación de una ruta hija ausente.
        '.validate': 'newData.hasChildren('+JSON.stringify(F.claves)+')',
        '$campo': { '.validate': `$campo.matches(/^c(0[1-9]|[1-3][0-9]|40)$/) && ((newData.val() === '' && (${tipo} === 'vacio' || ${schema}.child('obligatorio').val() === false)) || (${schema}.child('uso').val() !== 'panel' && (newData.isNumber() || (newData.isString() && newData.val().length > 0)) && (${variantes.join(' || ')})))` }
      }, '$otro': { '.validate': false }
    }
  }
};
reglas.rules.formularios_seguimiento = {
  '$form': {
    '.read': `${superadmin} || (${admin} && ${base}.child('lectura').val() === 'administradores')`,
    '$registro': {
      '$campo': {
        '.write': `(${superadmin} || (${admin} && ${base}.child('lectura').val() === 'administradores')) && root.child('formularios_respuestas').child($form).child($registro).exists() && ${schema}.child('tipo').val() === 'sino' && ${schema}.child('uso').val() === 'panel' && newData.exists()`,
        '.validate': "newData.hasChildren(['valor','actualizado_en','por'])",
        valor: { '.validate': "newData.val() === '' || newData.val() === 'Sí' || newData.val() === 'No'" },
        actualizado_en: { '.validate': 'newData.isNumber() && newData.val() === now' },
        por: { '.validate': 'auth != null && newData.val() === auth.uid' },
        '$otro': { '.validate': false }
      }
    }
  }
};
fs.writeFileSync(ruta, JSON.stringify(reglas, null, 2)+'\n');
console.log('Reglas comunes preparadas: definiciones y respuestas, 40 campos con validación dinámica.');
