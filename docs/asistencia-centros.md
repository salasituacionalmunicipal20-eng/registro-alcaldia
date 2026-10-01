# Asistencia por comuna y comunidad

Panel administrativo: `asistencia-centros.html`, disponible desde `admin.html`.

1. Selecciona la fecha de la jornada. Cada fecha conserva su asistencia por separado.
2. Filtra por comuna y comunidad; los centros se toman de las siete variantes del 1x10 y del catálogo territorial existente.
3. Revisa la lista. Una persona aparece una sola vez por nacionalidad y cédula; las ubicaciones incompatibles quedan por verificar.
4. Marca **Sí**, **No** o **Pendiente**. Pendiente significa que la asistencia aún no se revisó. El guardado se sincroniza entre administradores.
5. Descarga el PDF o Excel de la selección completa, o utiliza los botones de cada centro para preparar su archivo. Las descargas incluyen todas las páginas de la selección.

El panel registra únicamente asistencia. No modifica las fichas originales, no crea centros nuevos y no almacena preferencias ni selección de voto.

Los marcajes se guardan en `asistencia_centros/{fecha}/{nacionalidad_cedula}`, con estado, fecha de actualización y responsable. El nodo admite solamente administradores. Las listas se generan desde las fuentes originales; no se copian fichas personales a un nodo nuevo.

Las listas exportadas contienen cédula, nombre, comuna, comunidad, centro y asistencia. Deben entregarse únicamente al centro correspondiente. Los avisos institucionales de mantenimiento no adjuntan estas listas.

Comprobación local de la lógica: `node scripts/verificar-asistencia-centros.mjs`.
