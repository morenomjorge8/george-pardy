/* Arranque, rutas por hash, render de cada vista y eventos. */
import {
  VALORES, MINIJUEGOS, CASILLAS, OPCIONES_EQUIPO, EQUIPO_COLOR, EQUIPO_TINTA,
  juego, configurar, recibirEstado, recibirConfig, actualizarConfig, clonar, clave,
  infoCasilla, partirPregunta, letraRespuesta, enlaceValido,
  opcionEquipo, nombreEquipo, nombreCategoria, usada, casillasDisponibles, retoDe,
  tieneReloj, relojDe, restanteMs, duracionDe,
  abrir, mostrarRespuesta, resolver, cerrar, ajustar, pasarTurno, reactivar, nuevaPartida,
  decidirDoble, girar, resultadoDoble, cerrarDoble, relojAccion, alternarReloj,
  abrirLibre, cerrarLibre, abrirNombres, cerrarNombres, turnoNombres, asignarNombre, elegirEquipo,
  SILABAS_BASE, MAX_RESPUESTAS, lugaresTablero, lugaresObjetivo, tieneBomba, bombaDe, modoBomba, bombaGirando, bombaExploto, silabaDe, silabasDisponibles,
  bombaGirar, bombaSilaba, bombaAccion, alternarBomba,
  tieneEncuesta, encuestaDe, encuestaMostrar, encuestaRevelar, encuestaStrike, encuestaOcultar, encuestaQuitarStrike, encuestaReiniciar,
  tienePassword, palabrasDe, pwRondaTerminada, pwAciertos, pwTerminado, pwGanaPrimero,
  passwordEmpezar, passwordIniciar, passwordPausar, passwordMarcar, passwordDeshacer, passwordSiguiente, passwordReiniciar, alternarPassword
} from './estado.js';
import { relojPasswordHtml, tickPassword } from './password.js';
import * as sync from './sync.js';
import { renderRuleta, estaGirando, marcarFase } from './ruleta.js';
import { etiquetaReloj, relojHtml, tickReloj, prepararAudio, sonido } from './reloj.js';
import { ruedaBombaHtml, animarRuedasBomba, tickBomba } from './bomba.js';

const VISTAS = ['pantalla', 'control', 'preguntas'];
const NUM = new Intl.NumberFormat('es-MX');
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const htmlEquipo = k => `<span class="emoji" aria-hidden="true">${opcionEquipo(k).emoji}</span> ${esc(nombreEquipo(k))}`;
const estiloEquipo = k => `--equipo:${EQUIPO_COLOR[k]};--equipo-tinta:${EQUIPO_TINTA[k]}`;

/* ---------- Conexión entre el estado y la sincronización ---------- */
configurar({
  guardarEstado: sync.guardarEstado,
  guardarConfig: sync.guardarConfig,
  ahora: sync.ahora,
  alCambiar: () => render(),
  alGuardado: t => { $('#guardado').textContent = t; }
});

/* Confirmación con doble toque (sin ventanas emergentes) */
let armado = null, tArmado = null;
function armar(id) {
  armado = id;
  clearTimeout(tArmado);
  tArmado = setTimeout(() => { armado = null; render(); }, 3000);
  render();
}
function desarmar() { armado = null; clearTimeout(tArmado); }

/* ---------- Render ---------- */
/* Con Firebase, las vistas del juego necesitan una sala */
const necesitaSala = () => sync.firebaseConfigurado && sync.modoActual() !== 'local' && (!sync.salaActual() || sync.salaNoExiste());
function vistaActual() {
  const h = location.hash.replace(/^#/, '');
  if (!VISTAS.includes(h) || necesitaSala()) return 'inicio';
  return h;
}
let vistaPrevia = null;
function render() {
  const v = vistaActual();
  if (v !== vistaPrevia) {
    ['inicio', ...VISTAS].forEach(n => { $('#v-' + n).hidden = n !== v; });
    document.body.classList.toggle('oscuro', v === 'pantalla' || v === 'inicio');
    document.body.classList.toggle('fijo', v === 'pantalla');
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.getAttribute('href') === '#' + v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (v === 'preguntas') renderEditor();
    if (v !== 'pantalla') { abiertaPrevia = null; marcarFase(null); }
    vistaPrevia = v;
    window.scrollTo(0, 0);
  }
  if (v === 'pantalla') renderPantalla();
  else if (v === 'control') renderControl();
  else if (v === 'inicio') renderInicio();
  renderSync();
}

const TEXTOS_SYNC = { conectando: 'Conectando…', db: 'Sincronizado', offline: 'Sin conexión', local: 'Solo este navegador', 'sin-sala': 'Sin sala' };
function renderSync() {
  const m = sync.modoActual();
  const s = sync.salaActual();
  const conSala = s && (m === 'db' || m === 'offline');
  document.querySelectorAll('[data-sync]').forEach(el => {
    el.dataset.modo = m;
    el.textContent = TEXTOS_SYNC[m] + (conSala && !el.closest('.inicio') ? ` · sala ${s}` : '');
  });
}

/* ---------- Inicio ---------- */
let mostrarUnirse = false, errorSala = '', creandoSala = false, inicioHtmlPrevio = '';
function renderInicio() {
  const m = sync.modoActual();
  const s = sync.salaActual();
  const pideSala = necesitaSala();
  const enSala = sync.firebaseConfigurado && m !== 'local' && !pideSala;

  let nota = '';
  if (m === 'local') nota = sync.motivoModoLocal() === 'error'
    ? 'No se pudo conectar con Firebase. El juego funciona solo en este navegador; revisa el internet y recarga la página.'
    : 'Firebase todavía no está configurado: el juego funciona solo en este navegador. Puedes abrir la pantalla y el control en dos ventanas de esta computadora.';
  else if (m === 'db') nota = 'Abre esta página en el iPad y en la computadora del proyector con el mismo código: lo que hagas en uno aparece en el otro.';
  else if (m === 'offline') nota = 'Sin conexión. Puedes seguir jugando; los cambios se envían al volver el internet.';
  else if (m === 'sin-sala') nota = 'Crea una sala en la computadora del proyector y únete desde el iPad con el mismo código.';
  $('#nota-inicio').textContent = nota;

  $('#opciones-inicio').hidden = pideSala;
  $('#pregunta-inicio').hidden = pideSala;

  const caja = $('#sala-inicio');
  let h = '';
  if (sync.firebaseConfigurado && m !== 'local') {
    const formUnirse = `<form class="sala-unirse" data-form="unirse">
        <input name="codigo" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Código de 6 letras" aria-label="Código de sala">
        <button type="submit" class="btn">Unirse</button>
      </form>`;
    const btnCrear = `<button type="button" class="btn${enSala ? '' : ' btn-primario'}" data-accion="sala-crear"${creandoSala || m === 'conectando' ? ' disabled' : ''}>${creandoSala ? 'Creando…' : 'Crear sala nueva'}</button>`;
    if (enSala) {
      h = `<p class="sala-rotulo">Código de sala</p>
        <p class="sala-codigo">${esc(s)}</p>
        <p class="sala-nota">En el otro dispositivo abre esta misma página y escribe este código.</p>
        ${mostrarUnirse ? formUnirse : ''}
        <div class="sala-acciones">${mostrarUnirse ? '' : '<button type="button" class="btn" data-accion="sala-cambiar">Cambiar de sala</button>'}${btnCrear}</div>`;
    } else {
      h = `${sync.salaNoExiste() ? `<p class="sala-error">No existe la sala ${esc(s)}. Revisa el código.</p>` : ''}
        <div class="sala-acciones">${btnCrear}</div>
        <p class="sala-rotulo">¿Ya tienes un código?</p>
        ${formUnirse}`;
    }
    if (errorSala) h += `<p class="sala-error" role="alert">${esc(errorSala)}</p>`;
  }
  /* Solo se redibuja si cambió, para no borrar lo que se está escribiendo */
  if (h !== inicioHtmlPrevio) { caja.innerHTML = h; inicioHtmlPrevio = h; }
  caja.hidden = !h;
}
async function crearSalaNueva() {
  if (creandoSala) return;
  creandoSala = true; errorSala = ''; render();
  try {
    const codigo = await sync.crearSala();
    sync.irASala(codigo);
  } catch (err) {
    console.warn(err);
    creandoSala = false;
    errorSala = 'No se pudo crear la sala. Revisa la conexión y la configuración de Firebase.';
    render();
  }
}
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form="unirse"]');
  if (!f) return;
  e.preventDefault();
  const codigo = sync.normalizarCodigo(f.elements.codigo.value);
  if (!sync.codigoValido(codigo)) { errorSala = 'El código tiene 6 letras y números; revisa que esté completo.'; render(); return; }
  sync.irASala(codigo);
});

/* ---------- Videos (por ahora se abren en otra pestaña) ---------- */
const enlaceVideo = reto => enlaceValido(reto && reto.video);
const botonVideo = url => `<a class="btn-escenario" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-video>▶ Ver video <kbd>V</kbd></a>`;
const enlaceTimer = () => enlaceValido(juego.config.videoTemporizador);
const botonTimer = () => `<a class="btn-escenario" href="${esc(enlaceTimer())}" target="_blank" rel="noopener noreferrer" data-timer>⏱️ Timer de YouTube <kbd>T</kbd></a>`;
const avisoVideoCtl = reto => {
  const url = enlaceVideo(reto);
  return url ? `<p class="ctl-material"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver el video de explicación</a></p>` : '';
};

