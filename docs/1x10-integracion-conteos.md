# Integración y conteos del 1x10

Los siete registros originales siguen siendo la fuente: General, Empleados, Cristianos, Abuelos, Cristianos y abuelos, Salud y Educación. Cada variante tiene sus nodos `jefes_1x10` y `afines_1x10` con el sufijo correspondiente. No se fusionan ni eliminan inscripciones.

Los trece paneles administrativos comparten navegación y un resumen en vivo mediante `1x10-vinculos.mjs`. El resumen espera los catorce nodos antes de mostrar cantidades. Distingue **registros**, **personas únicas**, repeticiones incluidas y registros sin identidad válida. Los indicadores de un sector corresponden a ese sector; los filtros afectan sus detalles. Una desconexión se indica expresamente como última carga recibida, sin presentar una garantía de actualización en vivo.

`1x10-identidad.mjs` centraliza la validación de cédula y nacionalidad usada por seguimiento y asistencia. `1x10-integracion-datos.mjs` normaliza las fichas para los siete tableros usando exclusivamente las equivalencias confirmadas y la entrada exacta del catálogo. Las correcciones de comuna, comunidad y centro también se aplican al detalle y a las exportaciones. MILAGRO DE DIOS I sigue unificada y MILAGRO DE DIOS II permanece independiente.

Los indicadores de afines se calculan desde los registros almacenados, incluso si falta la ficha de un jefe. Los campos históricos `total_afines` no sustituyen el recuento de los nodos. Los tableros por sector esperan jefes y afines completos y bloquean las descargas durante la carga o ante un error. El panel de sectores conserva los afines sin jefe en el detalle de personas y distingue los grupos sin ficha de las personas registradas como jefes.

El directorio público es una proyección de nombre, comuna, comunidad y centro por identidad válida. Se comprueba al abrir cualquiera de los paneles y al recibir cambios, sin el antiguo bloqueo de quince minutos de un único navegador. Cada actualización usa una transacción en la ficha hija para no sobrescribir cambios concurrentes y se verifica releyendo. No se eliminan automáticamente fichas anteriores: se avisa si hay sobrantes, datos inválidos o diferencias pendientes. La sincronización depende de mantener un panel administrativo abierto y conectado; no es una función de servidor permanente. No se incorporan teléfonos, fechas de nacimiento ni fichas de jefes al directorio público.

La asistencia continúa compartida en `asistencia_centros/{fecha}/{identidad}` entre Consulta Popular, Asistencia por centro y el enlace público. Una persona repetida entre listas conserva un único estado por fecha. Las inscripciones del formulario público permanecen separadas en `directorio_1x10_publicos`; no se presentan como registros oficiales de una variante.

Los cruces administrativos de empleados y equipos esperan las catorce fuentes antes de calcular sus resultados. Los fallos de lectura no se convierten en listas vacías. La lista de empleados se recupera por páginas completas y las personas sin cédula no se cuentan como inscritas por descarte. Se conservan las reglas existentes de los cruces.

## Corte de revisión del 16/10/2026

Lectura directa, sin exportar datos personales:

| Variante | Jefes | Afines | Registros |
|---|---:|---:|---:|
| General | 948 | 9.725 | 10.673 |
| Empleados | 412 | 2.883 | 3.295 |
| Cristianos | 12 | 65 | 77 |
| Abuelos | 1 | 102 | 103 |
| Cristianos y abuelos | 0 | 0 | 0 |
| Salud | 4 | 23 | 27 |
| Educación | 9 | 99 | 108 |
| Total | 1.386 | 12.897 | 14.283 |

El corte contiene **12.161 personas únicas**, 2.122 registros repetidos incluidos, cero identidades inválidas y cero afines sin jefe. El directorio presentaba dos fichas menos al iniciar la revisión. Estas cifras son un corte, no cantidades fijas en la interfaz.

La auditoría también detecta **216 personas con ubicaciones contradictorias** y **84 con fechas de nacimiento distintas** entre sus registros. Seguimiento y asistencia usan el mismo criterio territorial, incluyendo contradicciones de comunidad. Los registros se conservan y los casos se señalan para revisión; no se elige ni se inventa una ubicación o fecha para corregir a personas reales.

## Verificación

`node pruebas/integracion-1x10.mjs` recorre los trece paneles con datos ficticios: carga retenida de una variante, actualización en vivo, error de lectura, totales por sector, repeticiones, afines sin ficha, equivalencias, navegación y adaptación móvil. Comprueba también que la proyección pública solo escriba las diferencias y se vuelva a sincronizar al recibir un registro nuevo.

Se mantienen las verificaciones de seguimiento, asistencia, equivalencias territoriales y los PDF de Consulta Popular. Las pruebas con datos reales comparan cada panel con lecturas directas de sus fuentes; no crean inscripciones ni marcajes de asistencia.
