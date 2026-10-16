# Resultados globales del 1x10

Actualizado el 16 de octubre de 2026.

## Problema corregido

El encabezado vinculado contaba las siete variantes, pero las tablas de Resultados de Movilización leían únicamente su sector. Una inscripción de Empleados no aparecía al buscarla en el resultado General.

## Comportamiento

- Las siete páginas de resultados consultan las catorce fuentes originales en vivo. Su vista inicial es **Todos los sectores**; el selector permite filtrar por sector.
- Los trece paneles vinculados comparten una búsqueda de registros en las siete variantes, independiente de los filtros propios de cada pantalla. También reconoce las búsquedas introducidas en los campos principales de resultados, sectores y asistencia.
- Buscar un afín en Resultados permite encontrar la lista de su jefe y abrir sus afines.
- Cada registro conserva sector, clave original e identidad. Las inscripciones repetidas en sectores diferentes siguen separadas. Registros y personas únicas se muestran como cantidades diferentes.
- Si falta una fuente o falla su lectura, no se ofrecen conteos globales parciales ni descargas con apariencia de lista completa.
- Las acciones de detalle, ficha y eliminación identifican el registro por una clave compuesta en memoria. Las rutas de Firebase se calculan desde el sector y la clave original, con validación; no se escribe la clave compuesta en Firebase.
- CSV y hojas de personas de Excel incluyen el sector. Los filtros y el origen se conservan en las fichas.

Las inscripciones existentes no se copian entre sectores ni se alteran para hacerlas visibles. Los formularios sectoriales siguen guardando en su fuente correspondiente. El enlace público conserva su búsqueda por identidad y el estado de asistencia compartido por persona y fecha.

## Verificación

`node pruebas/integracion-1x10.mjs` comprueba trece pantallas con datos ficticios: carga incompleta, errores, actualizaciones en vivo, búsqueda global, repetidos, búsqueda de Empleados desde General, sector seleccionado, modal de afines, Excel y CSV. Incluye claves iguales en sectores distintos y comprobación de las rutas de cada operación. No realiza escrituras sobre ciudadanos.

La revisión de producción utiliza una cuenta administrativa existente y verifica los datos leídos de las fuentes reales; no crea ciudadanos ni realiza eliminaciones de prueba. La sincronización automática del directorio se suspende únicamente en la sesión de comprobación para mantenerla de solo lectura.
