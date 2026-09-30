# Seguimiento de registros 1x10

Panel administrativo: `1x10-seguimiento.html`.

## Alcance

- Conteos en vivo del 1x10 general, por comuna y centro electoral.
- Personas únicas por nacionalidad y cédula; incluye jefes y afines.
- Rangos de 15 a 35 años y de 36 en adelante. Menores de 15 y edades faltantes se muestran aparte.
- Cargas adicionales de cantidades fuera del 1x10. No contienen identidades, teléfonos, preferencias políticas ni estados de voto.
- Informes PDF e impresión de la selección completa, sin paginar ni recortar registros.

## Fuentes y límites

Lee `jefes_1x10`, `afines_1x10` y el catálogo `territorio-data.js`. No modifica estas fuentes ni el panel de asistencia existente.

Los rangos se calculan al corte seleccionado usando fechas de nacimiento válidas. Si existen fechas distintas para una misma persona, su edad queda pendiente. Las ubicaciones incompatibles quedan agrupadas en «Ubicación por verificar». Se conservan las variantes de nombres territoriales: no se inventan equivalencias ni se corrigen datos de personas.

La ubicación propia del jefe prevalece sobre la ubicación que hereda cuando aparece como afin en otra lista. Para los afines sin jefe también se cuenta su información disponible. Un centro heredado de una comunidad no confirma el centro electoral individual.

Las cargas adicionales son declaraciones agregadas. No permiten detectar duplicados entre personas ni recalcular edades individuales; el total informado combina personas únicas del 1x10 con cantidades declaradas. Antes de cargar una lista se debe comprobar que no se solape con otra carga o con la base.

## Cantidades adicionales

Se guardan en `seguimiento_1x10_cargas`, con comuna, centro, referencia de lista, cuatro cantidades, fecha del servidor y UID del administrador. La referencia debe ser un código de lista sin nombres ni cédulas.

La clave se deriva de comuna, centro y referencia normalizada; una transacción impide crear dos veces la misma referencia en ese grupo. «Corregir» permite actualizar las cantidades y detecta modificaciones concurrentes mediante la fecha del servidor. Una corrección a cero conserva el registro de la carga. Para cambiar la ubicación de una lista, primero corregir sus cantidades a cero y crear la carga en el grupo correcto.

Las reglas permiten leer y escribir exclusivamente a administradores. Validan campos, cantidades enteras no negativas, límites y autor. No permiten borrar desde el navegador ni almacenar campos adicionales.

## Verificación y publicación

1. `node scripts/verificar-seguimiento-1x10.mjs`: límites de edad, fechas inválidas, duplicados, nacionalidades, conflictos, afines sin jefe y cargas adicionales.
2. Comprobar sintaxis del módulo embebido y del exportador.
3. Publicar reglas de Firebase antes del código.
4. Publicar archivos seleccionados con commit y push a `main`.
5. Verificar panel, filtros, carga/corrección y tiempo real en producción. Limpiar solo la carga sintética de prueba y comprobar su ausencia.
6. Generar el PDF completo y revisar sus páginas, encabezados, totales y márgenes.
7. Registrar y sincronizar el trabajo en el Centro de Control, pendiente del informe municipal siguiente.
