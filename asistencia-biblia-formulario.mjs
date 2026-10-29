import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getDatabase,ref,push,set,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import {configuracionSala} from './asistencia-biblia-util.mjs?v=20261029';
const $=id=>document.getElementById(id), form=$('formulario'), mensaje=$('mensaje');
let db;
try { db=getDatabase(initializeApp(await configuracionSala())); } catch {mensaje.textContent='No se pudo conectar con el sistema. Revisa tu conexión y vuelve a cargar la página.';mensaje.className='mensaje error';$('enviar').disabled=true;}
const comunidades=Object.values(window.TERRITORIO?.comunidades||{}).filter(x=>x.activo&&x.nombre).map(x=>x.nombre);
for(const nombre of [...new Set(comunidades)].sort((a,b)=>a.localeCompare(b,'es'))){const opcion=document.createElement('option');opcion.value=nombre;$('comunidades').append(opcion);}
form.addEventListener('submit',async e=>{e.preventDefault();if(!db||!form.reportValidity())return;
 const nombre=$('nombre').value.trim().replace(/\s+/g,' '),apellido=$('apellido').value.trim().replace(/\s+/g,' '),cedula=$('cedula').value.trim().toUpperCase().replace(/[.\s-]/g,''),telefono=$('telefono').value.trim(),comunidad=$('comunidad').value.trim().replace(/\s+/g,' '),edad=Number($('edad').value);
 const error=(texto,id)=>{mensaje.textContent=texto;mensaje.className='mensaje error';$(id).focus();};
 if(nombre.length<2)return error('Escribe tu nombre.','nombre');if(apellido.length<2)return error('Escribe tu apellido.','apellido');if(!/^[VE]?[0-9]{4,9}$/.test(cedula))return error('Revisa la cédula: escribe de 4 a 9 números, con V o E si corresponde.','cedula');if(!/^[0-9+() .-]{7,20}$/.test(telefono)||telefono.replace(/\D/g,'').length<7)return error('Escribe un teléfono válido.','telefono');if(comunidad.length<2)return error('Escribe tu comunidad.','comunidad');if(!Number.isInteger(edad)||edad<0||edad>120)return error('Escribe una edad entre 0 y 120 años.','edad');
 $('enviar').disabled=true;mensaje.className='mensaje';mensaje.textContent='Guardando asistencia…';
 try{await set(push(ref(db,'asistencia_biblia')),{nombre,apellido,cedula,telefono,comunidad,edad,fecha_registro:serverTimestamp()});form.reset();mensaje.className='mensaje exito';mensaje.textContent='Tu asistencia fue registrada correctamente.';mensaje.focus();}catch{mensaje.className='mensaje error';mensaje.textContent='No se pudo confirmar el registro. Revisa tu conexión antes de volver a intentarlo.';}finally{$('enviar').disabled=false;}
});
if(db){mensaje.textContent='';$('enviar').disabled=false;}
