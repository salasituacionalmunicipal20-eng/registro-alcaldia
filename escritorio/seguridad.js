const ORIGEN_PANEL = 'https://salasituacional.alcaldiadecharallave.com';
const ORIGENES_ACCESO = new Set([
    ORIGEN_PANEL,
    'https://alcaldia-admin.firebaseapp.com',
    'https://accounts.google.com',
    'https://oauth2.googleapis.com'
]);

function analizarURL(valor) {
    try {
        const url = new URL(valor);
        if (url.username || url.password) return null;
        return url;
    } catch { return null; }
}

function clasificarDestino(valor) {
    const url = analizarURL(valor);
    if (!url || !['https:', 'http:'].includes(url.protocol)) return 'bloqueado';
    return ORIGENES_ACCESO.has(url.origin) ? 'interno' : 'externo';
}

function permisoPermitido(origen, permiso) {
    const url = analizarURL(origen);
    return url?.origin === ORIGEN_PANEL && [
        'geolocation', 'media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write'
    ].includes(permiso);
}

module.exports = { clasificarDestino, permisoPermitido };
