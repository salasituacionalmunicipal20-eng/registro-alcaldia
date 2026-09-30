# Constructor de formularios

Herramienta exclusiva de Carlos en `admin.html`, publicada el 30 de septiembre de 2026.

## Crear y compartir

1. Abre **Constructor de formularios** y pulsa **Crear formulario**.
2. Escribe el nombre y las instrucciones. Elige quién puede llenarlo y quién puede ver las respuestas.
3. Agrega **Identidad completa**, **Ubicación territorial**, **Datos de contacto** o campos individuales. Selecciona una pregunta para cambiar su nombre, ayuda, sección, obligatoriedad y filtro.
4. Usa **Vista previa** para revisar las preguntas. La vista previa no envía datos.
5. Pulsa **Publicar formulario**. Aparecen el enlace para compartir, WhatsApp, QR y el enlace al tablero privado.

Cada formulario admite hasta 40 campos. El borrador se conserva en este navegador; los formularios publicados se guardan en Firebase y se pueden abrir desde otros equipos. La consulta de cédula reutiliza `cne-dateas.js`; completa nombres y apellidos separados solo en campos vacíos. La ubicación proviene del catálogo territorial, nunca del registro electoral. Verifica los datos antes de enviarlos.

## Sí / No y seguimiento

Agrega **Sí / No**, escribe tu pregunta y elige **Quién responde este Sí / No**:

- **La persona en el formulario:** pregunta visible al registrarse.
- **Yo desde el tablero:** seguimiento privado editable en cada fila del tablero; no aparece en el formulario ni cambia sus respuestas originales.

Sí aparece verde, No rojo y una respuesta pendiente aparece gris. El filtro ofrece Sí, No y Sin respuesta. El seguimiento también figura en la ficha, PDF y Excel.

## Consultar resultados

Desde **Mis formularios → Ver resultados** puedes buscar en todas las respuestas, filtrar por fecha de registro y por los campos configurados. Los números y fechas tienen rangos; las listas y territorio muestran opciones; el texto permite búsqueda. **Limpiar filtros** restaura todos los registros. Las filas se paginan de 25 en 25, pero PDF y Excel contienen toda la selección.

El PDF presenta fichas completas para evitar tablas de 40 columnas ilegibles, con cintillo y pie institucional en todas las páginas. Excel incluye título, fecha, encabezados con filtros y tres filas congeladas.

## Cambiar y cerrar

**Cerrar recepción** detiene nuevos envíos conservando sus respuestas. **Abrir recepción** habilita el mismo enlace. Si ya hay respuestas, los campos quedan protegidos: todavía puedes editar título, instrucciones, recepción y permisos. **Duplicar** crea un formulario nuevo con los mismos campos y respuestas independientes.

## Reglas reutilizables

`formularios_definiciones/{id}` guarda los campos; `formularios_respuestas/{id}/{registro}` guarda las respuestas; `formularios_seguimiento/{id}/{registro}/{campo}` guarda el seguimiento administrativo. Solo Carlos crea definiciones. Cada definición decide acceso de registro y lectura administrativa. El público no puede leer respuestas, sobrescribirlas ni modificar seguimiento.

Las reglas comunes validan los tipos y opciones de cada definición y exigen 40 posiciones, incluidas las vacías, para impedir que se omita un campo obligatorio. Las futuras publicaciones desde el constructor no necesitan desplegar reglas ni enviar código a un servicio de IA. No se ofrecen archivos adjuntos ni importación automática de formularios HTML anteriores.

## Evidencia

- `node pruebas/formularios-constructor.mjs`: 38 comprobaciones en Firebase real, con limpieza de registros y cuenta sintéticos verificada.
- `node pruebas/exportaciones-constructor.cjs`: 27 registros, 40 campos, Excel completo de 41 columnas y PDF completo de 63 páginas. Cintillo verificado en todas las páginas y sin bloques fuera de hoja.
- Navegador productivo: creación, publicación con enlaces y QR, recepción, aparición en vivo, seguimiento No guardado y filtro sin coincidencias.
- Escritorio revisado visualmente. La revisión de permisos del navegador rechazó la emulación móvil; no se afirma comprobación visual a 375 px.
