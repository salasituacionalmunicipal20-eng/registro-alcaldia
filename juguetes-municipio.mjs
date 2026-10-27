import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, get, onValue, push, runTransaction } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { edadEn, rangoEdad, registrarMovimiento } from './juguetes-core.mjs';

// Se reutiliza la configuración pública del cliente que usa la Sala Situacional.
const htmlConfig = await fetch('admin.html', { cache: 'no-cache' }).then(r => {
  if (!r.ok) throw new Error('No se pudo cargar la configuración del sistema.');
  return r.text();
}).catch(error => {
  document.getElementById('estado').textContent = error.message;
  throw error;
});
const bloqueConfig = htmlConfig.match(/const firebaseConfig\s*=\s*\{([\s\S]*?)\}/);
if (!bloqueConfig) throw new Error('No se encontró la configuración del sistema.');
const config = Object.fromEntries([...bloqueConfig[1].matchAll(/(\w+):\s*["']([^"']+)["']/g)].map(x => [x[1], x[2]]));
const app = initializeApp(config), auth = getAuth(app), db = getDatabase(app);
const $ = id => document.getElementById(id);
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ordenar = (a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
const unico = lista => [...new Set(lista.filter(Boolean))].sort(ordenar);
const limpio = v => String(v ?? '').trim();
const hoyMunicipio = () => {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Caracas', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date()).map(p => [p.type, p.value]));
  return new Date(Number(partes.year), Number(partes.month) - 1, Number(partes.day), 12);
};
const lugar = x => [x.calle, x.numero_casa ? 'Casa ' + x.numero_casa : ''].filter(Boolean).join(', ') || 'Sin dirección';
const nombre = x => [x.nombre, x.apellido].filter(Boolean).join(' ') || 'Sin nombre';
const opciones = (select, valores, primera) => {
  const actual = select.value;
  select.innerHTML = '<option value="">' + escape(primera) + '</option>' + valores.map(v => '<option value="' + escape(v) + '">' + escape(v) + '</option>').join('');
  if (valores.includes(actual)) select.value = actual;
};
const vacio = (n, texto) => '<tr><td class="vacio" colspan="' + n + '">' + escape(texto) + '</td></tr>';
let habitantes = [], territorios = {}, datos = {}, usuario = null, seleccion = null;

function comunasDisponibles() {
  return unico([...Object.keys(territorios), ...habitantes.map(x => limpio(x.comuna))]);
}
function comunidadesDisponibles(comuna) {
  const catalogo = comuna ? Object.values(territorios[comuna] || {}) : Object.values(territorios).flatMap(x => Object.values(x || {}));
  return unico([...catalogo.filter(x => typeof x === 'string'), ...habitantes.filter(x => !comuna || limpio(x.comuna) === comuna).map(x => limpio(x.comunidad))]);
}
function actualizarTerritorios() {
  const f = $('form-movimiento');
  opciones($('f-comuna'), comunasDisponibles(), 'Todas');
  opciones($('e-comuna'), comunasDisponibles(), 'Todas');
  opciones(f.elements.comuna, comunasDisponibles(), 'Selecciona');
  opciones($('f-comunidad'), comunidadesDisponibles($('f-comuna').value), 'Todas');
  opciones($('e-comunidad'), comunidadesDisponibles($('e-comuna').value), 'Todas');
  opciones(f.elements.comunidad, comunidadesDisponibles(f.elements.comuna.value), 'Selecciona');
}
function edadPersona(x) { return edadEn(x.fecha_nacimiento, hoyMunicipio()); }
function renderNinos() {
  const hoy = hoyMunicipio();
  const personas = habitantes.map(x => ({...x, edadCalculada: edadEn(x.fecha_nacimiento, hoy)}));
  const ninos = personas.filter(x => rangoEdad(x.edadCalculada));
  $('total-ninos').textContent = ninos.length;
  $('total-ninas').textContent = ninos.filter(x => limpio(x.sexo).toLowerCase() === 'femenino').length;
  $('total-ninos-sexo').textContent = ninos.filter(x => limpio(x.sexo).toLowerCase() === 'masculino').length;
  $('total-fechas').textContent = personas.filter(x => x.edadCalculada === null).length;
  const buscar = limpio($('f-buscar').value).toLocaleLowerCase('es');
  const filtrados = personas.filter(x => {
    const e = $('f-edad').value, sexo = limpio(x.sexo).toLowerCase();
    if (e === 'revision' ? x.edadCalculada !== null : !rangoEdad(x.edadCalculada) || (e && rangoEdad(x.edadCalculada) !== e)) return false;
    return (!$('f-comuna').value || limpio(x.comuna) === $('f-comuna').value) &&
      (!$('f-comunidad').value || limpio(x.comunidad) === $('f-comunidad').value) &&
      (!$('f-sexo').value || ($('f-sexo').value === 'otro' ? !['femenino','masculino'].includes(sexo) : sexo === $('f-sexo').value)) &&
      (!buscar || nombre(x).toLocaleLowerCase('es').includes(buscar));
  }).sort((a,b) => ordenar(a.comuna,b.comuna) || ordenar(a.comunidad,b.comunidad) || ordenar(nombre(a),nombre(b)));
  $('conteo-lista').textContent = filtrados.length + ' registros en la selección' + ($('f-edad').value === 'revision' ? ' · No se conoce su edad: pueden ser niños o adultos.' : '.');
  $('lista-ninos').innerHTML = filtrados.map(x => {
    const asignacion = datos.asignaciones?.[x.id] || {};
    const edad = x.edadCalculada === null ? 'Fecha por revisar' : x.edadCalculada + ' años · ' + rangoEdad(x.edadCalculada);
    return '<tr><td>' + escape(nombre(x)) + '</td><td>' + escape(limpio(x.sexo) || 'Sin especificar') + '<small>' + escape(edad) + '</small></td><td>' + escape(x.comuna || 'Sin comuna') + '<small>' + escape(x.comunidad || 'Sin comunidad') + '</small></td><td>' + escape(lugar(x)) + '</td><td>' + (asignacion.cantidad ? escape(asignacion.cantidad) + ' · ' + escape(asignacion.descripcion || 'Sin descripción') : 'Sin asignar') + '</td><td>' + (x.edadCalculada !== null ? '<button type="button" data-regalo="' + escape(x.id) + '">Registrar</button>' : '') + '</td></tr>';
  }).join('') || vacio(6, 'No hay registros con estos filtros.');
  const resumen = new Map();
  for (const x of filtrados) {
    const rango = rangoEdad(x.edadCalculada) || 'Fecha por revisar';
    const sexo = limpio(x.sexo) || 'Sin especificar';
    const clave = JSON.stringify([x.comuna || '',x.comunidad || '',sexo,rango]);
    const fila = resumen.get(clave) || {comuna:x.comuna || 'Sin comuna',comunidad:x.comunidad || 'Sin comunidad',sexo,rango,ninos:0,juguetes:0};
    fila.ninos++; fila.juguetes += Number(datos.asignaciones?.[x.id]?.cantidad || 0); resumen.set(clave,fila);
  }
  $('resumen-ninos').innerHTML = [...resumen.values()].map(x => '<tr><td>' + escape(x.comuna) + '<small>' + escape(x.comunidad) + '</small></td><td>' + escape(x.sexo) + '</td><td>' + escape(x.rango) + '</td><td>' + x.ninos + '</td><td>' + x.juguetes + '</td></tr>').join('') || vacio(5, 'No hay datos para resumir.');
  return filtrados;
}
function renderInventario() {
  const items = Object.entries(datos.inventario || {}).sort((a,b) => ordenar(a[0],b[0]));
  $('lista-existencias').innerHTML = items.map(([codigo,x]) => '<tr><td>' + escape(codigo) + '</td><td>' + escape(x.descripcion) + '</td><td>' + escape(x.caja || 0) + '</td><td>' + escape(x.unidad || 0) + '</td></tr>').join('') || vacio(4, 'Aún no hay juguetes registrados.');
}
function renderMovimientos() {
  const items = Object.values(datos.movimientos || {}).sort((a,b) => ordenar(b.fecha,a.fecha));
  $('lista-movimientos').innerHTML = items.map(x => '<tr><td>' + escape(new Date(x.fecha).toLocaleString('es-VE',{timeZone:'America/Caracas'})) + '<small>' + (x.tipo === 'salida' ? 'Salida' : 'Recepción') + '</small></td><td>' + escape(x.codigo) + '<small>' + escape(x.descripcion) + '</small></td><td>' + escape(x.cantidad) + ' ' + escape(x.presentacion) + (x.cantidad === 1 ? '' : 's') + '</td><td>' + escape(x.comuna || '—') + '<small>' + escape(x.comunidad || '') + '</small></td><td>Responsable: ' + escape(x.responsable) + ' · ' + escape(x.telefono_responsable) + '<small>Dueño: ' + escape(x.dueno) + ' · ' + escape(x.telefono_dueno) + '</small></td></tr>').join('') || vacio(5, 'Aún no hay movimientos.');
  const mapa = new Map();
  for (const x of items.filter(x => x.tipo === 'salida' && (!$('e-comuna').value || x.comuna === $('e-comuna').value) && (!$('e-comunidad').value || x.comunidad === $('e-comunidad').value))) {
    const clave = JSON.stringify([x.comuna,x.comunidad,x.codigo,x.presentacion]);
    const actual = mapa.get(clave) || { ...x, cantidad: 0 };
    actual.cantidad += Number(x.cantidad); mapa.set(clave, actual);
  }
  const resumen = [...mapa.values()].sort((a,b) => ordenar(a.comuna,b.comuna) || ordenar(a.comunidad,b.comunidad) || ordenar(a.descripcion,b.descripcion));
  $('lista-entregas').innerHTML = resumen.map(x => '<tr><td>' + escape(x.comuna) + '<small>' + escape(x.comunidad) + '</small></td><td>' + escape(x.codigo) + '<small>' + escape(x.descripcion) + '</small></td><td>' + escape(x.cantidad) + ' ' + escape(x.presentacion) + (x.cantidad === 1 ? '' : 's') + '</td></tr>').join('') || vacio(3, 'No hay entregas para esta selección.');
  return resumen;
}
function render() { renderNinos(); renderInventario(); renderMovimientos(); }

document.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-vista]').forEach(x => x.classList.toggle('activa', x === b));
  document.querySelectorAll('.vista').forEach(x => x.hidden = x.id !== 'vista-' + b.dataset.vista);
}));
for (const id of ['f-sexo','f-edad','f-buscar','f-comunidad']) $(id).addEventListener('input', renderNinos);
for (const prefijo of ['f','e']) {
  $(prefijo + '-comuna').addEventListener('change', () => { opciones($(prefijo + '-comunidad'), comunidadesDisponibles($(prefijo + '-comuna').value), 'Todas'); render(); });
}
$('e-comunidad').addEventListener('change', renderMovimientos);
const formMovimiento = $('form-movimiento');
formMovimiento.elements.comuna.addEventListener('change', () => opciones(formMovimiento.elements.comunidad, comunidadesDisponibles(formMovimiento.elements.comuna.value), 'Selecciona'));
formMovimiento.elements.tipo.addEventListener('change', () => {
  const salida = formMovimiento.elements.tipo.value === 'salida';
  formMovimiento.elements.comuna.required = salida; formMovimiento.elements.comunidad.required = salida;
});
formMovimiento.elements.codigo.addEventListener('input', () => {
  const x = datos.inventario?.[limpio(formMovimiento.elements.codigo.value).toUpperCase()];
  if (x) formMovimiento.elements.descripcion.value = x.descripcion;
});
formMovimiento.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.currentTarget, boton = f.querySelector('[type=submit]');
  const v = Object.fromEntries(new FormData(f).entries());
  const movimiento = {id:push(ref(db,'juguetes_municipio/movimientos')).key, tipo:v.tipo, codigo:limpio(v.codigo).toUpperCase(), descripcion:limpio(v.descripcion), cantidad:Number(v.cantidad), presentacion:v.presentacion, comuna:v.tipo === 'salida' ? limpio(v.comuna) : '', comunidad:v.tipo === 'salida' ? limpio(v.comunidad) : '', responsable:limpio(v.responsable), telefono_responsable:limpio(v.telefono_responsable), dueno:limpio(v.dueno), telefono_dueno:limpio(v.telefono_dueno), fecha:new Date().toISOString(), usuario:usuario.uid};
  let error = ''; boton.disabled = true; $('mensaje-movimiento').textContent = 'Guardando…';
  try {
    const resultado = await runTransaction(ref(db,'juguetes_municipio'), actual => {
      const r = registrarMovimiento(actual, movimiento); error = r.error || ''; return r.estado;
    }, {applyLocally:false});
    if (!resultado.committed) throw new Error(error || 'No fue posible guardar el movimiento.');
    f.reset(); formMovimiento.elements.tipo.dispatchEvent(new Event('change')); actualizarTerritorios(); $('mensaje-movimiento').textContent = 'Movimiento guardado correctamente.';
  } catch (err) { $('mensaje-movimiento').textContent = err.message || 'No fue posible guardar el movimiento.'; }
  finally { boton.disabled = false; }
});
$('lista-ninos').addEventListener('click', e => {
  const id = e.target.closest('[data-regalo]')?.dataset.regalo; if (!id) return;
  seleccion = habitantes.find(x => x.id === id); if (!seleccion) return;
  const a = datos.asignaciones?.[id] || {}; $('nombre-regalo').textContent = nombre(seleccion);
  $('form-regalo').elements.cantidad.value = a.cantidad || 0; $('form-regalo').elements.descripcion.value = a.descripcion || '';
  $('mensaje-regalo').textContent = ''; $('dialogo-regalo').showModal();
});
$('cerrar-regalo').addEventListener('click', () => $('dialogo-regalo').close());
$('form-regalo').addEventListener('submit', async e => {
  e.preventDefault(); const f=e.currentTarget, cantidad=Number(f.elements.cantidad.value), descripcion=limpio(f.elements.descripcion.value);
  if (!seleccion || !rangoEdad(edadPersona(seleccion)) || !Number.isSafeInteger(cantidad) || cantidad < 0 || cantidad > 1000 || (cantidad > 0 && !descripcion)) { $('mensaje-regalo').textContent = 'Indica una cantidad válida y la descripción del regalo.'; return; }
  const btn=f.querySelector('[type=submit]');btn.disabled=true;
  try {
    const asignacion = {cantidad, descripcion, fecha:new Date().toISOString(), usuario:usuario.uid};
    await runTransaction(ref(db,'juguetes_municipio'), actual => {
      const next = structuredClone(actual || {}); next.asignaciones ||= {}; next.asignaciones[seleccion.id] = asignacion; return next;
    }, {applyLocally:false});
    $('dialogo-regalo').close();
  } catch (err) { $('mensaje-regalo').textContent = 'No se pudo guardar la asignación: ' + err.message; }
  finally {btn.disabled=false;}
});
function descargarCSV(nombreArchivo,filas) {
  const csv = v => { let s=String(v ?? ''); if (/^[\s]*[=+@\-]/.test(s)) s="'"+s; return '"' + s.replace(/"/g,'""') + '"'; };
  const url=URL.createObjectURL(new Blob(['\ufeff'+filas.map(f=>f.map(csv).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const enlace=document.createElement('a');enlace.href=url;enlace.download=nombreArchivo;enlace.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('descargar').addEventListener('click', () => {
  const filas=[['Nombre','Sexo','Edad','Rango de edad','Comuna','Comunidad','Dirección','Cantidad prevista','Regalo previsto']];
  for (const x of renderNinos()) { const a=datos.asignaciones?.[x.id] || {}; filas.push([nombre(x),x.sexo,x.edadCalculada ?? 'Por revisar',rangoEdad(x.edadCalculada),x.comuna,x.comunidad,lugar(x),a.cantidad ?? '',a.descripcion ?? '']); }
  descargarCSV('juguetes-ninos-seleccion.csv',filas);
});
$('descargar-entregas').addEventListener('click', () => {
  const filas=[['Comuna','Comunidad','Código','Descripción','Cantidad entregada','Presentación']];
  for (const x of renderMovimientos()) filas.push([x.comuna,x.comunidad,x.codigo,x.descripcion,x.cantidad,x.presentacion]);
  descargarCSV('juguetes-entregas-comunidades.csv',filas);
});
onAuthStateChanged(auth, async u => {
  if (!u) { location.href='index.html'; return; }
  try {
    const perfil = u.email === 'carlos.admin@alcaldia.com' ? true : (await get(ref(db,'operadores/'+u.uid))).val()?.rol === 'admin';
    if (!perfil) { location.href='index.html'; return; }
    usuario = u;
    const [h,t] = await Promise.all([get(ref(db,'habitantes')),get(ref(db,'filtros_territoriales'))]);
    habitantes = Object.entries(h.val() || {}).map(([id,x]) => ({...x,id})); territorios=t.val() || {};
    actualizarTerritorios();
    onValue(ref(db,'juguetes_municipio'), snap => {datos=snap.val() || {};render();$('estado').hidden=true;$('aplicacion').hidden=false;}, err => {$('estado').hidden=false;$('estado').textContent='No se pudo cargar el sistema: '+err.message;});
  } catch (err) { $('estado').textContent='No se pudieron cargar los datos. '+err.message; }
});
