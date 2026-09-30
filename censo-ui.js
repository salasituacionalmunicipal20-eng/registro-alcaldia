/* Controles independientes por ficha; nunca se deduce el domicilio del CNE. */
const C=window.Censo,F=window.Formularios,e=F.escapar;
export function persona(contenedor, prefijo, valores={}) {
  contenedor.innerHTML='<div class="campos-publicos">'+C.campos.map(c=>{
    const id=prefijo+'-'+c.rol,atr=`id="${id}" data-rol="${c.rol}" ${c.obligatorio?'required':''}`;
    const select=['lista','nacionalidad','parroquia','comuna','comunidad'].includes(c.tipo);
    const control=select?`<select ${atr}><option value="">Selecciona…</option>${c.tipo==='nacionalidad'?'<option value="V">Venezolana</option><option value="E">Extranjera</option>':c.tipo==='lista'?F.opciones(c).map(v=>`<option>${e(v)}</option>`).join(''):''}</select>`:c.tipo==='parrafo'?`<textarea ${atr} maxlength="3000" rows="2"></textarea>`:`<input ${atr} type="${c.tipo==='telefono'?'tel':c.tipo==='fecha'?'date':'text'}" maxlength="${c.tipo==='cedula'?10:300}" ${c.tipo==='cedula'?'inputmode="numeric" pattern="[0-9]{5,10}"':''} autocomplete="off">`;
    return `<div class="campo ${c.tipo==='parrafo'?'ancho':''}"><label for="${id}">${e(c.etiqueta)}${c.obligatorio?' *':''}</label>${control}</div>`;
  }).join('')+'</div>';
  const el=k=>contenedor.querySelector('[data-rol="'+k+'"]');
  const territorio=Object.values(window.TERRITORIO.comunidades).filter(x=>x.activo!==false);
  const poblar=(k,vals)=>{el(k).innerHTML='<option value="">Selecciona…</option>'+[...new Set(vals)].sort((a,b)=>a.localeCompare(b,'es')).map(v=>`<option value="${e(v)}">${e(v)}</option>`).join('');};
  poblar('parroquia',territorio.map(x=>x.parroquia));
  el('parroquia').onchange=()=>{poblar('comuna',territorio.filter(x=>x.parroquia===el('parroquia').value).map(x=>x.circuito_comunal));poblar('comunidad',[]);};
  el('comuna').onchange=()=>poblar('comunidad',territorio.filter(x=>x.parroquia===el('parroquia').value&&x.circuito_comunal===el('comuna').value).map(x=>x.nombre));
  for(const c of C.campos){el(c.rol).value=valores[c.rol]||'';if(['parroquia','comuna'].includes(c.rol))el(c.rol).dispatchEvent(new Event('change'));}
  if(window.CNEDateas)window.CNEDateas.enganchar(el('cedula'),{soloIdentidad:true,nacEl:el('nacionalidad'),onData:d=>{if(String(d.cedula).replace(/\D/g,'')!==el('cedula').value.replace(/\D/g,''))return;['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido'].forEach(k=>{if(!el(k).value.trim()&&typeof d[k]==='string'){el(k).value=d[k];el(k).dispatchEvent(new Event('input',{bubbles:true}));}});}});
}
export function recoger(contenedor){return Object.fromEntries(C.campos.map(c=>[c.rol,contenedor.querySelector('[data-rol="'+c.rol+'"]').value.trim()]));}
export function enlaces(id){const url=new URL('censo.html?id='+id,location.href).href,panel=new URL('censo-panel.html?id='+id,location.href).href;return `<div class="campo"><label>Enlace para registrar responsables y personas</label><input readonly value="${e(url)}" onclick="this.select()"></div><div class="acciones"><button type="button" data-copiar="${e(url)}">Copiar enlace</button><a class="boton primario" href="${e(url)}" target="_blank" rel="noopener">Abrir formulario</a><a class="boton" href="https://wa.me/?text=${encodeURIComponent(url)}" target="_blank" rel="noopener">Compartir por WhatsApp</a><a class="boton" href="${e(panel)}">Abrir panel del censo</a></div><a class="boton" href="https://api.qrserver.com/v1/create-qr-code/?size=600x600&amp;download=1&amp;data=${encodeURIComponent(url)}" target="_blank" rel="noopener">Descargar QR</a><img alt="QR del formulario" width="180" height="180" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}">`;}
export function copiar(contenedor){contenedor.querySelectorAll('[data-copiar]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copiar);b.textContent='Enlace copiado';}catch{b.textContent='Selecciona y copia el enlace de arriba';}});}
