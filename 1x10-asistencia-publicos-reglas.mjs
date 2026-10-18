export function reglasRegistrosPublicos1x10(){
  const admin="auth != null && (auth.token.email === 'carlos.admin@alcaldia.com' || root.child('operadores').child(auth.uid).child('rol').val() === 'admin')";
  const campos={};
  for(const campo of ['nombre','comuna','comunidad','centro'])campos[campo]={'.validate':"newData.isString() && newData.val().length >= 1 && newData.val().length <= 160"};
  return {'.read':admin,'$persona':{'.read':true,
    '.write':"(!data.exists() && newData.exists() && !root.child('directorio_1x10').child($persona).exists()) || ("+admin+")",
    '.validate':"$persona.matches(/^[VE]_[0-9]{4,10}$/) && newData.hasChildren(['nombre','comuna','comunidad','centro','registrado_en','registrado_por'])",
    ...campos,registrado_en:{'.validate':'newData.isNumber() && (data.exists() || (newData.val() <= now && newData.val() >= now - 60000))'},
    registrado_por:{'.validate':"newData.isString() && (newData.val() === 'publico' || (auth != null && newData.val() === auth.uid))"},
    '$otro':{'.validate':false}}};
}
