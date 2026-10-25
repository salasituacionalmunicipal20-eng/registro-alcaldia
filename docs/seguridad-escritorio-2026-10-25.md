# Cliente Windows: controles de navegación y estado del runtime

El candidato 1.0.2 usa Electron 45.0.0 estable. Se limita la navegación interna al origen HTTPS exacto de Sala Situacional y a los proveedores exactos de acceso. Los enlaces web externos se abren en el navegador. Se rechazan protocolos locales o ejecutables, URL inválidas y credenciales incrustadas; se comprueban también las redirecciones. Los permisos sensibles se conceden solo al origen del panel y se rechazan para marcos de otros sitios.

El paquete conserva sandbox, aislamiento de contexto y Node desactivado en el contenido remoto. Al empaquetar se deshabilitan RunAsNode, NODE_OPTIONS, el inspector Node por CLI y los privilegios adicionales de file; se activan cifrado de cookies, integridad ASAR y carga exclusiva desde ASAR. Cuatro pruebas de seguridad comprueban la política y su conexión real con los manejadores de main.js. La herramienta oficial verifica los fuses en el ejecutable generado.

**Pendiente del proveedor:** el runtime incorporado por Electron estable es Node 24.22.0. El parche de octubre requiere 24.22.1. Las versiones estables de Electron disponibles al 25 de octubre todavía no lo incluyen; 46.0.0-alpha.1 sí lo incluye. Las mitigaciones aplicadas no equivalen a sustituir ese runtime. Se mantiene la rama estable y se registra expresamente la actualización pendiente; no se presenta este candidato como un cierre completo de ese hallazgo.

Candidato local: escritorio/dist/SalaSituacional-Setup-1.0.2.exe. Los candidatos 1.0.0 y 1.0.1 quedan superados. El instalador no se ha instalado ni distribuido mediante una publicación de versiones. La actualización del código web y sus bibliotecas sí está publicada y comprobada en el dominio.

Fuentes primarias: [versiones de Electron](https://releases.electronjs.org/), [parche Node 24.22.1](https://nodejs.org/en/blog/release/v24.22.1/), [fuses de Electron](https://www.electronjs.org/docs/latest/tutorial/fuses).
