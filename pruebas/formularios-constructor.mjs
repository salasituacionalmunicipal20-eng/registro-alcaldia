/* Verifica reglas reales con registros sintéticos aislados, sin cambiar usuarios
   ni registros municipales. Limpieza obligatoria incluso si falla una prueba. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
const require=createRequire(import.meta.url),F=require('../formularios-core.js');
const SA='C:/Users/carlo/Documents/Alcaldia BDD/alcaldia-admin-firebase-adminsdk-fbsvc-207472a5bd.json';
const DB='https://alcaldia-admin-default-rtdb.firebaseio.com';
const API_KEY='AIzaSyCEqiu5ypPSGbS6nzju6VZtd2RIRYRDmGU';
const app=initializeApp({credential:cert(JSON.parse(fs.readFileSync(SA,'utf8'))),databaseURL:DB}),db=getDatabase(app),auth=getAuth(app);
const id='prueba-constructor-'+Date.now(),privado=id+'-privado';let ok=0,adminPrueba=null;
const prueba=(nombre,valor)=>{assert.ok(valor,nombre);ok++;console.log('OK '+nombre);};
async function token(uid){const custom=await auth.createCustomToken(uid);const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+API_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});const j=await r.json();assert.ok(j.idToken,'Autenticación de prueba');return j.idToken;}
async function rest(ruta,valor,tk){const r=await fetch(DB+'/'+ruta+'.json'+(tk?'?auth='+encodeURIComponent(tk):''),valor===undefined?{}:{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(valor)});return {ok:r.ok,status:r.status};}
const clave=n=>('-prueba-'+String(n)).padEnd(20,'x');
const valores=(tipo='Sí')=>({...Object.fromEntries(F.claves.map(k=>[k,''])),c01:'Prueba',c02:tipo,c03:18,c04:'Jornada A'});
const registro=(v=valores())=>({valores:v,version:1,creado_en:{'.sv':'timestamp'}});
const def=()=>({titulo:'Prueba técnica del constructor',descripcion:'Datos sintéticos de verificación. Se retiran al finalizar.',mensaje:'Prueba registrada.',activo:true,publicado:true,acceso:'publico',lectura:'carlos',creado_en:{'.sv':'timestamp'},actualizado_en:{'.sv':'timestamp'},campos:F.empaquetar([F.campo('texto','Nombre de prueba',{obligatorio:true}),F.campo('sino','¿Requiere transporte?',{filtro:true}),F.campo('numero','Cantidad',{minimo:0,maximo:100}),F.campo('lista','Actividad',{opciones:'|Jornada A|Jornada B|'}),F.campo('sino','Atendido',{uso:'panel',filtro:true})])});
try{
  const carlos=await auth.getUserByEmail('carlos.admin@alcaldia.com');const tk=await token(carlos.uid);
  const robot=await auth.getUserByEmail('robot-gforms@alcaldia.com');const robotTk=await token(robot.uid);
  prueba('generar definición y publicar como Carlos',(await rest('formularios_definiciones/'+id,def(),tk)).ok);
  prueba('público lee definición',(await rest('formularios_definiciones/'+id)).ok);
  prueba('público no enumera definiciones',!(await rest('formularios_definiciones')).ok);
  prueba('público no publica formularios',!(await rest('formularios_definiciones/'+privado,def())).ok);
  prueba('otra cuenta no publica formularios',!(await rest('formularios_definiciones/'+privado,def(),robotTk)).ok);
  prueba('cualquier persona registra respuesta válida',(await rest('formularios_respuestas/'+id+'/'+clave(1),registro())).ok);
  prueba('otra respuesta No',(await rest('formularios_respuestas/'+id+'/'+clave(2),registro(valores('No')))).ok);
  prueba('Sí/No opcional vacío',(await rest('formularios_respuestas/'+id+'/'+clave(3),registro(valores('')))).ok);
  prueba('público no lee respuestas',!(await rest('formularios_respuestas/'+id)).ok);
  prueba('otra cuenta no lee respuestas privadas',!(await rest('formularios_respuestas/'+id,undefined,robotTk)).ok);
  prueba('Carlos lee resultados',(await rest('formularios_respuestas/'+id,undefined,tk)).ok);
  prueba('no se puede sobrescribir registro',!(await rest('formularios_respuestas/'+id+'/'+clave(1),registro(valores('No')))).ok);
  prueba('no se puede borrar registro desde formulario',!(await rest('formularios_respuestas/'+id+'/'+clave(1),null)).ok);
  prueba('Sí/No rechaza valores ajenos',!(await rest('formularios_respuestas/'+id+'/'+clave(4),registro(valores('Tal vez')))).ok);
  prueba('campo obligatorio vacío rechazado',!(await rest('formularios_respuestas/'+id+'/'+clave(5),registro({...valores(),c01:''}))).ok);
  const omitido=valores();delete omitido.c01;
  prueba('campo obligatorio omitido rechazado',!(await rest('formularios_respuestas/'+id+'/'+clave(6),registro(omitido))).ok);
  prueba('número fuera de rango rechazado',!(await rest('formularios_respuestas/'+id+'/'+clave(7),registro({...valores(),c03:101}))).ok);
  prueba('opción de lista desconocida rechazada',!(await rest('formularios_respuestas/'+id+'/'+clave(8),registro({...valores(),c04:'Otra'}))).ok);
  prueba('campo no usado no puede recibir datos',!(await rest('formularios_respuestas/'+id+'/'+clave(9),registro({...valores(),c06:'Dato no autorizado'}))).ok);
  prueba('público no rellena seguimiento administrativo',!(await rest('formularios_respuestas/'+id+'/'+clave(13),registro({...valores(),c05:'Sí'}))).ok);
  const estado={valor:'Sí',actualizado_en:{'.sv':'timestamp'},por:carlos.uid};
  prueba('Carlos guarda seguimiento Sí',(await rest('formularios_seguimiento/'+id+'/'+clave(1)+'/c05',estado,tk)).ok);
  prueba('público no modifica seguimiento',!(await rest('formularios_seguimiento/'+id+'/'+clave(1)+'/c05',estado)).ok);
  prueba('seguimiento rechaza valor ajeno',!(await rest('formularios_seguimiento/'+id+'/'+clave(1)+'/c05',{...estado,valor:'Tal vez'},tk)).ok);
  prueba('seguimiento no cambia pregunta pública',!(await rest('formularios_seguimiento/'+id+'/'+clave(1)+'/c02',estado,tk)).ok);
  adminPrueba=await auth.createUser({uid:id+'-admin'});await db.ref('operadores/'+adminPrueba.uid).set({rol:'admin'});const adminTk=await token(adminPrueba.uid);
  prueba('otro administrador no lee resultados de Carlos',!(await rest('formularios_respuestas/'+id,undefined,adminTk)).ok);
  await db.ref('formularios_definiciones/'+id+'/lectura').set('administradores');
  prueba('administrador lee resultado con permiso',(await rest('formularios_respuestas/'+id,undefined,adminTk)).ok);
  prueba('administrador actualiza seguimiento con permiso',(await rest('formularios_seguimiento/'+id+'/'+clave(1)+'/c05',{...estado,valor:'No',por:adminPrueba.uid},adminTk)).ok);
  const existente=(await db.ref('formularios_definiciones/'+id).get()).val();
  prueba('no alterar campo después de recibir respuestas',!(await rest('formularios_definiciones/'+id,{...existente,actualizado_en:{'.sv':'timestamp'},campos:{...existente.campos,c01:{...existente.campos.c01,etiqueta:'Otra pregunta'}}},tk)).ok);
  prueba('se pueden editar instrucciones con respuestas',(await rest('formularios_definiciones/'+id,{...existente,descripcion:'Instrucciones actualizadas.',actualizado_en:{'.sv':'timestamp'}},tk)).ok);
  await db.ref('formularios_definiciones/'+id+'/activo').set(false);
  prueba('cerrar recepción rechaza nuevos registros',!(await rest('formularios_respuestas/'+id+'/'+clave(10),registro())).ok);
  const d=def();d.acceso='administradores';
  prueba('publicar formulario interno',(await rest('formularios_definiciones/'+privado,d,tk)).ok);
  prueba('interno no expone definición al público',!(await rest('formularios_definiciones/'+privado)).ok);
  prueba('interno no admite registros públicos',!(await rest('formularios_respuestas/'+privado+'/'+clave(11),registro())).ok);
  prueba('interno admite registro de Carlos',(await rest('formularios_respuestas/'+privado+'/'+clave(12),registro(),tk)).ok);
  const rows=[{creado_en:Date.now(),valores:valores('Sí')},{creado_en:Date.now(),valores:valores('No')},{creado_en:Date.now(),valores:valores('')}];
  prueba('filtro Sí es exacto',F.filtrar(rows,def(),{c02:'Sí'}).length===1);
  prueba('filtro No es exacto',F.filtrar(rows,def(),{c02:'No'}).length===1);
  prueba('sin respuesta no se confunde con No',F.filtrar(rows,def(),{c02:'__sin_respuesta__'}).length===1);
  const tabla=F.tabla(def(),rows);prueba('exportaciones cuadradas',tabla.filas.every(r=>r.length===tabla.encabezados.length));
  console.log(ok+' verificaciones correctas.');
}finally{
  await db.ref().update({['formularios_definiciones/'+id]:null,['formularios_respuestas/'+id]:null,['formularios_seguimiento/'+id]:null,['formularios_definiciones/'+privado]:null,['formularios_respuestas/'+privado]:null,...(adminPrueba?{['operadores/'+adminPrueba.uid]:null}:{})});
  if(adminPrueba)await auth.deleteUser(adminPrueba.uid);
  assert.equal((await db.ref('formularios_definiciones/'+id).get()).exists(),false);console.log('Datos sintéticos retirados y ausencia comprobada.');await deleteApp(app);
}
