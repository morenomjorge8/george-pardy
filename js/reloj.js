/* Reloj de Minuto para Ganar y sonidos con Web Audio (solo suenan en la pantalla del proyector). */
import { juegoConReloj, tieneReloj, relojDe, restanteMs, duracionDe, ahora } from './estado.js';

export const CIRC = 2 * Math.PI * 45;

export function etiquetaReloj(r) {
  const ms = restanteMs(r);
  if (ms <= 0) return '¡Se acabó el tiempo!';
  if (r.estado === 'detenido') return 'Tiempo detenido';
  if (r.estado === 'corriendo') return 'segundos';
  return 'Listo para empezar';
}
export function relojHtml(d, clase) {
  const r = relojDe(d), ms = restanteMs(r), dur = duracionDe(d);
  const urg = r.estado === 'corriendo' && ms > 0 && ms <= 10000;
  return `<div class="${clase}${urg ? ' urgente' : ''}" data-reloj-caja>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="reloj-fondo" cx="50" cy="50" r="45"/><circle class="reloj-anillo" cx="50" cy="50" r="45" stroke-dasharray="${CIRC.toFixed(2)}" style="stroke-dashoffset:${(CIRC * (1 - ms / dur)).toFixed(2)}" data-reloj-anillo/></svg>
      <span class="reloj-num" data-reloj-num>${Math.ceil(ms / 1000)}</span>
    </div>`;
}

/* ---------- Sonido ---------- */
let audio = null;
export function prepararAudio() {
  try {
    if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; audio = new AC(); }
    if (audio.state === 'suspended') audio.resume();
  } catch (e) { /* sin audio */ }
}
export const audioActivo = () => !!audio && audio.state === 'running';
/* Los navegadores bloquean el audio hasta el primer clic o tecla en la página */
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, prepararAudio, { passive: true }));

function tono(freq, dur, { tipo = 'sine', vol = 0.2, cuando = 0 } = {}) {
  if (!audioActivo()) return;
  const t = audio.currentTime + cuando;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
export function sonido(nombre) {
  if (nombre === 'inicio') { tono(660, 0.18, { tipo: 'triangle', vol: 0.3 }); tono(990, 0.4, { tipo: 'triangle', vol: 0.3, cuando: 0.16 }); }
  else if (nombre === 'tic') { tono(1500, 0.035, { tipo: 'square', vol: 0.05 }); tono(110, 0.14, { vol: 0.35 }); }
  else if (nombre === 'beep') { tono(880, 0.15, { tipo: 'square', vol: 0.12 }); tono(110, 0.15, { vol: 0.45 }); }
  else if (nombre === 'fin') { tono(150, 1.4, { tipo: 'sawtooth', vol: 0.3 }); tono(157, 1.4, { tipo: 'square', vol: 0.12 }); }
  else if (nombre === 'alto') { tono(990, 0.15, { tipo: 'triangle', vol: 0.3 }); tono(1320, 0.35, { tipo: 'triangle', vol: 0.3, cuando: 0.13 }); }
  else if (nombre === 'mecha') { tono(2300, 0.045, { tipo: 'square', vol: 0.1 }); tono(1150, 0.06, { tipo: 'triangle', vol: 0.12 }); }
  else if (nombre === 'explosion') explosion();
}
/* Ruido que se apaga y se vuelve grave, más un golpe de bajo */
function explosion() {
  if (!audioActivo()) return;
  const t = audio.currentTime, dur = 2.2, n = Math.floor(audio.sampleRate * dur);
  const buf = audio.createBuffer(1, n, audio.sampleRate), datos = buf.getChannelData(0);
  for (let i = 0; i < n; i++) datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
  const ruido = audio.createBufferSource(); ruido.buffer = buf;
  const filtro = audio.createBiquadFilter(); filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(3200, t); filtro.frequency.exponentialRampToValueAtTime(90, t + dur);
  const g = audio.createGain(); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  ruido.connect(filtro).connect(g).connect(audio.destination);
  ruido.start(t); ruido.stop(t + dur);
  const o = audio.createOscillator(), go = audio.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.3);
  go.gain.setValueAtTime(0.0001, t); go.gain.exponentialRampToValueAtTime(0.9, t + 0.02); go.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(go).connect(audio.destination); o.start(t); o.stop(t + 1.5);
}

/* ---------- El reloj se actualiza solo: número, anillo y sonidos de cada segundo ---------- */
let relojVisto = { clave: null, seg: null, estado: null, fin: null };
/* enPantalla: si este dispositivo es el proyector (solo ahí suena). render: redibuja al llegar a 0. */
export function tickReloj(enPantalla, render) {
  document.querySelectorAll('[data-aviso-audio]').forEach(el => { el.hidden = !(enPantalla && !audioActivo()); });
  const d = juegoConReloj();
  if (!d || !tieneReloj(d)) { relojVisto = { clave: null, seg: null, estado: null, fin: null }; return; }
  const r = relojDe(d), ms = restanteMs(r), dur = duracionDe(d), seg = Math.ceil(ms / 1000);
  document.querySelectorAll('[data-reloj-num]').forEach(el => { if (el.textContent !== String(seg)) el.textContent = seg; });
  document.querySelectorAll('[data-reloj-anillo]').forEach(c => { c.style.strokeDashoffset = (CIRC * (1 - ms / dur)).toFixed(2); });
  const urg = r.estado === 'corriendo' && ms > 0 && ms <= 10000;
  document.querySelectorAll('[data-reloj-caja]').forEach(el => el.classList.toggle('urgente', urg));
  const clave = `${d.casilla}-${d.c}-${d.i}-${r.estado}-${r.inicioEn}`;
  if (r.estado === 'corriendo') {
    if (relojVisto.clave !== clave) {
      if (enPantalla && ahora() - r.inicioEn < 1500) sonido('inicio');
    } else if (seg !== relojVisto.seg && enPantalla) {
      if (seg === 0) sonido('fin'); else if (seg <= 10) sonido('beep'); else sonido('tic');
    }
    if (ms === 0 && relojVisto.fin !== clave) { relojVisto = { clave, seg, estado: r.estado, fin: clave }; render(); return; }
  } else if (r.estado === 'detenido' && relojVisto.estado === 'corriendo' && enPantalla) {
    sonido('alto');
  }
  relojVisto.clave = clave; relojVisto.seg = seg; relojVisto.estado = r.estado;
}
