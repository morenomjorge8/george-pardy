# George Pardy

Juego de preguntas tipo Jeopardy para fiestas, con dos equipos, una ruleta de minijuegos ("Doble o Nada") y control desde un iPad. Se proyecta desde una computadora y el moderador lo maneja desde el iPad. Este repositorio es la versión para publicar en **GitHub Pages**.

Habla con el usuario en **español (México)**. Toda la interfaz va en español. Los nombres de funciones, variables y archivos también van en español, como en la versión de referencia.

---

## 1. Archivos de partida

- `referencia/george-pardy-claude.html`: la versión que ya funciona, hecha en Claude.ai. Es la **fuente de verdad** para el diseño, los textos, las reglas y el comportamiento. Léela completa antes de empezar y conserva todo lo que hace, salvo lo que esta guía pide cambiar.
- `datos/config-inicial.json`: el contenido actual del juego: categorías, preguntas, nombres de equipos, retos de minijuegos y enlaces de video. Se usa para llenar una sala nueva. Las preguntas actuales son de prueba (las mismas cuatro de Harry Potter en las cinco categorías); el usuario las va a reemplazar.

### Qué cambia respecto a la referencia

La referencia vive dentro de Claude.ai, que da tres cosas que GitHub Pages no tiene, y bloquea una que GitHub Pages sí permite:

1. **Sincronización iPad ↔ proyector.** La referencia usa `window.claude.use('db')` (función `conectar()`). Eso no existe fuera de Claude. Reemplázalo por **Firebase Realtime Database** (sección 6).
2. **Videos de YouTube.** En Claude estaban bloqueados y se abrían en otra pestaña (botones "Ver video" y "Timer de YouTube"). Aquí **sí se insertan dentro de la página** con el reproductor de YouTube, y se controlan desde el iPad (sección 7).
3. **Fuentes y librerías.** Se cargan normalmente desde Google Fonts y CDNs; ya no hay restricciones de dominios.
4. Quita todo lo específico de Claude: `window.claude`, los comentarios sobre restricciones de Claude y los avisos de "ábrelo desde la computadora del proyector" que solo existían por esa limitación.

---

## 2. Stack y estructura

Sitio estático, **sin paso de compilación**, para que GitHub Pages lo sirva tal cual. HTML + CSS + JavaScript con módulos ES (`<script type="module">`). Nada de frameworks.

```
index.html
css/estilos.css
js/app.js              ← arranque, rutas por hash, render de cada vista, eventos
js/estado.js           ← modelo de datos, normalización y todas las acciones del juego
js/sync.js             ← Firebase (salas) + modo local de respaldo
js/ruleta.js           ← dibujo SVG y animación de la ruleta
js/reloj.js            ← temporizador de Minuto para Ganar y sonidos (Web Audio)
js/youtube.js          ← reproductor de YouTube (explicaciones y timer)
js/config-firebase.js  ← configuración web de Firebase (la llena el usuario)
datos/config-inicial.json
referencia/george-pardy-claude.html
```

- Fija versiones exactas de todo lo que cargues de un CDN (por ejemplo el SDK modular de Firebase desde `https://www.gstatic.com/firebasejs/<versión>/…`). Usa una versión estable que tenga al menos dos semanas de publicada.
- Fuentes: **Bungee** (títulos, números, tablero) y **Bitter** 400/600/700/800 (texto), con pilas de respaldo. Los emojis usan la pila `"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji"` y se carga **Noto Color Emoji** de Google Fonts para que las banderas 🇺🇸 🇲🇽 se vean en Windows.

---

## 3. Vistas

Rutas por hash. Cada dispositivo elige su vista; el estado del juego es compartido.

| Hash | Vista | Para qué |
| --- | --- | --- |
| (vacío) | Inicio | Elegir qué es este dispositivo. Muestra el estado de conexión y el código de sala. |
| `#pantalla` | Pantalla del proyector | Tablero, marcador, preguntas, Doble o Nada, ruleta, reloj, minijuegos, elegir nombres. Siempre oscura. |
| `#control` | Control del moderador (iPad) | Marcador con ±100, pasar turno, elegir nombres, tablero compacto, pregunta con su respuesta privada, Doble o Nada, ruleta, reloj, menú de minijuegos, nueva partida. |
| `#preguntas` | Editor | Categorías, 20 preguntas y respuestas, nombres de equipos, retos de los minijuegos, enlaces de video. Se guarda solo. |

En la pantalla del proyector, los controles aparecen al mover el mouse y se esconden a los 2.5 s (plan B si falla el iPad). El cursor se oculta cuando no se mueve.

---

## 4. Reglas del juego (no cambiarlas sin preguntar)

