// print-header.js
// Inyecta automaticamente el cintillo institucional con los 3 logos al body.
// Visible SOLO al imprimir (@media print). Idempotente.
//
// Uso: incluir el script una sola vez en el HTML, antes o despues del cuerpo:
//   <script type="module" src="print-header.js"></script>
//
// El elemento queda con id="print-header-inj" y title editable via:
//   document.getElementById('ph-titulo').textContent = 'Reporte de Asistencia'
//   document.getElementById('ph-subtitulo').textContent = 'Periodo Marzo 2026'
//
// Los logos van inline en base64 para evitar dependencias externas al imprimir
// y para que el PDF generado por el navegador no falle si esta offline.
import { LOGO_CRISTOBAL_ROJAS, LOGO_YUHISMAR, LOGO_PSUV } from './logos-base64.js';

const CSS = `
.print-header-institucional { display: none; }
@media print {
    .print-header-institucional {
        display: block !important;
        margin-bottom: 14px;
        padding-bottom: 12px;
        border-bottom: 2px solid #0a2351;
        page-break-after: avoid;
    }
    .ph-cintillo {
        background: #0a2351;
        color: white;
        padding: 5px 12px;
        font-size: 9.5px;
        letter-spacing: 1.2px;
        text-align: center;
        font-weight: 700;
        text-transform: uppercase;
    }
    .ph-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px 4px;
    }
    .ph-logo-cr { height: 64px; width: auto; object-fit: contain; }
    .ph-logo-psuv { height: 48px; width: auto; object-fit: contain; }
    .ph-logo-yu { height: 22px; width: auto; object-fit: contain; margin-top: 6px; }
    .ph-center { text-align: center; flex: 1; padding: 0 8px; }
    .ph-center h1 {
        margin: 0; font-size: 14px; color: #0a2351;
        font-weight: 800; letter-spacing: 0.3px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    }
    .ph-center p {
        margin: 2px 0 0; font-size: 10px; color: #555;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    }
    .ph-titulo-doc {
        text-align: left; margin-top: 10px; padding: 0 14px;
        border-left: 3px solid #d4a017; padding-left: 10px;
    }
    .ph-titulo-doc strong { color: #0a2351; font-size: 13px; }
    .ph-titulo-doc span { display: block; color: #64748b; font-size: 11px; margin-top: 2px; }
}
`;

function buildHTML() {
    const div = document.createElement('div');
    div.className = 'print-header-institucional';
    div.id = 'print-header-inj';
    div.innerHTML = `
        <div class="ph-cintillo">Republica Bolivariana de Venezuela &middot; Estado Miranda &middot; Alcaldia del Municipio Cristobal Rojas</div>
        <div class="ph-row">
            <img class="ph-logo-cr" src="${LOGO_CRISTOBAL_ROJAS}" alt="">
            <div class="ph-center">
                <h1>Despacho de la Alcaldesa</h1>
                <p>Sala Situacional &middot; Sistema de Integracion Territorial</p>
                <img class="ph-logo-yu" src="${LOGO_YUHISMAR}" alt="">
            </div>
            <img class="ph-logo-psuv" src="${LOGO_PSUV}" alt="">
        </div>
        <div class="ph-titulo-doc" id="ph-titulo-doc" style="display:none;">
            <strong id="ph-titulo">Reporte</strong>
            <span id="ph-subtitulo"></span>
        </div>
    `;
    return div;
}

export function inyectarHeaderImpresion(opts = {}) {
    if (!document.getElementById('print-styles-inj')) {
        const style = document.createElement('style');
        style.id = 'print-styles-inj';
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    let header = document.getElementById('print-header-inj');
    if (!header) {
        header = buildHTML();
        document.body.insertBefore(header, document.body.firstChild);
    }
    // Si llamaron pasando titulo/subtitulo, los pone visibles
    if (opts.titulo || opts.subtitulo) {
        const cont = document.getElementById('ph-titulo-doc');
        if (cont) cont.style.display = 'block';
        if (opts.titulo) document.getElementById('ph-titulo').textContent = opts.titulo;
        if (opts.subtitulo) document.getElementById('ph-subtitulo').textContent = opts.subtitulo;
    }
}

/** Llamar JUSTO antes de window.print() si queres titulo dinamico. */
window.inyectarHeaderImpresion = inyectarHeaderImpresion;

// Auto-inject al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => inyectarHeaderImpresion());
} else {
    inyectarHeaderImpresion();
}
