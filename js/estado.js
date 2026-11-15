/* Modelo de datos, normalización y acciones del juego.
   No toca el DOM: guardar, la hora y el redibujado llegan desde fuera con configurar(). */

export const VALORES = [100, 200, 300, 400];
export const CATEGORIAS_BASE = ['Comida', 'Harry Potter', 'Datos', 'Música', 'Deportes'];
export const EQUIPO_COLOR = ['var(--rosa)', 'var(--turquesa)'];
export const EQUIPO_TINTA = ['#FFFFFF', '#04232A'];
export const OPCIONES_EQUIPO = [
  { id: 'limon', nombre: 'Limón', emoji: '🍋' },
  { id: 'taco', nombre: 'Taco', emoji: '🌮' },
  { id: 'tortilla', nombre: 'Tortilla', emoji: '🫓' },
  { id: 'birria', nombre: 'Birria', emoji: '🍲' },
  { id: 'pavo', nombre: 'Pavo', emoji: '🦃' },
  { id: 'salsa', nombre: 'Salsa', emoji: '🌶️' },
  { id: 'puerco', nombre: 'Puerco', emoji: '🐷' },
  { id: 'usa', nombre: 'USA', emoji: '🇺🇸' },
  { id: 'mx', nombre: 'MX', emoji: '🇲🇽' },
  { id: 'tequila', nombre: 'Tequila', emoji: '🥃' },
  { id: 'cerveza', nombre: 'Cerveza', emoji: '🍺' },
  { id: 'clamato', nombre: 'Clamato', emoji: '🍅' },
  { id: 'botti', nombre: 'Botti', emoji: '🐶' }
];
export const IDS_EQUIPO = OPCIONES_EQUIPO.map(o => o.id);
export const MINIJUEGOS = [
  { nombre: '100 Mexicanos Dijeron', corto: '100 Mexicanos', emoji: '💯', color: '#E4007C', tinta: '#FFFFFF', desc: 'Adivinen las respuestas más populares, compitiendo contra el equipo rival.' },
  { nombre: 'Tic-Tac-Boom', corto: 'Tic-Tac-Boom', emoji: '💣', color: '#FF6A13', tinta: '#12163A', desc: 'Pasa una persona de cada equipo. Se pasan la pelota por turnos diciendo una palabra con la sílaba. Pierde quien tenga la pelota cuando explote la bomba.', bomba: true },
  { nombre: 'Minuto para Ganar', corto: 'Minuto', emoji: '⏱️', color: '#FFB81C', tinta: '#12163A', desc: 'Completen el reto en 60 segundos.', segundos: 60 },
  { nombre: 'Password', corto: 'Password', emoji: '🔑', color: '#00A3AD', tinta: '#04232A', desc: 'Adivinen la palabra con las pistas de sus compañeros.' },
  { nombre: 'Atínale al Precio', corto: 'Atínale', emoji: '🏷️', color: '#22A35A', tinta: '#072A16', desc: 'Los dos equipos adivinan el precio. Si queda más cerca el equipo que va por el doble, gana; si queda más cerca el que va ganando, se lo impide.' },
  { nombre: 'Completa la Canción', corto: 'Canción', emoji: '🎤', color: '#7B3FD6', tinta: '#FFFFFF', desc: 'Elijan a un participante y uno de los 2 artistas. Si sigue la letra 10 segundos cuando desaparezca, ganan.' }
];
/* 18 casillas: cada minijuego 3 veces (reto 1, 2 y 3), intercaladas para que no queden juntas */
export const CASILLAS = [];
for (let n = 1; n <= 3; n++) for (let j = 0; j < MINIJUEGOS.length; j++) CASILLAS.push(`${j}-${n}`);
export const infoCasilla = id => { const [j, n] = id.split('-').map(Number); return { juego: MINIJUEGOS[j], j, n }; };

