/* Lógica del tablero de formularios de Google (formularios-google.html).
   Va aparte para poder probarla sin navegador (pruebas/formularios-google.mjs).
   No toca la base ni la pantalla: recibe datos y devuelve datos.

   Regla de la casa (CLAUDE.md, trampas 10.10 y 10.11): al agrupar respuestas
   escritas a mano solo se unen las que son LITERALMENTE lo mismo (mayúsculas,
   tildes, espacios). Nunca se adivina ni se corrige un dato, y el tablero
   muestra qué se contó y cómo, para que se pueda revisar. */
(function (raiz) {
  'use strict';

  const SIN_RESPUESTA = ['SECTION_HEADER', 'PAGE_BREAK', 'IMAGE', 'VIDEO'];
  const DE_OPCIONES = ['MULTIPLE_CHOICE', 'LIST', 'CHECKBOX', 'SCALE', 'RATING'];

  /** Clave para agrupar: sin tildes, en mayúsculas y con los espacios limpios. */
  function normalizar(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toUpperCase().replace(/\s+/g, ' ').trim();
  }

  /** Lo que alguien escribió para decir "no" o "nada" en una pregunta abierta. */
  const NEGATIVAS = new Set(['', 'NO', 'N0', 'NINGUNA', 'NINGUNO', 'NINGUN', 'N/A', 'NA', 'NO APLICA', 'NO TIENE',
    'NO POSEE', 'NADA', 'NO PADECE', 'NINGUNA ENFERMEDAD', 'NINGUNA DISCAPACIDAD', 'NO TOMA', 'NO ESTA', '-', '--', '.', '0']);
  function esNegativa(v) {
    return NEGATIVAS.has(normalizar(v).replace(/[.,;:!¡¿?]+$/g, '').trim());
  }

  /** Respuestas que siguen en Google. Las que llegaron después de la última
      lista completa también cuentan (la lista se arma cada hora). */
  function vigentes(datos) {
    const res = (datos && datos.respuestas) || {};
    const vig = (datos && datos.vigentes) || null;
    const hasta = Number(datos && datos.meta && datos.meta.vigentes_hasta) || 0;
    return Object.keys(res)
      .filter(function (id) { return !hasta || (vig && vig[id]) || Number(res[id].enviada) > hasta; })
      .map(function (id) { return { id: id, enviada: Number(res[id].enviada) || 0, v: res[id].v || {}, correo: res[id].correo || '' }; })
      .sort(function (a, b) { return b.enviada - a.enviada; });
  }

  function preguntasConRespuesta(estructura) {
    const orden = (estructura && estructura.orden) || [];
    const p = (estructura && estructura.preguntas) || {};
    return orden.filter(function (id) { return p[id] && SIN_RESPUESTA.indexOf(p[id].tipo) < 0; })
      .map(function (id) { return Object.assign({ id: id }, p[id]); });
  }

  /** Un valor como texto para la tabla, el Excel y el PDF. */
  function comoTexto(v, pregunta) {
    if (v == null || v === '') return '';
    if (Array.isArray(v)) {
      if (pregunta && (pregunta.tipo === 'GRID' || pregunta.tipo === 'CHECKBOX_GRID')) {
        const filas = pregunta.filas || [];
        return v.map(function (x, i) {
          const t = Array.isArray(x) ? x.filter(Boolean).join(', ') : (x || '');
          return t ? (filas[i] || ('Fila ' + (i + 1))) + ': ' + t : '';
        }).filter(Boolean).join(' · ');
      }
      return v.filter(function (x) { return x !== '' && x != null; }).join(', ');
    }
    if (pregunta && pregunta.tipo === 'DATE' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const p = String(v).split('-'); return p[2] + '/' + p[1] + '/' + p[0];
    }
    return String(v);
  }

  /** Cuenta las respuestas de una pregunta. Para las de opciones: una fila por
      opción (en el orden del formulario) + lo escrito en "Otro". Para las
      abiertas: los valores iguales agrupados, de más a menos. */
  function resumen(pregunta, lista) {
    const valores = lista.map(function (r) { return r.v[pregunta.id]; });
    const respondieron = valores.filter(function (x) { return x != null && x !== '' && !(Array.isArray(x) && !x.filter(Boolean).length); }).length;
    const salida = { id: pregunta.id, titulo: pregunta.titulo, tipo: pregunta.tipo, total: lista.length, respondieron: respondieron, filas: [], otros: [] };

    if (DE_OPCIONES.indexOf(pregunta.tipo) >= 0) {
      const opciones = (pregunta.opciones || []).filter(function (o) { return o !== ''; });
      if (pregunta.tipo === 'SCALE' && pregunta.escala && !opciones.length) {
        for (let n = pregunta.escala.min; n <= pregunta.escala.max; n++) opciones.push(String(n));
      }
      const cuenta = new Map(opciones.map(function (o) { return [o, 0]; }));
      const otros = new Map();
      valores.forEach(function (x) {
        const lista2 = Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]);
        lista2.forEach(function (y) {
          if (y === '' || y == null) return;
          if (cuenta.has(y)) cuenta.set(y, cuenta.get(y) + 1);
          else otros.set(y, (otros.get(y) || 0) + 1);
        });
      });
      salida.filas = opciones.map(function (o) { return { valor: o, cantidad: cuenta.get(o) }; });
      const nOtros = Array.from(otros.values()).reduce(function (a, b) { return a + b; }, 0);
      if (nOtros) salida.filas.push({ valor: 'Otra respuesta', cantidad: nOtros, esOtro: true });
      salida.otros = Array.from(otros.entries()).map(function (e) { return { valor: e[0], cantidad: e[1] }; })
        .sort(function (a, b) { return b.cantidad - a.cantidad || a.valor.localeCompare(b.valor); });
      salida.deOpciones = true;
      return salida;
    }

    // Abierta: se agrupan solo los valores iguales (mayúsculas, tildes, espacios).
    const grupos = new Map();
    valores.forEach(function (x) {
      const t = comoTexto(x, pregunta);
      if (!t) return;
      const k = normalizar(t);
      if (!grupos.has(k)) grupos.set(k, { valor: t, cantidad: 0, variantes: new Set() });
      const g = grupos.get(k); g.cantidad++; g.variantes.add(t);
    });
    salida.filas = Array.from(grupos.values())
      .map(function (g) { return { valor: g.valor, cantidad: g.cantidad, variantes: Array.from(g.variantes) }; })
      .sort(function (a, b) { return b.cantidad - a.cantidad || a.valor.localeCompare(b.valor); });
    salida.distintos = salida.filas.length;
    // Si casi todo es número (edad, cantidad…), también mínimo, máximo, promedio y suma.
    const nums = valores.map(numeroDe).filter(function (n) { return n != null; });
    if (respondieron && nums.length >= Math.max(1, respondieron * 0.8)) {
      const suma = nums.reduce(function (a, b) { return a + b; }, 0);
      salida.numeros = { cuantos: nums.length, min: Math.min.apply(null, nums), max: Math.max.apply(null, nums),
        promedio: Math.round((suma / nums.length) * 10) / 10, suma: suma };
    }
    return salida;
  }

  /** El número que hay en un texto ("45", "45 AÑOS", "2 cilindros"); null si no hay uno solo claro. */
  function numeroDe(x) {
    if (x == null || Array.isArray(x)) return null;
    const m = String(x).trim().match(/^(\d{1,4})(?:[.,](\d+))?(?:\s*[A-Za-zÁÉÍÓÚáéíóúñÑ.]*)?$/);
    return m ? Number(m[1] + (m[2] ? '.' + m[2] : '')) : null;
  }

  /** Edad en años cumplidos a una fecha, desde "AAAA-MM-DD". */
  function edadDesdeFecha(iso, hoy) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    const h = hoy || new Date();
    let e = h.getFullYear() - Number(m[1]);
    if (h.getMonth() + 1 < Number(m[2]) || (h.getMonth() + 1 === Number(m[2]) && h.getDate() < Number(m[3]))) e--;
    return e >= 0 && e < 130 ? e : null;
  }

  const GRUPOS_EDAD = [
    { clave: 'ninos', nombre: 'Niños (0 a 11)', min: 0, max: 11 },
    { clave: 'adolescentes', nombre: 'Adolescentes (12 a 17)', min: 12, max: 17 },
    { clave: 'adultos', nombre: 'Adultos (18 a 59)', min: 18, max: 59 },
    { clave: 'mayores', nombre: 'Adultos mayores (60 o más)', min: 60, max: 200 }
  ];

  /** Encuentra una pregunta por palabras de su título (así sigue funcionando si
      cambia su número interno, pero no si le cambian el sentido). */
  function buscar(preguntas, patron) {
    return preguntas.find(function (p) { return patron.test(normalizar(p.titulo)); }) || null;
  }

  /** Resumen de la comunidad para formularios de caracterización (como el de la
      Comuna Terraza de Hugo Chávez). Devuelve null si el formulario no es de ese tipo. */
  function perfilCaracterizacion(preguntas, lista, hoy) {
    const P = {
      vivienda: buscar(preguntas, /CASA\/TORRE\/RANCHO|VIVIENDA/),
      jefe: buscar(preguntas, /JEFE DE FAMILIA/),
      sexo: buscar(preguntas, /^SEXO\b/),
      edad: buscar(preguntas, /^EDAD\b/),
      nacimiento: buscar(preguntas, /FECHA DE NACIMIENTO/),
      discapacidad: buscar(preguntas, /PADECE ALGUNA DISCAPACIDAD/),
      carnetDisc: buscar(preguntas, /CARNET DE DISCAPACIDAD/),
      embarazada: buscar(preguntas, /EMBARAZADA/),
      lactante: buscar(preguntas, /^LACTANTE\b/),
      enfermedad: buscar(preguntas, /PADECE ALGUNA ENFERMEDAD/),
      medicamento: buscar(preguntas, /TOMA ALGUN MEDICAMENTO/),
      patria: buscar(preguntas, /CARNET DE LA PATRIA/),
      gas: buscar(preguntas, /CILINDRO DE GAS/),
      cilindros: buscar(preguntas, /CANTIDAD DE CILINDROS/),
      voto: buscar(preguntas, /CLASIFICACION DEL VOTO/),
      centro: buscar(preguntas, /CENTRO DE VOTACION/)
    };
    const hallados = Object.keys(P).filter(function (k) { return P[k]; }).length;
    if (!P.jefe || !P.sexo || hallados < 6) return null;

    const val = function (r, p) { return p ? r.v[p.id] : undefined; };
    const distintos = function (p) {
      const s = new Set();
      lista.forEach(function (r) { const t = normalizar(comoTexto(val(r, p))); if (t) s.add(t); });
      return s.size;
    };
    const conTexto = function (p) {
      // Personas que escribieron algo que no es "no/ninguna"; y qué escribieron.
      const detalle = new Map(); let n = 0;
      if (p) lista.forEach(function (r) {
        const t = comoTexto(val(r, p));
        if (!t || esNegativa(t)) return;
        n++; const k = normalizar(t);
        if (!detalle.has(k)) detalle.set(k, { valor: t, cantidad: 0 });
        detalle.get(k).cantidad++;
      });
      return { cantidad: n, detalle: Array.from(detalle.values()).sort(function (a, b) { return b.cantidad - a.cantidad; }), pregunta: p ? p.titulo : null };
    };
    const iguala = function (p, valor) {
      if (!p) return null;
      return lista.filter(function (r) { return normalizar(val(r, p)) === normalizar(valor); }).length;
    };

    // Edad: la que escribieron; si no, la calculada con la fecha de nacimiento.
    const grupos = GRUPOS_EDAD.map(function (g) { return Object.assign({ cantidad: 0 }, g); });
    let sinEdad = 0, desdeFecha = 0;
    lista.forEach(function (r) {
      let e = numeroDe(val(r, P.edad));
      if (e == null || e > 130) {
        e = edadDesdeFecha(val(r, P.nacimiento), hoy);
        if (e != null) desdeFecha++;
      }
      if (e == null) { sinEdad++; return; }
      const g = grupos.find(function (x) { return e >= x.min && e <= x.max; });
      if (g) g.cantidad++; else sinEdad++;
    });

    const sexo = P.sexo ? resumen(P.sexo, lista).filas : [];
    let cilindros = null;
    if (P.cilindros) {
      const nums = lista.map(function (r) { return numeroDe(val(r, P.cilindros)); }).filter(function (n) { return n != null; });
      cilindros = { total: nums.reduce(function (a, b) { return a + b; }, 0), respondieron: nums.length };
    }
    return {
      personas: lista.length,
      familias: P.jefe ? distintos(P.jefe) : null,
      viviendas: P.vivienda ? distintos(P.vivienda) : null,
      sexo: sexo,
      edades: { grupos: grupos, sinEdad: sinEdad, desdeFecha: desdeFecha },
      discapacidad: conTexto(P.discapacidad),
      carnetDiscapacidad: iguala(P.carnetDisc, 'SI'),
      embarazadas: conTexto(P.embarazada),
      lactantes: iguala(P.lactante, 'SI'),
      enfermedad: conTexto(P.enfermedad),
      medicamento: conTexto(P.medicamento),
      carnetPatria: iguala(P.patria, 'SI'),
      gas: P.gas ? resumen(P.gas, lista).filas : null,
      cilindros: cilindros,
      voto: P.voto ? resumen(P.voto, lista).filas : null,
      preguntas: P
    };
  }

  /** Busca un texto en todas las respuestas de una persona. */
  function coincide(r, preguntas, q) {
    if (!q) return true;
    const t = normalizar(q);
    return preguntas.some(function (p) { return normalizar(comoTexto(r.v[p.id], p)).indexOf(t) >= 0; });
  }

  /** ¿La respuesta tiene ese valor en esa pregunta? (para filtrar tocando un gráfico). */
  function tieneValor(r, pregunta, valor, conocidas) {
    const x = r.v[pregunta.id];
    const lista2 = Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]);
    if (valor === 'Otra respuesta') return lista2.some(function (y) { return y && conocidas.indexOf(y) < 0; });
    return lista2.indexOf(valor) >= 0;
  }

  /** Día en formato AAAA-MM-DD, en la hora del teléfono o la computadora. */
  function diaLocal(ms) {
    const d = new Date(ms), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /** Columnas del Excel: todas las preguntas, en el orden del formulario. Encabezados,
      filas y anchos salen de la MISMA lista, para que nunca se descuadren (trampa 10.1). */
  function tablaExcel(preguntas, lista) {
    const cols = [{ titulo: 'N°', ancho: 6, de: function (r, i) { return i + 1; } },
      { titulo: 'Fecha y hora de envío', ancho: 20, de: function (r) { return fechaHora(r.enviada); } }]
      .concat(preguntas.map(function (p) {
        return { titulo: p.titulo, ancho: Math.min(45, Math.max(14, Math.round(p.titulo.length * 0.55))), de: function (r) { return comoTexto(r.v[p.id], p); } };
      }));
    return {
      encabezados: cols.map(function (c) { return c.titulo; }),
      anchos: cols.map(function (c) { return c.ancho; }),
      filas: lista.map(function (r, i) { return cols.map(function (c) { return c.de(r, i); }); })
    };
  }

  function fechaHora(ms) {
    if (!ms) return '';
    const d = new Date(ms), p = function (n) { return String(n).padStart(2, '0'); };
    let h = d.getHours(); const ap = h >= 12 ? 'p. m.' : 'a. m.'; h = h % 12 || 12;
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + h + ':' + p(d.getMinutes()) + ' ' + ap;
  }

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  /** "sábado 19 de septiembre de 2026 · 19/09/2026" (convención de los documentos). */
  function fechaLarga(ms) {
    const d = new Date(ms), p = function (n) { return String(n).padStart(2, '0'); };
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear() +
      ' · ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  /** "hace 3 minutos", "hace 2 horas"… para decir cuándo se revisó Google. */
  function haceCuanto(ms, ahora) {
    const s = Math.max(0, Math.round(((ahora || Date.now()) - ms) / 1000));
    if (s < 60) return 'hace menos de un minuto';
    const m = Math.round(s / 60); if (m < 60) return 'hace ' + m + (m === 1 ? ' minuto' : ' minutos');
    const h = Math.round(m / 60); if (h < 48) return 'hace ' + h + (h === 1 ? ' hora' : ' horas');
    const d = Math.round(h / 24); return 'hace ' + d + ' días';
  }

  raiz.GFormsLogica = {
    normalizar: normalizar, esNegativa: esNegativa, vigentes: vigentes, preguntasConRespuesta: preguntasConRespuesta,
    comoTexto: comoTexto, resumen: resumen, numeroDe: numeroDe, edadDesdeFecha: edadDesdeFecha,
    perfilCaracterizacion: perfilCaracterizacion, coincide: coincide, tieneValor: tieneValor, diaLocal: diaLocal,
    tablaExcel: tablaExcel, fechaHora: fechaHora, fechaLarga: fechaLarga, haceCuanto: haceCuanto, GRUPOS_EDAD: GRUPOS_EDAD
  };
})(typeof window !== 'undefined' ? window : globalThis);
