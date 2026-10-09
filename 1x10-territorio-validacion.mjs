import {nombreTerritorial} from './1x10-nombres-territoriales.mjs?v=20261010-residencial-unificada';

const esGenerico = valor => /^otros?$/i.test(String(valor ?? '').trim());
export const comunaCorregida = valor => nombreTerritorial(valor, 'comuna');

// Las listas nuevas conservan los identificadores de las comunidades reales.
export function prepararCatalogo1x10(catalogo) {
    const comunidades = Object.fromEntries(Object.entries(catalogo.comunidades || {})
        .filter(([, c]) => c.activo && !esGenerico(c.nombre) && !esGenerico(c.circuito_comunal))
        .map(([slug, c]) => [slug, {...c, circuito_comunal:comunaCorregida(c.circuito_comunal),
            centro_electoral:nombreTerritorial(c.centro_electoral, 'centro')} ]));
    return {...catalogo, comunidades};
}

// La comunidad debe pertenecer a la comuna y parroquia seleccionadas.
export function territorioValido(catalogo, parroquia, comuna, comunidadSlug) {
    if (![parroquia, comuna, comunidadSlug].every(v => typeof v === 'string' && v.trim())) return false;
    const comunidad = catalogo?.comunidades?.[comunidadSlug];
    return !!comunidad?.activo && !esGenerico(comuna) && !esGenerico(comunidad.nombre) && comunidad.parroquia === parroquia
        && comunidad.circuito_comunal === comuna && !!comunidad.nombre?.trim();
}

// Guardar siempre la ubicación del afín, aunque viva en la comunidad del jefe.
export function camposTerritoriales(catalogo, parroquia, comuna, comunidadSlug) {
    if (!territorioValido(catalogo, parroquia, comuna, comunidadSlug)) throw Error('Selecciona una comuna y una comunidad válidas.');
    const comunidad = catalogo.comunidades[comunidadSlug];
    const campos = {parroquia, circuito:comuna, comunidad_slug:comunidadSlug, comunidad_nombre:comunidad.nombre};
    if (comunidad.centro_electoral) campos.centro_electoral = comunidad.centro_electoral;
    if (comunidad.mesas != null && comunidad.mesas !== '') campos.mesas = comunidad.mesas;
    return campos;
}