/* ---------- Pantalla del proyector ---------- */
let abiertaPrevia = null;
function renderPantalla() {
  const { estado } = juego;
  let h = '';
  for (let c = 0; c < 5; c++) h += `<div class="categoria" style="grid-column:${c + 1};grid-row:1">${esc(nombreCategoria(c))}</div>`;
  for (let c = 0; c < 5; c++) {
    for (let i = 0; i < 4; i++) {
      const pos = `grid-column:${c + 1};grid-row:${i + 2}`;
      const etiqueta = `${esc(nombreCategoria(c))} por ${VALORES[i]}`;
      h += usada(c, i)
        ? `<div class="casilla jugada" style="${pos}" data-c="${c}" data-i="${i}" role="img" aria-label="${etiqueta}, ya jugada"></div>`
        : `<button type="button" class="casilla" style="${pos}" data-accion="abrir" data-c="${c}" data-i="${i}" aria-label="${etiqueta}">${VALORES[i]}</button>`;
    }
  }
  $('#tablero').innerHTML = h;

  const turno = $('#turno-pantalla');
  turno.style.setProperty('--equipo', EQUIPO_COLOR[estado.turno]);
  turno.innerHTML = `Turno de ${htmlEquipo(estado.turno)}`;

  $('#marcador').innerHTML = [0, 1].map(k => `
    <div class="equipo-pantalla${estado.turno === k ? ' activo' : ''}" style="--equipo:${EQUIPO_COLOR[k]}">
      <span class="nombre">${htmlEquipo(k)}</span>
      <span class="puntos">${NUM.format(estado.puntos[k])}</span>
    </div>`).join('');

  renderPreguntaGrande();
  renderDobleONada();
  renderLibre();
  renderNombresPantalla();
  const dd = estado.dobleONada;
  avisosEncuesta(estado.minijuegoLibre || (dd && dd.fase === 'jugando' ? dd : null));
  avisosPassword(estado.minijuegoLibre || (dd && dd.fase === 'jugando' ? dd : null));
}

function platosHtml(v) {
  return `<div class="don-platos">
        <div class="plato plato-riesgo"><span class="plato-rotulo">Si gana el reto</span><span class="plato-valor">+${NUM.format(v * 2)}</span></div>
        <div class="plato"><span class="plato-rotulo">Si pierde el reto</span><span class="plato-valor">0</span></div>
      </div>`;
}
const botonesResultado = `<button type="button" class="btn-escenario" data-accion="don-gano">Ganó el reto <kbd>G</kbd></button>
      <button type="button" class="btn-escenario" data-accion="don-perdio">Perdió el reto <kbd>P</kbd></button>`;

function botonesRelojPantalla(d) {
  const r = relojDe(d), ms = restanteMs(r), seg = Math.round(duracionDe(d) / 1000);
  if (ms <= 0) return '<button type="button" class="btn-escenario" data-accion="reloj-reiniciar">Reiniciar reloj</button>';
  if (r.estado === 'corriendo') return '<button type="button" class="btn-escenario" data-accion="reloj-detener">Detener <kbd>Espacio</kbd></button>';
  if (r.estado === 'detenido') return '<button type="button" class="btn-escenario" data-accion="reloj-iniciar">Continuar <kbd>Espacio</kbd></button><button type="button" class="btn-escenario" data-accion="reloj-reiniciar">Reiniciar reloj</button>';
  return `<button type="button" class="btn-escenario" data-accion="reloj-iniciar">Iniciar ${seg} segundos <kbd>Espacio</kbd></button>`;
}
function controlRelojHtml(d) {
  const r = relojDe(d), ms = restanteMs(r), seg = Math.round(duracionDe(d) / 1000);
  let b;
  if (ms <= 0) b = '<button type="button" class="btn" data-accion="reloj-reiniciar">Reiniciar reloj</button>';
  else if (r.estado === 'corriendo') b = '<button type="button" class="btn btn-primario" data-accion="reloj-detener">Detener</button>';
  else if (r.estado === 'detenido') b = '<button type="button" class="btn btn-primario" data-accion="reloj-iniciar">Continuar</button><button type="button" class="btn" data-accion="reloj-reiniciar">Reiniciar reloj</button>';
  else b = `<button type="button" class="btn btn-primario" data-accion="reloj-iniciar">Iniciar ${seg} segundos</button>`;
  return `<div class="ctl-reloj">${relojHtml(d, 'ctl-reloj-cara')}<div class="ctl-reloj-botones"><p class="ctl-nota">${etiquetaReloj(r)}</p>${b}</div></div>`;
}

