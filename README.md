# Sala Situacional — Alcaldía de Cristóbal Rojas

Panel administrativo (vanilla HTML + Firebase Realtime Database) para el censo territorial y gestión de la Alcaldía. Cada página es un archivo HTML estático con `<script type="module">` inline. **No requiere build** — se sirve directo desde GitHub Pages.

## Estructura del repo

```
alcaldia-admin/
├── index.html               · Login (entrada principal)
├── admin.html               · Dashboard de módulos (post-login)
├── *.html                   · Páginas de los módulos (consulta, registro, etc.)
│
├── logos/                   · Logos institucionales (PNG limpios sin espacios)
│   ├── cristobal-rojas.png
│   ├── yuhismar.png
│   └── psuv.png
│
├── logos-base64.js          · Logos en base64 (embedded en PDFs)
├── pdf-header.js            · Helper jsPDF para encabezado institucional
├── print-header.js          · Auto-inject de header en @media print
│
├── escritorio/              · Wrapper Electron (app Windows del panel)
│   ├── main.js, preload.js, package.json
│   └── README.md
│
├── CLAUDE.md                · Instrucciones del proyecto para Claude Code
└── .gitignore               · Excluye dumps de datos sensibles (CSV, JSON export)
```

## Páginas principales

| Página | Rol |
|---|---|
| `index.html` | Login, gate de autenticación |
| `admin.html` | Panel central con tarjetas de cada módulo |
| `consulta.html` | Búsqueda y edición de habitantes |
| `registro.html` | Alta de habitantes nuevos |
| `verificador.html` | Vista Excel-like para correcciones masivas (solo admin) |
| `estadisticas.html` | KPIs y reportes con filtros |
| `dashboard-ejecutivo.html` | Vista ejecutiva sin filtros para reuniones |
| `mapa.html` | Cartografía con pines GPS por hogar |
| `compromisos.html` | Workflow de promesas/pendientes |
| `tickets.html` | Sistema de reclamos ciudadanos |
| `constancias.html` | Generador de documentos oficiales |
| `auditoria.html` | Bitácora completa de cambios |
| `encuesta-publica.html` | Encuesta pública de Consulta Popular |
| `encuesta-resultados.html` | Panel de resultados con QR + shortlink |

## Backend

Firebase Realtime Database (proyecto `alcaldia-admin`). El `firebaseConfig` se repite inline en cada página — no hay módulo compartido.

## Notas

- Páginas HTML deben permanecer en la raíz: los URLs ya están distribuidos a operadores.
- `escritorio/` es un sub-proyecto Electron que empaqueta el panel como `.exe` para Windows.
- Los datos sensibles (export de Firebase, CSV con cédulas) están en `.gitignore`.
