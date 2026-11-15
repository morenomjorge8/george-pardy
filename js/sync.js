/* Sincronización: Firebase Realtime Database por salas, o modo local con localStorage. */
import { firebaseConfig } from './config-firebase.js';
import { normalizarConfig, estadoBase } from './estado.js';

const VERSION_FIREBASE = '12.6.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSION_FIREBASE}`;
/* Sin letras ni números que se confundan: I, L, O, 0, 1 */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LS_SALA = 'georgepardy-sala';

export const firebaseConfigurado = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);

/* 'conectando' | 'db' (sincronizado) | 'offline' (sin conexión) | 'local' | 'sin-sala' */
let modo = 'conectando';
let motivoLocal = firebaseConfigurado ? '' : 'sin-config';
let salaInexistente = false;
let sala = null;
let salaActiva = false;
let offset = 0;
let fb = null;
let avisos = { alEstado: () => {}, alConfig: () => {}, alModo: () => {} };

export const modoActual = () => modo;
export const motivoModoLocal = () => motivoLocal;
export const salaActual = () => sala;
export const salaNoExiste = () => salaInexistente;
export const puedeCrearSala = () => !!fb;
/* Hora del servidor (en modo local, la de este dispositivo) */
export const ahora = () => Date.now() + offset;

function ponerModo(m) {
  if (modo === m) return;
  modo = m;
  avisos.alModo(m);
}

