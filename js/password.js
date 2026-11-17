/* Password: reloj de 45 s por turno (número y anillo) y sus sonidos (solo en el proyector). */
import { PASSWORD_MS, juegoConReloj, tienePassword, restanteMs, ahora } from './estado.js';
import { CIRC, sonido } from './reloj.js';

export function relojPasswordHtml(p, clase) {
  const ms = restanteMs(p);
  const urg = p.estado === 'corriendo' && ms > 0 && ms <= 10000;
  return `<div class="${clase}${urg ? ' urgente' : ''}" data-pw-caja>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="reloj-fondo" cx="50" cy="50" r="45"/><circle class="reloj-anillo" cx="50" cy="50" r="45" stroke-dasharray="${CIRC.toFixed(2)}" style="stroke-dashoffset:${(CIRC * (1 - ms / PASSWORD_MS)).toFixed(2)}" data-pw-anillo/></svg>
      <span class="reloj-num" data-pw-num>${Math.ceil(ms / 1000)}</span>
    </div>`;
}

let visto = { clave: null, seg: null, fin: null };
export function tickPassword(enPantalla, render) {
  const d = juegoConReloj();
  const p = tienePassword(d) ? d.password : null;
  if (!p) { visto = { clave: null, seg: null, fin: null }; return; }
  const ms = restanteMs(p), seg = Math.ceil(ms / 1000);
  document.querySelectorAll('[data-pw-num]').forEach(el => { if (el.textContent !== String(seg)) el.textContent = seg; });
  document.querySelectorAll('[data-pw-anillo]').forEach(c => { c.style.strokeDashoffset = (CIRC * (1 - ms / PASSWORD_MS)).toFixed(2); });
  const urg = p.estado === 'corriendo' && ms > 0 && ms <= 10000;
  document.querySelectorAll('[data-pw-caja]').forEach(el => el.classList.toggle('urgente', urg));
  if (p.estado !== 'corriendo') { visto.clave = null; return; }
  const clave = `${d.casilla}-${p.ronda}-${p.inicioEn}`;
  if (visto.clave !== clave) {
    if (enPantalla && ahora() - p.inicioEn < 1500) sonido('inicio');
  } else if (seg !== visto.seg && enPantalla && seg > 0 && seg <= 10) sonido('beep');
  if (ms <= 0 && visto.fin !== clave) {
    visto.fin = clave;
    if (enPantalla && ahora() - (p.inicioEn + p.restanteMs) < 3000) sonido('fin');
    render();
  }
  visto.clave = clave; visto.seg = seg;
}
