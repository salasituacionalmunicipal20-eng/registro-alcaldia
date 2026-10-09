// Edad guardada o, si falta, años cumplidos a la fecha de emisión en Venezuela.
window.edadParaFicha1x10 = function (persona, hoy = new Date()) {
    const guardada = persona?.edad;
    if ((typeof guardada === 'number' || typeof guardada === 'string') && String(guardada).trim() !== '') {
        const edad = Number(guardada);
        if (Number.isInteger(edad) && edad >= 0 && edad <= 120) return edad;
    }
    const fecha = String(persona?.fecha_nacimiento || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const nac = new Date(Date.UTC(anio, mes - 1, dia));
    if (nac.getUTCFullYear() !== anio || nac.getUTCMonth() !== mes - 1 || nac.getUTCDate() !== dia) return null;
    const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(hoy);
    const actual = Object.fromEntries(partes.map(p => [p.type, Number(p.value)]));
    const edad = actual.year - anio - ((actual.month < mes || (actual.month === mes && actual.day < dia)) ? 1 : 0);
    return edad >= 0 && edad <= 120 ? edad : null;
};
// Vista previa local: no depende de ventanas emergentes ni sube el PDF a terceros.
window.mostrarFicha1x10 = function (doc, nombreArchivo, lista) {
    const anterior = document.getElementById('vistaFicha1x10');
    if (anterior) anterior.close();
    const url = URL.createObjectURL(doc.output('blob'));
    const modal = document.createElement('dialog');
    modal.id = 'vistaFicha1x10';
    modal.setAttribute('aria-label', 'Imprimir ficha individual 1×1');
    modal.style.cssText = 'width:960px;max-width:96vw;height:90vh;max-height:90vh;padding:16px;border:0;border-radius:12px;box-sizing:border-box;';
    modal.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><strong style="flex:1">Ficha individual 1×1</strong><button type="button" data-imprimir>Imprimir ficha</button><a data-descargar>Descargar PDF</a><button type="button" data-cerrar>Cerrar</button></div><p style="font-size:14px">Revisa la ficha y pulsa Imprimir ficha. También puedes descargar el PDF para imprimirlo desde tu dispositivo.</p><iframe title="Vista previa de la ficha individual" style="width:100%;height:calc(100% - 110px);border:1px solid #cbd5e1"></iframe>';
    modal.querySelectorAll('button,a').forEach(e => { e.style.cssText = 'min-height:44px;padding:10px 14px;font:inherit;cursor:pointer;'; });
    const enlace = modal.querySelector('[data-descargar]');
    enlace.href = url;
    enlace.download = nombreArchivo;
    const marco = modal.querySelector('iframe');
    const esc = s => String(s ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fecha = v => { if (!v) return '—'; const d = new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v+'T12:00:00' : v); return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('es-VE'); };
    const campos = p => [['Nombre', [p.nombres,p.apellidos].filter(Boolean).join(' ')],['Cédula', [p.nacionalidad,p.cedula].filter(Boolean).join('-')],['Teléfono',p.telefono],['Edad',window.edadParaFicha1x10(p) !== null ? window.edadParaFicha1x10(p) + ' años' : 'No indicada'],['Género',p.genero],['Parroquia',p.parroquia],['Comuna',p.circuito],['Comunidad',p.comunidad_nombre],['Centro electoral',p.centro_electoral],['Mesas',p.mesas],['Área / dependencia',p.direccion_secretaria],['Registrado',fecha(p.fecha_registro)]];
    const fichas = lista.map(j => '<section><header>ALCALDÍA DE CRISTÓBAL ROJAS</header><h1>Ficha individual 1×10</h1><h2>Jefe 1×10</h2><dl>'+campos(j).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl><p>Firma del jefe: __________________________</p><h2>Personas vinculadas: '+j._afines.length+'</h2><table><thead><tr>'+['N.º','Cédula','Nombre y apellido','Teléfono','Edad','Género','Firma','Huella'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:Math.max(10,j._afines.length)},(_,i)=>{const p=j._afines[i]||{};return '<tr>'+[i+1,[p.nacionalidad,p.cedula].filter(Boolean).join('-'),[p.nombres,p.apellidos].filter(Boolean).join(' '),p.telefono||'',window.edadParaFicha1x10(p) !== null ? window.edadParaFicha1x10(p) + ' años' : 'No indicada',p.genero||'','',''].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';}).join('')+'</tbody></table></section>').join('');
    marco.srcdoc = '<!doctype html><html lang="es"><meta charset="utf-8"><title>Ficha individual</title><style>body{font:12px Arial;color:#0f172a;margin:20px}header{border-top:8px solid #e30613;padding:12px;background:#0a2351;color:white;font-weight:bold}h1{font-size:20px}h2{font-size:15px}dl{display:grid;grid-template-columns:1fr 1fr;gap:7px}dl div{display:flex;gap:6px}dt{font-weight:bold}dd{margin:0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #94a3b8;padding:6px;overflow-wrap:anywhere}th{background:#e2e8f0}tr{break-inside:avoid}thead{display:table-header-group}section+section{break-before:page}@page{size:letter;margin:12mm}@media print{body{margin:0}}</style>'+fichas+'</html>';

    modal.querySelector('[data-imprimir]').addEventListener('click', () => {
        try { marco.contentWindow.focus(); marco.contentWindow.print(); }
        catch (e) { alert('Tu navegador no permite imprimir desde la vista previa. Pulsa Descargar PDF y abre el archivo para imprimirlo.'); }
    });
    modal.querySelector('[data-cerrar]').addEventListener('click', () => modal.close());
    modal.addEventListener('close', () => { URL.revokeObjectURL(url); modal.remove(); }, { once: true });
    document.body.appendChild(modal);
    modal.showModal();
};
