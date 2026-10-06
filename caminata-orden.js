// El orden manual del listado conserva la fecha y el número de inscripción.
export function ordenarInscripciones(registros) {
    const lista = [...registros].sort((a,b)=>(b.fecha_registro||0)-(a.fecha_registro||0));
    for (const r of [...lista]) {
        if (!r.despues_de || r.despues_de === r.id || !lista.some(a=>a.id===r.despues_de)) continue;
        const indice = lista.findIndex(a=>a.id===r.id);
        lista.splice(indice,1);
        const referencia = lista.findIndex(a=>a.id===r.despues_de);
        lista.splice(referencia+1,0,r);
    }
    return lista;
}