### Tablero
- 5 categorías × 4 preguntas de 100, 200, 300 y 400 (5,000 puntos en total). Categorías actuales: Comida, Harry Potter, Datos, Música, Deportes (editables).
- Turnos alternados. Una respuesta incorrecta no resta puntos.
- Al abrir una casilla, la pregunta crece desde la casilla hasta llenar la pantalla. El moderador ve la respuesta en el iPad antes de mostrarla.
- Acciones: mostrar respuesta, acertó equipo 1, acertó equipo 2, nadie acertó (los tres marcan la casilla como jugada y pasan el turno), volver sin calificar (no marca nada).
- Ajuste manual ±100 por equipo; los puntos nunca bajan de 0.
- Una casilla jugada se reactiva tocándola dos veces en el iPad. "Nueva partida" pide doble toque y reinicia puntos, turno, casillas jugadas y ruleta.
- **Opción múltiple:** si el texto de la pregunta contiene `A) … B) …` (en líneas separadas o en la misma), se muestran como recuadros (2 columnas). Si la respuesta empieza con la letra (`B) Falso`), al revelarla se ilumina esa opción y las demás se atenúan. En el iPad la correcta se marca desde el inicio. Ver `partirPregunta()` y `letraRespuesta()` en la referencia.

### Doble o Nada
- Solo puede pedirlo el **equipo que va perdiendo**, y solo después de **acertar** una pregunta.
- "Va perdiendo" se mide **antes** de sumar la pregunta recién acertada. En **empate** no hay Doble o Nada.
- Solo se arriesgan los puntos de esa pregunta: gana el reto → suma el doble; pierde → esa pregunta vale 0. El acumulado anterior nunca se toca.
- Si ya no quedan casillas en la ruleta, no se ofrece.
- Fases: `oferta` (sí / no) → `ruleta` (esperando giro) → `jugando` (minijuego) → `resultado` (pantalla grande de ganó/perdió) → vuelve al tablero. El turno pasa al otro equipo cuando se resuelve.

### Ruleta
- 18 casillas: 6 minijuegos × 3 (reto 1, 2 y 3). Id de casilla `"<juego>-<reto>"`. Orden intercalado: `for n in 1..3: for j in 0..5: push(j + "-" + n)`.
- Cada casilla usada desaparece hasta "Nueva partida". El iPad muestra cuántas quedan de cada minijuego.
- El giro se decide **una sola vez** en el dispositivo que lo pide y se guarda en el estado: `casilla`, `desfase` (aleatorio entre −0.35 y 0.35 del ancho de la casilla) y `giroEn` (marca de tiempo). Así todas las pantallas caen en la misma casilla.
- Animación: 7 vueltas + destino, 5.2 s, `cubic-bezier(.12,.62,.08,1)`. Se anima si esa pantalla vio la fase `ruleta` **o** si `giroEn` tiene menos de 60 s (la sincronización puede saltarse la fase de espera). Si la página se recarga después, cae directo en la casilla sin girar.
- El giro se anima **aunque el sistema tenga "reducir movimiento"** (es parte del juego). El resto de animaciones sí respetan esa preferencia.
- Al detenerse: la casilla ganadora con borde dorado, las demás atenuadas, y al lado el minijuego, "Reto N: nombre", las instrucciones y lo que se juega.
- Dibujo: SVG `viewBox="-100 -100 200 200"`, radio 96, aro dorado, centro oscuro, puntero dorado arriba. Etiquetas radiales con el nombre corto; en la mitad izquierda se voltean para leerse derechas. Tamaño de letra 7.5 / 9 / 11 según queden más de 12, más de 6 o menos casillas. Ver `dibujarRueda()`.

### Minijuegos

| # | Nombre | Corto | Emoji | Color | Tinta | Descripción por defecto |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 100 Mexicanos Dijeron | 100 Mexicanos | 💯 | #E4007C | #FFFFFF | Adivinen las respuestas más populares, compitiendo contra el equipo rival. |
| 1 | Tic-Tac-Boom | Tic-Tac-Boom | 💣 | #FF6A13 | #12163A | Juego de rapidez con una bomba y tiempo limitado. |
| 2 | Minuto para Ganar | Minuto | ⏱️ | #FFB81C | #12163A | Completen el reto en 60 segundos. (`segundos: 60`) |
| 3 | Password | Password | 🔑 | #00A3AD | #04232A | Adivinen la palabra con las pistas de sus compañeros. |
| 4 | Atínale al Precio | Atínale | 🏷️ | #22A35A | #072A16 | Los dos equipos adivinan el precio. Si queda más cerca el equipo que va por el doble, gana; si queda más cerca el que va ganando, se lo impide. |
| 5 | Completa la Canción | Canción | 🎤 | #7B3FD6 | #FFFFFF | Elijan a un participante y uno de los 2 artistas. Si sigue la letra 10 segundos cuando desaparezca, ganan. |

