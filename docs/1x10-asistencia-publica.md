# Enlace público de asistencia 1x10 y detalle por comuna y comunidad

Página pública: `1x10-asistencia-publica.html`, enlazada desde `1x10-asistencia.html` (tarjeta "Asistencia 1x10 por centro" de `admin.html`).

## Flujo público (sin login)

1. La persona abre el enlace y escribe su nacionalidad y cédula.
2. La página busca en `directorio_1x10/{nacionalidad}_{cédula}` (nodo mínimo de solo lectura pública con nombre, comuna, comunidad y centro). Si no aparece, se le indica que comunique a su jefe de calle para registrarse.
3. Si aparece, puede marcar **"Sí, ya asistí a votar"** o **"Todavía no he asistido"** para la jornada de hoy (hora de Caracas). Puede cambiar su respuesta; queda la última.
4. El marcado se guarda en `asistencia_centros/{fecha}/{nacionalidad_cedula}` con `actualizado_por: 'publico'`, el mismo nodo que usan los tableros, así que aparece en vivo en todos los paneles.

Solo se registra asistencia a la jornada; no preferencias ni contenido del voto.

## Resumen por comuna y comunidad en el panel

`1x10-asistencia.html` muestra la sección **"Votación por comuna y comunidad"**: personas con cédula válida de las siete variantes, contadas una sola vez por persona, con votaron / no votaron / pendientes / faltan por comunidad. Al pulsar una comunidad se abre una ventana emergente con la lista completa: verde (votó), rojo (no votó) y amarillo (pendiente), con filtros y actualización en vivo.

## Cómo se mantiene el directorio público

`directorio_1x10` se genera con `consolidarPersonas` (las mismas siete variantes y equivalencias que los tableros):

- Poblado y corregido con `node scripts/sincronizar-directorio-1x10.mjs` (usa la clave de administrador y verifica lo escrito leyendo de vuelta).
- El panel `1x10-asistencia.html` lo refresca solo con las diferencias, como máximo una vez cada 15 minutos por navegador y sin bloquear la interfaz.

## Reglas de Firebase publicadas

- `directorio_1x10`: lectura pública; escritura solo administradores; claves `^[VE]_[0-9]{4,10}$`; campos nombre, comuna, comunidad y centro obligatorios.
- `asistencia_centros/$fecha/$persona`: lectura pública del registro propio (por cédula) y escritura pública limitada a **crear o cambiar** a `asistio`/`no_asistio` con `actualizado_por: 'publico'`. No se puede borrar ni poner `pendiente` sin sesión de administrador.

## Comprobaciones

- Local: `node scripts/verificar-asistencia-publica-1x10.mjs` (sintaxis, marcadores y reglas del archivo).
- Producción: `tmp/verificar-publico-voto-1x10.mjs` (flujo completo del enlace público con una persona de prueba que se elimina al terminar).