/* Tic-Tac-Boom: la ruleta chica decide dónde va la sílaba; la bomba explota entre 30 y 45 s */
export const MODOS_BOMBA = [
  { id: 'tic', nombre: 'TIC', verbo: 'empiece con', color: '#00A3AD', tinta: '#04232A' },
  { id: 'tac', nombre: 'TAC', verbo: 'tenga en cualquier parte', color: '#FFB81C', tinta: '#12163A' },
  { id: 'boom', nombre: 'BOOM', verbo: 'termine con', color: '#E4007C', tinta: '#FFFFFF' }
];
export const SILABAS_BASE = ['CON', 'TRA', 'SAL'];
export const BOMBA_MIN_MS = 30000, BOMBA_MAX_MS = 45000, BOMBA_GIRO_MS = 3200;
const J_BOMBA = MINIJUEGOS.findIndex(m => m.bomba);

export const clonar = o => JSON.parse(JSON.stringify(o));
export const texto = v => (typeof v === 'string' ? v : '');
export const clave = (c, i) => c + '-' + i;

/* Firebase puede devolver un arreglo como objeto {0: …, 1: …} y no guarda arreglos vacíos */
function comoArreglo(v) {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== 'object') return null;
  const llaves = Object.keys(v).filter(k => /^\d+$/.test(k));
  if (!llaves.length) return null;
  const a = [];
  llaves.forEach(k => { a[+k] = v[k]; });
  return a;
}

/* Separa "Pregunta A) uno B) dos…" en enunciado y opciones */
export function partirPregunta(t) {
  const todo = (t || '').trim();
  const m = todo.match(/(^|\s)A\)\s/);
  if (!m) return { enunciado: todo, opciones: [] };
  const inicio = m.index + m[1].length;
  const opciones = todo.slice(inicio).split(/\s+(?=[B-D]\)\s)/).map(s => {
    const o = s.trim().match(/^([A-D])\)\s*([\s\S]*)$/);
    return o ? { letra: o[1], texto: o[2].replace(/\s+/g, ' ').trim() } : null;
  }).filter(Boolean);
  if (opciones.length < 2) return { enunciado: todo, opciones: [] };
  const enunciado = todo.slice(0, inicio).replace(/opciones\s*:?\s*$/i, '').trim();
  return { enunciado, opciones };
}
export const letraRespuesta = r => { const m = (r || '').trim().match(/^([A-D])\)/); return m ? m[1] : null; };

/* Solo enlaces web completos */
export const enlaceValido = u => { const s = texto(u).trim(); return /^https?:\/\/\S+$/i.test(s) ? s : ''; };

