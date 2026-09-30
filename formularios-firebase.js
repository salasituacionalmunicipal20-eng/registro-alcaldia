import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, push, onValue, serverTimestamp, runTransaction } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
const config = {
            apiKey: "AIzaSyCEqiu5ypPSGbS6nzju6VZtd2RIRYRDmGU",
            authDomain: "alcaldia-admin.firebaseapp.com",
            databaseURL: "https://alcaldia-admin-default-rtdb.firebaseio.com",
            projectId: "alcaldia-admin",
            storageBucket: "alcaldia-admin.firebasestorage.app",
            messagingSenderId: "945828226894",
            appId: "1:945828226894:web:0efeebeb270357e6f5201f",
            measurementId: "G-P4QSQR0XGE"
        };
const app = getApps()[0] || initializeApp(config);
export const auth = getAuth(app), db = getDatabase(app);
export { ref, get, set, update, push, onValue, serverTimestamp, runTransaction };
export const SUPER = 'carlos.admin@alcaldia.com';
export function sesion() { return new Promise(resolve => { const off = onAuthStateChanged(auth, u => { off(); resolve(u); }); }); }
export async function administrador(user) { if (!user) return false; if (user.email === SUPER) return true; const s = await get(ref(db, 'operadores/'+user.uid)).catch(()=>null); return s?.val()?.rol === 'admin'; }
export const idFormulario = () => { const id = new URLSearchParams(location.search).get('id'); if (!/^[a-z0-9-]{3,60}$/.test(id || '')) throw new Error('El enlace del formulario no es v?lido.'); return id; };
export function mensaje(texto, tipo='') { const el=document.getElementById('mensaje'); el.textContent=texto; el.className='mensaje '+tipo; el.hidden=!texto; if(texto) el.scrollIntoView({block:'nearest',behavior:'smooth'}); }
export const enlace = (pagina,id) => new URL(pagina+'?id='+encodeURIComponent(id),location.href).href;