/* ---------- Tic-Tac-Boom ---------- */
const comillas = s => `“${esc(s)}”`;
/* Sin sílaba (s vacía) se dice "la sílaba": así el proyector no la revela antes de iniciar */
function reglaBomba(m, s) {
  const sil = s ? comillas(s) : 'la sílaba';
  if (m.id === 'tic') return `una palabra que <b>empiece</b> con ${sil}`;
  if (m.id === 'tac') return `una palabra que <b>tenga</b> ${sil} en cualquier parte`;
  return `una palabra que <b>termine</b> con ${sil}`;
}
const avisoAudio = '<p class="reloj-aviso" data-aviso-audio hidden>Haz clic en esta pantalla para activar el sonido.</p>';
/* Lo que ve el proyector una vez que se giró la ruleta chica. Nunca muestra el tiempo. */
function bombaPantallaHtml(d, lema) {
  const b = bombaDe(d), m = modoBomba(b.modo), s = silabaDe(d);
  if (bombaGirando(b)) {
    return `<p class="reloj-titulo" style="--juego:#FF6A13">¿TIC, TAC o BOOM?</p>
      ${ruedaBombaHtml(b)}`;
  }
  if (bombaExploto(b)) {
    return `<div class="ttb-explosion">
        <p class="ttb-boom emoji" aria-hidden="true">💥</p>
        <p class="ttb-boom-texto">¡BOOM!</p>
        <p class="reloj-estado">Pierde quien tenga la pelota.</p>
        ${lema}
      </div>`;
  }
  /* La sílaba solo aparece al iniciar; antes se ve un "?" */
  const estados = { listo: 'La sílaba aparece cuando empiece el juego.', corriendo: '¡La bomba está encendida!', detenido: 'Bomba en pausa.' };
  const oculta = b.estado === 'listo';
  return `${oculta ? '' : `<p class="ttb-bomba emoji${b.estado === 'corriendo' ? ' encendida' : ''}" aria-hidden="true">💣</p>`}
    <div class="ttb-fila"><p class="ttb-modo" style="--modo:${m.color}">${m.nombre}</p><p class="ttb-silaba${oculta ? ' oculta' : ''}">${oculta ? '?' : esc(s)}</p></div>
    <p class="ttb-regla">Digan ${reglaBomba(m, oculta ? '' : s)}.</p>
    <p class="reloj-estado">${estados[b.estado]}</p>
    ${lema}
    ${avisoAudio}`;
}
function botonesBombaPantalla(d) {
  const b = bombaDe(d);
  const btn = (accion, t) => `<button type="button" class="btn-escenario" data-accion="${accion}">${t}</button>`;
  if (bombaGirando(b)) return '';
  if (bombaExploto(b)) return btn('bomba-reiniciar', 'Otra ronda');
  if (b.estado === 'corriendo') return btn('bomba-pausar', 'Pausar <kbd>Espacio</kbd>');
  if (b.estado === 'detenido') return btn('bomba-continuar', 'Continuar <kbd>Espacio</kbd>') + btn('bomba-reiniciar', 'Otra ronda');
  if (!b.modo) return btn('bomba-girar', 'Girar Tic-Tac-Boom <kbd>Espacio</kbd>');
  return btn('bomba-encender', 'Iniciar <kbd>Espacio</kbd>') + btn('bomba-girar', 'Girar otra vez');
}
function bombaControlHtml(d) {
  const b = bombaDe(d), m = modoBomba(b.modo), s = silabaDe(d);
  const girando = bombaGirando(b), exploto = bombaExploto(b);
  const btn = (accion, t, primario) => `<button type="button" class="btn${primario ? ' btn-primario' : ''}" data-accion="${accion}">${t}</button>`;
  let texto, botones;
  if (girando) texto = 'Girando la ruleta…';
  else if (!m) texto = 'Gira la ruleta para ver si es TIC, TAC o BOOM.';
  else texto = `<b class="ttb-modo-chico" style="--modo:${m.color};--modo-tinta:${m.tinta}">${m.nombre}</b> Digan ${reglaBomba(m, s)}.`;
  let estado = '';
  if (exploto) estado = '💥 ¡Explotó! Pierde quien tenga la pelota.';
  else if (b.estado === 'corriendo') estado = '💣 Bomba encendida. Explota sola entre 30 y 45 segundos; nadie ve el tiempo.';
  else if (b.estado === 'detenido') estado = 'Bomba en pausa.';
  if (girando) botones = '';
  else if (exploto) botones = btn('bomba-reiniciar', 'Otra ronda', true);
  else if (b.estado === 'corriendo') botones = btn('bomba-pausar', 'Pausar la bomba', true);
  else if (b.estado === 'detenido') botones = btn('bomba-continuar', 'Continuar', true) + btn('bomba-reiniciar', 'Otra ronda');
  else if (!m) botones = btn('bomba-girar', 'Girar Tic-Tac-Boom', true);
  else botones = btn('bomba-encender', 'Iniciar: mostrar sílaba y encender bomba', true) + btn('bomba-girar', 'Girar otra vez');
  return `<div class="ctl-bomba">
      <p class="ttb-rotulo">Sílaba</p>
      <div class="ttb-silabas">${silabasDisponibles().map(x => `<button type="button" class="ttb-chip" data-accion="bomba-silaba" data-silaba="${esc(x)}" aria-pressed="${x === s}">${esc(x)}</button>`).join('')}</div>
      <p class="ctl-texto">${texto}</p>
      ${estado ? `<p class="ctl-nota">${estado}</p>` : ''}
      <div class="ctl-bomba-botones">${botones}</div>
    </div>`;
}
/* ---------- 100 Mexicanos ---------- */
/* Tablero como el del programa: dos columnas (1–4 y 5–8); las 3 primeras en dorado */
function encuestaPantallaHtml(d, lema) {
  const reto = retoDe(d.casilla), x = encuestaDe(d);
  const lugares = lugaresTablero(d), objetivo = lugaresObjetivo(d);
  const dosColumnas = lugares.length > 4;
  const filasPorColumna = Math.max(1, dosColumnas ? 4 : lugares.length);
  const filas = lugares.map((k, i) => {
    const r = reto.respuestas[k], abierta = x.reveladas[k];
    return `<li class="enc-fila${objetivo.includes(k) ? ' objetivo' : ''}${abierta ? ' revelada' : ''}">
      ${abierta
        ? `<span class="enc-resp">${esc(r.texto.trim())}</span><span class="enc-pts">${r.puntos || ''}</span>`
        : `<span class="enc-num">${i + 1}</span>`}
    </li>`;
  }).join('');
  const strikes = [0, 1, 2].map(k => `<span class="enc-x${k < x.strikes ? ' activa' : ''}" aria-hidden="true">✗</span>`).join('');
  const fin = x.fin ? `<p class="enc-fin ${x.fin}">${x.fin === 'gano' ? '¡Encontraron las tres!' : '¡Tres strikes!'}</p>` : '';
  return `<p class="reloj-titulo" style="--juego:#E4007C"><span class="emoji" aria-hidden="true">💯</span> ${esc(reto.nombre.trim() || '100 Mexicanos')}</p>
    <ol class="enc-tablero" style="--filas:${filasPorColumna};--cols:${dosColumnas ? 2 : 1}">${filas}</ol>
    <p class="enc-leyenda">Encuentren las <b>3 doradas</b> antes de 3 strikes</p>
    <div class="enc-strikes" role="img" aria-label="${x.strikes} de 3 strikes">${strikes}</div>
    ${fin}
    ${lema}`;
}
function botonesEncuestaPantalla(d) {
  if (!d.encuesta) return '<button type="button" class="btn-escenario" data-accion="enc-mostrar">Mostrar tablero <kbd>Espacio</kbd></button>';
  const x = encuestaDe(d);
  return x.fin ? '' : '<button type="button" class="btn-escenario" data-accion="enc-strike">Strike <kbd>X</kbd></button><span class="enc-ayuda">Destapar: teclas 1–8</span>';
}
function encuestaControlHtml(d) {
  const reto = retoDe(d.casilla), x = encuestaDe(d);
  const objetivo = lugaresObjetivo(d);
  const lugares = lugaresTablero(d);
  const filas = lugares.map((k, i) => {
    const r = reto.respuestas[k];
    return `<li class="enc-ctl-fila${objetivo.includes(k) ? ' objetivo' : ''}${x.reveladas[k] ? ' revelada' : ''}">
        <b>${i + 1}</b><span>${esc(r.texto.trim())}${r.puntos ? ` <small>(${r.puntos})</small>` : ''}</span>
        ${!d.encuesta ? '' : x.reveladas[k]
          ? `<button type="button" class="btn-texto" data-accion="enc-ocultar" data-k="${k}">Ocultar</button>`
          : `<button type="button" class="btn${objetivo.includes(k) ? ' btn-primario' : ''}" data-accion="enc-revelar" data-k="${k}">Destapar</button>`}
      </li>`;
  }).join('');
  let estado = `Strikes: ${x.strikes} de 3. Strike solo si la respuesta no está en el tablero.`;
  if (x.fin === 'gano') estado = '¡Encontraron las tres! Ganaron el reto.';
  else if (x.fin === 'perdio') estado = '¡Tres strikes! Perdieron el reto. Puedes destapar las que faltan.';
  return `<div class="ctl-bomba">
      <p class="ttb-rotulo">Tablero (solo tú lo ves) · ★ las 3 que necesitan</p>
      ${lugares.length ? `<ol class="enc-ctl">${filas}</ol>` : '<p class="ctl-nota">Este reto no tiene respuestas escritas. Agrégalas en Editar preguntas.</p>'}
      ${!d.encuesta
        ? `<p class="ctl-nota">Pongan el video con la pregunta, páusenlo y luego muestra el tablero en el proyector.</p>
      <div class="ctl-bomba-botones"><button type="button" class="btn btn-primario" data-accion="enc-mostrar">Mostrar tablero</button></div>`
        : `<p class="ctl-nota">${estado}</p>
      <div class="ctl-bomba-botones">
        ${x.fin ? '' : '<button type="button" class="btn btn-alerta" data-accion="enc-strike">✗ Strike</button>'}
        ${x.strikes ? '<button type="button" class="btn" data-accion="enc-quitar-strike">Quitar un strike</button>' : ''}
        <button type="button" class="btn" data-accion="enc-reiniciar">Reiniciar tablero</button>
      </div>`}
    </div>`;
}
/* Sonido y X grande en el proyector cuando cambia el tablero */
let encuestaVista = null;
function avisosEncuesta(d) {
  if (!d || !tieneEncuesta(d) || !d.encuesta) { encuestaVista = null; return; }
  const x = encuestaDe(d), clave = d.casilla, n = x.reveladas.filter(Boolean).length;
  const antes = encuestaVista && encuestaVista.clave === clave ? encuestaVista : null;
  if (antes && vistaActual() === 'pantalla') {
    if (x.strikes > antes.strikes) {
      sonido('strike');
      const f = document.createElement('div');
      f.className = 'enc-flash'; f.setAttribute('aria-hidden', 'true');
      f.textContent = '✗'.repeat(x.strikes);
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1300);
    } else if (n > antes.n) sonido(x.fin === 'gano' && antes.fin !== 'gano' ? 'triunfo' : 'acierto');
  }
  encuestaVista = { clave, strikes: x.strikes, n, fin: x.fin };
}

