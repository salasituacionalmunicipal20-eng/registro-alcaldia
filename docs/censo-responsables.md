# Censo municipal con responsables

## Registro en tres pasos y nombre editable

El censo usa el recorrido de la estructura original: datos del responsable, comunidad del responsable y fichas de las personas vinculadas. Permite entre 1 y 100 personas, conserva las fichas al volver entre pasos y valida todos los datos antes de guardar. Las personas pueden tener una ubicación distinta a la del responsable.

Se preparó un censo inicial llamado **Censo municipal**, con identificador `censo-municipal`: formulario `censo.html?id=censo-municipal` y panel `censo-panel.html?id=censo-municipal`. Tiene una tarjeta propia en el panel principal de Carlos que abre directamente sus resultados. La tarjeta toma el nombre configurado del censo. El panel queda reservado a Carlos. El formulario permite crear grupos mediante el enlace; los datos y las correcciones siguen protegidos por las reglas existentes.

Para cambiar el nombre: abre el panel del censo y pulsa **Cambiar nombre**, o entra en **Crear y configurar censos → Mis censos → Cambiar nombre / configurar**. Cambiar el título conserva el identificador, los enlaces, los grupos y el seguimiento Sí/No. El título actualizado también aparece en la cabecera y en la pestaña del formulario. No se copian registros de otros módulos.

Entra como `carlos.admin` al panel de Sala Situacional y abre **Censo con responsables**. También está disponible desde el Constructor de formularios, mediante **Responsable + hasta 100 personas**.

1. Pulsa **Crear censo**. Escribe su nombre, instrucciones y el nombre del seguimiento Sí/No (por ejemplo, Contactado o Encuestado).
2. Elige quién puede registrar grupos y quién puede consultar y corregir. Las fichas son privadas; recibir registros públicos no permite leerlos.
3. Guarda. Se generan el enlace de registro, el QR, el enlace para WhatsApp y un panel propio.
4. En el formulario completa al responsable y agrega entre 1 y 100 personas. Cada una tiene nacionalidad, cédula, nombres y apellidos separados, teléfono opcional, parroquia, comuna, comunidad y necesidad u observación opcional. Las ubicaciones pertenecen a cada ficha; no se toman de información electoral. La consulta existente se utiliza sólo para nombres y apellidos.
5. En el panel alterna entre **Personas** y **Responsables y grupos**. Busca por nombre, cédula o necesidad; filtra por parroquia, comuna, comunidad, responsable y seguimiento. Sí aparece verde, No rojo y Sin marcar permanece pendiente.
6. **Ver grupo** abre todas las fichas. **Corregir grupo o agregar personas** permite ampliar y corregir con permiso administrativo. Guarda el grupo completo; si otra sesión lo modificó, se exige recargar para evitar sobrescribirla.
7. Excel y PDF incluyen todos los resultados de los filtros, con datos completos de la persona y su responsable. El Excel congela las primeras tres filas; el PDF usa el encabezado y pie institucionales.

Cerrar la recepción impide nuevos grupos, conservando la consulta y corrección administrativa. No hay borrado de grupos desde la interfaz. Los identificadores internos de cada persona se mantienen al quitar otras fichas y el seguimiento verifica la cédula para evitar trasladarlo a otra persona. Las cédulas repetidas dentro de un grupo se rechazan en el formulario; los cruces entre grupos se señalan en el panel para revisión, sin fusionar personas automáticamente.

Los nodos `censos_definiciones`, `censos_grupos` y `censos_seguimiento` son independientes de los módulos anteriores. Las reglas reutilizables preparan permisos para cada censo creado desde el panel: únicamente Carlos configura; cada censo decide el acceso administrativo. El servidor verifica campos, cédulas, contador y un máximo de cien espacios de personas, rechaza lecturas públicas, modificaciones públicas y estados de seguimiento ajenos. Publicar reglas con `scripts/preparar-reglas-censo.cjs` y Firebase antes de publicar las páginas.

No se importan ni modifican registros de las estructuras anteriores. Este módulo se dedica al censo territorial y a la organización de necesidades comunitarias.

## Funciones adaptadas del panel existente

El panel abre por responsables y muestra el contador de cada grupo (hasta 100), promedio por responsable y cantidad de grupos al máximo de capacidad. El contador abre la ficha del grupo. La vista Personas permite filtrar la población directamente por comuna y comunidad, además de edad y género declarado. El resumen territorial muestra cuántos registros y responsables hay en cada comunidad y cuántos tienen seguimiento Sí, No o Sin marcar. Se puede abrir el listado pulsando la comunidad.

La fecha de nacimiento y el género son opcionales en ambas fichas. La edad se calcula desde la fecha registrada; no se infiere ningún dato. Al activar filtros de edad se excluyen registros sin fecha válida. Las estadísticas indican explícitamente los datos faltantes y corresponden a la vista activa.

Excel organizado contiene tres hojas: resultados filtrados, fichas relacionadas y resumen territorial. La hoja relacionada contiene todas las personas de los grupos elegidos cuando la vista es Responsables, o las fichas de sus responsables cuando la vista es Personas; esta diferencia se explica en la hoja. Todas las hojas tienen filtros y tres filas congeladas. CSV y PDF completo usan la selección actual. El PDF de resumen incluye conteos y territorio; la hoja de firmas tiene espacio de firma para cada resultado; las fichas por responsable agrupan todos los datos y continúan en varias páginas si el grupo es grande. El QR tiene enlace de descarga.

Archivar un grupo lo oculta de la vista activa, conservando las fichas y el seguimiento. Desde Ver archivados se puede abrir su ficha y restaurarlo. No se borra información municipal. Los módulos anteriores conservan su código, datos y permisos; se reutilizan sus funciones civiles en el nuevo censo.
