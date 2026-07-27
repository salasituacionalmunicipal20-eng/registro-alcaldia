// Auto-actualizar caché: al ENTRAR a la página, si la versión publicada es más nueva que la que el
// navegador tiene cacheada, recarga UNA sola vez para no quedar con ajustes viejos.
// SEGURIDAD DE DATOS: solo recarga si (a) el usuario NO empezó a interactuar (no perder lo tipeado en
// un formulario) y (b) la comprobación fue rápida (timeout) — así en móvil lento nunca recarga a
// mitad del llenado. Compara el ETag/Last-Modified del servidor (GitHub Pages); no estampa versión.
(function autoFresh() {
    // Si el usuario toca/tipea cualquier cosa, ya NO recargamos (protege el formulario en curso).
    let interactuo = false;
    const marcar = function () { interactuo = true; };
    ['keydown', 'input', 'change', 'submit', 'pointerdown', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, marcar, { once: true, capture: true, passive: true });
    });
    (async function () {
        try {
            const path = location.pathname;
            const ctrl = new AbortController();
            const to = setTimeout(function () { ctrl.abort(); }, 2500); // si tarda (conexión lenta), NO recarga
            const [nuevo, cache] = await Promise.all([
                fetch(path, { cache: 'no-store', signal: ctrl.signal }),      // versión fresca del servidor
                fetch(path, { cache: 'force-cache', signal: ctrl.signal })    // versión cacheada del navegador
            ]);
            clearTimeout(to);
            const tn = nuevo.headers.get('etag') || nuevo.headers.get('last-modified');
            const tc = cache.headers.get('etag') || cache.headers.get('last-modified');
            if (!interactuo && tn && tc && tn !== tc && sessionStorage.getItem('__cbAll') !== tn) {
                sessionStorage.setItem('__cbAll', tn); // evita bucles: 1 recarga por versión nueva
                location.reload();
            }
        } catch (e) { /* abort / sin conexión / file:// : se ignora, no recarga */ }
    })();
})();
