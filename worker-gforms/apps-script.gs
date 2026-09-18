/**
 * @OnlyCurrentDoc
 *
 * Conexión de ESTE formulario de Google con la Sala Situacional de la
 * Alcaldía de Cristóbal Rojas (salasituacional.alcaldiadecharallave.com).
 *
 * Qué hace:
 *   · Cada vez que alguien envía el formulario, manda esa respuesta a la
 *     Sala Situacional (tablero en vivo).
 *   · Una vez por hora manda todo otra vez: las preguntas, todas las
 *     respuestas y la lista de las que siguen en Google. Así, si una se
 *     perdió o se editó o se borró aquí, el tablero se pone al día solo.
 *
 * Por "@OnlyCurrentDoc", este programa solo puede ver ESTE formulario: no ve
 * el resto de la cuenta de Google (ni el correo, ni el Drive).
 *
 * Instalación (una sola vez):
 *   1. Configuración del proyecto → Propiedades del script → agregar
 *      CLAVE_FIRMA con la clave que da el administrador de sistemas. La clave
 *      NO se escribe en este código.
 *   2. Elegir la función "instalar" arriba y tocar Ejecutar; aceptar permisos.
 *
 * Copia de referencia: worker-gforms/apps-script.gs en el repositorio de la
 * Sala Situacional. Si se cambia aquí, cambiarlo también allá.
 */

const DESTINO = 'https://formularios-google.alcaldiadecharallave.com/recibir';
const LOTE = 200;

/** Se corre UNA vez, a mano, desde el editor. Deja los dos disparadores y sincroniza. */
function instalar() {
  const form = FormApp.getActiveForm();
  if (!clave_()) throw new Error('Falta la propiedad CLAVE_FIRMA (Configuración del proyecto → Propiedades del script).');
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('alEnviar').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('sincronizarTodo').timeBased().everyHours(1).create();
  sincronizarTodo();
  console.log('Listo: cada respuesta nueva se manda al llegar, y todo se revisa cada hora.');
}

/** Disparador: alguien envió el formulario. */
function alEnviar(e) {
  try {
    enviar_({ tipo: 'respuestas', respuestas: [convertir_(e.response)] });
  } catch (err) {
    // No se pierde: la sincronización de cada hora la vuelve a mandar.
    console.error('No se pudo mandar la respuesta; se reintentará en la revisión de la hora. ' + err.message);
  }
}

/** Disparador de cada hora (y parte de instalar): manda todo. */
function sincronizarTodo() {
  const form = FormApp.getActiveForm();
  // La lista de vigentes vale hasta un minuto antes de pedirla: una respuesta
  // que llegue después se sigue mostrando aunque no esté en esta lista.
  const hasta = Date.now() - 60 * 1000;
  enviar_(estructura_(form));
  const respuestas = form.getResponses();
  for (let i = 0; i < respuestas.length; i += LOTE) {
    enviar_({ tipo: 'respuestas', respuestas: respuestas.slice(i, i + LOTE).map(convertir_) });
  }
  enviar_({ tipo: 'vigentes', ids: respuestas.map(function (r) { return r.getId(); }), hasta: hasta });
  console.log('Sincronizadas ' + respuestas.length + ' respuesta(s).');
}

// ------------------------------------------------------------------ ayudas

function clave_() {
  return PropertiesService.getScriptProperties().getProperty('CLAVE_FIRMA');
}

function enviar_(datos) {
  datos.form_id = FormApp.getActiveForm().getId();
  const cuerpo = JSON.stringify(datos);
  const momento = String(Date.now());
  const firma = Utilities.computeHmacSha256Signature(momento + '.' + cuerpo, clave_(), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  const r = UrlFetchApp.fetch(DESTINO, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    payload: cuerpo,
    headers: { 'X-Momento': momento, 'X-Firma': firma },
    muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) {
    throw new Error('La Sala Situacional respondió ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  }
}

function texto_(x) { return x === null || x === undefined ? '' : String(x); }

function convertir_(resp) {
  const v = {};
  resp.getItemResponses().forEach(function (ir) {
    const x = ir.getResponse();
    if (x === null || x === undefined || x === '') return;
    v[String(ir.getItem().getId())] = Array.isArray(x)
      ? x.map(function (y) { return Array.isArray(y) ? y.map(texto_) : texto_(y); })
      : texto_(x);
  });
  const r = { id: resp.getId(), enviada: resp.getTimestamp().getTime(), v: v };
  const correo = resp.getRespondentEmail();
  if (correo) r.correo = correo;
  return r;
}

const COMO_ = {
  TEXT: 'asTextItem', PARAGRAPH_TEXT: 'asParagraphTextItem', MULTIPLE_CHOICE: 'asMultipleChoiceItem',
  CHECKBOX: 'asCheckboxItem', LIST: 'asListItem', SCALE: 'asScaleItem', GRID: 'asGridItem',
  CHECKBOX_GRID: 'asCheckboxGridItem', DATE: 'asDateItem', DATETIME: 'asDateTimeItem', TIME: 'asTimeItem',
  DURATION: 'asDurationItem', RATING: 'asRatingItem'
};
const CONOCIDOS_ = ['TEXT', 'PARAGRAPH_TEXT', 'MULTIPLE_CHOICE', 'CHECKBOX', 'LIST', 'SCALE', 'GRID', 'CHECKBOX_GRID',
  'DATE', 'DATETIME', 'TIME', 'DURATION', 'FILE_UPLOAD', 'RATING', 'PAGE_BREAK', 'SECTION_HEADER', 'IMAGE', 'VIDEO'];

function estructura_(form) {
  const preguntas = form.getItems().map(function (item) {
    const tipo = String(item.getType());
    const p = { id: String(item.getId()), titulo: item.getTitle() || '', tipo: CONOCIDOS_.indexOf(tipo) >= 0 ? tipo : 'OTRO' };
    const ayuda = item.getHelpText();
    if (ayuda) p.ayuda = ayuda;
    let q = null;
    try { q = COMO_[tipo] ? item[COMO_[tipo]]() : null; } catch (e) { q = null; }
    if (q) {
      try { p.obligatoria = q.isRequired(); } catch (e) { /* algunos tipos no lo tienen */ }
      if (tipo === 'MULTIPLE_CHOICE' || tipo === 'CHECKBOX' || tipo === 'LIST') {
        p.opciones = q.getChoices().map(function (c) { return c.getValue(); });
        if (tipo !== 'LIST' && q.hasOtherOption()) p.otro = true;
      }
      if (tipo === 'SCALE') p.escala = { min: q.getLowerBound(), max: q.getUpperBound(), izq: q.getLeftLabel() || '', der: q.getRightLabel() || '' };
      if (tipo === 'GRID' || tipo === 'CHECKBOX_GRID') { p.filas = q.getRows(); p.columnas = q.getColumns(); }
    }
    return p;
  });
  return { tipo: 'estructura', titulo: form.getTitle(), descripcion: form.getDescription() || '', preguntas: preguntas };
}