/* ---------- Password ---------- */
function marcadorPassword(p) {
  const a = pwAciertos(p);
  return `<div class="pw-marcador">${[0, 1].map(r => `<div class="pw-equipo${p.ronda === r && !pwTerminado(p) ? ' activo' : ''}" style="${estiloEquipo(p.equipos[r])}">
      <span class="pw-rotulo">${r === 0 ? 'Va por el doble' : 'Retador'}</span>
      <span class="pw-nombre">${htmlEquipo(p.equipos[r])}</span>
      <span class="pw-cuenta">${a[r]}</span>
    </div>`).join('')}</div>`;
}
function resultadoPassword(p) {
  return pwGanaPrimero(p)
    ? `¡${htmlEquipo(p.equipos[0])} iguala o supera: gana el reto!`
    : `¡${htmlEquipo(p.equipos[1])} adivinó más: lo detiene!`;
}
/* Proyector: la palabra en grande mientras corre el tiempo (quien adivina le da la espalda) */
function passwordPantallaHtml(d, lema) {
  const p = d.password, palabras = palabrasDe(d.casilla), eq = p.equipos[p.ronda];
  const a = pwAciertos(p);
  let centro;
  if (pwTerminado(p)) {
    centro = `<p class="pw-fin">${resultadoPassword(p)}</p>`;
  } else if (pwRondaTerminada(p)) {
    centro = `<p class="pw-aviso">¡Tiempo! ${htmlEquipo(eq)} adivinó ${a[p.ronda]} ${a[p.ronda] === 1 ? 'palabra' : 'palabras'}.</p>
      <p class="reloj-estado">Sigue ${htmlEquipo(p.equipos[1])}: que pase su pareja.</p>`;
  } else if (p.estado === 'listo') {
    centro = `<p class="pw-aviso">Turno de ${htmlEquipo(eq)}</p>
      <p class="reloj-estado">45 segundos. Quien adivina, de espaldas a la pantalla.</p>`;
  } else if (p.estado === 'detenido') {
    centro = `${relojPasswordHtml(p, 'pw-reloj')}<p class="pw-aviso">Pausa</p>`;
  } else {
    centro = `${relojPasswordHtml(p, 'pw-reloj')}
      <p class="pw-palabra">${esc(palabras[p.indice] || '')}</p>`;
  }
  return `<p class="reloj-titulo" style="--juego:#00A3AD"><span class="emoji" aria-hidden="true">🔑</span> Password</p>
    ${marcadorPassword(p)}
    ${centro}
    ${lema}
    ${avisoAudio}`;
}
function botonesPasswordPantalla(d) {
  const p = d.password;
  const btn = (accion, t) => `<button type="button" class="btn-escenario" data-accion="${accion}">${t}</button>`;
  if (!p) return btn('pw-empezar', 'Empezar Password <kbd>Espacio</kbd>');
  if (pwTerminado(p)) return '';
  if (pwRondaTerminada(p)) return btn('pw-siguiente', 'Siguiente equipo <kbd>Espacio</kbd>');
  if (p.estado === 'listo') return btn('pw-iniciar', 'Iniciar 45 segundos <kbd>Espacio</kbd>');
  if (p.estado === 'detenido') return btn('pw-iniciar', 'Continuar <kbd>Espacio</kbd>');
  return btn('pw-si', 'Adivinó <kbd>A</kbd>') + btn('pw-no', 'No adivinó <kbd>N</kbd>') + btn('pw-pausar', 'Pausar <kbd>Espacio</kbd>');
}
function passwordControlHtml(d) {
  const p = d.password, palabras = palabrasDe(d.casilla);
  const btn = (accion, t, clase = '') => `<button type="button" class="btn${clase ? ' ' + clase : ''}" data-accion="${accion}">${t}</button>`;
  if (!p) {
    return `<div class="ctl-bomba">
      <p class="ctl-nota">${palabras.length} palabras. Empieza ${htmlEquipo(d.equipo === 0 || d.equipo === 1 ? d.equipo : juego.estado.turno)}${d.equipo === 0 || d.equipo === 1 ? ', que va por el doble' : ''}.</p>
      <div class="ctl-bomba-botones">${btn('pw-empezar', 'Empezar Password', 'btn-primario')}</div></div>`;
  }
  const corriendo = p.estado === 'corriendo' && !pwRondaTerminada(p);
  let cuerpo = '', botones = '';
  if (pwTerminado(p)) {
    cuerpo = `<p class="ctl-texto">${resultadoPassword(p)}</p>
      <p class="ctl-nota">${d.equipo === 0 || d.equipo === 1 ? (pwGanaPrimero(p) ? 'Toca “Ganó el reto”.' : 'Toca “Perdió el reto”.') : 'Minijuego libre: no suma puntos.'}</p>`;
    botones = btn('pw-deshacer', 'Deshacer la última') + btn('pw-reiniciar', 'Reiniciar Password');
  } else if (pwRondaTerminada(p)) {
    cuerpo = `<p class="ctl-texto">¡Tiempo! Turno terminado.</p>`;
    botones = btn('pw-siguiente', p.ronda === 0 ? `Siguiente: ${htmlEquipo(p.equipos[1])}` : '', 'btn-primario') + btn('pw-deshacer', 'Deshacer la última');
  } else if (p.estado === 'listo') {
    cuerpo = `<p class="ctl-texto">Turno de ${htmlEquipo(p.equipos[p.ronda])}: que pase su pareja.</p>`;
    botones = btn('pw-iniciar', 'Iniciar 45 segundos', 'btn-primario');
  } else {
    cuerpo = `<div class="pw-ctl-reloj">${relojPasswordHtml(p, 'ctl-reloj-cara')}
        <p class="pw-ctl-palabra">${p.estado === 'detenido' ? 'Pausa' : esc(palabras[p.indice] || '—')}</p></div>`;
    botones = corriendo
      ? `<div class="pw-ctl-marcar">${btn('pw-si', '✓ Adivinó', 'pw-si')}${btn('pw-no', '✗ No adivinó', 'pw-no')}</div>` + btn('pw-pausar', 'Pausar') + btn('pw-deshacer', 'Deshacer la última')
      : btn('pw-iniciar', 'Continuar', 'btn-primario') + btn('pw-deshacer', 'Deshacer la última');
  }
  const ultimas = p.marcas[p.ronda].map((si, i) => ({ si, palabra: palabras[p.marcas[0].length * p.ronda + i] })).slice(-6).reverse();
  const lista = ultimas.length ? `<ul class="pw-ultimas">${ultimas.map(u => `<li class="${u.si ? 'si' : 'no'}">${u.si ? '✓' : '✗'} ${esc(u.palabra || '')}</li>`).join('')}</ul>` : '';
  return `<div class="ctl-bomba">${marcadorPassword(p)}${cuerpo}<div class="ctl-bomba-botones">${botones}</div>${lista}</div>`;
}
/* Sonido en el proyector al marcar cada palabra */
let passwordVisto = null;
function avisosPassword(d) {
  const p = d && tienePassword(d) ? d.password : null;
  if (!p) { passwordVisto = null; return; }
  const n = p.marcas[0].length + p.marcas[1].length, clave = d.casilla;
  if (passwordVisto && passwordVisto.clave === clave && n > passwordVisto.n && vistaActual() === 'pantalla') {
    sonido(p.marcas[p.ronda][p.marcas[p.ronda].length - 1] ? 'acierto' : 'paso');
  }
  passwordVisto = { clave, n };
}

/* Lo que dice el proyector del reto. En 100 Mexicanos solo las reglas: la pregunta sale en el video. */
function instruccionesPantalla(id) {
  const { juego: mj } = infoCasilla(id);
  return mj.encuesta ? mj.desc : (retoDe(id).instrucciones.trim() || mj.desc);
}
/* Línea del reto en el proyector */
function lineaReto(d) {
  const { juego: mj, n } = infoCasilla(d.casilla);
  const nombre = retoDe(d.casilla).nombre.trim();
  /* Tic-Tac-Boom no revela la sílaba ni 100 Mexicanos la pregunta antes de tiempo */
  if (mj.bomba || mj.encuesta) return `Reto ${n} de 3`;
  return nombre ? `Reto ${n}: ${esc(nombre)}` : `Reto ${n} de 3`;
}

function selectorNombresHtml(modo) {
  const { estado, config } = juego;
  const t = estado.eligiendoNombres ? estado.eligiendoNombres.turno : 0;
  const slots = [0, 1].map(k => `<button type="button" class="nb-slot${t === k ? ' activo' : ''}" style="${estiloEquipo(k)}" data-accion="nombres-turno" data-equipo="${k}" aria-pressed="${t === k}">
      <span class="nb-slot-rotulo">${t === k ? `Elige el equipo ${k + 1}` : `Equipo ${k + 1}`}</span>
      <span class="nb-slot-nombre">${htmlEquipo(k)}</span>
    </button>`).join('');
  const tarjetas = OPCIONES_EQUIPO.map(o => {
    const duenio = config.equipos.indexOf(o.id);
    const deOtro = duenio !== -1 && duenio !== t;
    return `<button type="button" class="nb-tarjeta${duenio !== -1 ? ' tomada' : ''}"${duenio !== -1 ? ` style="${estiloEquipo(duenio)}"` : ''} data-accion="nombres-elegir" data-opcion="${o.id}" aria-pressed="${duenio === t}"${deOtro ? ' disabled' : ''}>
        <span class="emoji nb-emoji" aria-hidden="true">${o.emoji}</span>
        <span class="nb-nombre">${esc(o.nombre)}</span>
        ${duenio !== -1 ? `<span class="nb-duenio">Equipo ${duenio + 1}</span>` : ''}
      </button>`;
  }).join('');
  return `<div class="nb-slots">${slots}</div><div class="nb-grid nb-${modo}">${tarjetas}</div>`;
}
let nombresHtmlPrevio = '';
function renderNombresPantalla() {
  const ov = $('#nombres');
  if (!juego.estado.eligiendoNombres) { ov.hidden = true; nombresHtmlPrevio = ''; return; }
  const h = selectorNombresHtml('pantalla');
  if (h !== nombresHtmlPrevio) { $('#nombres-cuerpo').innerHTML = h; nombresHtmlPrevio = h; }
  $('#nombres-controles').innerHTML = '<button type="button" class="btn-escenario" data-accion="nombres-cerrar">Listo <kbd>Esc</kbd></button>';
  ov.hidden = false;
}

/* Minijuego libre en el proyector */
let libreHtmlPrevio = '';
function renderLibre() {
  const ov = $('#libre');
  const L = juego.estado.minijuegoLibre;
  if (!L) { ov.hidden = true; libreHtmlPrevio = ''; return; }
  const { juego: mj, n } = infoCasilla(L.casilla);
  const reto = retoDe(L.casilla);
  const nombreReto = reto.nombre.trim();
  const conReloj = tieneReloj(L);
  const r = conReloj ? relojDe(L) : null;
  const conBomba = tieneBomba(L);
  const conEncuesta = tieneEncuesta(L);
  let cuerpo;
  if (conBomba && bombaDe(L).modo) {
    cuerpo = bombaPantallaHtml(L, '');
  } else if (conEncuesta && L.encuesta) {
    cuerpo = encuestaPantallaHtml(L, '');
  } else if (tienePassword(L) && L.password) {
    cuerpo = passwordPantallaHtml(L, '');
  } else if (conReloj && r.estado !== 'listo') {
    cuerpo = `<p class="reloj-titulo" style="--juego:${mj.color}"><span class="emoji" aria-hidden="true">${mj.emoji}</span> ${esc(nombreReto || mj.nombre)}</p>
      ${relojHtml(L, 'reloj-cara')}
      <p class="reloj-estado">${etiquetaReloj(r)}</p>
      <p class="reloj-aviso" data-aviso-audio hidden>Haz clic en esta pantalla para activar el sonido.</p>`;
  } else {
    cuerpo = `<p class="juego-emoji emoji" aria-hidden="true">${mj.emoji}</p>
      <h2 class="juego-nombre" id="libre-titulo" style="--juego:${mj.color}">${esc(mj.nombre)}</h2>
      <p class="juego-reto">${lineaReto(L)}</p>
      <p class="juego-desc">${esc(instruccionesPantalla(L.casilla))}</p>`;
  }
  const cu = $('#libre-cuerpo');
  if (cuerpo !== libreHtmlPrevio) { cu.innerHTML = cuerpo; libreHtmlPrevio = cuerpo; animarRuedasBomba(); }
  $('#libre-controles').innerHTML = (conReloj && enlaceTimer() ? botonTimer() : '') + (enlaceVideo(reto) ? botonVideo(enlaceVideo(reto)) : '') + (conReloj ? botonesRelojPantalla(L) : '') + (conBomba ? botonesBombaPantalla(L) : '') + (conEncuesta ? botonesEncuestaPantalla(L) : '') + (tienePassword(L) ? botonesPasswordPantalla(L) : '') +
    '<button type="button" class="btn-escenario" data-accion="libre-cerrar">Cerrar <kbd>Esc</kbd></button>';
  ov.hidden = false;
}