Cada reto tiene `nombre`, `instrucciones` (se ven en el proyector), `material` (solo en el iPad) y `video` (enlace de explicación). Si un reto no tiene nombre o instrucciones, se usa la descripción por defecto del minijuego.

Retos ya definidos (Minuto para Ganar): 1 A Bit Dicey, 2 Face the Cookie, 3 Ligas vs Cartas. Están en `datos/config-inicial.json`.

### Tic-Tac-Boom
- Pasa una persona de cada equipo al frente. Se pasan una pelota por turnos y cada quien dice una palabra con la sílaba. Pierde quien tenga la pelota cuando explota la bomba.
- Sílabas: el nombre de cada reto es su sílaba (reto 1 CON, 2 TRA, 3 SAL). `config.silabasRespaldo` (texto separado por comas, por defecto `"PAR, RES"`) da sílabas de respaldo; el iPad puede cambiar la sílaba en cualquier momento.
- Ruleta chica TIC / TAC / BOOM (se gira desde el iPad o con Espacio, 3.2 s): **TIC** = la palabra empieza con la sílaba; **TAC** = la tiene en cualquier parte; **BOOM** = termina con la sílaba. El giro se decide una vez y se guarda (`modo`, `giroEn`, `desfase`), como la ruleta grande.
- Bomba: al encenderla se sortea un tiempo **aleatorio entre 30 y 45 s** (`duracionMs`). **Nunca se muestra el tiempo restante**, ni en el proyector ni en el iPad. En el proyector suena una mecha "ti… ti… titi… tititi" que se acelera, y al llegar a 0 suena una explosión y aparece "¡BOOM!". Se puede pausar, continuar y jugar otra ronda.
- Estado: `bomba: null | { modo, giroEn, desfase, silaba, estado: 'listo'|'corriendo'|'detenido', inicioEn, restanteMs, duracionMs }` dentro de `dobleONada` o `minijuegoLibre`. Explotó = corriendo con restante 0.

### Minuto para Ganar: reloj
- Estado del reloj: `listo` → `corriendo` (`inicioEn`, `restanteMs`) → `detenido` (`restanteMs`). "Se acabó" se calcula cuando lo restante llega a 0. Acciones: iniciar / detener / continuar / reiniciar.
- Mientras está `listo` se ve la tarjeta del reto. Al iniciar, el proyector cambia a un reloj grande: título del reto, anillo que se vacía, número en Bungee, estado ("segundos", "Tiempo detenido", "¡Se acabó el tiempo!") y lo que se juega. Últimos 10 s en rosa con latido.
- Sonidos con Web Audio, **solo en la pantalla del proyector**: dos notas al iniciar, tic + golpe grave cada segundo, pitido los últimos 10, alarma al llegar a 0, dos notas al detener. Ver `sonido()` en la referencia.
- Los navegadores bloquean el audio hasta el primer clic en la página: crea o reanuda el `AudioContext` en el primer `pointerdown`/`keydown`, ofrece "Probar sonido" y muestra un aviso rosa si sigue bloqueado.
- Con Firebase, corrige la diferencia de reloj entre dispositivos con `.info/serverTimeOffset`: guarda `inicioEn` y `giroEn` en hora del servidor y calcula con esa misma base.

### Minijuego libre
Desde el menú "Minijuegos" del iPad se abre cualquier reto en el proyector, con su reloj si aplica. No suma puntos ni gasta casillas. Solo se abre si no hay pregunta, Doble o Nada ni selección de nombres en curso.

### Elegir nombres
- 13 opciones con emoji, sin texto libre: Limón 🍋, Taco 🌮, Tortilla 🫓, Birria 🍲, Pavo 🦃, Salsa 🌶️, Puerco 🐷, USA 🇺🇸, MX 🇲🇽, Tequila 🥃, Cerveza 🍺, Clamato 🍅, Botti 🐶 (es un perro). Se guardan por id: `limon, taco, tortilla, birria, pavo, salsa, puerco, usa, mx, tequila, cerveza, clamato, botti`. Por defecto: taco y limon.
- Botón "Elegir nombres" en el iPad (y en la barra del proyector): el proyector muestra "Elijan su nombre" con las 13 tarjetas y los dos equipos arriba. Se elige desde el iPad o con el mouse en el proyector. El equipo que elige está resaltado; al elegir, el turno pasa al otro. Un nombre ya tomado queda bloqueado para el otro equipo. Esc o "Listo" cierra.
- El editor también tiene el selector (botones, no campos de texto).

