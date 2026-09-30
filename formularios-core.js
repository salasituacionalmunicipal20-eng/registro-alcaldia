/* Lógica compartida del constructor, el formulario y su tablero. */
(function (raiz) {
  'use strict';
  const MAX = 40;
  const TIPOS = { texto: 'Texto corto', parrafo: 'Texto largo', cedula: 'Cédula', nombre: 'Nombre o apellido', telefono: 'Teléfono', correo: 'Correo electrónico', fecha: 'Fecha', numero: 'Número', lista: 'Lista de opciones', sino: 'Sí / No', parroquia: 'Parroquia', comuna: 'Comuna', comunidad: 'Comunidad', nacionalidad: 'Nacionalidad' };
  const claves = Array.from({ length: MAX }, (_, i) => 'c' + String(i + 1).padStart(2, '0'));
  const normalizar = v => String(v ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const escapar = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vacio = () => ({ tipo: 'vacio', etiqueta: '', ayuda: '', obligatorio: false, filtro: false, opciones: '|', seccion: '', rol: '', uso: 'formulario', minimo: -1000000000000, maximo: 1000000000000 });
  function campo(tipo, etiqueta, extra = {}) { return { ...vacio(), tipo, etiqueta, filtro: ['sino', 'lista', 'fecha', 'numero', 'parroquia', 'comuna', 'comunidad', 'nacionalidad'].includes(tipo), ...extra }; }
  const identidad = () => [campo('nacionalidad', 'Nacionalidad', { rol: 'nacionalidad', obligatorio: true }), campo('cedula', 'Cédula', { rol: 'cedula', obligatorio: true }), campo('nombre', 'Primer nombre', { rol: 'primer_nombre', obligatorio: true }), campo('nombre', 'Segundo nombre', { rol: 'segundo_nombre' }), campo('nombre', 'Primer apellido', { rol: 'primer_apellido', obligatorio: true }), campo('nombre', 'Segundo apellido', { rol: 'segundo_apellido' })];
  const territorio = () => [campo('parroquia', 'Parroquia', { rol: 'parroquia', obligatorio: true }), campo('comuna', 'Comuna', { rol: 'comuna', obligatorio: true }), campo('comunidad', 'Comunidad', { rol: 'comunidad', obligatorio: true })];
  function campos(def) { return Object.entries(def.campos || {}).filter(([, c]) => c.tipo !== 'vacio'); }
  function empaquetar(lista) { return Object.fromEntries(claves.map((id, i) => [id, lista[i] ? { ...vacio(), ...lista[i] } : vacio()])); }
  function opciones(c) { return String(c.opciones).split('|').filter(Boolean); }
  function validarDefinicion(d) {
    if (!d.titulo?.trim()) throw new Error('Escribe el nombre del formulario.');
    if (d.titulo.length > 120 || d.descripcion.length > 1500) throw new Error('Acorta el título a 120 caracteres y la descripción a 1500.');
    const cs = campos(d);
    if (!cs.length || cs.length > MAX) throw new Error('Agrega entre 1 y 40 campos.');
    const roles = new Set();
    for (const [, c] of cs) {
      if (!TIPOS[c.tipo] || !c.etiqueta.trim() || c.etiqueta.length > 100) throw new Error('Cada campo necesita un nombre de hasta 100 caracteres.');
      if (c.tipo === 'lista' && (!opciones(c).length || new Set(opciones(c)).size !== opciones(c).length)) throw new Error('La lista «' + c.etiqueta + '» necesita opciones distintas.');
      if (c.rol && roles.has(c.rol)) throw new Error('No repitas el campo de identidad o territorio «' + c.etiqueta + '».');
      if (c.rol) roles.add(c.rol);
      if (c.tipo === 'numero' && c.minimo > c.maximo) throw new Error('Revisa los límites de «' + c.etiqueta + '».');
    }
    if (roles.has('comunidad') && (!roles.has('comuna') || !roles.has('parroquia'))) throw new Error('Agrega el bloque territorial completo.');
    return d;
  }
  function validarValor(c, v) {
    if (v === '') return c.obligatorio ? 'Completa «' + c.etiqueta + '».' : '';
    if (c.tipo === 'numero') return typeof v !== 'number' || !Number.isFinite(v) || v < c.minimo || v > c.maximo ? 'Revisa el número de «' + c.etiqueta + '».' : '';
    if (typeof v !== 'string' || v.length > (c.tipo === 'parrafo' ? 3000 : 300)) return 'Revisa «' + c.etiqueta + '».';
    if (['cedula', 'telefono', 'correo', 'fecha', 'nombre'].includes(c.tipo)) {
      const reglas = { cedula: /^\d{5,10}$/, telefono: /^\+?[0-9 ()-]{7,25}$/, correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, fecha: /^\d{4}-\d{2}-\d{2}$/, nombre: /^[\p{L}\p{M} .'-]+$/u };
      if (!reglas[c.tipo].test(v)) return 'Revisa el formato de «' + c.etiqueta + '».';
      if (c.tipo === 'fecha') { const fecha = new Date(v + 'T12:00:00Z'); if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== v) return 'Escribe una fecha válida.'; }
    }
    if (c.tipo === 'sino' && !['Sí', 'No'].includes(v)) return 'Selecciona Sí o No.';
    if (c.tipo === 'nacionalidad' && !['V', 'E'].includes(v)) return 'Selecciona la nacionalidad.';
    if (c.tipo === 'lista' && !opciones(c).includes(v)) return 'Selecciona una opción de «' + c.etiqueta + '».';
    return '';
  }
  function filtrar(registros, def, filtros = {}, buscar = '', desde = '', hasta = '') {
    const q = normalizar(buscar);
    return registros.filter(r => {
      const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(r.creado_en));
      const parte = k => partes.find(p => p.type === k).value;
      const dia = parte('year') + '-' + parte('month') + '-' + parte('day');
      if (desde && dia < desde || hasta && dia > hasta) return false;
      if (q && !Object.values(r.valores).some(v => normalizar(v).includes(q))) return false;
      return Object.entries(filtros).every(([id, f]) => {
        const c = def.campos[id], v = r.valores[id] ?? '';
        if (f === '' || f == null) return true;
        if (f === '__sin_respuesta__') return v === '';
        if (typeof f === 'object') return v !== '' && (f.min === '' || f.min == null || v >= f.min) && (f.max === '' || f.max == null || v <= f.max);
        return ['texto', 'parrafo', 'nombre', 'cedula', 'telefono', 'correo'].includes(c.tipo) ? normalizar(v).includes(normalizar(f)) : String(v) === f;
      });
    });
  }
  function mostrar(c, v) { if (v === '' || v == null) return 'Sin respuesta'; return c.tipo === 'fecha' ? new Date(v + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : String(v); }
  function tabla(def, registros) { const cs = campos(def); return { encabezados: ['Fecha de registro', ...cs.map(([, c]) => c.etiqueta)], filas: registros.map(r => [new Date(r.creado_en).toLocaleString('es-VE', { timeZone: 'America/Caracas' }), ...cs.map(([id, c]) => mostrar(c, r.valores[id]))]) }; }
  raiz.Formularios = { MAX, TIPOS, claves, normalizar, escapar, vacio, campo, identidad, territorio, campos, empaquetar, opciones, validarDefinicion, validarValor, filtrar, mostrar, tabla };
  if (typeof module !== 'undefined') module.exports = raiz.Formularios;
})(typeof window !== 'undefined' ? window : globalThis);
