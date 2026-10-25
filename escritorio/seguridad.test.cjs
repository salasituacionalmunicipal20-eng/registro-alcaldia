const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clasificarDestino, permisoPermitido } = require('./seguridad');
const fs = require('node:fs');
const vm = require('node:vm');

test('navegación interna limitada al panel HTTPS y sus proveedores de acceso exactos', () => {
    for (const url of ['https://salasituacional.alcaldiadecharallave.com/index.html', 'https://alcaldia-admin.firebaseapp.com/__/auth/handler', 'https://accounts.google.com/o/oauth2/auth']) assert.equal(clasificarDestino(url), 'interno');
    for (const url of ['https://evilgoogle.com', 'https://otra.firebaseapp.com', 'http://salasituacional.alcaldiadecharallave.com', 'https://salasituacional.alcaldiadecharallave.com:8443']) assert.equal(clasificarDestino(url), 'externo');
});

test('rechaza protocolos locales, ejecutables, credenciales incrustadas y URL inválidas', () => {
    for (const url of ['javascript:alert(1)', 'file:///C:/Windows/System32/cmd.exe', 'ms-msdt:/id', 'data:text/html,test', 'https://usuario:clave@accounts.google.com', 'no es una URL']) assert.equal(clasificarDestino(url), 'bloqueado');
});

test('permisos sensibles solo para el origen HTTPS exacto del panel', () => {
    assert.equal(permisoPermitido('https://salasituacional.alcaldiadecharallave.com/panel', 'media'), true);
    for (const origen of ['https://evilgoogle.com', 'https://accounts.google.com', 'http://salasituacional.alcaldiadecharallave.com', 'file:///panel', 'https://salasituacional.alcaldiadecharallave.com.ejemplo.com']) assert.equal(permisoPermitido(origen, 'media'), false);
    assert.equal(permisoPermitido('https://salasituacional.alcaldiadecharallave.com', 'midiSysex'), false);
});

test('la ventana aplica los controles a navegación, redirecciones, ventanas y permisos', async () => {
    const eventos = {}, externos = [], permisos = {};
    let opciones;
    class Ventana {
        constructor(config) {
            opciones = config;
            this.webContents = {
                on: (nombre, fn) => { eventos[nombre] = fn; },
                setWindowOpenHandler: fn => { eventos.abrir = fn; }
            };
        }
        once() {} on() {} loadURL() {}
    }
    const electron = {
        app: { requestSingleInstanceLock: () => true, on() {}, whenReady: () => Promise.resolve(), quit() {} },
        BrowserWindow: Ventana,
        Menu: { buildFromTemplate: x => x, setApplicationMenu() {} },
        shell: { openExternal: url => { externos.push(url); return Promise.resolve(); } },
        dialog: {},
        session: { defaultSession: {
            setPermissionCheckHandler: fn => { permisos.comprobar = fn; },
            setPermissionRequestHandler: fn => { permisos.solicitar = fn; }
        } }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./main'), 'utf8'), {
        require: nombre => nombre === 'electron' ? electron : require(nombre),
        __dirname, URL, console, process: { platform: 'win32' }
    });
    await Promise.resolve();
    assert.equal(opciones.webPreferences.nodeIntegration, false);
    assert.equal(opciones.webPreferences.contextIsolation, true);
    assert.equal(opciones.webPreferences.sandbox, true);
    for (const nombre of ['will-navigate', 'will-redirect']) {
        let detenido = false;
        eventos[nombre]({ preventDefault() { detenido = true; } }, 'file:///C:/Windows/System32/cmd.exe');
        assert.equal(detenido, true);
        assert.equal(externos.length, 0);
    }
    eventos['will-navigate']({ preventDefault() {} }, 'https://evilgoogle.com');
    assert.equal(externos.at(-1), 'https://evilgoogle.com');
    assert.equal(eventos.abrir({ url: 'javascript:alert(1)' }).action, 'deny');
    assert.equal(externos.length, 1);
    assert.equal(permisos.comprobar(null, 'media', 'https://otra.firebaseapp.com'), false);
    let permitido;
    permisos.solicitar({ getURL: () => 'https://salasituacional.alcaldiadecharallave.com/' }, 'media', valor => { permitido = valor; }, { requestingUrl: 'https://evilgoogle.com', isMainFrame: false });
    assert.equal(permitido, false);
});
