/* =====================================================================
   PROCOINE — CLASIFICACIÓN de lo que responden en el formulario
   =====================================================================
   El grado y los planteles se escriben a mano, así que llegan de mil
   formas: "1ER AÑO", "1er Año", "1° AÑO", "1 año"; "UEE CARMEN RUIZ",
   "Carmen Ruiz". Para poder contarlos hay que agruparlos, PERO sin
   adivinar (trampa 10.10 del manual):

   - Grado: se reconoce el tipo por la palabra (GRADO → primaria, AÑO →
     media, NIVEL / GRUPO / INICIAL / PREESCOLAR → inicial) y el número por
     el dígito o el ordinal romano. Si no se entiende, o trae dos números
     ("1ER o 2° GRADO"), o el número no existe en ese nivel, va a
     "Sin clasificar" con el texto tal cual, salvo lo que el usuario aclaró
     (ver ACLARADOS).
   - Plantel: se une solo lo que es literalmente el mismo nombre: sin
     mayúsculas, acentos, puntos, el tipo de plantel adelante (UEE, UEN,
     EBN, Liceo…) ni el título (Dr., Profa.), y con abreviaturas
     inequívocas desarrolladas (NTRA → NUESTRA, FCO → FRANCISCO).
     Pero NO se une un preescolar (CEIN) con una escuela o liceo del mismo
     nombre: son planteles distintos. Si alguien no puso el tipo y ese
     nombre existe como preescolar y como escuela, queda aparte, marcado
     "sin tipo de plantel".
     "POLICARPO" y "POLICARPO FARRERA" quedan APARTE; "TERESA DE BOLÍVAR 1"
     y "TERESA DE BOLÍVAR GRUPO" también: podrían ser planteles distintos.
   - Cada grupo guarda cómo lo escribió la gente, para poder auditarlo.

   Se usa en procoine-resultados.html y en las pruebas con Node.
   ===================================================================== */
