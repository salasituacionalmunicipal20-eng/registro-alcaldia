# Sala Situacional

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Carlos administra la Sala Situacional. Los ciudadanos completan formularios por enlace; los administradores consultan resultados.

## Product Purpose
Crear formularios municipales desde el panel, reutilizando identidad y territorio, sin programar cada formulario ni consumir servicios de IA.

## Capabilities and Constraints
HTML estático, Firebase Auth y Realtime Database. Constructor reservado a carlos.admin. Cada formulario publicado genera enlace público y tablero privado con filtros. Campos Sí/No con etiqueta personalizable, Sí verde y No rojo. Reutilizar consulta de cédula sin deducir datos personales. Publicar reglas antes del código. Documentación municipal obligatoria.

## Operating Context
Formularios compartidos por WhatsApp y completados también desde teléfonos. Las exportaciones incluyen todos los registros seleccionados.

## Product Principles
- Creación visual con vista previa.
- Datos personales protegidos del acceso público.
- Nombres, apellidos y cédulas conservan su significado.
- Reglas reutilizables para futuros formularios.
