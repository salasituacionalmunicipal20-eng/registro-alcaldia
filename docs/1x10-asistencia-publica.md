# Consulta Popular 18 de Octubre: enlace público y detalle por comuna y comunidad

Página pública: `1x10-asistencia-publica.html`, enlazada desde `1x10-asistencia.html` (tarjeta "Consulta Popular 18 de Octubre" de `admin.html`).

Enlace corto oficial (TinyURL con alias propio, se puede dictar por teléfono): `https://tinyurl.com/voto1x10cr2026` → redirige (301) a la página pública. Sigue la convención del proyecto con sufijo `cr2026` (CR = Cristóbal Rojas). No usar da.gd: muestra advertencia de phishing a visitantes nuevos.

## Flujo público (sin login)

1. La persona abre el enlace y escribe su nacionalidad y cédula.
2. La página busca en `directorio_1x10/{nacionalidad}_{cédula}` (nodo de solo lectura pública con nombre, comuna, comunidad y centro). Si aparece, marca "Sí" o "Todavía no" para la jornada de hoy.
3. Si **no aparece**, la misma página le ofrece registrarse ahí mismo: nombre, comuna, comunidad y centro electoral. El registro se guarda en `directorio_1x10_publicos/{nacionalidad}_{cédula}` (solo lectura pública, escritura permitida al visitante para crear). El visitante puede marcar su asistencia inmediatamente después de registrar.
4. El marcado se guarda en `asistencia_centros/{fecha}/{nacionalidad_cedula}` con `actualizado_por: 'publico'`, el mismo nodo que usan los tableros, así que aparece en vivo en todos los paneles.

Solo se registra asistencia a la jornada; no preferencias ni contenido del voto.

## Resumen por comuna y comunidad en el panel

`1x10-asistencia.html` muestra la sección **"Votación por comuna y comunidad"**: personas con cédula válida de las siete variantes, contadas una sola vez por persona, con votaron / no votaron / pendientes / faltan por comunidad. Al pulsar una comunidad se abre una ventana emergente con la lista completa: verde (votó), rojo (no votó) y amarillo (pendiente), con filtros y actualización en vivo.

## Registro público en el panel de administración

El panel `1x10-asistencia.html` muestra debajo de la lista principal una sección **"Personas registradas por el público"** con las filas de `directorio_1x10_publicos`. El administrador puede:

- Eliminar un registro público equivocado o duplicado (escritura restringida al superadmin / admin).
- Las personas registradas públicamente NO entran en el listado de jefes/afines de `jefes_1x10` ni `afines_1x10`: el sincronizador `sincronizar-directorio-1x10.mjs` solo reconstruye `directorio_1x10` a partir de las siete variantes oficiales, por lo que no se borran.

> Nota: `directorio_1x10_publicos` es un nodo independiente que **no** sincroniza con `sincronizar-directorio-1x10.mjs`. El admin aplica los cambios de la lista oficial con la consola de Firebase o el script, y los registros públicos se dejan en su nodo solo para auditoría y eliminación manual.

## Cómo se mantiene el directorio público

`directorio_1x10` se genera con `consolidarPersonas` (las mismas siete variantes y equivalencias que los tableros):

- Poblado y corregido con `node scripts/sincronizar-directorio-1x10.mjs` (usa la clave de administrador y verifica lo escrito leyendo de vuelta).
- El panel `1x10-asistencia.html` lo refresca solo con las diferencias, como máximo una vez cada 15 minutos por navegador y sin bloquear la interfaz.

## Reglas de Firebase publicadas

- `directorio_1x10`: lectura pública; escritura solo administradores; claves `^[VE]_[0-9]{4,10}$`; campos nombre, comuna, comunidad y centro obligatorios.
- `directorio_1x10_publicos`: lectura pública; escritura permitida **solo para crear** el registro del visitante (no se puede borrar ni modificar desde el público); claves `^[VE]_[0-9]{4,10}$`; campos nombre, comuna, comunidad y centro obligatorios.
- `asistencia_centros/$fecha/$persona`: lectura pública del registro propio (por cédula) y escritura pública limitada a **crear o cambiar** a `asistio`/`no_asistio` con `actualizado_por: 'publico'`. No se puede borrar ni poner `pendiente` sin sesión de administrador.

