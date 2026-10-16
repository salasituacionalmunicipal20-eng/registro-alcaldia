const texto=v=>String(v??'').trim().replace(/\s+/g,' ');
export function identidad(id,p={}) {
  const original=texto(p.cedula||(/^[VE]?[-\s]?\d+$/i.test(id)?id:''));
  const cedula=original.replace(/^[VE][-\s]*/i,'').replace(/[.\s-]/g,'').replace(/^0+(?=\d)/,'');
  const nacionalidad=texto(p.nacionalidad||(/^E/i.test(original)?'E':'V')).toUpperCase();
  return /^\d{4,10}$/.test(cedula)&&/^[VE]$/.test(nacionalidad)?{id:nacionalidad+'_'+cedula,cedula,nacionalidad}:null;
}
