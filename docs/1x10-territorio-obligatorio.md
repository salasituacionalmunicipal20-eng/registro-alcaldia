# Comuna y comunidad obligatorias en el 1x10

Las siete variantes requieren una parroquia, comuna y comunidad válidas para el jefe y cada afín. La comunidad debe pertenecer a las selecciones anteriores. El envío se detiene antes de escribir si falta un dato territorial.

Desde el 3 de octubre de 2026, las listas aplican las equivalencias confirmadas en `1x10-nombres-territoriales.mjs`, también al cargar un registro anterior. No ofrecen «Otro» ni «Otros» como comuna o comunidad; esos valores tampoco pasan la validación de guardado. Se conservan los identificadores de las comunidades y los registros históricos. Quien edite una ubicación genérica anterior debe seleccionar su comunidad real antes de guardar.

Cada afín guarda su ubicación completa, incluso si coincide con la del jefe. Los registros anteriores se conservan. Para formularios que ya estaban abiertos, las reglas permiten heredar exclusivamente una ubicación completa del jefe cuando el afín no contiene ningún campo territorial propio; una ubicación parcial no se acepta en un alta nueva.

Verificación: `node scripts/verificar-territorio-obligatorio-1x10.mjs`. Incluye las siete páginas, validación antes del envío, comunidad de otra comuna, ubicación explícita y sintaxis de los módulos.
