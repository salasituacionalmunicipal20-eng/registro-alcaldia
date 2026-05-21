// Preload minimo. El panel web no necesita APIs nativas por ahora;
// dejamos este archivo listo por si en el futuro hay que exponer algo via contextBridge.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('salaSituacional', {
    esEscritorio: true,
    plataforma: process.platform
});