### Atajos de teclado en el proyector
R o Espacio: mostrar respuesta · 1 / 2: acertó equipo · 0: nadie · Esc: volver/cerrar · S / N: aceptar o rechazar Doble o Nada · Espacio: girar la ruleta, o iniciar/detener el reloj · G / P: ganó o perdió el reto · V: video de explicación · T: timer de YouTube.

---

## 5. Modelo de datos

Dos documentos por sala. **Todo lo que se lee se normaliza** (`normalizarConfig`, `normalizarEstado`, `normalizarReloj` de la referencia): cualquier campo faltante o inválido toma su valor por defecto. Esto es obligatorio con Firebase, porque Realtime Database **no guarda arreglos vacíos ni valores `null`** y puede devolver arreglos como objetos.

```js
config = {
  equipos: ['taco', 'limon'],                    // ids de OPCIONES_EQUIPO, siempre distintos
  categorias: [ { nombre, preguntas: [ { pregunta, respuesta } ×4 ] } ×5 ],
  minijuegos: [ { retos: [ { nombre, instrucciones, material, video } ×3 ] } ×6 ],
  videoTemporizador: 'https://www.youtube.com/watch?v=ebvtJCu33vM',
  videoTemporizadorInicio: 0                     // NUEVO: segundo del video donde empieza la cuenta
}

estado = {
  puntos: [0, 0], turno: 0,
  usadas: ['0-2', …],                            // casillas del tablero "categoría-fila"
  abierta: null | { c, i }, respuestaVisible: false,
  ruletaUsadas: ['4-1', …],
  dobleONada: null | { equipo, c, i, fase, gano, casilla, desfase, giroEn, reloj },
  minijuegoLibre: null | { casilla, reloj },
  eligiendoNombres: null | { turno },
  video: null | { url, inicio, reproduciendo }    // NUEVO: video de YouTube en el proyector
}
reloj = null | { estado: 'listo'|'corriendo'|'detenido', inicioEn, restanteMs }
```

Escrituras: un escritor por documento que serializa (una escritura a la vez, la última gana; ver `crearEscritor`). El editor guarda con 700 ms de espera tras teclear.

---

## 6. Sincronización con Firebase Realtime Database

- **Salas:** cada partida vive en `/salas/{codigo}/config` y `/salas/{codigo}/estado`. El código va en la URL como `?sala=XXXXXX` (6 letras/números sin caracteres confusos) y se recuerda en `localStorage`. La pantalla de inicio permite crear una sala nueva o escribir un código, y muestra el código grande para abrirlo en el otro dispositivo. Una sala nueva se llena con `datos/config-inicial.json`.
- **Autenticación anónima** de Firebase antes de leer o escribir.
- **Escucha en tiempo real** con `onValue` en ambos documentos; escribe con `set` (estado completo) para evitar mezclas raras.
- **Indicador de conexión** usando `.info/connected`: "Sincronizado" (verde), "Sin conexión" (amarillo), "Conectando…".
- **Modo local de respaldo:** si Firebase no está configurado o falla, todo funciona en un solo navegador con `localStorage`, y dos ventanas de la misma computadora se sincronizan con el evento `storage` (por ejemplo, control en la laptop y pantalla en el proyector como segunda pantalla).
- `js/config-firebase.js` exporta el objeto de configuración web de Firebase. Esos valores no son secretos; la seguridad la dan las reglas. Si el archivo trae valores vacíos, la app entra en modo local y lo dice en la pantalla de inicio.

Reglas sugeridas para Realtime Database:

```json
{
  "rules": {
    "salas": {
      "$sala": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "$sala.length >= 6 && $sala.length <= 12"
      }
    }
  }
}
```

---

## 7. YouTube dentro de la página

Usa la **YouTube IFrame Player API** (`https://www.youtube.com/iframe_api`, cargada solo cuando haga falta).

- **Videos de explicación:** cuando un reto tiene `video`, el iPad muestra "Mostrar video en el proyector". Eso guarda `estado.video` y el proyector abre una capa a pantalla completa con el reproductor. El iPad puede pausar, reanudar y cerrar. En el proyector también funcionan el botón al mover el mouse y la tecla V.
- **Timer de YouTube (Minuto para Ganar):** al iniciar el reloj, si hay `videoTemporizador`, el proyector reproduce ese video a pantalla completa desde `videoTemporizadorInicio` en lugar del anillo propio. El reloj interno sigue contando en silencio para que el iPad vea el tiempo, y al detener el reloj se pausa el video. Agrega en el editor un ajuste "Usar el timer de YouTube" (sí/no) y el campo del segundo de inicio.
- Extrae el id del video de enlaces `watch?v=`, `youtu.be/` y `shorts/`. Usa `youtube-nocookie.com` si la API lo permite.
- El sonido automático requiere que alguien haya hecho clic antes en la página del proyector: mismo aviso que el audio del reloj.
- Si el video no permite insertarse (errores 101/150 del reproductor) o no carga, muestra el aviso y un enlace "Abrir en YouTube" como respaldo.