(function (raiz) {
    'use strict';

    const sinAcentos = (s) => String(s == null ? '' : s).normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const limpio = (s) => sinAcentos(s).toUpperCase().replace(/\s+/g, ' ').trim();

    /* ---------------------------- GRADO ---------------------------- */

    const NIVELES = {
        inicial: { nombre: 'Educación inicial', orden: 1, maximo: 3, unidad: 'grupo' },
        primaria: { nombre: 'Primaria', orden: 2, maximo: 6, unidad: 'grado' },
        media: { nombre: 'Media', orden: 3, maximo: 5, unidad: 'año' },
        especial: { nombre: 'Educación especial', orden: 4 },
        no_escolarizado: { nombre: 'No escolarizado', orden: 5 },
        sin_clasificar: { nombre: 'Sin clasificar', orden: 9 }
    };
    const ORDINAL = { 1: '1er', 2: '2do', 3: '3er', 4: '4to', 5: '5to', 6: '6to' };

    /* Lo que el USUARIO aclaró a mano (15/09/2026). Solo se agrega aquí lo que él
       confirme: nada se deduce. La llave es el texto ya limpio (mayúsculas, sin acentos). */
    const ACLARADOS = {
        '1ER ALO': 'media|1',            /* "1er alo es primer año" */
        '9NO': 'media|9g',               /* "9no es noveno grado" (sistema anterior; va en media, sin convertirlo a año) */
        '5TO': 'media|5',                /* "5TO y 5 Años son quinto año" */
        '5 ANOS': 'media|5',
        'ECER ANO': 'media|3',           /* "ECER AÑO es tercer año" */
        /* "3er es tercer grado, 4°G GRADO es cuarto grado": es UNA sola inscripción que escribió los dos,
           así que no se escoge uno: va en primaria, en su propia fila "3er o 4to grado". */
        '3ER O 4 G GRADO': 'primaria|3o4'
        /* "TEL": el usuario no sabe a qué se refiere; se deja sin clasificar. */
    };
    /* 7mo, 8vo y 9no solo existen como grados (sistema anterior). */
    const GRADOS_VIEJOS = { '7': '7mo grado', '8': '8vo grado', '9': '9no grado' };

    function clasificarGrado(texto) {
        const original = String(texto == null ? '' : texto).trim();
        /* "2D0" y "4T0" traen un cero en vez de la letra O del ordinal. */
        const t = limpio(original).replace(/°|º/g, ' ').replace(/(\d\s?[DT])0\b/g, '$1O');
        const sin = { nivel: 'sin_clasificar', numero: null, original };
        if (!t) return { ...sin, clave: 'sin_clasificar|vacio' };
        if (ACLARADOS[t]) {
            const [nv, num] = ACLARADOS[t].split('|');
            return { nivel: nv, numero: num === '3o4' ? 3.5 : parseInt(num, 10), clave: ACLARADOS[t], original };   /* 3.5: se ordena entre 3er y 4to grado */
        }
        const viejo = t.match(/^([789])\s*(MO|VO|NO)?\s*(GRADO)?$/);
        if (viejo && (viejo[2] || viejo[3])) return { nivel: 'media', numero: Number(viejo[1]), clave: 'media|' + viejo[1] + 'g', original };
        if (/NO ESCOLARIZAD/.test(t)) return { nivel: 'no_escolarizado', numero: null, clave: 'no_escolarizado', original };
        if (/\bESPECIAL\b/.test(t)) return { nivel: 'especial', numero: null, clave: 'especial', original };

        let nivel = null;
        if (/GR\w{0,2}ADO/.test(t)) nivel = 'primaria';
        else if (/ANO\b/.test(t) && !/\bANOS\b/.test(t)) nivel = 'media';   /* "AÑO" sí; "5 AÑOS" es una edad, no un grado */
        else if (/NIVEL|GRUPO|INICIAL|PRE?ESC/.test(t)) nivel = 'inicial';
        if (!nivel) return { ...sin, clave: 'sin_clasificar|' + t };

        const digitos = [...new Set((t.match(/\d/g) || []))];
        let numero = null;
        if (digitos.length === 1) numero = Number(digitos[0]);
        else if (digitos.length === 0) {
            const romano = t.match(/\b(III|II|I)\b/);
            if (romano) numero = romano[1].length;
            else if (nivel === 'inicial' && /PRE?ESC/.test(t) && !/NIVEL|GRUPO/.test(t)) {
                return { nivel: 'inicial', numero: null, clave: 'inicial|sin_numero', original };
            }
        }
        const max = NIVELES[nivel].maximo;
        if (!numero || numero < 1 || numero > max) return { ...sin, clave: 'sin_clasificar|' + t };
        return { nivel, numero, clave: nivel + '|' + numero, original };
    }

    function nombreGrado(clave) {
        const [nivel, numero] = String(clave).split('|');
        if (nivel === 'sin_clasificar') return numero === 'vacio' ? 'No indicó el grado' : 'Sin clasificar';
        const n = NIVELES[nivel];
        if (!n) return clave;
        if (!n.unidad) return n.nombre;
        if (numero === 'sin_numero') return 'Sin decir el grupo';
        if (/^[789]g$/.test(numero)) return GRADOS_VIEJOS[numero[0]] + ' (sistema anterior)';
        if (numero === '3o4') return '3er o 4to grado (lo escribieron así)';
        return `${ORDINAL[numero]} ${n.unidad}`;
    }

    /* --------------------------- PLANTEL --------------------------- */

    const PAISES = ['COLOMBIA', 'CHILE', 'ECUADOR', 'PERU', 'ARGENTINA', 'BRASIL', 'PANAMA', 'MEXICO', 'ESPANA', 'ESTADOS UNIDOS',
        'EEUU', 'USA', 'REPUBLICA DOMINICANA', 'TRINIDAD Y TOBAGO', 'TRINIDAD', 'BOLIVIA', 'URUGUAY', 'PARAGUAY', 'COSTA RICA',
        'CUBA', 'ITALIA', 'PORTUGAL', 'CANADA', 'GUYANA', 'ARUBA', 'CURAZAO'];

    /* Tipos de plantel que van adelante del nombre, con su familia. Del más largo al más corto.
       "GE" / "GRUPO ESCOLAR" NO se quitan: en "Teresa de Bolívar" distinguen un plantel de otro. */
    const PREFIJOS = [
        ['CENTRO DE EDUCACION INICIAL', 'inicial'], ['UNIDAD EDUCATIVA NACIONAL BOLIVARIANA', 'escuela'], ['UNIDAD EDUCATIVA NACIONAL', 'escuela'],
        ['UNIDAD EDUCATIVA ESTADAL', 'escuela'], ['UNIDAD EDUCATIVA PRIVADA', 'escuela'], ['UNIDAD EDUCATIVA BOLIVARIANA', 'escuela'],
        ['UNIDAD EDUCATIVA', 'escuela'], ['ESCUELA BASICA NACIONAL', 'escuela'], ['ESCUELA BASICA ESTADAL', 'escuela'], ['ESCUELA BASICA', 'escuela'],
        ['COMPLEJO EDUCATIVO', 'escuela'], ['CONCENTRACION ESCOLAR', 'escuela'], ['CONC ESC', 'escuela'],
        ['U E P', 'escuela'], ['U E E', 'escuela'], ['U E N', 'escuela'], ['U E', 'escuela'], ['E B N', 'escuela'], ['E B', 'escuela'],
        ['UENB', 'escuela'], ['UEEB', 'escuela'], ['UEP', 'escuela'], ['UEE', 'escuela'], ['UEN', 'escuela'], ['UEM', 'escuela'], ['UE', 'escuela'],
        ['UN', 'escuela'], ['EBN', 'escuela'], ['EBE', 'escuela'], ['EBM', 'escuela'], ['EBB', 'escuela'], ['EB', 'escuela'],
        ['LICEO', 'escuela'], ['COLEGIO', 'escuela'], ['ESCUELA', 'escuela'], ['IE', 'escuela'], ['CEE', 'escuela'], ['CE', 'escuela'],
        ['CEINB', 'inicial'], ['CEIN', 'inicial'], ['CEIE', 'inicial'], ['CEI', 'inicial'], ['EEI', 'inicial'], ['SIMONCITO', 'inicial'],
        ['CEN', 'cen']
    ];
    const TITULOS = ['DRA', 'DR', 'PROFA', 'PROF', 'LICDA', 'LIC', 'SRTA', 'SRA', 'SR', 'GRAL', 'MONS', 'PBRO'];
    const ABREVIATURAS = { NTRA: 'NUESTRA', NTRO: 'NUESTRO', NTROS: 'NUESTROS', NTRAS: 'NUESTRAS', SRA: 'SENORA', FCO: 'FRANCISCO',
        SGDO: 'SAGRADO', STA: 'SANTA', STO: 'SANTO', GRAL: 'GENERAL', MCAL: 'MARISCAL' };
    const ROMANO_FINAL = { I: '1', II: '2', III: '3' };

    /* Lo que queda de un plantel después de limpiar: su nombre y su familia (vacía si no dijeron el tipo). */
    function analizarPlantel(texto) {
        const original = String(texto == null ? '' : texto).trim();
        let t = limpio(original).replace(/[.,;:()"'`´\-_/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!t) return { tipo: 'vacio', original };

        /* "EXT / CHILE" es un extranjero; "EXT TERESA DE BOLIVAR" es una extensión. */
        const sinExt = t.replace(/^EXT(RANJERO)?\b\s*/, '');
        if (PAISES.includes(sinExt)) return { tipo: 'exterior', pais: sinExt, original };
        t = t.replace(/^EXT\b/, 'EXTENSION');

        let familia = '';
        for (let vuelta = 0; vuelta < 2; vuelta++) {
            let quitado = false;
            for (const [p, fam] of PREFIJOS) {
                const re = new RegExp('^' + p + '\\b\\s+');
                if (re.test(t) && t.replace(re, '').trim().length >= 3) {
                    t = t.replace(re, '').trim();
                    if (!familia) familia = fam;   /* manda el primer tipo que se escribió */
                    quitado = true; break;
                }
            }
            if (!quitado) break;
        }
        for (const ti of TITULOS) {
            const re = new RegExp('^' + ti + '\\b\\s+');
            if (re.test(t) && t.replace(re, '').trim().length >= 3) { t = t.replace(re, '').trim(); break; }
        }
        const palabras = t.split(' ').map(w => ABREVIATURAS[w] || w);
        const ultima = palabras[palabras.length - 1];
        if (palabras.length > 1 && ROMANO_FINAL[ultima]) palabras[palabras.length - 1] = ROMANO_FINAL[ultima];
        return { tipo: 'plantel', nombre: palabras.join(' '), familia, original };
    }

    const FAMILIA_TXT = { inicial: 'preescolar', escuela: 'escuela o liceo', cen: 'CEN' };

    /* Arma, con TODAS las respuestas, a qué grupo va cada forma escrita. Se
       hace sobre todo el conjunto (no sobre lo filtrado) para que un plantel
       tenga siempre el mismo grupo, se filtre como se filtre. */
    function indicePlanteles(textos) {
        const analizados = new Map();
        const familiasPorNombre = new Map();
        for (const x of textos) {
            const k = String(x == null ? '' : x).trim();
            if (analizados.has(k)) continue;
            const a = analizarPlantel(k);
            analizados.set(k, a);
            if (a.tipo === 'plantel' && a.familia) {
                if (!familiasPorNombre.has(a.nombre)) familiasPorNombre.set(a.nombre, new Set());
                familiasPorNombre.get(a.nombre).add(a.familia);
            }
        }
        const claveDe = (texto) => {
            const k = String(texto == null ? '' : texto).trim();
            const a = analizados.get(k) || analizarPlantel(k);
            if (a.tipo === 'vacio') return { clave: 'vacio', etiqueta: null };
            if (a.tipo === 'exterior') return { clave: 'exterior|' + a.pais, etiqueta: 'En el exterior: ' + a.pais.charAt(0) + a.pais.slice(1).toLowerCase() };
            const familias = familiasPorNombre.get(a.nombre) || new Set();
            if (a.familia) return { clave: 'plantel|' + a.familia + '|' + a.nombre, etiqueta: null };
            if (familias.size === 1) return { clave: 'plantel|' + [...familias][0] + '|' + a.nombre, etiqueta: null };
            if (familias.size === 0) return { clave: 'plantel||' + a.nombre, etiqueta: null };
            return { clave: 'plantel|?|' + a.nombre, etiqueta: null, sinTipo: true };
        };
        return claveDe;
    }

    /* --------------------------- EDAD --------------------------- */

    /* La edad escrita; si no la pusieron pero hay fecha de nacimiento, se
       calcula al día en que se inscribió (y se marca como calculada). */
    function edadDe(r, ahora) {
        const e = r.est_edad;
        if (e !== undefined && e !== null && e !== '' && Number.isFinite(Number(e))) return { edad: Number(e), calculada: false };
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(r.est_fecha_nac || ''));
        if (!m) return { edad: null, calculada: false };
        const ref = new Date(r.fecha_registro || ahora || Date.now());
        let edad = ref.getFullYear() - Number(m[1]);
        if (ref.getMonth() + 1 < Number(m[2]) || (ref.getMonth() + 1 === Number(m[2]) && ref.getDate() < Number(m[3]))) edad--;
        return edad >= 0 && edad <= 30 ? { edad, calculada: true } : { edad: null, calculada: false };
    }

    const RANGOS = [
        { clave: '0-2', nombre: '0 a 2 años', min: 0, max: 2 },
        { clave: '3-5', nombre: '3 a 5 años (edad de inicial)', min: 3, max: 5 },
        { clave: '6-11', nombre: '6 a 11 años (edad de primaria)', min: 6, max: 11 },
        { clave: '12-17', nombre: '12 a 17 años (edad de media)', min: 12, max: 17 },
        { clave: '18+', nombre: '18 años o más', min: 18, max: 999 }
    ];
    const rangoDe = (edad) => (edad == null ? null : RANGOS.find(x => edad >= x.min && edad <= x.max) || null);

    /* ------------------------- AGRUPAR TODO ------------------------- */

    const cupoDe = (r) => [r.est_institucion_requiere, r.est_institucion_requiere_2, r.est_institucion_requiere_3].filter(Boolean);
    const indiceDe = (regs) => indicePlanteles(regs.flatMap(r => [r.est_institucion_estudia, ...cupoDe(r)]));

    function sumar(mapa, clave, original, extra) {
        if (!mapa.has(clave)) mapa.set(clave, { clave, total: 0, variantes: new Map(), ...extra });
        const g = mapa.get(clave);
        g.total++;
        const v = original || '(vacío)';
        g.variantes.set(v, (g.variantes.get(v) || 0) + 1);
        return g;
    }
    /* El nombre que se muestra es la forma escrita más usada. */
    function cerrar(g) {
        const variantes = [...g.variantes.entries()].sort((a, b) => b[1] - a[1]);
        let nombre = g.nombre || variantes[0][0];
        if (g.sinTipo) nombre += ' (sin tipo de plantel)';
        return { ...g, variantes, nombre };
    }

    /* regs: las inscripciones a contar (ya filtradas). indice: el de indiceDe(TODAS). */
    function clasificar(regs, ahora, indice) {
        const claveDe = indice || indiceDe(regs);
        const total = regs.length;
        const grados = new Map(), edades = new Map(), rangos = new Map(), estudia = new Map(), cupo1 = new Map(), cupoTodas = new Map();
        let sinEdad = 0, edadCalculada = 0;

        for (const r of regs) {
            const g = clasificarGrado(r.est_grado);
            const grupo = sumar(grados, g.clave, g.original, { nivel: g.nivel, numero: g.numero, nombre: nombreGrado(g.clave), edades: [] });
            const { edad, calculada } = edadDe(r, ahora);
            if (edad == null) sinEdad++; else { grupo.edades.push(edad); if (calculada) edadCalculada++; }
            const claveEdad = edad == null ? 'sin' : String(edad);
            sumar(edades, claveEdad, claveEdad, { edad, nombre: edad == null ? 'No indicó' : `${edad} año${edad === 1 ? '' : 's'}` });
            const rango = rangoDe(edad);
            sumar(rangos, rango ? rango.clave : 'sin', '', { nombre: rango ? rango.nombre : 'No indicó la edad', orden: rango ? RANGOS.indexOf(rango) : 99 });

            const pe = claveDe(r.est_institucion_estudia);
            sumar(estudia, pe.clave, String(r.est_institucion_estudia || '').trim(),
                { nombre: pe.clave === 'vacio' ? 'No indicó dónde estudia' : pe.etiqueta, sinTipo: pe.sinTipo });

            const opciones = cupoDe(r);
            if (opciones[0]) { const p1 = claveDe(opciones[0]); sumar(cupo1, p1.clave, opciones[0]); }
            const vistas = new Set();
            for (const o of opciones) {
                const p = claveDe(o);
                if (vistas.has(p.clave)) continue;       /* la misma escuela en dos opciones cuenta una vez */
                vistas.add(p.clave);
                sumar(cupoTodas, p.clave, String(o).trim(), { nombre: p.etiqueta, sinTipo: p.sinTipo });
            }
        }

        const porGrado = [...grados.values()].map(cerrar).map(g => {
            const e = g.edades.slice().sort((a, b) => a - b);
            return { ...g, nivelNombre: NIVELES[g.nivel].nombre, nivelOrden: NIVELES[g.nivel].orden,
                edadMin: e.length ? e[0] : null, edadMax: e.length ? e[e.length - 1] : null,
                edadPromedio: e.length ? Math.round((e.reduce((a, b) => a + b, 0) / e.length) * 10) / 10 : null, conEdad: e.length };
        }).sort((a, b) => (a.nivelOrden - b.nivelOrden) || ((a.numero || 99) - (b.numero || 99)) || (b.total - a.total));

        const niveles = Object.entries(NIVELES).map(([clave, n]) => ({
            clave, nombre: n.nombre, orden: n.orden, total: porGrado.filter(g => g.nivel === clave).reduce((a, g) => a + g.total, 0)
        })).filter(n => n.total > 0).sort((a, b) => a.orden - b.orden);

        const primeraOpcion = new Map([...cupo1.values()].map(g => [g.clave, g.total]));
        return {
            total, sinEdad, edadCalculada, niveles, porGrado,
            porEdad: [...edades.values()].map(cerrar).sort((a, b) => (a.edad == null) - (b.edad == null) || a.edad - b.edad),
            porRango: [...rangos.values()].map(cerrar).sort((a, b) => a.orden - b.orden),
            porEstudia: [...estudia.values()].map(cerrar).sort((a, b) => (a.clave === 'vacio') - (b.clave === 'vacio') || b.total - a.total || a.nombre.localeCompare(b.nombre)),
            porCupo: [...cupoTodas.values()].map(cerrar).map(g => ({ ...g, primera: primeraOpcion.get(g.clave) || 0 }))
                .sort((a, b) => b.total - a.total || b.primera - a.primera || a.nombre.localeCompare(b.nombre))
        };
    }

    const API = { clasificarGrado, nombreGrado, analizarPlantel, indicePlanteles, indiceDe, edadDe, rangoDe, RANGOS, NIVELES, FAMILIA_TXT, clasificar, cupoDe };
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
    raiz.PROCOINE_CLASIFICACION = API;
})(typeof window !== 'undefined' ? window : globalThis);
