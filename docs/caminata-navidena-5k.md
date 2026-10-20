# Caminata y Carrera Navideña 5K

Evento independiente para el sábado 5 de diciembre de 2026 · 05/12/2026. Se conserva el formulario y la base del evento anterior.

Formulario público: https://salasituacional.alcaldiadecharallave.com/caminata-navidena-5k.html

Panel administrativo: https://salasituacional.alcaldiadecharallave.com/caminata-navidena-5k-resultados.html

Primero se completa al líder o responsable. Debajo, «Agregar familiar» permite incorporar a cada integrante con sus datos, parentesco, talla de camisa, condición de discapacidad y elección de caminata o carrera. El teléfono y la dirección del líder son el contacto del grupo; cada familiar puede indicar otro teléfono. Cada persona conserva su propia ficha y planilla. La inscripción individual también es posible.

El botón final guarda todo el grupo y las fotografías seleccionadas mediante una única actualización atómica. Una cédula repetida impide guardar el grupo completo. Las fotografías vacías no se envían. La confirmación aparece únicamente después de recibir la respuesta del servidor. Se imprime una planilla por participante, con el líder primero.

El tablero dispone de filtros por modalidad, talla, discapacidad y rol familiar, además de los filtros originales. Los listados y exportaciones conservan juntos los miembros del grupo y muestran al líder primero. Excel y PDF incluyen los datos individuales y familiares; las exportaciones respetan todos los filtros, sin limitarse a la página visible.

## Numeración independiente por modalidad

Cada participante, incluido cada familiar o menor sin cédula, recibe su propio número: **Caminata 1, Caminata 2…** o **Carrera 1, Carrera 2…**. Ambas secuencias empiezan en 1. Los registros existentes se numeran por fecha de inscripción; los integrantes de un grupo se desempatan por su orden familiar. La confirmación, las planillas, la tabla, la ficha, Excel y PDF muestran la modalidad junto al número.

El servidor municipal del Centro de Control asigna los números mediante reservas privadas con ETag de Firebase. Las reservas son idempotentes: un reintento devuelve el mismo número. El contador conserva su avance cuando se elimina una inscripción, por lo que una baja puede dejar un salto; su número no se entrega a otra persona. La escritura de cada ficha es condicional, para conservar ediciones o bajas concurrentes. El asignador también completa pendientes cada cinco minutos.

El formulario primero guarda atómicamente el grupo y sus fotografías y luego solicita sus números. Si falla esa segunda confirmación, muestra que la inscripción ya está guardada y permite **Reintentar numeración**, sin enviar otra vez el grupo. La impresión se habilita cuando todos los números están confirmados. Un comprobante aleatorio por grupo permite recuperar únicamente sus números; no habilita lectura pública de datos de participantes. El comprobante nunca se incluye en las exportaciones ni en la bitácora.

Los menores sin cédula se agregan dentro del grupo con nombre y nacimiento, marcando la opción correspondiente. Se guardan con una clave interna propia, vinculados a la cédula del responsable; no se inventa un documento. El CNE y Dateas están retirados del formulario y no completan datos automáticamente.

Las notas del evento aparecen antes del envío, en la confirmación y en cada planilla: llevar planilla impresa y cédula laminada al chequeo; inscripción previa mediante el enlace para participar en la carrera, y posibilidad de incorporarse únicamente a la caminata tras el chequeo si no se realizó la inscripción previa.

## Configuración y acceso

Registros: `caminata_navidena_5k_2026`; fotografías: `caminata_navidena_5k_2026_fotos`; reservas privadas: `caminata_navidena_5k_2026_numeracion`; apertura: `config/caminata_navidena_5k_2026/abierta`. Servicio de confirmación: `POST https://admin.alcaldiadecharallave.com/api/caminata-navidad/numeracion`.

Las reglas permiten crear registros públicos nuevos cuando la inscripción está abierta. La lectura, modificación y eliminación requieren administración. Cada familiar debe referenciar a un líder válido; las fotografías deben acompañar la creación del registro. Las reglas del resto de los módulos se conservan semánticamente y deben compararse con producción antes de publicar.

Publicar las reglas antes del formulario. Habilitar exclusivamente la configuración del nuevo evento. No modificar la configuración del evento anterior.

Para cambios de numeración, publicar primero las reglas y el asignador `src/caminata-numeracion.js` del repositorio `admin-alcaldia`; después, el formulario. El cliente no puede establecer `numero_inscripcion` ni leer o modificar el libro de reservas. No borrar ni reiniciar sus contadores para corregir un registro.

## Verificación

`node pruebas/caminata-navidena-5k.mjs` verifica el flujo del formulario y del panel con datos ficticios y Firebase simulado: líder y familiares, duplicados, fotografías, impresión del grupo, filtros, Excel y PDF, escritorio y móvil de 375 px. Los artefactos se generan en `output/navidad-5k-pruebas/` y no contienen participantes reales.

Además se comprobaron las reglas efectivas en producción mediante registros ficticios: envío atómico con fotografías, bloqueo de duplicados, privacidad de lectura, bloqueo de modificación/borrado públicos y rechazo de familiar sin líder. Todos los registros de prueba se eliminaron y se releyeron las rutas para confirmar su ausencia. Se revisaron visualmente los PDF: tres planillas para tres personas, una ficha individual y el informe completo; Excel contiene 23 columnas y encabezados congelados hasta la tercera fila.