/* ---------- Valores por defecto y normalización ---------- */
export function configBase() {
  return {
    equipos: ['taco', 'limon'],
    categorias: CATEGORIAS_BASE.map(nombre => ({
      nombre,
      preguntas: VALORES.map(() => ({ pregunta: '', respuesta: '' }))
    })),
    minijuegos: MINIJUEGOS.map(() => ({ retos: [0, 1, 2].map(() => ({ nombre: '', instrucciones: '', material: '', video: '' })) })),
    videoTemporizador: '',
    videoTemporizadorInicio: 0,
    usarTimerYoutube: false,
    silabasRespaldo: 'PAR, RES'
  };
}
export function estadoBase() {
  return {
    puntos: [0, 0], turno: 0, usadas: [], abierta: null, respuestaVisible: false,
    dobleONada: null, ruletaUsadas: [], minijuegoLibre: null, eligiendoNombres: null, video: null
  };
}
export function normalizarReloj(r) {
  if (!r || typeof r !== 'object' || !['listo', 'corriendo', 'detenido'].includes(r.estado)) return null;
  return {
    estado: r.estado,
    inicioEn: Number.isFinite(r.inicioEn) ? r.inicioEn : 0,
    restanteMs: Number.isFinite(r.restanteMs) ? Math.max(0, Math.min(600000, r.restanteMs)) : 60000
  };
}
const limpiarSilaba = s => texto(s).trim().toUpperCase().replace(/\s+/g, '').slice(0, 10);
export function normalizarBomba(b) {
  if (!b || typeof b !== 'object') return null;
  const ms = v => (Number.isFinite(v) ? Math.max(0, Math.min(BOMBA_MAX_MS, v)) : 0);
  return {
    modo: MODOS_BOMBA.some(m => m.id === b.modo) ? b.modo : null,
    giroEn: Number.isFinite(b.giroEn) ? b.giroEn : 0,
    desfase: Number.isFinite(b.desfase) ? Math.max(-0.4, Math.min(0.4, b.desfase)) : 0,
    silaba: limpiarSilaba(b.silaba),
    estado: ['corriendo', 'detenido'].includes(b.estado) ? b.estado : 'listo',
    inicioEn: Number.isFinite(b.inicioEn) ? b.inicioEn : 0,
    restanteMs: ms(b.restanteMs),
    duracionMs: ms(b.duracionMs)
  };
}
export function normalizarConfig(raw) {
  const base = configBase();
  if (!raw || typeof raw !== 'object') return base;
  const equipos = comoArreglo(raw.equipos);
  if (equipos) {
    base.equipos = base.equipos.map((d, k) => (IDS_EQUIPO.includes(equipos[k]) ? equipos[k] : d));
    if (base.equipos[0] === base.equipos[1]) base.equipos[1] = IDS_EQUIPO.find(id => id !== base.equipos[0]);
  }
  const categorias = comoArreglo(raw.categorias);
  if (categorias) {
    base.categorias = base.categorias.map((cat, c) => {
      const r = categorias[c];
      if (!r || typeof r !== 'object') return cat;
      const preguntas = comoArreglo(r.preguntas) || [];
      return {
        nombre: typeof r.nombre === 'string' ? r.nombre : cat.nombre,
        preguntas: cat.preguntas.map((p, i) => {
          const rp = preguntas[i];
          return { pregunta: texto(rp && rp.pregunta), respuesta: texto(rp && rp.respuesta) };
        })
      };
    });
  }
  const minijuegos = comoArreglo(raw.minijuegos);
  if (minijuegos) {
    base.minijuegos = base.minijuegos.map((m, j) => {
      const retos = (minijuegos[j] && comoArreglo(minijuegos[j].retos)) || [];
      return { retos: m.retos.map((r, x) => {
        const rr = retos[x];
        return { nombre: texto(rr && rr.nombre), instrucciones: texto(rr && rr.instrucciones), material: texto(rr && rr.material), video: texto(rr && rr.video) };
      }) };
    });
  }
  base.videoTemporizador = texto(raw.videoTemporizador);
  base.videoTemporizadorInicio = Number.isFinite(raw.videoTemporizadorInicio) ? Math.max(0, Math.round(raw.videoTemporizadorInicio)) : 0;
  base.usarTimerYoutube = raw.usarTimerYoutube === true;
  if (typeof raw.silabasRespaldo === 'string') base.silabasRespaldo = raw.silabasRespaldo;
  return base;
}
const casillaValida = (c, i) => Number.isInteger(c) && Number.isInteger(i) && c >= 0 && c < 5 && i >= 0 && i < 4;
export function normalizarEstado(raw) {
  const e = estadoBase();
  if (!raw || typeof raw !== 'object') return e;
  const puntos = comoArreglo(raw.puntos);
  if (puntos) e.puntos = [0, 1].map(k => (Number.isFinite(puntos[k]) ? Math.max(0, Math.round(puntos[k])) : 0));
  e.turno = raw.turno === 1 ? 1 : 0;
  const usadas = comoArreglo(raw.usadas);
  if (usadas) e.usadas = [...new Set(usadas.filter(u => typeof u === 'string' && /^[0-4]-[0-3]$/.test(u)))];
  const a = raw.abierta;
  if (a && casillaValida(a.c, a.i)) e.abierta = { c: a.c, i: a.i };
  e.respuestaVisible = !!(e.abierta && raw.respuestaVisible === true);
  const ruletaUsadas = comoArreglo(raw.ruletaUsadas);
  if (ruletaUsadas) e.ruletaUsadas = [...new Set(ruletaUsadas.filter(id => CASILLAS.includes(id)))];
  const d = raw.dobleONada;
  if (d && (d.equipo === 0 || d.equipo === 1) && casillaValida(d.c, d.i) && ['oferta', 'ruleta', 'jugando', 'resultado'].includes(d.fase)) {
    e.dobleONada = {
      equipo: d.equipo, c: d.c, i: d.i, fase: d.fase,
      gano: d.fase === 'resultado' ? d.gano === true : null,
      casilla: CASILLAS.includes(d.casilla) ? d.casilla : null,
      desfase: Number.isFinite(d.desfase) ? Math.max(-0.4, Math.min(0.4, d.desfase)) : 0,
      giroEn: Number.isFinite(d.giroEn) ? d.giroEn : 0,
      reloj: normalizarReloj(d.reloj),
      bomba: normalizarBomba(d.bomba)
    };
  }
  const L = raw.minijuegoLibre;
  if (L && CASILLAS.includes(L.casilla)) e.minijuegoLibre = { casilla: L.casilla, reloj: normalizarReloj(L.reloj), bomba: normalizarBomba(L.bomba) };
  if (raw.eligiendoNombres && typeof raw.eligiendoNombres === 'object') e.eligiendoNombres = { turno: raw.eligiendoNombres.turno === 1 ? 1 : 0 };
  const v = raw.video;
  if (v && enlaceValido(v.url)) {
    e.video = { url: enlaceValido(v.url), inicio: Number.isFinite(v.inicio) ? Math.max(0, Math.round(v.inicio)) : 0, reproduciendo: v.reproduciendo !== false };
  }
  return e;
}

