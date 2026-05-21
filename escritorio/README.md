# Sala Situacional - Cliente de Escritorio (Windows)

App de Windows que envuelve el panel web de la Sala Situacional de la Alcaldia de Cristobal Rojas en una ventana nativa. La app carga el sitio publicado en GitHub Pages, asi que los operadores siempre ven la version actualizada sin reinstalar.

## Requisitos

- [Node.js 20+](https://nodejs.org/) (incluye `npm`)
- Windows 10/11 x64

## Primera vez (preparar el equipo de desarrollo)

```powershell
cd escritorio
npm install
```

Esto descarga Electron y electron-builder a `node_modules/` (no se commitea).

## Probar la app en modo desarrollo

```powershell
npm start
```

Se abre la ventana nativa cargando el panel en linea. `F12` abre las DevTools.

## Generar el instalador .exe para distribuir

1. Coloca el icono final en `build/icon.ico` (256x256 o multi-resolucion, formato ICO).
   - Si no existe, electron-builder usa el icono por defecto de Electron.
   - Puedes generar uno desde un PNG con cualquier conversor online.
2. Ejecuta:

```powershell
npm run build:win
```

3. El instalador queda en `dist/SalaSituacional-Setup-1.0.0.exe`. Es un instalador NSIS en espanol que:
   - Permite elegir carpeta de instalacion.
   - Crea acceso directo en escritorio y menu inicio.
   - Instala por usuario (no requiere admin).
   - No borra datos al desinstalar.

## Distribuir a los operadores

Comparte el archivo `SalaSituacional-Setup-1.0.0.exe` por el medio que prefieras (correo, Drive, USB). Al ejecutarlo se instala la app. Como no esta firmado digitalmente, Windows SmartScreen mostrara una advertencia la primera vez ("Mas informacion" -> "Ejecutar de todas formas"). Para eliminar esa advertencia se necesita un certificado de firma de codigo (costo anual aprox. 200-400 USD).

## Actualizaciones

Como la app carga el sitio en linea, **cada cambio que pusheas a `main` queda disponible automaticamente** para todos los operadores cuando recarguen (`Ctrl+R`) o reinicien la app. Solo necesitas redistribuir el instalador si cambias el codigo nativo (`main.js`, version de Electron, etc).

## Estructura

```
escritorio/
├── package.json        Configuracion y dependencias
├── main.js             Proceso principal de Electron (ventana, menu, navegacion)
├── preload.js          Puente seguro al renderer (vacio por ahora)
├── renderer/
│   └── sin-conexion.html   Pantalla de fallback cuando no hay internet
├── build/
│   └── icon.ico        Icono de la app (pendiente de colocar)
└── dist/               Salida del build (generada, no commitear)
```

## Notas tecnicas

- `contextIsolation: true` y `nodeIntegration: false`: el panel web no tiene acceso a APIs nativas, solo al objeto `window.salaSituacional` expuesto por `preload.js`.
- `setWindowOpenHandler`: cualquier link a un dominio externo se abre en el navegador del sistema, no dentro de la app.
- `will-navigate`: solo permite navegar a GitHub Pages y dominios de Firebase Auth. Otros links salen al navegador.
- `requestSingleInstanceLock`: evita abrir la app dos veces, en su lugar enfoca la ventana existente.
