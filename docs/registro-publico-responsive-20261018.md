# Registro público de asistencia: PC y móvil

18 de octubre de 2026 · 18/10/2026

## Problema comprobado

En producción, una búsqueda sin coincidencias mostraba el botón «Registrarme en el 1x10» por debajo del área visible en una pantalla de 375 × 800: su borde superior estaba a 852,9 píxeles y no había desplazamiento hacia el resultado. En PC de 1280 × 800 sí quedaba visible. Además, después de un alta, el botón permanecía oculto para la siguiente búsqueda sin coincidencias dentro de la misma sesión.

## Corrección

- Llevo el resultado y el botón de registro al área visible después de buscar; cierro el foco del campo de cédula al iniciar la consulta.
- Abro el formulario con foco en el nombre y desplazamiento hasta el formulario.
- Restablezco botón, formulario, datos y mensajes en cada nueva consulta. Desvinculo el marcado anterior y retiro resultados si cambia la cédula o la nacionalidad.
- Descarto respuestas de consultas cuya identidad ya cambió y bloqueo la identidad mientras se guarda una inscripción.
- Muestro la confirmación de guardado junto a las opciones de asistencia y retiro la advertencia de persona no encontrada.
- Asocio etiquetas a sus campos y permito dividir textos largos de la ficha sin desbordar la pantalla.

## Verificación

Chrome con el SDK real de Firebase y reglas seleccionadas del proyecto en el emulador local: PC de 1280 píxeles y vistas móviles de 375 y 320 píxeles. Compruebo cédula inválida, resultado sin coincidencias, botón dentro de la pantalla y de al menos 44 píxeles, apertura y validación del formulario, alta, marcado de asistencia, segunda persona sin recargar, limpieza al cambiar nacionalidad, búsqueda de una incorporación pública tras recargar y búsqueda de una ficha oficial. Sin errores JavaScript ni desplazamiento horizontal.

Evidencia local: `tmp/registro-publico-responsive-verificado.json` y capturas `tmp/registro-publico-corregido-*.png`, `tmp/registro-publico-formulario-*.png`. Los registros sintéticos se crean exclusivamente en el emulador y se eliminan al terminar. La comprobación del enlace productivo usa búsquedas de solo lectura. La emulación móvil no sustituye una prueba física en todos los modelos de teléfono.

La validación existente `node scripts/verificar-asistencia-publica-1x10.mjs` pasa. Las advertencias del detector visual corresponden a los bordes de color del diseño existente, conservado en esta corrección funcional.

No se modifican reglas ni registros reales. Trabajo destinado al próximo informe institucional.