/* ---------- Estado vivo y conexión con el exterior ---------- */
export const juego = { config: configBase(), estado: estadoBase() };

const deps = {
  guardarEstado: () => {},
  guardarConfig: () => Promise.resolve('local'),
  ahora: () => Date.now(),
  alCambiar: () => {},
  alGuardado: () => {}
};
export function configurar(d) { Object.assign(deps, d); }
export const ahora = () => deps.ahora();

let configSucia = false, tConfig = null, guardandoConfig = 0;
export const configPendiente = () => configSucia;

/* Llegan datos de otro dispositivo (o de la carga inicial) */
export function recibirEstado(raw) { juego.estado = normalizarEstado(raw); }
export function recibirConfig(raw) {
  if (configSucia) return false;
  juego.config = normalizarConfig(raw);
  return true;
}

function cambiarEstado(nuevo) {
  juego.estado = normalizarEstado(nuevo);
  deps.guardarEstado(juego.estado);
  deps.alCambiar();
}
function guardarConfigAhora() {
  guardandoConfig++;
  Promise.resolve(deps.guardarConfig(juego.config)).then(r => r, () => 'error').then(resultado => {
    guardandoConfig--;
    if (tConfig || guardandoConfig) return;
    configSucia = false;
    const mensajes = {
      'en-linea': 'Guardado.',
      local: 'Guardado en este navegador.',
      pendiente: 'Sin conexión: se guardó en este navegador y se subirá al reconectar.'
    };
    deps.alGuardado(mensajes[resultado] || 'No se pudo guardar en línea; quedó guardado en este navegador.');
  });
}
/* El editor guarda 700 ms después de dejar de teclear */
export function actualizarConfig(nc) {
  juego.config = normalizarConfig(nc);
  configSucia = true;
  deps.alGuardado('Guardando…');
  clearTimeout(tConfig);
  tConfig = setTimeout(() => { tConfig = null; guardarConfigAhora(); }, 700);
}
function cambiarConfigYa(nc) {
  juego.config = normalizarConfig(nc);
  configSucia = true;
  clearTimeout(tConfig);
  tConfig = null;
  guardarConfigAhora();
}