let donPrevio = null, donHtmlPrevio = '', ladoHtmlPrevio = '';
function renderDobleONada() {
  const { estado } = juego;
  const ov = $('#doble-o-nada');
  const d = estado.dobleONada;
  if (!d) { ov.hidden = true; donPrevio = null; donHtmlPrevio = ''; ladoHtmlPrevio = ''; $('#don-reloj').dataset.html = ''; marcarFase(null); return; }
  const v = VALORES[d.i];
  const fase = `${d.c}-${d.i}-${d.fase}`;
  $('#don-cat').textContent = nombreCategoria(d.c);
  $('#don-valor').textContent = NUM.format(v);
  const conRueda = d.fase === 'ruleta' || (d.fase === 'jugando' && !!d.casilla);
  const cu = $('#don-cuerpo');
  $('#don-ruleta').hidden = !conRueda;
  $('#don-reloj').hidden = true;
  cu.hidden = conRueda;
  ov.hidden = false;
  let botones = '';

  if (conRueda) {
    if (donHtmlPrevio) { cu.innerHTML = ''; donHtmlPrevio = ''; }
    const ids = CASILLAS.filter(id => !estado.ruletaUsadas.includes(id) || id === d.casilla);
    renderRuleta($('#rueda'), d, ids, render);
    const revelado = d.fase === 'jugando' && !estaGirando();
    const conReloj = revelado && tieneReloj(d);
    const r = conReloj ? relojDe(d) : null;
    const modoReloj = conReloj && r.estado !== 'listo';
    const conBomba = revelado && tieneBomba(d);
    const modoBombaVisible = conBomba && !!bombaDe(d).modo;
    const conEncuesta = revelado && tieneEncuesta(d);
    const modoEncuesta = conEncuesta && !!d.encuesta;
    const conPassword = revelado && tienePassword(d);
    const modoPassword = conPassword && !!d.password;
    $('#don-ruleta').hidden = modoReloj || modoBombaVisible || modoEncuesta || modoPassword;
    $('#don-reloj').hidden = !(modoReloj || modoBombaVisible || modoEncuesta || modoPassword);
    let lado;
    if (revelado) {
      const { juego: mj } = infoCasilla(d.casilla);
      const reto = retoDe(d.casilla);
      lado = `<p class="juego-emoji emoji" aria-hidden="true">${mj.emoji}</p>
        <h2 class="juego-nombre" id="don-titulo" style="--juego:${mj.color}">${esc(mj.nombre)}</h2>
        <p class="juego-reto">${lineaReto(d)}</p>
        <p class="juego-desc">${esc(instruccionesPantalla(d.casilla))}</p>
        ${platosHtml(v)}`;
      botones = botonesResultado;
      if (conReloj) botones = botonesRelojPantalla(d) + botones;
      if (conBomba) {
        botones = botonesBombaPantalla(d) + botones;
        if (modoBombaVisible) {
          const zb = $('#don-reloj');
          const hb = bombaPantallaHtml(d, `<p class="don-lema reloj-lema">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>`);
          if (zb.dataset.html !== hb) { zb.innerHTML = hb; zb.dataset.html = hb; animarRuedasBomba(); }
        }
      }
      if (conEncuesta) {
        botones = botonesEncuestaPantalla(d) + botones;
        if (modoEncuesta) {
          const ze = $('#don-reloj');
          const he = encuestaPantallaHtml(d, `<p class="don-lema reloj-lema">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>`);
          if (ze.dataset.html !== he) { ze.innerHTML = he; ze.dataset.html = he; }
        }
      }
      if (conPassword) {
        botones = botonesPasswordPantalla(d) + botones;
        if (modoPassword) {
          const zp = $('#don-reloj');
          const hp = passwordPantallaHtml(d, `<p class="don-lema reloj-lema">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>`);
          if (zp.dataset.html !== hp) { zp.innerHTML = hp; zp.dataset.html = hp; }
        }
      }
      if (enlaceVideo(reto)) botones = botonVideo(enlaceVideo(reto)) + botones;
      if (conReloj && enlaceTimer()) botones = botonTimer() + botones;
      if (modoReloj) {
        const reloj = `<p class="reloj-titulo" style="--juego:${mj.color}"><span class="emoji" aria-hidden="true">${mj.emoji}</span> ${esc(reto.nombre.trim() || mj.nombre)}</p>
          ${relojHtml(d, 'reloj-cara')}
          <p class="reloj-estado">${etiquetaReloj(r)}</p>
          <p class="don-lema reloj-lema">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>
          <p class="reloj-aviso" data-aviso-audio hidden>Haz clic en esta pantalla para activar el sonido.</p>`;
        const zr = $('#don-reloj');
        if (zr.innerHTML !== reloj) { zr.innerHTML = reloj; zr.dataset.html = ''; }
      }
    } else {
      lado = `<h2 class="don-titulo don-titulo-chico" id="don-titulo">Doble o nada</h2>
        <p class="don-lema">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>
        ${platosHtml(v)}
        <p class="don-estado">${estaGirando() ? 'Girando…' : `Quedan ${casillasDisponibles().length} casillas en la ruleta.`}</p>`;
      if (d.fase === 'ruleta') botones = '<button type="button" class="btn-escenario" data-accion="don-girar">Girar la ruleta <kbd>Espacio</kbd></button>';
    }
    const lad = $('#don-lado');
    if (lado !== ladoHtmlPrevio) {
      lad.innerHTML = lado;
      ladoHtmlPrevio = lado;
      lad.classList.remove('entra');
      if (revelado && !reducirMovimiento.matches) { void lad.offsetWidth; lad.classList.add('entra'); }
    }
  } else {
    ladoHtmlPrevio = '';
    marcarFase(d.fase);
    let cuerpo;
    if (d.fase === 'oferta') {
      cuerpo = `<h2 class="don-titulo" id="don-titulo">¿Doble o nada?</h2>
      <p class="don-lema">${htmlEquipo(d.equipo)} va perdiendo y acertó.</p>
      <div class="don-platos">
        <div class="plato"><span class="plato-rotulo">Se queda con</span><span class="plato-valor">+${NUM.format(v)}</span></div>
        <div class="plato plato-riesgo"><span class="plato-rotulo">Arriesga por</span><span class="plato-valor">+${NUM.format(v * 2)}</span><span class="plato-nota">o 0 si pierde el reto</span></div>
      </div>`;
      botones = `<button type="button" class="btn-escenario" data-accion="don-si">Sí, doble o nada <kbd>S</kbd></button>
      <button type="button" class="btn-escenario" data-accion="don-no">No, quedarse con ${NUM.format(v)} <kbd>N</kbd></button>`;
    } else if (d.fase === 'jugando') {
      cuerpo = `<h2 class="don-titulo" id="don-titulo">Doble o nada</h2>
      <p class="don-lema">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>
      ${platosHtml(v)}`;
      botones = botonesResultado;
    } else {
      cuerpo = `<h2 class="don-titulo" id="don-titulo">${d.gano ? '¡Ganó el reto!' : 'Perdió el reto'}</h2>
      <p class="don-resultado${d.gano ? '' : ' cero'}">${d.gano ? '+' + NUM.format(v * 2) : '0'}</p>
      <p class="don-lema">${d.gano ? `${htmlEquipo(d.equipo)} suma el doble.` : `Esta pregunta vale 0 para ${htmlEquipo(d.equipo)}.`}</p>`;
      botones = '<button type="button" class="btn-escenario" data-accion="don-cerrar">Volver al tablero <kbd>Esc</kbd></button>';
    }
    if (cuerpo !== donHtmlPrevio) { cu.innerHTML = cuerpo; donHtmlPrevio = cuerpo; }
    if (fase !== donPrevio && !reducirMovimiento.matches) { cu.classList.remove('entra'); void cu.offsetWidth; cu.classList.add('entra'); }
  }
  $('#don-controles').innerHTML = botones;
  donPrevio = fase;
}

function renderPreguntaGrande() {
  const { estado, config } = juego;
  const ov = $('#pregunta-grande');
  const a = estado.abierta;
  if (!a) { ov.hidden = true; abiertaPrevia = null; return; }
  const k = clave(a.c, a.i);
  const p = config.categorias[a.c].preguntas[a.i];
  const nueva = abiertaPrevia !== k;

  $('#pg-cat').textContent = nombreCategoria(a.c);
  $('#pg-valor').textContent = NUM.format(VALORES[a.i]);
  const { enunciado: q, opciones } = partirPregunta(p.pregunta);
  const tx = $('#pg-texto');
  tx.textContent = q || 'Esta pregunta todavía no está escrita.';
  tx.className = 'pg-texto' + (q ? (q.length > 140 || opciones.length ? ' largo' : '') : ' vacia');
  const correcta = estado.respuestaVisible ? letraRespuesta(p.respuesta) : null;
  const ol = $('#pg-opciones');
  ol.hidden = !opciones.length;
  ol.classList.toggle('revelada', !!correcta);
  ol.innerHTML = opciones.map(o => `<li${o.letra === correcta ? ' class="correcta"' : ''}><span class="letra">${o.letra}</span><span>${esc(o.texto)}</span></li>`).join('');

  const r = $('#pg-respuesta');
  if (estado.respuestaVisible) {
    const yaEstaba = !r.hidden && !nueva;
    r.hidden = false;
    r.textContent = p.respuesta.trim() || 'Sin respuesta escrita.';
    r.classList.toggle('larga', p.respuesta.trim().length > 90);
    if (!yaEstaba) { r.classList.remove('visible'); void r.offsetWidth; r.classList.add('visible'); }
  } else {
    r.hidden = true;
    r.classList.remove('visible');
  }
  $('#pg-mostrar').hidden = estado.respuestaVisible;
  [0, 1].forEach(e => { $('#pg-eq' + e).innerHTML = `Acertó ${htmlEquipo(e)} <kbd>${e + 1}</kbd>`; });

  ov.hidden = false;
  if (nueva) animarApertura(a.c, a.i);
  abiertaPrevia = k;
}

