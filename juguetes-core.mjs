// Funciones compartidas por el panel y las pruebas. No modifican el censo.
export function edadEn(fecha, hoy = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  const edad = hoy.getFullYear() - a - (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d) ? 1 : 0);
  return edad >= 0 && edad <= 120 ? edad : null;
}

export function rangoEdad(edad) {
  if (!Number.isInteger(edad) || edad < 0 || edad > 12) return '';
  if (edad <= 2) return '0 a 2';
  if (edad <= 6) return '3 a 6';
  if (edad <= 9) return '7 a 9';
  return '10 a 12';
}

export function registrarMovimiento(estado, movimiento) {
  const m = movimiento;
  if (!m || !/^[A-Z0-9_-]{1,40}$/.test(m.codigo || '') || !m.descripcion?.trim() ||
      !['recepcion', 'salida'].includes(m.tipo) || !['caja', 'unidad'].includes(m.presentacion) ||
      !Number.isSafeInteger(m.cantidad) || m.cantidad < 1 || m.cantidad > 1000000 ||
      !m.id || !m.fecha || !m.usuario || !m.responsable?.trim() || !m.telefono_responsable?.trim() ||
      !m.dueno?.trim() || !m.telefono_dueno?.trim() ||
      (m.tipo === 'salida' && (!m.comuna?.trim() || !m.comunidad?.trim()))) return { error: 'Completa todos los campos obligatorios.' };
  const next = structuredClone(estado || {});
  next.movimientos ||= {};
  next.inventario ||= {};
  if (next.movimientos[m.id]) return { error: 'Este movimiento ya fue registrado.' };
  const actual = next.inventario[m.codigo] || { descripcion: m.descripcion, caja: 0, unidad: 0 };
  if (actual.descripcion.trim().toLocaleUpperCase('es') !== m.descripcion.trim().toLocaleUpperCase('es'))
    return { error: 'Ese código ya pertenece a otro juguete. Comprueba la descripción.' };
  const saldo = Number(actual[m.presentacion] || 0) + (m.tipo === 'recepcion' ? m.cantidad : -m.cantidad);
  if (saldo < 0) return { error: 'La salida supera la existencia disponible para esa presentación.' };
  next.inventario[m.codigo] = { ...actual, [m.presentacion]: saldo };
  next.movimientos[m.id] = m;
  return { estado: next };
}