/* ---------- Consultas ---------- */
const E = () => juego.estado;
export const opcionEquipo = k => OPCIONES_EQUIPO.find(o => o.id === juego.config.equipos[k]) || OPCIONES_EQUIPO[k];
export const nombreEquipo = k => opcionEquipo(k).nombre;
export const nombreCategoria = c => juego.config.categorias[c].nombre.trim() || `Categoría ${c + 1}`;
export const usada = (c, i) => E().usadas.includes(clave(c, i));
/* Va perdiendo = tiene menos puntos ANTES de sumar la pregunta. En empate nadie va perdiendo. */
export const vaPerdiendo = eq => E().puntos[eq] < E().puntos[1 - eq];
export const casillasDisponibles = () => CASILLAS.filter(id => !E().ruletaUsadas.includes(id));
export const retoDe = id => { const { j, n } = infoCasilla(id); return juego.config.minijuegos[j].retos[n - 1]; };
export const tieneReloj = d => !!(d && d.casilla && infoCasilla(d.casilla).juego.segundos);
export const duracionDe = d => ((d && d.casilla && infoCasilla(d.casilla).juego.segundos) || 60) * 1000;
export const relojDe = d => d.reloj || { estado: 'listo', inicioEn: 0, restanteMs: duracionDe(d) };
export const restanteMs = r => (r.estado === 'corriendo' ? Math.max(0, r.restanteMs - Math.max(0, ahora() - r.inicioEn)) : r.restanteMs);
/* El reloj activo: el del minijuego libre, o el del Doble o Nada en juego */
export function juegoConReloj() {
  if (E().minijuegoLibre) return E().minijuegoLibre;
  const d = E().dobleONada;
  return d && d.fase === 'jugando' ? d : null;
}

/* Tic-Tac-Boom */
export const tieneBomba = d => !!(d && d.casilla && infoCasilla(d.casilla).juego.bomba);
const BOMBA_BASE = { modo: null, giroEn: 0, desfase: 0, silaba: '', estado: 'listo', inicioEn: 0, restanteMs: 0, duracionMs: 0 };
export const bombaDe = d => (d && d.bomba) || BOMBA_BASE;
export const modoBomba = id => MODOS_BOMBA.find(m => m.id === id) || null;
export const bombaGirando = b => !!b.modo && ahora() - b.giroEn < BOMBA_GIRO_MS;
export const bombaExploto = b => b.estado === 'corriendo' && restanteMs(b) <= 0;
/* La sílaba del reto es su nombre en el editor; si está vacío, CON, TRA o SAL */
function silabaDeReto(n) {
  const r = juego.config.minijuegos[J_BOMBA].retos[n - 1];
  return limpiarSilaba(r && r.nombre) || SILABAS_BASE[n - 1];
}
export function silabasDisponibles() {
  const respaldo = juego.config.silabasRespaldo.split(/[,;\s]+/).map(limpiarSilaba);
  return [...new Set([1, 2, 3].map(silabaDeReto).concat(respaldo).filter(Boolean))];
}
export const silabaDe = d => bombaDe(d).silaba || (d && d.casilla ? silabaDeReto(infoCasilla(d.casilla).n) : '');

/* ---------- Acciones del tablero ---------- */
export function abrir(c, i) {
  const e = E();
  if (e.abierta || e.dobleONada || e.minijuegoLibre || e.eligiendoNombres || usada(c, i)) return;
  cambiarEstado({ ...e, abierta: { c, i }, respuestaVisible: false });
}
export function mostrarRespuesta() {
  if (!E().abierta || E().respuestaVisible) return;
  cambiarEstado({ ...E(), respuestaVisible: true });
}
export function resolver(equipo) {
  const e = E();
  if (!e.abierta) return;
  const { c, i } = e.abierta;
  const base = { ...e, usadas: [...e.usadas, clave(c, i)], abierta: null, respuestaVisible: false };
  if ((equipo === 0 || equipo === 1) && vaPerdiendo(equipo) && casillasDisponibles().length > 0) {
    cambiarEstado({ ...base, dobleONada: { equipo, c, i, fase: 'oferta', gano: null, casilla: null, desfase: 0 } });
    return;
  }
  const puntos = [...e.puntos];
  if (equipo === 0 || equipo === 1) puntos[equipo] += VALORES[i];
  cambiarEstado({ ...base, puntos, turno: 1 - e.turno });
}
export function cerrar() {
  if (!E().abierta) return;
  cambiarEstado({ ...E(), abierta: null, respuestaVisible: false });
}
export function ajustar(equipo, delta) {
  const puntos = [...E().puntos];
  puntos[equipo] = Math.max(0, puntos[equipo] + delta);
  cambiarEstado({ ...E(), puntos });
}
export function pasarTurno() { cambiarEstado({ ...E(), turno: 1 - E().turno }); }
export function reactivar(c, i) { cambiarEstado({ ...E(), usadas: E().usadas.filter(u => u !== clave(c, i)) }); }
export function nuevaPartida() { cambiarEstado(estadoBase()); }

