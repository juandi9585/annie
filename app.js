/* Una flor para Annie
 *
 * Tres ideas sostienen esto:
 *
 * 1. NO se llama a anim.play(). El Lottie se mantiene parado y se avanza frame
 *    a frame con un tween propio. Reproducir un Lottie a su velocidad de
 *    exportación es justo lo que delata una plantilla.
 *
 * 2. La flor arranca en un frame donde NO HAY NADA DIBUJADO. Lo que se ve y se
 *    toca antes de empezar es la semilla, que es un objeto de la página, no de
 *    la animación. Por eso la flor puede estar escondida de verdad: no está
 *    pequeña ni transparente, todavía no existe.
 *
 * 3. Hacen falta muchos toques, y la mayoría no entregan nada. Dos de cada
 *    tres sólo TENSAN: la tierra tiembla y la luz sube un escalón. Si esos
 *    toques se sintieran vacíos, Annie dejaría de tocar antes del mensaje, así
 *    que la carga tiene que verse. Es el problema de diseño de este archivo.
 */
(function () {
  'use strict';

  /* --- lo que hay que tocar para cambiar el ritmo -------------------------- */

  var TOQUES_POR_FASE = 3;   // 3 fases x 3 toques + el estallido final = 10

  /* Tramo útil del Lottie. La animación no es un capullo que se abre: es la
     flor entera escalando desde un punto. FRAME_FROM tiene que caer donde el
     lienzo está VACÍO de verdad — no donde la flor es pequeña — porque en
     reposo no debe verse nada. Por arriba se corta en 0.88 porque a partir de
     ahí nada se mueve. Se miden con tools/frames.html. */
  var FRAME_FROM = 0.03;
  var FRAME_TO   = 0.88;

  /* Punto desde el que crece la flor, en fracción del lienzo del Lottie. Es el
     ancla de TODA la composición: ahí se planta la semilla, ahí pasa el
     horizonte y de ahí salen disparadas las fotos. */
  var ORIGIN_X = 0.542;
  var ORIGIN_Y = 0.883;

  /* Dónde queda el pétalo más alto, ya florecida. Con ORIGIN_Y da la parte del
     lienzo que la planta ocupa de verdad por encima del suelo: 0.768. Sólo
     sirve para repartir sitio con el mensaje. */
  var CIMA_Y = 0.115;

  /* Hasta dónde crece la planta en cada fase. Se queda corto a propósito: si
     repartiera el crecimiento en tercios, al primer estallido ya se vería la
     flor entera en pequeño y el final no sorprendería. Durante todo el acto de
     las fotos la planta es un brote. */
  var FASE_DESDE = 0.08;
  var FASE_HASTA = 0.30;

  var BROTE_MS   = 700;    // cada estirón de fase
  var BLOOM_MS   = 2400;   // el estallido final
  var REVEAL_AT  = 0.68;   // progreso al que entra el mensaje (solapado)
  var SETTLE_MAX = 0.016;  // amplitud del asentamiento final
  var CERROJO_MS = 420;    // toques ignorados tras un estallido, para que un
                           // doble toque sin querer no se salte una fase

  var BREATHE_MS = 3600;   // periodo de la respiración de la luz
  var SEED_AMP   = 0.06;   // cuánto respira la semilla
  var HALO_AMP   = 0.18;   // cuánto respira su luz

  var PISTAS = ['tócala', 'otra vez', 'sigue', 'una más'];

  /* --- elementos ---------------------------------------------------------- */

  var root      = document.documentElement;
  var escena    = document.getElementById('escena');
  var semilla   = document.getElementById('semilla');
  var toqueBtn  = document.getElementById('toque');
  var toqueTxt  = document.getElementById('toqueTexto');
  var monticulo = document.getElementById('monticulo');
  var flor      = document.getElementById('flor');
  var mensaje   = document.getElementById('mensaje');
  var pista     = document.getElementById('pista');
  var caja      = document.getElementById('recuerdos');
  var bajar     = document.getElementById('bajar');
  var jardin    = document.getElementById('jardin');
  var lupa      = document.getElementById('lupa');
  var lupaFoto  = document.getElementById('lupaFoto');
  var lupaCierra = document.getElementById('lupaCerrar');

  var recuerdos = Array.prototype.slice.call(caja.querySelectorAll('.recuerdo'));

  /* Las fases salen de cuántas fotos haya en el HTML: añadir o quitar un
     <div class="recuerdo"> cambia el número de toques sin tocar nada más. */
  var FASES = recuerdos.map(function (_, i) {
    if (recuerdos.length < 2) return FASE_HASTA;
    return FASE_DESDE + (FASE_HASTA - FASE_DESDE) * (i / (recuerdos.length - 1));
  });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Escalona las líneas del mensaje sea cual sea su número. */
  Array.prototype.forEach.call(mensaje.children, function (el, i) {
    el.style.setProperty('--i', i);
  });

  /* --- easing ------------------------------------------------------------- */

  /* Solver de cubic-bezier (Newton-Raphson con bisección de respaldo), el mismo
     método que usan los navegadores para las curvas de CSS. */
  function cubicBezier(x1, y1, x2, y2) {
    function A(a, b) { return 1 - 3 * b + 3 * a; }
    function B(a, b) { return 3 * b - 6 * a; }
    function C(a)    { return 3 * a; }
    function calc(t, a, b)  { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
    function slope(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }

    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) {          // Newton-Raphson
        var d = slope(t, x1, x2);
        if (d === 0) break;
        t -= (calc(t, x1, x2) - x) / d;
      }
      if (t < 0 || t > 1) {                  // respaldo: bisección
        var lo = 0, hi = 1;
        t = x;
        for (var j = 0; j < 24; j++) {
          if (calc(t, x1, x2) < x) lo = t; else hi = t;
          t = (lo + hi) / 2;
        }
      }
      return calc(t, y1, y2);
    };
  }

  // el brote sale de golpe y frena; la floración duda al principio y tiene
  // cola larga al abrirse del todo
  var easeBrote = cubicBezier(0.16, 0.88, 0.3, 1);
  var easeBloom = cubicBezier(0.42, 0.02, 0.16, 1);

  /* --- medidas de la escena ------------------------------------------------ */

  /* El punto de crecimiento del Lottie se ancla al horizonte con transform +
     transform-origin en el MISMO punto, así el tallo nace exactamente donde
     estaba la semilla y el asentamiento no lo desplaza. */
  root.style.setProperty('--ox', (ORIGIN_X * 100).toFixed(2) + '%');
  root.style.setProperty('--oy', (ORIGIN_Y * 100).toFixed(2) + '%');

  var FLOR_MAX = 0.68;   // del alto de pantalla, lo máximo que ocupa el lienzo
  var FLOR_MIN = 0.38;   // por debajo de esto ya no se lee como una flor
  var HUECO    = 28;     // aire mínimo entre la última línea y la planta, en px

  function fraccion(nombre, porDefecto) {
    var n = parseFloat(getComputedStyle(root).getPropertyValue(nombre));
    return isNaN(n) ? porDefecto : n / 100;
  }

  /* Dos cuentas que dependen del tamaño de la ventana y que el CSS no puede
     hacer solo. Se rehacen al girar el móvil y cuando cargan las fuentes. */
  function medir() {
    var ancho = escena.clientWidth, alto = escena.clientHeight;
    if (!alto) return;

    /* 1. El salto de las fotos: el vector que va desde donde aterrizan hasta
          el montículo, en píxeles. En CSS no sale, porque un porcentaje dentro
          de translate() mide sobre la propia foto y no sobre la escena. */
    var ejeX  = fraccion('--eje', 0.5) * ancho;
    var horY  = fraccion('--horizonte', 0.8) * alto;
    var fotoX = fraccion('--foto-x', 0.5) * ancho;
    var fotoY = fraccion('--foto-y', 0.42) * alto;
    caja.style.setProperty('--lanza-x', (ejeX - fotoX).toFixed(1) + 'px');
    caja.style.setProperty('--lanza-y', (horY - fotoY).toFixed(1) + 'px');

    /* 2. Cuánta flor cabe. En móvil el mensaje y la flor comparten pantalla y
          el mensaje puede ser una frase o un párrafo de tres, así que se mide
          el mensaje y a la flor se le da lo que sobra: el texto no acaba nunca
          entre los pétalos, se escriba corto o largo. En pantalla ancha el
          mensaje va al lado y no hay nada que ceder. */
    if (window.matchMedia('(min-width: 900px)').matches) {
      root.style.removeProperty('--flor-alto');
      return;
    }
    var libre = horY - HUECO -
                (mensaje.getBoundingClientRect().bottom -
                 escena.getBoundingClientRect().top);
    var px = Math.min(alto * FLOR_MAX, libre / (ORIGIN_Y - CIMA_Y));
    root.style.setProperty('--flor-alto',
      Math.max(alto * FLOR_MIN, px).toFixed(1) + 'px');
  }

  medir();

  /* Otra vez cuando las fuentes estén listas: con la serif de respaldo el
     mensaje mide otra cosa y la primera cuenta saldría mal. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

  var remedir = null;
  window.addEventListener('resize', function () {
    clearTimeout(remedir);
    remedir = setTimeout(medir, 150);
  });

  /* --- estado -------------------------------------------------------------- */

  var anim = null;
  var pActual = 0;       // progreso de la planta, de 0 a 1
  var fase = 0;          // fases ya estalladas
  var cargas = 0;        // toques acumulados dentro de la fase en curso
  var carga = 0;         // lo mismo, pero para la luz (se lee en el rAF)
  var florecido = false;
  var ocupado = false;
  var idleRAF = null;
  var tweenRAF = null;

  function lastFrame() { return Math.max(0, anim.totalFrames - 1); }

  // p va de 0 a 1 y se reparte sobre el tramo útil, no sobre el timeline entero
  function seek(p) {
    anim.goToAndStop((FRAME_FROM + p * (FRAME_TO - FRAME_FROM)) * lastFrame(), true);
  }

  /* --- la luz que respira y se carga --------------------------------------- */

  /* Es lo único que se mueve entre toque y toque. Un solo seno gobierna el
     tamaño de la semilla y el tamaño y el brillo del halo, para que respiren a
     la vez y no parezcan dos efectos sueltos. 'carga' los amplifica: es la
     única señal de que los toques que no sacan foto están haciendo algo. */
  function idleLoop(now) {
    var s = 0.5 - 0.5 * Math.cos(2 * Math.PI * ((now % BREATHE_MS) / BREATHE_MS));
    var mas = 1 + carga * 0.5;

    root.style.setProperty('--semilla-esc', (1 + SEED_AMP * s * mas).toFixed(4));
    root.style.setProperty('--halo', (1 + HALO_AMP * s * mas + carga * 0.2).toFixed(4));
    root.style.setProperty('--halo-o',
      Math.min(1, 0.62 + 0.38 * s + carga * 0.16).toFixed(3));

    idleRAF = requestAnimationFrame(idleLoop);
  }

  function arrancarReposo() {
    if (idleRAF === null && !florecido && !reduced) idleRAF = requestAnimationFrame(idleLoop);
  }
  function pararReposo() {
    if (idleRAF !== null) { cancelAnimationFrame(idleRAF); idleRAF = null; }
  }

  // No gastar batería respirando en una pestaña que nadie está mirando.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pararReposo(); else arrancarReposo();
  });

  /* --- el tween de la planta ----------------------------------------------- */

  /* op: {desde, hasta, ms, ease, settle, cada, fin} */
  function crecer(op) {
    if (tweenRAF !== null) cancelAnimationFrame(tweenRAF);
    var t0 = performance.now();
    var avisado = false;

    function paso(now) {
      var t = Math.min(1, (now - t0) / op.ms);
      var p = op.desde + (op.hasta - op.desde) * op.ease(t);
      seek(p);

      /* Asentamiento: la planta se hincha un poco y vuelve en el último tramo.
         No puede ir en el timeline del Lottie porque más allá del último frame
         no hay nada, así que va en la escala. Como el origen de la
         transformación es el punto de crecimiento, la base no se despega. */
      var s = Math.min(1, Math.max(0, (t - 0.62) / 0.38));
      root.style.setProperty('--settle',
        (1 + op.settle * Math.sin(Math.PI * s)).toFixed(4));

      if (!avisado && op.cada && t >= op.cada.en) { avisado = true; op.cada.fn(); }

      if (t < 1) {
        tweenRAF = requestAnimationFrame(paso);
      } else {
        tweenRAF = null;
        root.style.setProperty('--settle', '1');
        if (op.cada && !avisado) op.cada.fn();
        if (op.fin) op.fin();
      }
    }
    tweenRAF = requestAnimationFrame(paso);
  }

  /* --- las fotos ------------------------------------------------------------ */

  /* Se descargan por adelantado, no al tocar: entre toque y toque hay segundos
     de sobra y así ninguna llega tarde a su propia entrada. */
  function precargar(i) {
    var el = recuerdos[i];
    if (!el || el.getAttribute('data-lista')) return;
    el.setAttribute('data-lista', '1');
    var img = document.createElement('img');
    img.alt = '';
    img.src = el.getAttribute('data-foto');
    el.appendChild(img);
  }

  function mostrarRecuerdo(i) {
    var antes = recuerdos[i - 1];
    if (antes) { antes.classList.remove('entra'); antes.classList.add('sale'); }

    var el = recuerdos[i];
    if (!el) return;
    el.classList.remove('sale');
    reiniciar(el);
    el.classList.add('entra');
    precargar(i + 1);
  }

  /* Quitar y volver a poner una clase no reinicia su animación si el navegador
     no ha repintado en medio. Leer offsetWidth le obliga a hacerlo. */
  function reiniciar(el) { void el.offsetWidth; }

  /* --- los toques ----------------------------------------------------------- */

  function pistaDice(texto) {
    if (!texto || pista.textContent === texto) return;
    pista.textContent = texto;
    pista.classList.remove('cambia');
    reiniciar(pista);
    pista.classList.add('cambia');
  }

  /* Los toques que no sacan foto. No pueden sentirse vacíos: algo tira, la
     tierra se estremece y la luz sube un escalón que no vuelve a bajar hasta
     que estalla. */
  function tensar() {
    var quien = fase === 0 ? semilla : monticulo;
    quien.classList.remove('tiembla');
    reiniciar(quien);
    quien.classList.add('tiembla');
    carga = cargas;
  }

  function empujarTierra() {
    monticulo.classList.remove('brota');
    reiniciar(monticulo);
    monticulo.classList.add('brota');
  }

  function brotar(i) {
    ocupado = true;
    setTimeout(function () { ocupado = false; }, CERROJO_MS);
    carga = 0;

    /* En el primer estallido la semilla se entierra, y con ella se va la única
       diana precisa. A partir de aquí vale tocar en cualquier parte, que es lo
       que uno hace por instinto con el móvil en la mano. */
    if (i === 0) {
      var teniaFoco = document.activeElement === semilla;
      document.body.classList.add('is-sembrada');
      semilla.disabled = true;
      toqueBtn.hidden = false;
      if (teniaFoco) toqueBtn.focus();
    }

    empujarTierra();
    mostrarRecuerdo(i);
    crecer({ desde: pActual, hasta: FASES[i], ms: BROTE_MS,
             ease: easeBrote, settle: 0.02 });
    pActual = FASES[i];
  }

  function toque() {
    if (florecido || !anim || reduced || ocupado) return;

    // Ya salieron todas las fotos: este es el toque de la flor.
    if (fase >= FASES.length) { florecer(); return; }

    cargas++;
    if (cargas < TOQUES_POR_FASE) { tensar(); return; }

    cargas = 0;
    brotar(fase);
    fase++;
    pistaDice(PISTAS[Math.min(fase, PISTAS.length - 1)]);
    toqueTxt.textContent = fase >= FASES.length
      ? 'Tocar una última vez' : 'Tocar otra vez';
  }

  semilla.addEventListener('click', toque);
  toqueBtn.addEventListener('click', toque);

  /* --- el estallido final ---------------------------------------------------- */

  function florecer() {
    if (florecido) return;
    florecido = true;
    pararReposo();
    toqueBtn.disabled = true;
    document.body.classList.add('is-blooming');

    var ultimo = recuerdos[recuerdos.length - 1];
    if (ultimo) { ultimo.classList.remove('entra'); ultimo.classList.add('sale'); }

    empujarTierra();
    crecer({
      desde: pActual, hasta: 1, ms: BLOOM_MS,
      ease: easeBloom, settle: SETTLE_MAX,
      cada: { en: REVEAL_AT, fn: function () {
        document.body.classList.add('is-bloomed');
      } },
      fin: function () {
        document.body.classList.remove('is-blooming');
        document.body.classList.add('is-bloomed');
        abrirJardin();
      }
    });
  }

  /* --- el jardín -------------------------------------------------------------- */

  /* Hasta aquí la página es UNA pantalla: el scroll está bloqueado en el CSS.
     Se suelta cuando el mensaje ya está puesto, con un respiro de por medio
     para que no aparezca una flecha encima de las palabras recién llegadas. */
  function abrirJardin() {
    setTimeout(function () {
      bajar.hidden = false;
      jardin.removeAttribute('aria-hidden');
      jardin.removeAttribute('inert');
      document.body.classList.add('is-abierto');
    }, 1000);
  }

  /* --- la lupa ---------------------------------------------------------------- */

  var copiaAbierta = null;
  var scrollGuardado = 0;

  function abrirLupa(boton) {
    copiaAbierta = boton;
    scrollGuardado = window.pageYOffset;

    var mini = boton.querySelector('img');
    lupaFoto.src = boton.getAttribute('data-grande');
    lupaFoto.alt = mini ? mini.alt : '';
    lupa.hidden = false;
    document.body.classList.add('lupa-abierta');
    reiniciar(lupa);
    lupa.classList.add('is-vista');
    lupaCierra.focus();
  }

  function cerrarLupa() {
    if (lupa.hidden) return;
    lupa.classList.remove('is-vista');
    document.body.classList.remove('lupa-abierta');
    /* Al soltar el overflow el navegador manda el scroll a cero, así que hay
       que devolverlo a donde estaba o Annie acabaría otra vez en el cielo. */
    window.scrollTo(0, scrollGuardado);
    setTimeout(function () {
      lupa.hidden = true;
      lupaFoto.removeAttribute('src');
    }, 280);
    if (copiaAbierta) copiaAbierta.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.copia'), function (b) {
    b.addEventListener('click', function () { abrirLupa(b); });
  });
  lupaCierra.addEventListener('click', cerrarLupa);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) cerrarLupa();
  });

  /* --- carga ------------------------------------------------------------------ */

  /* Si la flor no carga, Annie ve el mensaje y las fotos igual sobre la misma
     escena. El regalo es eso; la flor es cómo se entrega. */
  function degradar() {
    document.body.classList.add('is-sembrada');
    document.body.classList.add('is-bloomed');
    escena.classList.add('is-ready');
    bajar.hidden = false;
    jardin.removeAttribute('aria-hidden');
    jardin.removeAttribute('inert');
    document.body.classList.add('is-abierto');
  }

  if (typeof lottie === 'undefined') {
    degradar();
    return;
  }

  fetch('assets/flower.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      /* El hueco toma la proporción del propio Lottie, así una flor alta y
         estrecha no se queda pequeña por culpa de un lienzo cuadrado. */
      if (data.w && data.h) root.style.setProperty('--ar', (data.w / data.h).toFixed(4));

      anim = lottie.loadAnimation({
        container: flor,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: data,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: false,
        },
      });

      anim.setSubframe(true);   // permite frames fraccionarios: el tween va suave

      anim.addEventListener('DOMLoaded', function () {
        if (reduced) {
          /* Sin animación no hay juego que jugar: la página se abre entera,
             con la flor puesta y el jardín ya disponible. */
          seek(1);
          document.body.classList.add('is-sembrada');
          document.body.classList.add('is-bloomed');
          bajar.hidden = false;
          jardin.removeAttribute('aria-hidden');
          jardin.removeAttribute('inert');
          document.body.classList.add('is-abierto');
        } else {
          seek(0);              // lienzo vacío: la flor todavía no existe
          arrancarReposo();
          precargar(0);
          precargar(1);
        }
        escena.classList.add('is-ready');
        medir();
      });
    })
    .catch(degradar);
})();
