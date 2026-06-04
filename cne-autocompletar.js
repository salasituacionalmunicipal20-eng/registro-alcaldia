// cne-autocompletar.js
//
// Se incluye en cada encuesta publica (encuesta-publica, encuesta-gobierno,
// encuesta-percepcion-gestion). Al hacer blur del input #f_cedula con
// formato valido, consulta la Edge Function `consultar-cedula` de Supabase
// y rellena automaticamente nombres, apellidos y fecha de nacimiento.
//
// Filosofia:
//   • Falla SILENCIOSA: si el CNE no encuentra la cedula o el servicio
//     esta caido, no molesta al ciudadano. Sigue llenando a mano normal.
//   • NO sobrescribe: si los campos de nombres/apellidos ya tienen algo
//     tipeado, no los toca (respeta la edicion manual).
//   • Indicador visual sutil: fondo amarillo mientras consulta, verde
//     breve al exito, vuelta al normal.
//   • Sin botones, cero fricion — la consulta se dispara automaticamente
//     al pasar al siguiente campo.

(function () {
    const SUPABASE_URL = 'https://tfbzghjjfcaqmkzsxrrs.supabase.co'
    const ENDPOINT = SUPABASE_URL + '/functions/v1/consultar-cedula'

    function activar() {
        const cedula = document.getElementById('f_cedula')
        if (!cedula) return

        cedula.addEventListener('blur', async () => {
            const raw = (cedula.value || '').trim()
            const num = raw.replace(/\D/g, '')
            if (num.length < 4 || num.length > 10) return // no parece cedula valida

            const nombres = document.getElementById('f_nombres')
            const apellidos = document.getElementById('f_apellidos')
            // Respetar lo que el ciudadano haya tipeado manualmente
            if ((nombres && nombres.value.trim()) || (apellidos && apellidos.value.trim())) return

            const nacionalidad = /^[Ee]/.test(raw) ? 'E' : 'V'
            const placeholderOriginal = cedula.placeholder
            const bgOriginal = cedula.style.background
            cedula.style.background = '#fef3c7'
            cedula.placeholder = 'Consultando CNE...'

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

                if (nombres && !nombres.value.trim()) {
                    nombres.value = [d.primer_nombre, d.segundo_nombre].filter(Boolean).join(' ').trim()
                }
                if (apellidos && !apellidos.value.trim()) {
                    apellidos.value = [d.primer_apellido, d.segundo_apellido].filter(Boolean).join(' ').trim()
                }
                const fecha = document.getElementById('f_fecha_nacimiento')
                if (fecha && d.fecha_nac && !fecha.value) {
                    fecha.value = d.fecha_nac
                    // Trigger change para que el handler de edad recalcule
                    fecha.dispatchEvent(new Event('change'))
                }
                // Flash verde de confirmacion
                cedula.style.background = '#dcfce7'
                setTimeout(() => { cedula.style.background = bgOriginal }, 1500)
            } catch (err) {
                console.warn('[CNE] consulta fallida:', err)
            } finally {
                cedula.placeholder = placeholderOriginal
                // Si terminamos con bg amarillo (sin exito), restaurar
                if (cedula.style.background === 'rgb(254, 243, 199)') {
                    cedula.style.background = bgOriginal
                }
            }
        })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activar)
    } else {
        activar()
    }
})()