/* La pregunta crece desde su casilla hasta llenar la pantalla */
function animarApertura(c, i) {
  const ov = $('#pregunta-grande');
  const casilla = $(`#tablero [data-c="${c}"][data-i="${i}"]`);
  if (reducirMovimiento.matches || !casilla) return;
  const t = casilla.getBoundingClientRect();
  const o = ov.getBoundingClientRect();
  if (!o.width || !o.height) return;
  ov.style.transition = 'none';
  ov.style.transformOrigin = '0 0';
  ov.style.transform = `translate(${t.left - o.left}px, ${t.top - o.top}px) scale(${t.width / o.width}, ${t.height / o.height})`;
  ov.classList.add('abriendo');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ov.style.transition = 'transform 520ms cubic-bezier(.2,.7,.2,1)';
    ov.style.transform = 'none';
  }));
  setTimeout(() => ov.classList.remove('abriendo'), 460);
}

/* ---------- Control del moderador ---------- */
function renderMenuMinijuegos() {
  $('#ctl-minijuegos').innerHTML = `<h2 class="ctl-subtitulo">Minijuegos</h2>
    <p class="leyenda">Abre cualquier reto en el proyector para probarlo o jugarlo fuera de la ruleta. No suma puntos ni gasta casillas.</p>
    <div class="menu-minijuegos">${MINIJUEGOS.map((m, j) => `
      <div class="mj-fila">
        <p class="mj-nombre"><span class="emoji" aria-hidden="true">${m.emoji}</span> ${esc(m.nombre)}</p>
        <div class="mj-retos">${[1, 2, 3].map(n => {
          const nom = juego.config.minijuegos[j].retos[n - 1].nombre.trim();
          return `<button type="button" class="btn mj-reto" data-accion="libre-abrir" data-casilla="${j}-${n}"><b>${n}</b><span${nom ? '' : ' class="sin-nombre"'}>${esc(nom || 'Sin nombre')}</span></button>`;
        }).join('')}</div>
      </div>`).join('')}</div>`;
}
function renderControlLibre(L) {
  const { juego: mj, n } = infoCasilla(L.casilla);
  const reto = retoDe(L.casilla);
  let h = `<div class="ctl-meta"><span>Minijuego</span><span>Sin puntos</span></div>
    <p class="ctl-texto"><span class="emoji" aria-hidden="true">${mj.emoji}</span> ${esc(mj.nombre)}${reto.nombre.trim() ? `: ${esc(reto.nombre.trim())}` : `, reto ${n}`}</p>
    <p class="ctl-nota">${esc(reto.instrucciones.trim() || mj.desc)}</p>
    ${reto.material.trim() ? `<p class="ctl-material"><b>Material:</b> ${esc(reto.material.trim())}</p>` : ''}
    ${avisoVideoCtl(reto)}`;
  if (tieneReloj(L)) h += controlRelojHtml(L);
  if (tieneBomba(L)) h += bombaControlHtml(L);
  if (tieneEncuesta(L)) h += encuestaControlHtml(L);
  if (tienePassword(L)) h += passwordControlHtml(L);
  h += '<button type="button" class="btn btn-primario" data-accion="libre-cerrar">Cerrar minijuego</button>';
  $('#ctl-libre').innerHTML = h;
}
function renderControlDoble(d) {
  const v = VALORES[d.i];
  const botonesResultadoCtl = `<div class="ctl-acciones">
        <button type="button" class="btn btn-equipo" style="${estiloEquipo(d.equipo)}" data-accion="don-gano"><span>Ganó el reto</span><small>+${NUM.format(v * 2)}</small></button>
        <button type="button" class="btn btn-columna" data-accion="don-perdio"><span>Perdió el reto</span><small>0</small></button>
      </div>`;
  let h = `<div class="ctl-meta"><span>Doble o nada</span><span class="valor">${NUM.format(v)}</span></div>`;
  if (d.fase === 'oferta') {
    h += `<p class="ctl-texto">${htmlEquipo(d.equipo)} va perdiendo y acertó. ¿Quiere doble o nada?</p>
      <p class="ctl-nota">Si gana el reto suma ${NUM.format(v * 2)}; si lo pierde, esta pregunta vale 0. Sus puntos anteriores no se tocan.</p>
      <div class="ctl-acciones">
        <button type="button" class="btn btn-primario" data-accion="don-si">Sí, doble o nada</button>
        <button type="button" class="btn" data-accion="don-no">No, quedarse con ${NUM.format(v)}</button>
      </div>`;
  } else if (d.fase === 'ruleta') {
    const libres = casillasDisponibles();
    h += `<p class="ctl-texto">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>
      <p class="ctl-nota">Gira la ruleta; el minijuego aparece en el proyector.</p>
      <button type="button" class="btn btn-primario" data-accion="don-girar">Girar la ruleta</button>
      <ul class="ctl-restantes" aria-label="Casillas que quedan en la ruleta">${MINIJUEGOS.map((m, j) => {
        const q = libres.filter(id => id.startsWith(j + '-')).length;
        return `<li${q ? '' : ' class="agotado"'}><span class="emoji" aria-hidden="true">${m.emoji}</span><span>${esc(m.nombre)}</span><b>${q}</b></li>`;
      }).join('')}</ul>`;
  } else if (d.fase === 'jugando') {
    if (d.casilla) {
      const { juego: mj, n } = infoCasilla(d.casilla);
      const reto = retoDe(d.casilla);
      h += `<p class="ctl-texto">Salió <span class="emoji" aria-hidden="true">${mj.emoji}</span> ${esc(mj.nombre)}${reto.nombre.trim() ? `: ${esc(reto.nombre.trim())}` : `, reto ${n} de 3`}.</p>
      <p class="ctl-nota">${esc(reto.instrucciones.trim() || mj.desc)}</p>
      ${reto.material.trim() ? `<p class="ctl-material"><b>Material:</b> ${esc(reto.material.trim())}</p>` : ''}
      ${avisoVideoCtl(reto)}
      <p class="ctl-nota">Espera a que la ruleta se detenga en el proyector antes de anunciarlo.</p>`;
      if (tieneReloj(d)) h += controlRelojHtml(d);
      if (tieneBomba(d)) h += bombaControlHtml(d);
      if (tieneEncuesta(d)) h += encuestaControlHtml(d);
      if (tienePassword(d)) h += passwordControlHtml(d);
    } else {
      h += `<p class="ctl-texto">${htmlEquipo(d.equipo)} se juega ${NUM.format(v)} puntos.</p>
      <p class="ctl-nota">Ya no quedan casillas en la ruleta: elijan un minijuego y marca el resultado.</p>`;
    }
    h += botonesResultadoCtl;
  } else {
    h += `<p class="ctl-texto">${d.gano ? `${htmlEquipo(d.equipo)} ganó el reto y suma ${NUM.format(v * 2)}.` : `${htmlEquipo(d.equipo)} perdió el reto: esta pregunta vale 0.`}</p>
      <button type="button" class="btn btn-primario" data-accion="don-cerrar">Volver al tablero</button>`;
  }
  $('#ctl-doble').innerHTML = h;
}
function renderControl() {
  const { estado, config } = juego;
  $('#ctl-equipos').innerHTML = [0, 1].map(k => `
    <div class="equipo-ctl" style="${estiloEquipo(k)}">
      <div class="fila-sup">
        <span class="nombre">${htmlEquipo(k)}</span>
        ${estado.turno === k ? '<span class="etiqueta-turno">Turno</span>' : ''}
      </div>
      <span class="puntos">${NUM.format(estado.puntos[k])}</span>
      <div class="ajustes">
        <button type="button" class="btn" data-accion="ajustar" data-equipo="${k}" data-delta="-100" aria-label="Restar 100 a ${esc(nombreEquipo(k))}">−100</button>
        <button type="button" class="btn" data-accion="ajustar" data-equipo="${k}" data-delta="100" aria-label="Sumar 100 a ${esc(nombreEquipo(k))}">+100</button>
      </div>
    </div>`).join('');

  const a = estado.abierta;
  const d = estado.dobleONada;
  const L = estado.minijuegoLibre;
  const N = estado.eligiendoNombres;
  $('#ctl-zona-tablero').hidden = !!a || !!d || !!L || !!N;
  $('#ctl-pregunta').hidden = !a;
  $('#ctl-doble').hidden = !d;
  $('#ctl-libre').hidden = !L;
  $('#ctl-nombres').hidden = !N;
  if (d) renderControlDoble(d);
  if (L) renderControlLibre(L);
  if (N) {
    $('#ctl-nombres').innerHTML = `<div class="ctl-meta"><span>Elegir nombres</span><span>Se ve en el proyector</span></div>
      <p class="ctl-nota">Toca el equipo que va a elegir y luego su nombre. Un nombre ya tomado no se puede repetir.</p>
      ${selectorNombresHtml('ctl')}
      <button type="button" class="btn btn-primario" data-accion="nombres-cerrar">Listo</button>`;
  }
  if (!a && !d && !L && !N) renderMenuMinijuegos();

  if (!a) {
    let h = '';
    for (let c = 0; c < 5; c++) h += `<div class="ctl-cat" style="grid-column:${c + 1};grid-row:1">${esc(nombreCategoria(c))}</div>`;
    for (let c = 0; c < 5; c++) {
      for (let i = 0; i < 4; i++) {
        const pos = `grid-column:${c + 1};grid-row:${i + 2}`;
        const etiqueta = `${esc(nombreCategoria(c))} por ${VALORES[i]}`;
        if (usada(c, i)) {
          const arm = armado === `re-${c}-${i}`;
          h += `<button type="button" class="ctl-casilla jugada${arm ? ' armada' : ''}" style="${pos}" data-accion="reactivar" data-c="${c}" data-i="${i}" aria-label="${etiqueta}, ya jugada. ${arm ? 'Toca otra vez para reactivarla' : 'Toca dos veces para reactivarla'}">${arm ? '¿Reactivar?' : 'Jugada'}</button>`;
        } else {
          const vacia = !config.categorias[c].preguntas[i].pregunta.trim();
          h += `<button type="button" class="ctl-casilla${vacia ? ' sin-texto' : ''}" style="${pos}" data-accion="abrir" data-c="${c}" data-i="${i}" aria-label="${etiqueta}${vacia ? ', sin pregunta escrita' : ''}">${VALORES[i]}</button>`;
        }
      }
    }
    $('#ctl-tablero').innerHTML = h;
  } else {
    const p = config.categorias[a.c].preguntas[a.i];
    const v = VALORES[a.i];
    const { enunciado: q, opciones } = partirPregunta(p.pregunta);
    const correcta = letraRespuesta(p.respuesta);
    $('#ctl-pregunta').innerHTML = `
      <div class="ctl-meta"><span>${esc(nombreCategoria(a.c))}</span><span class="valor">${NUM.format(v)}</span></div>
      <p class="ctl-texto${q ? '' : ' vacia'}">${esc(q || 'Esta pregunta todavía no está escrita.')}</p>
      ${opciones.length ? `<ol class="ctl-opciones">${opciones.map(o => `<li${o.letra === correcta ? ' class="correcta"' : ''}><b>${o.letra})</b> ${esc(o.texto)}</li>`).join('')}</ol>` : ''}
      <div class="ctl-respuesta">
        <p class="rotulo">${estado.respuestaVisible ? 'Respuesta (ya está en pantalla)' : 'Respuesta (solo tú la ves)'}</p>
        <p class="valor-resp">${esc(p.respuesta.trim() || 'Sin respuesta escrita.')}</p>
      </div>
      <button type="button" class="btn btn-primario" data-accion="mostrar"${estado.respuestaVisible ? ' disabled' : ''}>${estado.respuestaVisible ? 'Respuesta en pantalla' : 'Mostrar respuesta en pantalla'}</button>
      <div class="ctl-acciones">
        ${[0, 1].map(k => `<button type="button" class="btn btn-equipo" style="${estiloEquipo(k)}" data-accion="acerto" data-equipo="${k}"><span>Acertó ${htmlEquipo(k)}</span><small>+${NUM.format(v)}</small></button>`).join('')}
        <button type="button" class="btn ancho" data-accion="nadie">Nadie acertó</button>
      </div>
      <button type="button" class="btn-texto" data-accion="cerrar">Volver al tablero sin calificar</button>`;
  }
  $('#btn-nueva').textContent = armado === 'nueva' ? 'Toca otra vez para borrar los puntos' : 'Nueva partida';
}

