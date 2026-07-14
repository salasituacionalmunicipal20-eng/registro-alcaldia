// Cliente de escritorio para la Sala Situacional de la Alcaldia de Cristobal Rojas.
// Envuelve el panel web (publicado en GitHub Pages) en una ventana nativa de Windows.

const { app, BrowserWindow, Menu, shell, dialog, session } = require('electron');
const path = require('path');

const URL_PRODUCCION = 'https://salasituacional.alcaldiadecharallave.com/';
const URL_PAGINA_OFFLINE = `file://${path.join(__dirname, 'renderer', 'sin-conexion.html')}`;

let ventanaPrincipal = null;

function crearVentana() {
    ventanaPrincipal = new BrowserWindow({
        width: 1366,
        height: 820,
        minWidth: 1024,
        minHeight: 640,
        backgroundColor: '#0f172a',
        title: 'Sala Situacional - Alcaldia de Cristobal Rojas',
        icon: path.join(__dirname, 'build', 'icon.ico'),
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: true
        }
    });

    Menu.setApplicationMenu(construirMenu());

    ventanaPrincipal.once('ready-to-show', () => {
        ventanaPrincipal.show();
    });

    ventanaPrincipal.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    ventanaPrincipal.webContents.on('will-navigate', (event, url) => {
        const destino = new URL(url);
        const origenPermitido = new URL(URL_PRODUCCION);
        const esMismoHost = destino.host === origenPermitido.host;
        const esFirebaseAuth = destino.host.endsWith('firebaseapp.com')
            || destino.host.endsWith('google.com')
            || destino.host.endsWith('googleapis.com');
        if (!esMismoHost && !esFirebaseAuth) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    ventanaPrincipal.webContents.on('did-fail-load', (_evt, codigo, descripcion, urlFallido) => {
        if (codigo === -3) return;
        console.error(`Fallo al cargar ${urlFallido}: ${codigo} ${descripcion}`);
        ventanaPrincipal.loadURL(URL_PAGINA_OFFLINE);
    });

    ventanaPrincipal.on('closed', () => {
        ventanaPrincipal = null;
    });

    ventanaPrincipal.loadURL(URL_PRODUCCION);
}

function construirMenu() {
    const plantilla = [
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Imprimir / Guardar como PDF',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => ventanaPrincipal && ventanaPrincipal.webContents.print()
                },
                { type: 'separator' },
                {
                    label: 'Recargar panel',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => ventanaPrincipal && ventanaPrincipal.reload()
                },
                {
                    label: 'Forzar recarga (limpiar cache)',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => ventanaPrincipal && ventanaPrincipal.webContents.reloadIgnoringCache()
                },
                { type: 'separator' },
                {
                    label: 'Salir',
                    accelerator: 'Alt+F4',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Edicion',
            submenu: [
                { role: 'undo', label: 'Deshacer' },
                { role: 'redo', label: 'Rehacer' },
                { type: 'separator' },
                { role: 'cut', label: 'Cortar' },
                { role: 'copy', label: 'Copiar' },
                { role: 'paste', label: 'Pegar' },
                { role: 'selectAll', label: 'Seleccionar todo' }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'zoomIn', label: 'Acercar' },
                { role: 'zoomOut', label: 'Alejar' },
                { role: 'resetZoom', label: 'Zoom original' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Pantalla completa' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Abrir herramientas de desarrollador',
                    accelerator: 'F12',
                    click: () => ventanaPrincipal && ventanaPrincipal.webContents.toggleDevTools()
                },
                {
                    label: 'Abrir en navegador',
                    click: () => shell.openExternal(URL_PRODUCCION)
                },
                { type: 'separator' },
                {
                    label: 'Acerca de Sala Situacional',
                    click: () => {
                        dialog.showMessageBox(ventanaPrincipal, {
                            type: 'info',
                            title: 'Acerca de Sala Situacional',
                            message: 'Sala Situacional',
                            detail: `Cliente de escritorio para el panel de la Alcaldia de Cristobal Rojas.\n\nVersion: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}`,
                            buttons: ['Cerrar']
                        });
                    }
                }
            ]
        }
    ];
    return Menu.buildFromTemplate(plantilla);
}

const lockSingleton = app.requestSingleInstanceLock();
if (!lockSingleton) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (ventanaPrincipal) {
            if (ventanaPrincipal.isMinimized()) ventanaPrincipal.restore();
            ventanaPrincipal.focus();
        }
    });

    app.whenReady().then(() => {
        session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
            const permitidos = ['geolocation', 'media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write'];
            callback(permitidos.includes(permission));
        });
        crearVentana();
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_evt, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
});
