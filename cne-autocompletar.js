// cne-autocompletar.js
//
// Auto-completar nombres / apellidos / fecha de nacimiento al hacer blur del
// campo de cédula. Soporta multiples formularios del proyecto:
//
//   1. ENCUESTAS publicas (encuesta-publica, encuesta-gobierno,
//      encuesta-percepcion-gestion): IDs con prefijo "f_" y plural
//      (f_cedula, f_nombres, f_apellidos, f_fecha_nacimiento).
//
//   2. REGISTRO de habitante / jefe de hogar (registro.html, formulario
//      principal): IDs en singular sin prefijo (cedula, nombre, apellido,
//      fecha_nacimiento).
//
//   3. REGISTRO de dependiente (registro.html, modal): IDs en singular
//      con prefijo "m_" (m_cedula, m_nombre, m_apellido, m_fecha_nacimiento).
//
// El listener blur convive con cualquier listener input/change existente
// (en registro.html hay un input listener en cedula que actualiza el radar
// de presencia — este script NO lo pisa).
//
// Filosofia:
//   - Falla SILENCIOSA: si el CNE no encuentra la cedula o el servicio
//     esta caido, no molesta. El operador llena a mano.
//   - NO sobrescribe: si los campos de nombre/apellido ya tienen algo
//     tipeado, no los toca (respeta la edicion manual).
//   - Indicador visual sutil: fondo amarillo mientras consulta, verde
//     breve al exito.
//   - Despues de llenar fecha_nacimiento, dispara event "change" para que
//     handlers existentes (ej. calculo de edad en registro.html) corran.