/* ---------- Editor de preguntas ---------- */
function renderEditor() {
  const { config } = juego;
  let h = '<h2>Equipos</h2><div class="equipos-edit" id="editor-equipos"></div><h2>Categorías y preguntas</h2>';
  config.categorias.forEach((cat, c) => {
    h += `<section class="cat-edit"><label class="campo">Categoría ${c + 1}<input type="text" maxlength="40" data-campo="categoria" data-c="${c}" value="${esc(cat.nombre)}"></label>`;
    cat.preguntas.forEach((p, i) => {
      h += `<div class="fila-pregunta">
        <span class="valor" aria-hidden="true">${VALORES[i]}</span>
        <textarea rows="2" maxlength="400" data-campo="pregunta" data-c="${c}" data-i="${i}" placeholder="Pregunta de ${VALORES[i]}" aria-label="Pregunta de ${VALORES[i]} en la categoría ${c + 1}">${esc(p.pregunta)}</textarea>
        <input type="text" maxlength="600" data-campo="respuesta" data-c="${c}" data-i="${i}" placeholder="Respuesta" aria-label="Respuesta de ${VALORES[i]} en la categoría ${c + 1}" value="${esc(p.respuesta)}">
      </div>`;
    });
    h += '</section>';
  });
  h += '<h2>Retos de la ruleta</h2><p class="editor-intro">Cada minijuego sale hasta 3 veces; cada vez toca un reto distinto. Las instrucciones se ven en el proyector y el material solo en el control.</p>';
  MINIJUEGOS.forEach((m, j) => {
    h += `<section class="cat-edit"><h3 class="reto-juego"><span class="emoji" aria-hidden="true">${m.emoji}</span> ${esc(m.nombre)}</h3>`;
    if (m.segundos) h += `<label class="campo campo-timer">Video del temporizador (YouTube)<input type="url" maxlength="300" data-campo="video-temporizador" placeholder="https://www.youtube.com/watch?v=…" value="${esc(config.videoTemporizador)}"></label>`;
    if (m.bomba) h += `<p class="editor-intro campo-timer">En Tic-Tac-Boom el nombre de cada reto es su sílaba. Las de respaldo aparecen en el control para cambiarla si hace falta.</p>
      <label class="campo campo-timer">Sílabas de respaldo (separadas por coma)<input type="text" maxlength="60" data-campo="silabas-respaldo" placeholder="PAR, RES" value="${esc(config.silabasRespaldo)}"></label>`;
    config.minijuegos[j].retos.forEach((r, x) => {
      const et = `reto ${x + 1} de ${esc(m.nombre)}`;
      h += `<div class="fila-reto">
        <span class="valor" aria-hidden="true">${x + 1}</span>
        <div class="reto-campos">
          <input type="text" maxlength="60" data-campo="reto-nombre" data-j="${j}" data-n="${x}" placeholder="${m.bomba ? `Sílaba (por ejemplo ${SILABAS_BASE[x]})` : 'Nombre del reto'}" aria-label="${m.bomba ? 'Sílaba' : 'Nombre'} del ${et}" value="${esc(r.nombre)}">
          <textarea rows="2" maxlength="400" data-campo="reto-instrucciones" data-j="${j}" data-n="${x}" placeholder="Instrucciones: qué hay que hacer para ganar" aria-label="Instrucciones del ${et}">${esc(r.instrucciones)}</textarea>
          <input type="text" maxlength="160" data-campo="reto-material" data-j="${j}" data-n="${x}" placeholder="Material" aria-label="Material del ${et}" value="${esc(r.material)}">
          <input type="url" maxlength="300" data-campo="reto-video" data-j="${j}" data-n="${x}" placeholder="${m.encuesta ? 'Video con la pregunta (YouTube, con el minuto: …&t=182s)' : 'Enlace del video de explicación (YouTube)'}" aria-label="Video del ${et}" value="${esc(r.video)}">
          ${m.password ? `<textarea rows="5" data-campo="reto-palabras" data-j="${j}" data-n="${x}" placeholder="Palabras, una por línea" aria-label="Palabras del ${et}">${esc(r.palabras)}</textarea>` : ''}
          ${m.encuesta ? `<p class="enc-edit-nota">Tablero en orden, de la más popular a la menos. Las 3 primeras son las que hay que encontrar.</p>
          <div class="enc-edit">${[...Array(MAX_RESPUESTAS).keys()].map(k => `<div class="enc-edit-fila${k < 3 ? ' objetivo' : ''}">
              <span>${k + 1}</span>
              <input type="text" maxlength="40" data-campo="reto-respuesta" data-j="${j}" data-n="${x}" data-k="${k}" placeholder="Respuesta ${k + 1}" aria-label="Respuesta ${k + 1} del ${et}" value="${esc(r.respuestas[k].texto)}">
              <input type="number" min="0" max="100" inputmode="numeric" data-campo="reto-puntos" data-j="${j}" data-n="${x}" data-k="${k}" placeholder="Pts" aria-label="Puntos de la respuesta ${k + 1} del ${et}" value="${r.respuestas[k].puntos || ''}">
            </div>`).join('')}</div>` : ''}
        </div>
      </div>`;
    });
    h += '</section>';
  });
  $('#editor-campos').innerHTML = h;
  renderEquiposEditor();
}
function renderEquiposEditor() {
  const zona = $('#editor-equipos');
  if (!zona) return;
  const { config } = juego;
  zona.innerHTML = [0, 1].map(k => `
    <fieldset class="selector-equipo" style="${estiloEquipo(k)}">
      <legend>Equipo ${k + 1}</legend>
      <div class="opciones-equipo">
        ${OPCIONES_EQUIPO.map(o => {
          const elegido = config.equipos[k] === o.id;
          const ocupado = config.equipos[1 - k] === o.id;
          return `<button type="button" class="chip-equipo" data-accion="elegir-equipo" data-equipo="${k}" data-opcion="${o.id}" aria-pressed="${elegido}"${ocupado ? ' disabled title="Ya lo eligió el otro equipo"' : ''}><span class="emoji" aria-hidden="true">${o.emoji}</span> ${esc(o.nombre)}</button>`;
        }).join('')}
      </div>
    </fieldset>`).join('');
}
function elegirEquipoEditor(k, id) {
  if (!elegirEquipo(k, id)) return;
  renderEquiposEditor();
  const b = $(`[data-accion="elegir-equipo"][data-equipo="${k}"][data-opcion="${id}"]`);
  if (b) b.focus();
}