/* ---------- localStorage ---------- */
const lsClave = tipo => `georgepardy-${sala || 'local'}-${tipo}`;
function leerLocal(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function guardarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

/* ---------- Códigos de sala ---------- */
export const normalizarCodigo = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const codigoValido = c => typeof c === 'string' && c.length === 6 && [...c].every(ch => ALFABETO.includes(ch));
function nuevoCodigo() {
  const n = new Uint32Array(6);
  crypto.getRandomValues(n);
  return [...n].map(x => ALFABETO[x % ALFABETO.length]).join('');
}
function leerSala() {
  const enUrl = normalizarCodigo(new URLSearchParams(location.search).get('sala'));
  if (codigoValido(enUrl)) { guardarLocal(LS_SALA, enUrl); return enUrl; }
  const guardada = leerLocal(LS_SALA);
  if (codigoValido(guardada)) {
    const u = new URL(location.href);
    u.searchParams.set('sala', guardada);
    history.replaceState(null, '', u);
    return guardada;
  }
  return null;
}
/* Cambia de sala recargando la página con ?sala=XXXXXX (se queda en la misma vista) */
export function irASala(codigo) {
  guardarLocal(LS_SALA, codigo);
  const u = new URL(location.href);
  u.searchParams.set('sala', codigo);
  location.href = u.toString();
}
export function salirDeSala() {
  try { localStorage.removeItem(LS_SALA); } catch (e) { /* nada */ }
  const u = new URL(location.href);
  u.searchParams.delete('sala');
  u.hash = '';
  location.href = u.toString();
}

async function cargarConfigInicial() {
  try {
    const r = await fetch('datos/config-inicial.json', { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

const conTiempo = (promesa, ms) => Promise.race([promesa, new Promise((_, no) => setTimeout(() => no(new Error('tiempo')), ms))]);

/* ---------- Arranque ---------- */
export async function iniciar(cb) {
  avisos = { ...avisos, ...cb };
  window.addEventListener('storage', alCambiarStorage);
  if (!firebaseConfigurado) return iniciarLocal();

  sala = leerSala();
  /* Lo último que se vio de esta sala, para mostrar algo mientras conecta */
  if (sala) {
    const c = leerLocal(lsClave('config')), e = leerLocal(lsClave('estado'));
    if (c) avisos.alConfig(c);
    if (e) avisos.alEstado(e);
  }
  try {
    await conTiempo(cargarFirebase(), 15000);
  } catch (err) {
    console.warn('No se pudo conectar con Firebase; se usa el modo local.', err);
    motivoLocal = 'error';
    return iniciarLocal();
  }
  if (!sala) { ponerModo('sin-sala'); return; }
  await entrarSala();
}

async function iniciarLocal() {
  let c = leerLocal(lsClave('config'));
  if (!c) { c = await cargarConfigInicial(); if (c) guardarLocal(lsClave('config'), normalizarConfig(c)); }
  avisos.alConfig(c);
  avisos.alEstado(leerLocal(lsClave('estado')));
  ponerModo('local');
}

/* Dos ventanas de la misma computadora se sincronizan con el evento storage */
function alCambiarStorage(e) {
  if (modo !== 'local') return;
  if (e.key === lsClave('estado')) avisos.alEstado(leerLocal(e.key));
  else if (e.key === lsClave('config')) avisos.alConfig(leerLocal(e.key));
}

async function cargarFirebase() {
  const [app, auth, base] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-database.js`)
  ]);
  const aplicacion = app.initializeApp(firebaseConfig);
  await auth.signInAnonymously(auth.getAuth(aplicacion));
  const db = base.getDatabase(aplicacion);
  fb = { db, ref: base.ref, get: base.get, set: base.set, onValue: base.onValue };

  let yaConecto = false;
  fb.onValue(fb.ref(db, '.info/connected'), s => {
    if (!salaActiva) return;
    if (s.val() === true) { yaConecto = true; ponerModo('db'); }
    else ponerModo(yaConecto ? 'offline' : 'conectando');
  });
  /* Corrige la diferencia de reloj entre dispositivos */
  fb.onValue(fb.ref(db, '.info/serverTimeOffset'), s => { offset = Number(s.val()) || 0; });
}

async function entrarSala() {
  const rConfig = fb.ref(fb.db, `salas/${sala}/config`);
  const rEstado = fb.ref(fb.db, `salas/${sala}/estado`);
  let existe;
  try {
    existe = (await conTiempo(fb.get(rConfig), 15000)).exists();
  } catch (err) {
    console.warn('No se pudo leer la sala; se usa el modo local.', err);
    motivoLocal = 'error';
    return iniciarLocal();
  }
  if (!existe) { salaInexistente = true; ponerModo('sin-sala'); return; }

  salaActiva = true;
  ponerModo('db');
  fb.onValue(rEstado, s => {
    const v = s.val();
    if (v === null) { escribir(rEstado, estadoBase()); return; }
    guardarLocal(lsClave('estado'), v);
    avisos.alEstado(v);
  }, err => console.warn('Error al escuchar el estado', err));
  fb.onValue(rConfig, s => {
    const v = s.val();
    if (v === null) return;
    guardarLocal(lsClave('config'), v);
    avisos.alConfig(v);
  }, err => console.warn('Error al escuchar la configuración', err));
}

export async function crearSala() {
  if (!fb) throw new Error('Firebase no está disponible');
  const config = normalizarConfig(await cargarConfigInicial());
  for (let intento = 0; intento < 5; intento++) {
    const codigo = nuevoCodigo();
    const r = fb.ref(fb.db, `salas/${codigo}`);
    if ((await fb.get(r)).exists()) continue;
    await fb.set(r, { config, estado: estadoBase() });
    return codigo;
  }
  throw new Error('No se encontró un código libre');
}

/* ---------- Escrituras ----------
   set() de Realtime Database se aplica en el orden en que se llama y escribe el documento completo,
   así que la última escritura gana. Sin conexión, Firebase las guarda y las sube al reconectar. */
function escribir(r, datos) {
  return fb.set(r, datos).then(() => true, err => { console.warn('No se pudo escribir', err); return false; });
}
export function guardarEstado(e) {
  guardarLocal(lsClave('estado'), e);
  if (salaActiva) escribir(fb.ref(fb.db, `salas/${sala}/estado`), e);
}
/* Devuelve 'en-linea' | 'pendiente' | 'local' | 'error' */
export function guardarConfig(c) {
  guardarLocal(lsClave('config'), c);
  if (!salaActiva) return Promise.resolve('local');
  const p = escribir(fb.ref(fb.db, `salas/${sala}/config`), c).then(ok => (ok ? 'en-linea' : 'error'));
  return modo === 'offline' ? Promise.resolve('pendiente') : p;
}