/* ---------- Doble o Nada: solo arriesga los puntos de esta pregunta; el acumulado no se toca ---------- */
export function decidirDoble(acepta) {
  const e = E(), d = e.dobleONada;
  if (!d || d.fase !== 'oferta') return;
  if (acepta) { cambiarEstado({ ...e, dobleONada: { ...d, fase: 'ruleta' } }); return; }
  const puntos = [...e.puntos];
  puntos[d.equipo] += VALORES[d.i];
  cambiarEstado({ ...e, puntos, turno: 1 - e.turno, dobleONada: null });
}
/* El giro se decide una sola vez y se guarda: todas las pantallas caen en la misma casilla */
export function girar() {
  const e = E(), d = e.dobleONada;
  if (!d || d.fase !== 'ruleta') return;
  const libres = casillasDisponibles();
  if (!libres.length) { cambiarEstado({ ...e, dobleONada: { ...d, fase: 'jugando' } }); return; }
  const id = libres[Math.floor(Math.random() * libres.length)];
  cambiarEstado({
    ...e,
    ruletaUsadas: [...e.ruletaUsadas, id],
    dobleONada: { ...d, fase: 'jugando', casilla: id, desfase: Math.random() * 0.7 - 0.35, giroEn: ahora(), reloj: null, bomba: null }
  });
}
export function resultadoDoble(gano) {
  const e = E(), d = e.dobleONada;
  if (!d || d.fase !== 'jugando') return;
  const puntos = [...e.puntos];
  if (gano) puntos[d.equipo] += VALORES[d.i] * 2;
  cambiarEstado({ ...e, puntos, turno: 1 - e.turno, dobleONada: { ...d, fase: 'resultado', gano }, video: null });
}
export function cerrarDoble() {
  if (!E().dobleONada || E().dobleONada.fase !== 'resultado') return;
  cambiarEstado({ ...E(), dobleONada: null });
}

/* ---------- Reloj de Minuto para Ganar ---------- */
export function relojAccion(tipo) {
  const d = juegoConReloj();
  if (!d || !tieneReloj(d)) return;
  const r = relojDe(d), ms = restanteMs(r);
  let nuevo;
  if (tipo === 'iniciar') { if (r.estado === 'corriendo' || ms <= 0) return; nuevo = { estado: 'corriendo', inicioEn: ahora(), restanteMs: ms }; }
  else if (tipo === 'detener') { if (r.estado !== 'corriendo') return; nuevo = { estado: 'detenido', inicioEn: 0, restanteMs: ms }; }
  else nuevo = { estado: 'listo', inicioEn: 0, restanteMs: duracionDe(d) };
  cambiarJuegoActivo({ ...d, reloj: nuevo });
}
/* Guarda el minijuego en curso, sea libre o de Doble o Nada */
function cambiarJuegoActivo(nd) {
  if (E().minijuegoLibre) cambiarEstado({ ...E(), minijuegoLibre: nd });
  else cambiarEstado({ ...E(), dobleONada: nd });
}
export function alternarReloj() {
  const d = juegoConReloj();
  if (!tieneReloj(d)) return;
  const r = relojDe(d), ms = restanteMs(r);
  if (r.estado === 'corriendo' && ms > 0) relojAccion('detener');
  else if (ms > 0) relojAccion('iniciar');
}

