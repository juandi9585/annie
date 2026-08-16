/* Una flor para Annie
 *
 * La idea central: NO se llama a anim.play(). El Lottie se mantiene parado y se
 * avanza frame a frame con un tween propio. Reproducir un Lottie a su velocidad
 * de exportación es justo lo que delata una plantilla; con un temporizado propio
 * la flor se abre como si la animación se hubiera hecho para esta página.
 */
(function () {
  'use strict';

  var BLOOM_MS     = 2400;   // duración de la floración
  var REVEAL_AT    = 0.70;   // progreso al que entra el mensaje (solapado, no después)
  var SETTLE_MAX   = 0.014;  // amplitud del asentamiento final
  var BREATHE_MS   = 4200;   // periodo de la respiración del capullo
  var BREATHE_AMP  = 0.015;  // amplitud de la respiración
  var BREATHE_OUT  = 600;    // en cuánto se apaga la respiración al tocar

  var stage = document.getElementById('stage');
  var bud   = document.getElementById('bud');
  var art   = document.getElementById('art');
  var msg   = document.getElementById('message');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Escalona las líneas del mensaje sea cual sea su número: añadir un <p> en
     index.html basta, no hay que tocar CSS ni JS. */
  Array.prototype.forEach.call(msg.children, function (el, i) {
    el.style.setProperty('--i', i);
  });

  /* --- easing ------------------------------------------------------------ */

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

  // arranque lento (la flor duda), empuje a media floración, cola larga al abrir
  var easeBloom = cubicBezier(0.34, 0.02, 0.16, 1);

  /* --- carga -------------------------------------------------------------- */

  var anim = null;
  var bloomed = false;
  var idleRAF = null;

  function lastFrame() {
    return Math.max(0, anim.totalFrames - 1);
  }

  function seek(p) {
    anim.goToAndStop(p * lastFrame(), true);
  }

  /* --- respiración del capullo -------------------------------------------- */

  /* Escala suave alrededor de 1, en fase continua con el reloj: al empezar la
     floración el tween retoma exactamente este valor, sin discontinuidad. */
  function breatheAt(now, amp) {
    var phase = (now % BREATHE_MS) / BREATHE_MS;
    return 1 + amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
  }

  function setScale(v) {
    art.style.setProperty('--settle', v.toFixed(4));
  }

  function idleLoop(now) {
    setScale(breatheAt(now, BREATHE_AMP));
    idleRAF = requestAnimationFrame(idleLoop);
  }

  function startIdle() {
    if (idleRAF === null && !bloomed && !reduced) idleRAF = requestAnimationFrame(idleLoop);
  }

  function stopIdle() {
    if (idleRAF !== null) { cancelAnimationFrame(idleRAF); idleRAF = null; }
  }

  // No gastar batería respirando en una pestaña que nadie está mirando.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopIdle(); else startIdle();
  });

  /* Si la flor no carga, Annie ve el mensaje igual. El regalo es el mensaje;
     la flor es cómo se entrega. */
  function degrade() {
    bud.style.display = 'none';
    document.body.classList.add('is-bloomed');
    stage.classList.add('is-ready');
  }

  if (typeof lottie === 'undefined') {
    degrade();
    return;
  }

  fetch('assets/flower.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      /* El hueco toma la proporción del propio Lottie, así una flor alta y
         estrecha no se queda pequeña por culpa de un lienzo cuadrado. Se
         ajusta solo a cualquier animación que se ponga en su sitio. */
      if (data.w && data.h) {
        art.style.setProperty('--ar', (data.w / data.h).toFixed(4));
      }

      anim = lottie.loadAnimation({
        container: art,
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
          seek(1);
          document.body.classList.add('is-bloomed');
        } else {
          seek(0);              // capullo cerrado
          startIdle();
        }
        stage.classList.add('is-ready');
      });
    })
    .catch(degrade);

  /* --- floración ---------------------------------------------------------- */

  function bloom() {
    if (bloomed || !anim || reduced) return;
    bloomed = true;
    stopIdle();
    bud.setAttribute('aria-disabled', 'true');
    document.body.classList.add('is-blooming');

    var t0 = performance.now();
    var revealed = false;

    function frame(now) {
      var elapsed = now - t0;
      var t = Math.min(1, elapsed / BLOOM_MS);
      var p = easeBloom(t);

      seek(p);

      /* Asentamiento: la flor entera se hincha ~1.4% y vuelve durante el último
         tramo. El overshoot no puede ir en el timeline del Lottie porque más
         allá del último frame no hay nada que mostrar, así que va en la escala. */
      var s = (p - 0.62) / 0.38;
      var settle = 1 + SETTLE_MAX * Math.sin(Math.PI * Math.min(1, Math.max(0, s)));

      // La respiración se apaga en vez de cortarse: en t=0 vale lo mismo que
      // en el lazo de reposo, así el toque no produce ningún salto.
      var amp = BREATHE_AMP * Math.max(0, 1 - elapsed / BREATHE_OUT);

      setScale(breatheAt(now, amp) * settle);

      if (!revealed && p >= REVEAL_AT) {
        revealed = true;
        document.body.classList.add('is-bloomed');
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        setScale(1);
        document.body.classList.remove('is-blooming');
        if (!revealed) document.body.classList.add('is-bloomed');
      }
    }

    requestAnimationFrame(frame);
  }

  // 'click' cubre táctil, ratón y teclado (Enter/Espacio) por ser un <button>.
  bud.addEventListener('click', bloom);
})();
