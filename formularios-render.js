/* La vista previa y el formulario público comparten exactamente los mismos campos. */
(function () {
  const F = window.Formularios, e = F.escapar;
  function renderizar(contenedor, def, { preview = false } = {}) {
    let seccion = '';
    contenedor.innerHTML = '<h1>' + e(def.titulo || 'Tu formulario') + '</h1><p class="muted" style="white-space:pre-wrap">' + e(def.descripcion) + '</p><p class="obligatorio-aviso">Los campos con * son obligatorios.</p><div class="campos-publicos">' + F.campos(def).filter(([,c])=>c.uso!=='panel').map(([id, c]) => {
      let titulo = '';
      if (c.seccion && c.seccion !== seccion) { seccion = c.seccion; titulo = '<h2 class="seccion">' + e(seccion) + '</h2>'; }
      const atr = `id="${id}" name="${id}" ${c.obligatorio ? 'required' : ''} aria-describedby="ayuda-${id}"`;
      let control;
      if (c.tipo === 'sino') control = `<fieldset class="sino" style="border:0;padding:0;margin:0" id="${id}" aria-label="${e(c.etiqueta)}"><legend class="hidden">${e(c.etiqueta)}</legend>${['Sí', 'No'].map(v => `<label><input type="radio" name="${id}" value="${v}" ${c.obligatorio ? 'required' : ''}>${v}</label>`).join('')}</fieldset>${!c.obligatorio ? '<button type="button" class="limpiar-sino" data-id="'+id+'">Quitar respuesta</button>' : ''}`;
      else if (['lista', 'nacionalidad', 'parroquia', 'comuna', 'comunidad'].includes(c.tipo)) {
        const ops = c.tipo === 'lista' ? F.opciones(c) : c.tipo === 'nacionalidad' ? ['V', 'E'] : [];
        control = `<select ${atr}><option value="">Selecciona…</option>${ops.map(v => `<option value="${e(v)}">${e(v === 'V' ? 'Venezolana' : v === 'E' ? 'Extranjera' : v)}</option>`).join('')}</select>`;
      } else if (c.tipo === 'parrafo') control = `<textarea ${atr} maxlength="3000" rows="4"></textarea>`;
      else {
        const tipo = { correo: 'email', telefono: 'tel', fecha: 'date', numero: 'number' }[c.tipo] || 'text';
        control = `<input ${atr} type="${tipo}" maxlength="300" ${c.tipo === 'cedula' ? 'inputmode="numeric" pattern="[0-9]{5,10}"' : ''} ${c.tipo === 'numero' ? 'step="any" min="'+c.minimo+'" max="'+c.maximo+'"' : ''} autocomplete="${c.rol === 'primer_nombre' ? 'given-name' : c.rol === 'primer_apellido' ? 'family-name' : c.tipo === 'telefono' ? 'tel' : c.tipo === 'correo' ? 'email' : 'off'}">`;
      }
      return titulo + `<div class="campo ${c.tipo === 'parrafo' || c.tipo === 'sino' ? 'ancho' : ''}"><label ${c.tipo === 'sino' ? '' : 'for="'+id+'"'}>${e(c.etiqueta)}${c.obligatorio ? ' <span class="requerido">*</span>' : ''}</label>${control}<p class="ayuda" id="ayuda-${id}">${e(c.ayuda)}</p></div>`;
    }).join('') + `</div>${preview ? '' : '<button class="primario" id="enviar" type="submit">Enviar registro</button><p class="ayuda">Revisa tus datos antes de enviarlos.</p>'}`;
    contenedor.querySelectorAll('.limpiar-sino').forEach(b => b.onclick = () => contenedor.querySelectorAll('input[name="'+b.dataset.id+'"]').forEach(r => r.checked = false));
    const porRol = rol => { const c = F.campos(def).find(([, c]) => c.rol === rol); return c ? contenedor.querySelector('#' + c[0]) : null; };
    const comunidades = Object.values(window.TERRITORIO?.comunidades || {}).filter(c => c.activo !== false);
    const parroquia = porRol('parroquia'), comuna = porRol('comuna'), comunidad = porRol('comunidad');
    const poblar = (el, vals) => { if (el) el.innerHTML = '<option value="">Selecciona…</option>' + [...new Set(vals)].sort((a,b)=>a.localeCompare(b,'es')).map(v => '<option value="'+e(v)+'">'+e(v)+'</option>').join(''); };
    poblar(parroquia, comunidades.map(c => c.parroquia));
    if (parroquia) parroquia.onchange = () => { poblar(comuna, comunidades.filter(c => c.parroquia === parroquia.value).map(c => c.circuito_comunal)); poblar(comunidad, []); };
    if (comuna) comuna.onchange = () => poblar(comunidad, comunidades.filter(c => c.parroquia === parroquia?.value && c.circuito_comunal === comuna.value).map(c => c.nombre));
    if (!preview && window.CNEDateas) {
      const cedula = porRol('cedula'), nac = porRol('nacionalidad');
      if (cedula) window.CNEDateas.enganchar(cedula, { nacEl: nac, onData: d => ['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido'].forEach(rol => { const el = porRol(rol); if (el && !el.value.trim() && typeof d[rol] === 'string') { el.value = d[rol]; el.dispatchEvent(new Event('input', {bubbles:true})); } }) });
    }
  }
  function recoger(contenedor, def) {
    const valores = Object.fromEntries(F.claves.map(id => [id, '']));
    for (const [id,c] of F.campos(def).filter(([,c])=>c.uso!=='panel')) {
      const el = c.tipo === 'sino' ? contenedor.querySelector('input[name="'+id+'"]:checked') : contenedor.querySelector('#'+id);
      const bruto = (el?.value || '').trim();
      valores[id] = c.tipo === 'numero' && bruto !== '' ? Number(bruto) : bruto;
      const error = F.validarValor(c, valores[id]);
      if (error) { (el || contenedor.querySelector('input[name="'+id+'"]'))?.focus(); throw new Error(error); }
    }
    return valores;
  }
  window.FormulariosRender = { renderizar, recoger };
})();
