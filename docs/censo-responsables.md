# Censo municipal con responsables

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
