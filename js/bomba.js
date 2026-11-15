/* Tic-Tac-Boom: ruleta TIC/TAC/BOOM y la mecha de la bomba (el sonido solo en el proyector). */
import { MODOS_BOMBA, BOMBA_GIRO_MS, juegoConReloj, tieneBomba, bombaDe, bombaGirando, restanteMs, ahora } from './estado.js';
import { sonido } from './reloj.js';

/* Rueda de 3 gajos; el gajo k queda arriba al girar a 5 vueltas − k·120° */
export function ruedaBombaHtml(b) {
  const k = Math.max(0, MODOS_BOMBA.findIndex(m => m.id === b.modo));
  const destino = 360 * 5 - k * 120 + b.desfase * 120;
  const punto = (a, r) => `${(r * Math.sin(a * Math.PI / 180)).toFixed(2)} ${(-r * Math.cos(a * Math.PI / 180)).toFixed(2)}`;
  const gajos = MODOS_BOMBA.map((m, i) => {
    const a = i * 120;
    return `<path d="M0 0 L${punto(a - 60, 94)} A94 94 0 0 1 ${punto(a + 60, 94)} Z" fill="${m.color}" stroke="#050932" stroke-width="2"/>
      <text transform="rotate(${a}) translate(0 -54)" text-anchor="middle" dominant-baseline="middle" fill="${m.tinta}" font-size="${m.id === 'boom' ? 26 : 30}">${m.nombre}</text>`;
  }).join('');
  return `<div class="ttb-rueda">
      <svg viewBox="-100 -100 200 200" aria-hidden="true" class="ttb-giro" style="--giro:${destino.toFixed(1)}deg" data-rueda-bomba data-giro-en="${b.giroEn}">
        <circle r="98" fill="#FFB81C"/>${gajos}<circle r="14" fill="#050932"/>
      </svg>
      <div class="puntero" aria-hidden="true"></div>
    </div>`;
}
/* Cada rueda nueva arranca su animación donde va el giro real (si la página se recarga, cae directo) */
export function animarRuedasBomba() {
  document.querySelectorAll('[data-rueda-bomba]:not([data-lista])').forEach(el => {
    const pasado = Math.max(0, Math.min(BOMBA_GIRO_MS, ahora() - Number(el.dataset.giroEn)));
    el.style.animationDelay = `${-pasado}ms`;
    el.dataset.lista = '1';
  });
}

/* Mecha: el tic se acelera conforme se acerca la explosión (ti… ti… titi… tititi) */
let visto = { giro: null, exploto: null, ultimoTic: 0 };
export function tickBomba(enPantalla, render) {
  const d = juegoConReloj();
  if (!tieneBomba(d)) { visto = { giro: null, exploto: null, ultimoTic: 0 }; return; }
  const b = bombaDe(d);
  /* Al terminar la ruleta chica se redibuja para mostrar el resultado */
  const claveGiro = `${d.casilla}-${b.giroEn}`;
  if (b.modo && !bombaGirando(b) && visto.giro !== claveGiro) { visto.giro = claveGiro; render(); }
  if (b.estado !== 'corriendo') return;
  const ms = restanteMs(b);
  const claveMecha = `${d.casilla}-${b.inicioEn}-${b.restanteMs}`;
  if (ms <= 0) {
    if (visto.exploto !== claveMecha) {
      visto.exploto = claveMecha;
      /* Solo suena si explotó hace poco (no al recargar la página después) */
      if (enPantalla && ahora() - (b.inicioEn + b.restanteMs) < 3000) sonido('explosion');
      render();
    }
    return;
  }
  const falta = b.duracionMs ? ms / b.duracionMs : 1;
  const intervalo = 130 + 770 * Math.pow(falta, 1.5);
  const t = performance.now();
  if (t - visto.ultimoTic >= intervalo) {
    visto.ultimoTic = t;
    if (enPantalla) sonido('mecha');
  }
}