/* ---------- Tic-Tac-Boom ---------- */
/* La ruleta TIC/TAC/BOOM se decide una vez y se guarda, como la grande */
export function bombaGirar() {
  const d = juegoConReloj();
  if (!tieneBomba(d)) return;
  const b = bombaDe(d);
  if (b.estado !== 'listo' || bombaGirando(b)) return;
  const modo = MODOS_BOMBA[Math.floor(Math.random() * MODOS_BOMBA.length)].id;
  cambiarJuegoActivo({ ...d, bomba: { ...b, modo, giroEn: ahora(), desfase: Math.random() * 0.7 - 0.35 } });
}
export function bombaSilaba(s) {
  const d = juegoConReloj();
  if (!tieneBomba(d) || !silabasDisponibles().includes(s)) return;
  cambiarJuegoActivo({ ...d, bomba: { ...bombaDe(d), silaba: s } });
}
/* encender: el tiempo se sortea aquí (30 a 45 s) y nadie lo ve */
export function bombaAccion(tipo) {
  const d = juegoConReloj();
  if (!tieneBomba(d)) return;
  const b = bombaDe(d), ms = restanteMs(b);
  let nueva;
  if (tipo === 'encender') {
    if (b.estado !== 'listo' || !b.modo || bombaGirando(b)) return;
    const dur = BOMBA_MIN_MS + Math.floor(Math.random() * (BOMBA_MAX_MS - BOMBA_MIN_MS + 1));
    nueva = { ...b, estado: 'corriendo', inicioEn: ahora(), restanteMs: dur, duracionMs: dur };
  } else if (tipo === 'pausar') {
    if (b.estado !== 'corriendo' || ms <= 0) return;
    nueva = { ...b, estado: 'detenido', inicioEn: 0, restanteMs: ms };
  } else if (tipo === 'continuar') {
    if (b.estado !== 'detenido') return;
    nueva = { ...b, estado: 'corriendo', inicioEn: ahora() };
  } else if (tipo === 'reiniciar') {
    nueva = { ...b, estado: 'listo', inicioEn: 0, restanteMs: 0, duracionMs: 0 };
  } else return;
  cambiarJuegoActivo({ ...d, bomba: nueva });
}
/* Espacio en el proyector: girar → encender → pausar / continuar */
export function alternarBomba() {
  const d = juegoConReloj();
  if (!tieneBomba(d)) return;
  const b = bombaDe(d);
  if (b.estado === 'listo') { if (!b.modo) bombaGirar(); else bombaAccion('encender'); }
  else if (b.estado === 'corriendo') bombaAccion('pausar');
  else bombaAccion('continuar');
}

/* ---------- Minijuego libre: no suma puntos ni gasta casillas ---------- */
export function abrirLibre(id) {
  const e = E();
  if (!CASILLAS.includes(id) || e.abierta || e.dobleONada || e.eligiendoNombres) return;
  cambiarEstado({ ...e, minijuegoLibre: { casilla: id, reloj: null, bomba: null } });
}
export function cerrarLibre() {
  if (!E().minijuegoLibre) return;
  cambiarEstado({ ...E(), minijuegoLibre: null, video: null });
}

/* ---------- Elegir nombres ---------- */
export function abrirNombres() {
  const e = E();
  if (e.abierta || e.dobleONada || e.minijuegoLibre) return;
  cambiarEstado({ ...e, eligiendoNombres: { turno: 0 } });
}
export function cerrarNombres() {
  if (!E().eligiendoNombres) return;
  cambiarEstado({ ...E(), eligiendoNombres: null });
}
export function turnoNombres(k) {
  if (!E().eligiendoNombres || (k !== 0 && k !== 1)) return;
  cambiarEstado({ ...E(), eligiendoNombres: { turno: k } });
}
export function asignarNombre(id) {
  const en = E().eligiendoNombres;
  if (!en || !IDS_EQUIPO.includes(id)) return;
  const k = en.turno;
  if (juego.config.equipos[1 - k] === id) return;
  if (juego.config.equipos[k] !== id) {
    const nc = clonar(juego.config);
    nc.equipos[k] = id;
    cambiarConfigYa(nc);
  }
  cambiarEstado({ ...E(), eligiendoNombres: { turno: 1 - k } });
}
/* Desde el editor */
export function elegirEquipo(k, id) {
  const cfg = juego.config;
  if (!IDS_EQUIPO.includes(id) || cfg.equipos[k] === id || cfg.equipos[1 - k] === id) return false;
  const nc = clonar(cfg);
  nc.equipos[k] = id;
  actualizarConfig(nc);
  return true;
}