(function () {
    const SUPABASE_URL = 'https://tfbzghjjfcaqmkzsxrrs.supabase.co'
    const ENDPOINT = SUPABASE_URL + '/functions/v1/consultar-cedula'

    // Validador de fecha del CNE. Descarta:
    //   - "0000-00-00" (placeholder que el CNE usa cuando NO tiene la fecha real)
    //   - Formato distinto de YYYY-MM-DD
    //   - Anos absurdos (antes de 1900 o muy lejanos al futuro)
    // Bug que se filtraba antes: el batch del actualizador escribia "0000-00-00"
    // tal cual a Firebase, sobreescribiendo fechas validas con basura.
    function esFechaCneValida(f) {
        if (!f || typeof f !== 'string') return false
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false
        if (f === '0000-00-00') return false
        const anio = parseInt(f.substring(0, 4), 10)
        if (anio < 1900 || anio > 2030) return false
        const mes = parseInt(f.substring(5, 7), 10)
        if (mes < 1 || mes > 12) return false
        const dia = parseInt(f.substring(8, 10), 10)
        if (dia < 1 || dia > 31) return false
        return true
    }

    // Mapeos: para cada input de cedula posible, los IDs de los campos
    // relacionados que vamos a llenar. Si el HTML no tiene alguno, no pasa nada.
    // El campo `donde_vota` (Centro de Votación) se llena con el
    // centro_electoral del CNE. La UBCH NO se toca — se queda como el
    // operador la asigna a mano.
    const MAPEOS = [
        // Encuestas publicas (prefijo f_, plural) - no tienen donde_vota
        { cedula: 'f_cedula', nombre: 'f_nombres', apellido: 'f_apellidos', fecha: 'f_fecha_nacimiento', nacionalidad: null, donde_vota: null },
        // Registro habitante (formulario principal, jefe de hogar)
        { cedula: 'cedula', nombre: 'nombre', apellido: 'apellido', fecha: 'fecha_nacimiento', nacionalidad: 'nacionalidad', donde_vota: 'donde_vota' },
        // Registro dependiente (modal, prefijo m_)
        { cedula: 'm_cedula', nombre: 'm_nombre', apellido: 'm_apellido', fecha: 'm_fecha_nacimiento', nacionalidad: 'm_nacionalidad', donde_vota: 'm_donde_vota' },
        // Modulo 1x10: registro de JEFE de patrulla
        { cedula: "jefe_cedula", nombre: "jefe_nombres", apellido: "jefe_apellidos", fecha: null, nacionalidad: "jefe_nacionalidad", donde_vota: null }
    ]

    function nacionalidadDe(raw, mapeo) {
        // 1) Si hay un <select id="nacionalidad"> y tiene valor, usarlo.
        if (mapeo.nacionalidad) {
            const sel = document.getElementById(mapeo.nacionalidad)
            const v = sel && (sel.value || '').toUpperCase()
            if (v === 'E' || v === 'V') return v
        }
        // 2) Si la cedula viene prefijada con E (ej "E12345"), usar E.
        if (/^[Ee]/.test(raw)) return 'E'
        // 3) Default V.
        return 'V'
    }

    function listenerBlur(mapeo) {
        return async function () {
            const cedulaEl = this
            const raw = (cedulaEl.value || '').trim()
            const num = raw.replace(/\D/g, '')
            if (num.length < 4 || num.length > 10) return

            const nombreEl = mapeo.nombre ? document.getElementById(mapeo.nombre) : null
            const apellidoEl = mapeo.apellido ? document.getElementById(mapeo.apellido) : null
            const fechaEl = mapeo.fecha ? document.getElementById(mapeo.fecha) : null
            const dondeVotaEl = mapeo.donde_vota ? document.getElementById(mapeo.donde_vota) : null

            // Respetar lo que el operador haya tipeado manualmente
            if ((nombreEl && nombreEl.value.trim()) || (apellidoEl && apellidoEl.value.trim())) return

            const nacionalidad = nacionalidadDe(raw, mapeo)
            const placeholderOriginal = cedulaEl.placeholder
            const bgOriginal = cedulaEl.style.background
            cedulaEl.style.background = '#fef3c7'
            cedulaEl.placeholder = 'Consultando CNE...'

            try {
                const resp = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cedula: num, nacionalidad })
                })
                if (!resp.ok) {
                    console.warn('[CNE] HTTP', resp.status)
                    return
                }
                const json = await resp.json()
                if (json && json.error) {
                    if (json.error_str !== 'RECORD_NOT_FOUND') {
                        console.warn('[CNE] error_str:', json.error_str)
                    }
                    return
                }
                const d = json && json.data
                if (!d) return

                if (nombreEl && !nombreEl.value.trim()) {
                    nombreEl.value = [d.primer_nombre, d.segundo_nombre].filter(Boolean).join(' ').trim()
                    nombreEl.dispatchEvent(new Event('input', { bubbles: true }))
                }
                if (apellidoEl && !apellidoEl.value.trim()) {
                    apellidoEl.value = [d.primer_apellido, d.segundo_apellido].filter(Boolean).join(' ').trim()
                    apellidoEl.dispatchEvent(new Event('input', { bubbles: true }))
                }
                // Validar fecha del CNE: descartar "0000-00-00", formato invalido
                // o anos absurdos. Bug conocido: el CNE devuelve "0000-00-00" como
                // placeholder cuando no tiene la fecha real, NO la fecha actual.
                if (fechaEl && esFechaCneValida(d.fecha_nac) && !fechaEl.value) {
                    fechaEl.value = d.fecha_nac
                    fechaEl.dispatchEvent(new Event('change', { bubbles: true }))
                }
                // Centro de Votación = centro_electoral del CNE.
                // Solo lo llena si el campo esta visible (puede estar oculto si
                // la persona es menor de edad y aun no tiene CV asignado) y vacio.
                if (dondeVotaEl && d.cne && d.cne.centro_electoral && !dondeVotaEl.value.trim()) {
                    dondeVotaEl.value = d.cne.centro_electoral
                }
                // Flash verde breve de confirmacion
                cedulaEl.style.background = '#dcfce7'
                setTimeout(() => { cedulaEl.style.background = bgOriginal }, 1500)
            } catch (err) {
                console.warn('[CNE] consulta fallida:', err)
            } finally {
                cedulaEl.placeholder = placeholderOriginal
                // Si terminamos sin exito, restaurar fondo
                if (cedulaEl.style.background === 'rgb(254, 243, 199)') {
                    cedulaEl.style.background = bgOriginal
                }
            }
        }
    }

    function activar() {
        for (const mapeo of MAPEOS) {
            const cedulaEl = document.getElementById(mapeo.cedula)
            if (!cedulaEl) continue
            // Marca para no doble-registrar si activar() se llama dos veces
            if (cedulaEl.dataset.cneAutocompletar === '1') continue
            cedulaEl.dataset.cneAutocompletar = '1'
            cedulaEl.addEventListener('blur', listenerBlur(mapeo))
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activar)
    } else {
        activar()
    }

    // Exponer activar() globalmente para paginas que inyectan inputs de cedula
    // DESPUES del DOMContentLoaded (ej. 1x10.html que construye los 10 inputs
    // del paso 3 cuando el usuario hace click en Continuar). Sin esto, los
    // inputs nuevos no tienen el listener blur y el CNE nunca se consulta.
    window._cneActivarMapeos = activar

    // Modulo 1x10: bloques de afin son dinamicos (el operador agrega/elimina
    // a voluntad). Para que el listener blur se registre en inputs creados
    // DESPUES del DOMContentLoaded, observamos mutaciones en el DOM y por cada
    // input nuevo cuyo id sea afin_cedula_<n>, registramos el listener.
    function registrarMapeoAfinPorId(idCedula) {
      const m = /^afin_cedula_(\d+)$/.exec(idCedula);
      if (!m) return;
      const n = m[1];
      const cedulaEl = document.getElementById(idCedula);
      if (!cedulaEl) return;
      if (cedulaEl.dataset.cneAutocompletar === "1") return;
      cedulaEl.dataset.cneAutocompletar = "1";
      const mapeo = {
        cedula: idCedula,
        nombre: `afin_nombres_${n}`,
        apellido: `afin_apellidos_${n}`,
        fecha: `afin_fecha_${n}`,
        nacionalidad: `afin_nacionalidad_${n}`,
        donde_vota: null
      };
      cedulaEl.addEventListener("blur", listenerBlur(mapeo));
    }
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          // Buscar inputs afin_cedula_<n> dentro del nodo recien agregado
          if (node.id && /^afin_cedula_\d+$/.test(node.id)) {
            registrarMapeoAfinPorId(node.id);
          }
          const nested = node.querySelectorAll ? node.querySelectorAll("input[id^=\"afin_cedula_\"]") : [];
          nested.forEach(el => registrarMapeoAfinPorId(el.id));
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Tambien escanear al cargar por si los bloques ya estan en el DOM (edicion)
    document.querySelectorAll("input[id^=\"afin_cedula_\"]").forEach(el => registrarMapeoAfinPorId(el.id));
})()