## Comprobaciones

### Contacto por WhatsApp

En la columna **Teléfono** de la lista administrativa, el botón **WhatsApp** abre el chat de la persona en otra pestaña. Se conserva **Llamar**. Los números venezolanos locales se convierten al formato internacional `58` para construir el enlace; se admiten números internacionales con su código de país. Los valores incompletos o con varios teléfonos mezclados no generan un enlace de WhatsApp. El valor guardado permanece intacto. El administrador escribe y envía el mensaje desde WhatsApp; abrir el chat no realiza un envío automático.

### Impresión del panel administrativo (15/10/2026)

En `1x10-asistencia.html` están disponibles:

- **Imprimir lista filtrada completa**: imprime todos los registros que cumplen la fecha, centro, estado, búsqueda y grupo de edad seleccionados. Incluye las páginas no visibles de la lista, conserva los registros repetidos entre variantes y distingue el total de registros del total de personas distintas.
  Al pulsarlo aparece una selección previa: **Todos**, **Jóvenes (15 a 35 años)** o **Adultos (36 años en adelante)**. Se propone el grupo de edad actual. **Generar PDF** aplica esa elección conservando centro, estado, fecha y búsqueda; **Cancelar** cierra sin cambiar los filtros ni generar el archivo. El grupo elegido también aparece en el PDF.
- **Imprimir resumen territorial**: imprime todas las comunas y comunidades del resumen con el filtro de edad vigente y los estados de la jornada.
- **Imprimir esta comunidad**: desde el detalle, imprime todas sus personas con el filtro Todas / Solo las que votaron / Solo las que faltan y el grupo de edad seleccionado.

Los tres botones generan un PDF de **papel carta horizontal (27,94 × 21,59 cm)** con **márgenes de 15 mm**. Se abre una vista previa con **Imprimir PDF** y **Descargar PDF**. Al imprimir se debe seleccionar carta y tamaño real o escala 100 %. El PDF conserva cintillo institucional en todas las páginas, fecha de la jornada, filtros, encabezados de tabla repetidos, filas completas y numeración «Página X de Y». No incluye controles para modificar los registros. La impresión espera la carga completa de las siete variantes y los estados de asistencia.

La generación se realiza en `consulta-popular-pdf.mjs`, usando jsPDF, autoTable y los encabezados institucionales compartidos. Se sustituyó la impresión de la tabla HTML porque su encabezado repetido se desplazaba al borde en las páginas siguientes. Los parámetros nuevos de margen del encabezado y pie son opcionales; los otros módulos conservan sus coordenadas anteriores.

Verificación: `node pruebas/consulta-popular-pdf.mjs` recorre los tres botones y los filtros con datos ficticios; imprime los 151 registros aunque solo haya 75 visibles, y prueba listados extensos y vacíos. `python pruebas/verificar-pdf-consulta.py` revisa las ocho salidas PDF y sus 51 páginas: tamaño carta, texto y bordes dentro de los márgenes, encabezados, numeración y presencia de todos los registros. Los PDF se renderizaron y revisaron visualmente. Se verificó también el formulario navideño para descartar regresiones en su PDF.

Las comunidades `MILAGRO DE DIO I` y `EL MILAGRO DE DIOS I` se unifican como **MILAGRO DE DIOS I**. Se conserva el identificador técnico del catálogo y se mantiene separado **MILAGRO DE DIOS II**. Se verificaron 23 campos corregidos en Firebase sin cambios en los demás datos.

- Local: `node scripts/verificar-asistencia-publica-1x10.mjs` (sintaxis, marcadores de la página, reglas del archivo).
- Producción: `tmp/verificar-publico-voto-1x10.mjs` (flujo completo del enlace público con una persona de prueba que se elimina al terminar).
