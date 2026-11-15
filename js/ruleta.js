/* Ruleta del Doble o Nada: dibujo SVG y animación del giro. */
import { infoCasilla, ahora } from './estado.js';

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let ruedaClave = null, giroVisto = null, girando = false, tGiro = null, faseRuedaPrevia = null;

export const estaGirando = () => girando;
/* Recuerda en qué fase estaba el Doble o Nada la última vez que esta pantalla lo vio */
export function marcarFase(fase) { faseRuedaPrevia = fase; }

export function dibujarRueda(ids) {
  const N = ids.length, a = 360 / N, R = 96;
  const pt = (ang, r) => { const t = ang * Math.PI / 180; return [(r * Math.sin(t)).toFixed(2), (-r * Math.cos(t)).toFixed(2)]; };
  const fs = N > 12 ? 7.5 : N > 6 ? 9 : 11;
  let h = '<circle r="99" fill="#050932" stroke="#FFB81C" stroke-width="2"/>';
  ids.forEach((id, k) => {
    const { juego } = infoCasilla(id);
    let forma;
    if (N === 1) forma = `<circle r="${R}" fill="${juego.color}" stroke="#050932" stroke-width=".8"/>`;
    else {
      const [x0, y0] = pt(k * a, R), [x1, y1] = pt((k + 1) * a, R);
      forma = `<path d="M0 0 L${x0} ${y0} A${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${x1} ${y1} Z" fill="${juego.color}" stroke="#050932" stroke-width=".8"/>`;
    }
    /* Etiquetas radiales; en la mitad izquierda se voltean para leerse derechas */
    const medio = (k + 0.5) * a;
    const etiqueta = medio > 180
      ? `<text transform="rotate(${(medio + 90).toFixed(2)})" x="${-(R - 7)}" dy=".35em" text-anchor="start" font-size="${fs}" fill="${juego.tinta}">${esc(juego.corto)}</text>`
      : `<text transform="rotate(${(medio - 90).toFixed(2)})" x="${R - 7}" dy=".35em" text-anchor="end" font-size="${fs}" fill="${juego.tinta}">${esc(juego.corto)}</text>`;
    h += `<g class="gajo" data-id="${id}">${forma}${etiqueta}</g>`;
  });
  return h + '<circle r="12" fill="#050932" stroke="#FFB81C" stroke-width="2"/>';
}

/* ids: casillas que se dibujan (las libres más la que salió). alTerminar: se llama cuando la rueda se detiene. */
export function renderRuleta(svg, d, ids, alTerminar) {
  const clv = ids.join(',');
  if (clv !== ruedaClave && !girando) {
    svg.innerHTML = dibujarRueda(ids);
    svg.classList.remove('girando');
    svg.style.transform = 'rotate(0deg)';
    ruedaClave = clv;
  }
  const llave = d.casilla ? `${d.c}-${d.i}-${d.casilla}` : null;
  if (d.fase === 'jugando' && llave && giroVisto !== llave) {
    giroVisto = llave;
    const k = ids.indexOf(d.casilla), a = 360 / ids.length;
    const destino = 360 * 7 - (k + 0.5 + d.desfase) * a;
    /* Gira si esta pantalla vio la ruleta esperando, o si el giro es reciente
       (la sincronización puede saltarse el paso de espera si el moderador toca rápido) */
    const reciente = d.giroEn > 0 && Math.abs(ahora() - d.giroEn) < 60000;
    if (faseRuedaPrevia === 'ruleta' || reciente) {
      girando = true;
      svg.classList.remove('girando');
      svg.style.transform = 'rotate(0deg)';
      void svg.getBoundingClientRect();
      svg.classList.add('girando');
      svg.style.transform = `rotate(${destino}deg)`;
      clearTimeout(tGiro);
      tGiro = setTimeout(() => { girando = false; svg.classList.remove('girando'); alTerminar(); }, 5400);
    } else {
      svg.classList.remove('girando');
      svg.style.transform = `rotate(${destino}deg)`;
    }
  }
  const aterrizada = d.fase === 'jugando' && !!d.casilla && !girando;
  svg.classList.toggle('aterrizada', aterrizada);
  svg.querySelectorAll('.gajo').forEach(g => g.classList.toggle('ganadora', aterrizada && g.dataset.id === d.casilla));
  faseRuedaPrevia = d.fase;
}
