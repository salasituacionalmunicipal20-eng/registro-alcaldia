# Comuna y comunidad obligatorias en el 1x10

Las siete variantes requieren una parroquia, comuna y comunidad válidas para el jefe y cada afín. La comunidad debe pertenecer a las selecciones anteriores. El envío se detiene antes de escribir si falta un dato territorial.

Cada afín guarda su ubicación completa, incluso si coincide con la del jefe. Los registros anteriores se conservan. Para formularios que ya estaban abiertos, las reglas permiten heredar exclusivamente una ubicación completa del jefe cuando el afín no contiene ningún campo territorial propio; una ubicación parcial no se acepta en un alta nueva.

Verificación: `node scripts/verificar-territorio-obligatorio-1x10.mjs`. Incluye las siete páginas, validación antes del envío, comunidad de otra comuna, ubicación explícita y sintaxis de los módulos.