document.addEventListener('input', e => {
  const el = e.target.closest('[data-campo]');
  if (!el) return;
  const nc = clonar(juego.config);
  const v = el.value;
  const c = +el.dataset.c, i = +el.dataset.i;
  switch (el.dataset.campo) {
    case 'categoria': nc.categorias[c].nombre = v; break;
    case 'pregunta': nc.categorias[c].preguntas[i].pregunta = v; break;
    case 'respuesta': nc.categorias[c].preguntas[i].respuesta = v; break;
    case 'reto-nombre': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].nombre = v; break;
    case 'reto-instrucciones': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].instrucciones = v; break;
    case 'reto-material': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].material = v; break;
    case 'reto-video': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].video = v; break;
    case 'video-temporizador': nc.videoTemporizador = v; break;
    case 'silabas-respaldo': nc.silabasRespaldo = v; break;
    case 'reto-palabras': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].palabras = v; break;
    case 'reto-respuesta': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].respuestas[+el.dataset.k].texto = v; break;
    case 'reto-puntos': nc.minijuegos[+el.dataset.j].retos[+el.dataset.n].respuestas[+el.dataset.k].puntos = Number(v) || 0; break;
    default: return;
  }
  actualizarConfig(nc);
});

/* ---------- Eventos ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-accion]');
  if (!b || b.disabled) return;
  const c = +b.dataset.c, i = +b.dataset.i, k = +b.dataset.equipo;
  switch (b.dataset.accion) {
    case 'abrir': abrir(c, i); break;
    case 'mostrar': mostrarRespuesta(); break;
    case 'acerto': resolver(k); break;
    case 'nadie': resolver(null); break;
    case 'cerrar': cerrar(); break;
    case 'ajustar': ajustar(k, +b.dataset.delta); break;
    case 'turno': pasarTurno(); break;
    case 'reactivar': {
      const id = `re-${c}-${i}`;
      if (armado === id) { desarmar(); reactivar(c, i); } else armar(id);
      break;
    }
    case 'nueva':
      if (armado === 'nueva') { desarmar(); nuevaPartida(); } else armar('nueva');
      break;
    case 'pantalla-completa': alternarPantallaCompleta(); break;
    case 'elegir-equipo': elegirEquipoEditor(k, b.dataset.opcion); break;
    case 'don-si': decidirDoble(true); break;
    case 'don-no': decidirDoble(false); break;
    case 'don-gano': resultadoDoble(true); break;
    case 'don-perdio': resultadoDoble(false); break;
    case 'don-cerrar': cerrarDoble(); break;
    case 'don-girar': girar(); break;
    case 'reloj-iniciar': relojAccion('iniciar'); break;
    case 'reloj-detener': relojAccion('detener'); break;
    case 'reloj-reiniciar': relojAccion('reiniciar'); break;
    case 'probar-sonido': prepararAudio(); setTimeout(() => sonido('inicio'), 60); break;
    case 'pw-empezar': passwordEmpezar(); break;
    case 'pw-iniciar': passwordIniciar(); break;
    case 'pw-pausar': passwordPausar(); break;
    case 'pw-si': passwordMarcar(true); break;
    case 'pw-no': passwordMarcar(false); break;
    case 'pw-deshacer': passwordDeshacer(); break;
    case 'pw-siguiente': passwordSiguiente(); break;
    case 'pw-reiniciar': passwordReiniciar(); break;
    case 'enc-mostrar': encuestaMostrar(); break;
    case 'enc-revelar': encuestaRevelar(+b.dataset.k); break;
    case 'enc-ocultar': encuestaOcultar(+b.dataset.k); break;
    case 'enc-strike': encuestaStrike(); break;
    case 'enc-quitar-strike': encuestaQuitarStrike(); break;
    case 'enc-reiniciar': encuestaReiniciar(); break;
    case 'bomba-girar': bombaGirar(); break;
    case 'bomba-silaba': bombaSilaba(b.dataset.silaba); break;
    case 'bomba-encender': bombaAccion('encender'); break;
    case 'bomba-pausar': bombaAccion('pausar'); break;
    case 'bomba-continuar': bombaAccion('continuar'); break;
    case 'bomba-reiniciar': bombaAccion('reiniciar'); break;
    case 'libre-abrir': abrirLibre(b.dataset.casilla); break;
    case 'libre-cerrar': cerrarLibre(); break;
    case 'nombres-abrir': abrirNombres(); break;
    case 'nombres-cerrar': cerrarNombres(); break;
    case 'nombres-turno': turnoNombres(k); break;
    case 'nombres-elegir': asignarNombre(b.dataset.opcion); break;
    case 'sala-crear': crearSalaNueva(); break;
    case 'sala-cambiar': mostrarUnirse = true; errorSala = ''; render(); { const inp = $('#sala-inicio input'); if (inp) inp.focus(); } break;
  }
});

/* Atajos de teclado en el proyector */
document.addEventListener('keydown', e => {
  if (vistaActual() !== 'pantalla' || e.metaKey || e.ctrlKey || e.altKey) return;
  const { estado } = juego;
  const enControl = e.target.closest && e.target.closest('button, a');
  const k = e.key;
  if ((k === ' ' || k === 'Enter') && enControl) return;
  if (k === 'v' || k === 'V') {
    const enlace = document.querySelector('#v-pantalla .doble:not([hidden]) [data-video]');
    if (enlace) { e.preventDefault(); window.open(enlace.href, '_blank', 'noopener'); return; }
  }
  if (k === 't' || k === 'T') {
    const enlace = document.querySelector('#v-pantalla .doble:not([hidden]) [data-timer]');
    if (enlace) { e.preventDefault(); window.open(enlace.href, '_blank', 'noopener'); return; }
  }
  if (estado.eligiendoNombres) { if (k === 'Escape') cerrarNombres(); return; }
  /* 100 Mexicanos: Espacio muestra el tablero, 1-3 destapan, X marca strike */
  const activo = estado.minijuegoLibre || (estado.dobleONada && estado.dobleONada.fase === 'jugando' ? estado.dobleONada : null);
  /* Password: Espacio empieza / inicia / pausa / siguiente equipo; A adivinó, N no adivinó */
  if (tienePassword(activo) && !estaGirando()) {
    if (k === ' ') { e.preventDefault(); alternarPassword(); return; }
    if (activo.password && (k === 'a' || k === 'A')) { passwordMarcar(true); return; }
    if (activo.password && (k === 'n' || k === 'N')) { passwordMarcar(false); return; }
  }
  if (tieneEncuesta(activo) && !estaGirando()) {
    if (k === ' ' && !activo.encuesta) { e.preventDefault(); encuestaMostrar(); return; }
    if (activo.encuesta && /^[1-8]$/.test(k)) { const lugar = lugaresTablero(activo)[+k - 1]; if (lugar !== undefined) encuestaRevelar(lugar); return; }
    if (activo.encuesta && (k === 'x' || k === 'X')) { encuestaStrike(); return; }
  }
  if (estado.minijuegoLibre) {
    if (k === ' ') { e.preventDefault(); if (tieneBomba(estado.minijuegoLibre)) alternarBomba(); else alternarReloj(); }
    else if (k === 'Escape') cerrarLibre();
    return;
  }
  const d = estado.dobleONada;
  if (d) {
    const t = k.toLowerCase();
    if (d.fase === 'oferta') { if (t === 's') decidirDoble(true); else if (t === 'n') decidirDoble(false); }
    else if (d.fase === 'ruleta') { if (k === ' ' || k === 'Enter') { e.preventDefault(); girar(); } }
    else if (d.fase === 'jugando') { if (t === 'g') resultadoDoble(true); else if (t === 'p') resultadoDoble(false); else if (k === ' ' && tieneReloj(d)) { e.preventDefault(); alternarReloj(); } else if (k === ' ' && tieneBomba(d) && !estaGirando()) { e.preventDefault(); alternarBomba(); } }
    else if (k === 'Escape' || k === 'Enter' || k === ' ') { e.preventDefault(); cerrarDoble(); }
    return;
  }
  if (!estado.abierta) return;
  if (k === ' ' || k === 'r' || k === 'R') { e.preventDefault(); mostrarRespuesta(); }
  else if (k === '1') resolver(0);
  else if (k === '2') resolver(1);
  else if (k === '0') resolver(null);
  else if (k === 'Escape') cerrar();
});

/* Los controles de la pantalla aparecen al mover el mouse y se esconden solos */
let tMouse = null;
function actividad() {
  document.body.classList.add('con-mouse');
  clearTimeout(tMouse);
  tMouse = setTimeout(() => document.body.classList.remove('con-mouse'), 2500);
}
['mousemove', 'pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, actividad, { passive: true }));

/* Pantalla completa */
const btnFS = $('#btn-fs');
if (!document.fullscreenEnabled) btnFS.hidden = true;
function alternarPantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => { btnFS.hidden = true; });
}
document.addEventListener('fullscreenchange', () => {
  btnFS.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
});

/* ---------- Arranque ---------- */
setInterval(() => tickReloj(vistaActual() === 'pantalla', render), 100);
setInterval(() => tickBomba(vistaActual() === 'pantalla', render), 40);
setInterval(() => tickPassword(vistaActual() === 'pantalla', render), 100);
window.addEventListener('hashchange', render);
render();
sync.iniciar({
  alEstado: raw => { recibirEstado(raw); render(); },
  alConfig: raw => {
    /* No pisar lo que se está escribiendo en el editor */
    const enEditor = vistaActual() === 'preguntas' && document.activeElement && document.activeElement.closest('#editor-campos');
    if (enEditor || !recibirConfig(raw)) return;
    if (vistaActual() === 'preguntas') renderEditor();
    render();
  },
  alModo: () => render()
});