---

## 8. Diseño (respetar la referencia)

- **Paleta:** escenario `#0A1150`, escenario profundo `#050932`, casilla `#1B29A6`, casilla hover `#2638C9`, casilla jugada `#0F1A75`, oro (cempasúchil) `#FFB81C`, papel `#F1F3FF`, papel suave `#B9BFEA`, rosa mexicano `#E4007C` (equipo 1, tinta blanca), turquesa `#00A3AD` (equipo 2, tinta `#04232A`).
- **Proyector:** siempre oscuro, pensado para leerse de lejos (tamaños con `vmin` y `clamp`). Tablero con separaciones oscuras, valores en oro con sombra, marcador abajo con borde del color de cada equipo y el equipo en turno resaltado.
- **iPad y editor:** respetan modo claro y oscuro con variables en `:root` y `@media (prefers-color-scheme: dark)`. Botones de al menos 44 px de alto.
- `viewport-fit=cover` y márgenes con `env(safe-area-inset-*)`.
- Puntuación tipográfica en los textos visibles: ¿?, ¡!, “ ”, ’ y —.
- Confirmaciones con doble toque (sin `confirm()`), como en la referencia.

---

## 9. Publicar en GitHub Pages

Guía al usuario paso a paso cuando lleguemos a este punto:

1. Crear el repositorio en GitHub y subir el proyecto (`git init`, `git add`, `git commit`, `git push`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`**. La página queda en `https://<usuario>.github.io/<repositorio>/`.
3. En la consola de Firebase: crear el proyecto, agregar una app web y copiar su configuración a `js/config-firebase.js`; en **Authentication** activar el proveedor **Anónimo** y agregar `<usuario>.github.io` en los dominios autorizados; crear la **Realtime Database** y pegar las reglas de la sección 6.
4. Abrir el sitio en la computadora del proyector (crear sala) y en el iPad (unirse con el código).

Todas las rutas del sitio deben ser relativas para que funcione bajo `/<repositorio>/`.

---

## 10. Orden de trabajo sugerido

1. Estructura de archivos y `index.html` con las vistas, portando el CSS y los textos de la referencia.
2. `estado.js` con el modelo, normalización y acciones, sin cambiar las reglas.
3. Modo local completo (un navegador y dos ventanas) y verificar todo el juego así.
4. Firebase: salas, autenticación anónima, tiempo real, indicador de conexión, corrección de hora del servidor.
5. Ruleta y reloj portados; probar con dos dispositivos.
6. YouTube: videos de explicación y timer.
7. Publicar en GitHub Pages y probar en el iPad real.

Después de cada paso, abre la página localmente (por ejemplo con `npx serve` o `python3 -m http.server`; los módulos ES no funcionan abriendo el archivo directo) y revisa que no haya errores en la consola.

### Pruebas antes del evento
- Partida completa: abrir, mostrar respuesta, acertar, nadie acierta, volver sin calificar, ajustes ±100, reactivar casilla, nueva partida.
- Doble o Nada: empate (no se ofrece), rechazar, aceptar y ganar, aceptar y perder; los puntos deben cuadrar con la sección 4.
- Ruleta: el iPad gira y el proyector anima y cae en la misma casilla; recargar el proyector a media jugada; las casillas usadas desaparecen.
- Reloj: iniciar, detener, continuar, reiniciar, llegar a 0, sonido en el proyector.
- YouTube: video de explicación desde el iPad y timer de YouTube.
- Elegir nombres desde el iPad y desde el proyector.
- Wi-Fi del lugar: probar la conexión y el modo local de respaldo.

---

## 11. Pendientes del plan (no inventar; preguntar al usuario)

- Escribir las 20 preguntas definitivas.
- Definir las condiciones de victoria de 100 Mexicanos Dijeron y Password. (Tic-Tac-Boom ya está definido.)
- Escribir los retos de los otros cinco minijuegos (15 en total).
- Ligas vs Cartas: cuántas cartas y a qué distancia se dispara.
- Opción pendiente de decidir: poder elegir el reto a mano durante un Doble o Nada en lugar de girar.
