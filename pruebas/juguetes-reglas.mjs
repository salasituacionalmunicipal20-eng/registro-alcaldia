// Ejecutar únicamente con el emulador de Firebase y datos ficticios.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { registrarMovimiento } from '../juguetes-core.mjs';
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) throw new Error('Se requiere el emulador local.');
assert.deepEqual(JSON.parse(fs.readFileSync('firebase-rules.json','utf8')).rules.juguetes_municipio,JSON.parse(fs.readFileSync('pruebas/juguetes-reglas-emulador.json','utf8')).rules.juguetes_municipio,'Las reglas del emulador deben coincidir con las del proyecto.');
const url='https://demo-juguetes-default-rtdb.firebaseio.com';
const admin=initializeApp({projectId:'demo-juguetes',databaseURL:url},'semilla');
const operador=initializeApp({projectId:'demo-juguetes',databaseURL:url,databaseAuthVariableOverride:{uid:'operador',token:{email:'operador@example.test'}}},'operador');
const gestor=initializeApp({projectId:'demo-juguetes',databaseURL:url,databaseAuthVariableOverride:{uid:'gestor',token:{email:'gestor@example.test'}}},'gestor');
const anonimo=initializeApp({projectId:'demo-juguetes',databaseURL:url,databaseAuthVariableOverride:null},'anonimo');
const db=getDatabase(admin);
try {
  await db.ref('operadores').set({gestor:{rol:'admin'},operador:{rol:'operador'}});
  const nuevo={inventario:{MU1:{descripcion:'Muñeca',caja:2,unidad:0}},movimientos:{m1:{id:'m1',tipo:'recepcion',codigo:'MU1',descripcion:'Muñeca',cantidad:2,presentacion:'caja',responsable:'Conductor',telefono_responsable:'123',dueno:'Dueño',telefono_dueno:'456',fecha:'2026-10-27',usuario:'gestor'}},asignaciones:{n1:{cantidad:1,descripcion:'Muñeca',fecha:'2026-10-27',usuario:'gestor'}}};
  await getDatabase(gestor).ref('juguetes_municipio').set(nuevo);
  assert.equal((await getDatabase(gestor).ref('juguetes_municipio/inventario/MU1/caja').once('value')).val(),2);
  await new Promise(resolve => getDatabase(gestor).ref('juguetes_municipio').on('value',resolve));
  const salida={...nuevo.movimientos.m1,id:'m2',tipo:'salida',cantidad:1,comuna:'Comuna A',comunidad:'La Chivera'};
  const transaccion=await getDatabase(gestor).ref('juguetes_municipio').transaction(actual=>registrarMovimiento(actual,salida).estado);
  assert.equal(transaccion.committed,true);
  assert.equal((await getDatabase(gestor).ref('juguetes_municipio/inventario/MU1/caja').once('value')).val(),1);
  assert.equal((await getDatabase(gestor).ref('juguetes_municipio/movimientos/m2/comunidad').once('value')).val(),'La Chivera');
  await assert.rejects(getDatabase(anonimo).ref('juguetes_municipio').once('value'));
  await assert.rejects(getDatabase(operador).ref('juguetes_municipio').once('value'));
  await assert.rejects(getDatabase(operador).ref('juguetes_municipio').set(nuevo));
  await assert.rejects(getDatabase(gestor).ref('juguetes_municipio/inventario/MU1/caja').set(-1));
  await assert.rejects(getDatabase(gestor).ref('juguetes_municipio/asignaciones/n1/cantidad').set(1001));
  console.log('Reglas: administrador permitido; acceso anónimo, operador y datos inválidos rechazados.');
} finally {await Promise.all([admin,operador,gestor,anonimo].map(deleteApp));}
