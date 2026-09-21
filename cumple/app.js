/* Sorpresa de cumpleaños para Annie
 *
 * Pon aquí la URL del Apps Script (la de /exec). Nada más de este archivo
 * hace falta tocarlo.
 */
var BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwKWHgcbWi5GdIRaLSPY5cnoYduLON1-1u7UM-L3HRGKofDlpbRr8CwG8VlcixFmIM1/exec';

/* Cómo funciona, en tres ideas:
 *
 * 1. La portada es estática y se ve al instante; las misiones las manda el
 *    backend ({accion:'estado'}) y se pintan como polaroids: hecha, disponible
 *    o bloqueada.
 * 2. La cámara es SÓLO getUserMedia, abierta dentro del toque. Nunca un
 *    <input type="file">: no se puede elegir una foto de la galería.
 * 3. La espera del backend es el revelado de la polaroid (Web Animations API):
 *    se revela hasta «casi» y respira ahí hasta que llega la respuesta.
 *
 * Todo texto que llega del backend se pone con textContent: el comentario lo
 * escribe una IA y no es de fiar como HTML.
 */
(function () {
  'use strict';

  var params  = new URLSearchParams(location.search);
  var PRUEBA  = params.has('prueba');
  var TIMEOUT_MS = 60000;
  var LADO_MAX   = 1280;          // lado largo de la foto que se manda
  var CALIDAD    = 0.85;          // JPEG

  /* Lo que se lee mientras se revela. El backend se despierta en frío y a
     veces tarda: por eso cambia la frase con el tiempo. */
  var ESPERA = [
    [0,     'Juan está mirando tu foto…'],
    [7000,  'Se está revelando, un momentito…'],
    [16000, 'Ya casi. A veces tarda un poco en despertarse.']
  ];

  /* El filtro de la foto en cada punto del revelado. Las tres listas tienen
     las mismas funciones en el mismo orden para que se interpolen suave. */
  var VELADA = 'sepia(1) saturate(.25) brightness(1.55) contrast(.35) blur(10px)';
  var CASI   = 'sepia(.4) saturate(.7) brightness(1.08) contrast(.9) blur(.8px)';
  var CASI_2 = 'sepia(.55) saturate(.55) brightness(1.15) contrast(.84) blur(1.6px)';
  var LIMPIA = 'sepia(0) saturate(1) brightness(1) contrast(1) blur(0px)';
  var APAGADA = 'sepia(.2) saturate(.4) brightness(1.04) contrast(.95) blur(0px)';   // rechazada

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  var portada = $('portada'), tablero = $('tablero'), cuenta = $('cuenta');
  var aviso = $('aviso'), avisoTexto = $('avisoTexto');
  var camara = $('camara'), video = $('video'), captura = $('captura'), flash = $('flash');
  var controlesVivo = $('controlesVivo'), controlesFoto = $('controlesFoto');
  var camError = $('camError'), camErrorTitulo = $('camErrorTitulo'), camErrorTexto = $('camErrorTexto');
  var voltearBtn = $('voltear'), dispararBtn = $('disparar');
  var revelado = $('revelado'), revFoto = $('revFoto'), revVelo = $('revVelo');
  var revTitulo = $('revTitulo'), revComentario = $('revComentario'), revLinea = $('revLinea');
  var revAcciones = $('revAcciones'), revPrincipal = $('revPrincipal'), revSecundario = $('revSecundario');
  var tarjeta = $('tarjeta'), guardarBtn = $('guardar'), guardarNota = $('guardarNota');
  var guardado = $('guardado');

  var estado = { misiones: [], final: null };
  var pantalla = 'portada';
  var recien = null;               // id de la polaroid que se acaba de pegar

  /* --- intentos por misión --------------------------------------------------
     Empiezan en 1, suben con cada rechazo y vuelven a 1 al aprobar. Se guardan
     en el móvil para que una recarga no le devuelva al primer intento (el
     backend aprueba siempre a partir del tercero). */
  var CLAVE = 'cumple-intentos' + (PRUEBA ? '-prueba' : '');
  var intentos = {};
  try { intentos = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { intentos = {}; }
  function guardarIntentos() {
    try { localStorage.setItem(CLAVE, JSON.stringify(intentos)); } catch (e) { /* modo privado */ }
  }

  /* --- backend --------------------------------------------------------------
     Sin headers a propósito: así el cuerpo va como text/plain y el navegador
     no hace preflight CORS, que Apps Script no sabe contestar. */
  function llamar(req) {
    req.prueba = PRUEBA;
    if (window.BACKEND_MOCK) return window.BACKEND_MOCK(req).then(revisar);
    var ctrl = new AbortController();
    var reloj = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    return fetch(BACKEND_URL, { method: 'POST', body: JSON.stringify(req), signal: ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(revisar, function (e) {
        throw new Error(e && e.name === 'AbortError'
          ? 'Tardó demasiado en contestar.'
          : 'Parece que no hay conexión, o el servidor no contesta.');
      })
      .finally(function () { clearTimeout(reloj); });
  }
  function revisar(d) {
    if (!d || typeof d !== 'object') throw new Error('La respuesta llegó vacía.');
    if (d.error) throw new Error(String(d.error));
    return d;
  }

  /* --- pantallas ------------------------------------------------------------ */

  function mostrar(cual) {
    pantalla = cual;
    camara.hidden   = cual !== 'camara';
    revelado.hidden = cual !== 'revelado';
    tarjeta.hidden  = cual !== 'tarjeta';
    portada.hidden  = cual === 'tarjeta';
    // Con una capa encima, la portada no debe recibir foco ni lector.
    portada.inert   = cual === 'camara' || cual === 'revelado';
    document.body.style.overflow = (cual === 'camara' || cual === 'revelado') ? 'hidden' : '';
  }

  /* --- la portada ----------------------------------------------------------- */

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function pintarCargando() {
    tablero.textContent = '';
    tablero.setAttribute('aria-busy', 'true');
    for (var i = 0; i < 4; i++) {
      var li = el('li');
      var p = el('div', 'polaroid polaroid--cargando');
      p.appendChild(el('div', 'polaroid__hueco'));
      p.appendChild(el('div', 'polaroid__pie'));
      li.appendChild(p);
      tablero.appendChild(li);
    }
    cuenta.textContent = '';
  }

  function polaroidDeMision(m) {
    var tipo = m.hecha ? 'hecha' : (m.bloqueada ? 'bloqueada' : 'disponible');
    var p = el(tipo === 'disponible' ? 'button' : 'figure', 'polaroid polaroid--' + tipo);
    var hueco = el(tipo === 'disponible' ? 'span' : 'div', 'polaroid__hueco');   // un <button> sólo admite contenido en línea
    var pie = el(tipo === 'disponible' ? 'span' : 'figcaption', 'polaroid__pie');
    p.appendChild(el('span', 'polaroid__cinta'));
    p.appendChild(hueco);
    p.appendChild(pie);
    pie.appendChild(el('span', 'polaroid__titulo', m.titulo));

    if (tipo === 'hecha') {
      if (m.foto) {
        var img = el('img');
        img.src = m.foto;
        img.alt = 'Tu foto: ' + (m.titulo || 'misión');
        hueco.appendChild(img);
      }
      if (m.comentario) pie.appendChild(el('span', 'polaroid__comentario', m.comentario));
      if (recien === m.id) p.classList.add('recien');
    } else if (tipo === 'disponible') {
      p.type = 'button';
      hueco.appendChild(el('span', 'pista', 'tócala'));
      if (m.instruccion) pie.appendChild(el('span', 'polaroid__nota', m.instruccion));
      p.addEventListener('click', function () { abrirCamara(m); });
    } else {
      // La instrucción se ve desde el principio: tiene que saber del dulce antes de que llegue.
      hueco.appendChild(el('span', 'pista', 'después de la primera'));
      if (m.instruccion) pie.appendChild(el('span', 'polaroid__nota', m.instruccion));
    }
    return p;
  }

  function pintarMisiones() {
    tablero.textContent = '';
    tablero.removeAttribute('aria-busy');
    var hechas = 0;
    estado.misiones.forEach(function (m) {
      if (m.hecha) hechas++;
      var li = el('li');
      li.appendChild(polaroidDeMision(m));
      tablero.appendChild(li);
    });
    cuenta.textContent = estado.misiones.length ? hechas + ' de ' + estado.misiones.length : '';
  }

  /* Lo que ya sabemos en local (la foto recién hecha) gana a un estado que
     todavía no la traiga. */
  function fusionar(nuevas) {
    var antes = {};
    estado.misiones.forEach(function (m) { antes[m.id] = m; });
    estado.misiones = (nuevas || []).map(function (m) {
      var a = antes[m.id];
      if (a && a.hecha && !m.hecha) return a;
      if (a && a.hecha && !m.foto) { m.foto = a.foto; m.comentario = m.comentario || a.comentario; }
      return m;
    });
  }

  var cargando = false;
  function cargarEstado(silencioso) {
    if (cargando) return;
    cargando = true;
    if (!silencioso) { aviso.hidden = true; pintarCargando(); }
    llamar({ accion: 'estado' }).then(function (d) {
      fusionar(d.misiones);
      estado.final = d.final || null;
      pintarMisiones();
      if (estado.final && pantalla === 'portada') abrirTarjeta(false);
    }, function (e) {
      if (silencioso) return;
      tablero.textContent = '';
      tablero.removeAttribute('aria-busy');
      avisoTexto.textContent = 'No pude traer tus misiones. ' + e.message + ' Prueba otra vez en un momento.';
      aviso.hidden = false;
    }).then(function () { cargando = false; });
  }

  $('avisoReintentar').addEventListener('click', function () { cargarEstado(false); });

  function volverAPortada() {
    mostrar('portada');
    pintarMisiones();
    var nueva = tablero.querySelector('.recien');
    if (nueva) nueva.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    recien = null;
    // Puede que al hacer esta se hayan desbloqueado otras.
    cargarEstado(true);
  }

  /* --- la cámara ------------------------------------------------------------ */

  var stream = null;
  var mision = null;
  var facing = 'user';
  var espejo = false;
  var foto = null;
  var pedido = 0;                  // para descartar una cámara que llega tarde
  var enPausa = false;

  function apagar() {
    pedido++;
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null;
    video.srcObject = null;
  }

  function abrirCamara(m) {
    mision = m;
    facing = m.camara === 'environment' ? 'environment' : 'user';
    $('camTitulo').textContent = m.titulo || '';
    $('camInstruccion').textContent = m.instruccion || '';
    modoVivo();
    mostrar('camara');
    encender();                     // todavía dentro del toque: iOS lo exige
    $('camVolver').focus({ preventScroll: true });
  }

  /* iOS no sostiene dos cámaras a la vez: siempre se apaga la anterior antes
     de pedir otra. */
  function encender() {
    apagar();
    camError.hidden = true;
    controlesVivo.hidden = false;
    enPausa = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { errorCamara('sinSoporte'); return; }
    var n = pedido;
    dispararBtn.disabled = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
      audio: false
    }).then(function (s) {
      if (n !== pedido || pantalla !== 'camara') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      var pista = s.getVideoTracks()[0];
      var ajustes = pista && pista.getSettings ? pista.getSettings() : {};
      espejo = (ajustes.facingMode || facing) === 'user';
      video.classList.toggle('espejo', espejo);
      video.srcObject = s;
      contarCamaras();
      dispararBtn.disabled = false;
      // Un play() rechazado no es un permiso denegado (también se llama
      // NotAllowedError): el <video> lleva autoplay y muted, así que se ignora.
      video.play().catch(function () {});
    }).catch(function (e) {
      if (n !== pedido) return;
      errorCamara(e && e.name);
    });
  }

  function contarCamaras() {
    if (!navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (ds) {
      voltearBtn.hidden = ds.filter(function (d) { return d.kind === 'videoinput'; }).length < 2;
    }, function () {});
  }

  function errorCamara(tipo) {
    apagar();
    controlesVivo.hidden = true;
    controlesFoto.hidden = true;
    camErrorTexto.textContent = '';
    var reintentar = $('camReintentar');
    reintentar.hidden = false;
    if (tipo === 'NotAllowedError' || tipo === 'SecurityError') {
      camErrorTitulo.textContent = 'Necesito permiso para la cámara';
      camErrorTexto.appendChild(el('p', null, 'Safari no me dejó abrirla. Para permitirla:'));
      var ol = el('ol');
      [['Toca el botón ', 'aA', ' de la barra de direcciones.'],
       ['Entra en ', 'Ajustes del sitio web', '.'],
       ['En ', 'Cámara', ', elige «Permitir».'],
       ['Recarga la página y vuelve a tocar la misión.', '', '']].forEach(function (partes) {
        var li = el('li', null, partes[0]);
        if (partes[1]) li.appendChild(el('b', null, partes[1]));
        if (partes[2]) li.appendChild(document.createTextNode(partes[2]));
        ol.appendChild(li);
      });
      camErrorTexto.appendChild(ol);
    } else if (tipo === 'sinSoporte') {
      camErrorTitulo.textContent = 'Abre este link en Safari';
      camErrorTexto.appendChild(el('p', null,
        'Desde aquí no puedo usar la cámara. Toca los tres puntos o el botón de compartir y elige «Abrir en Safari»; ahí funciona.'));
      reintentar.hidden = true;
    } else {
      camErrorTitulo.textContent = 'La cámara no quiso abrirse';
      camErrorTexto.appendChild(el('p', null,
        'Puede que otra app la esté usando. Ciérrala si es así y vuelve a intentarlo.'));
    }
    camError.hidden = false;
  }

  function modoVivo() {
    foto = null;
    captura.hidden = true;
    captura.removeAttribute('src');
    controlesFoto.hidden = true;
    controlesVivo.hidden = false;
  }

  function disparar() {
    if (!stream || !video.videoWidth) return;
    var w = video.videoWidth, h = video.videoHeight;
    var k = Math.min(1, LADO_MAX / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    var ctx = c.getContext('2d');
    if (espejo) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }   // lo que ve es lo que se manda
    ctx.drawImage(video, 0, 0, c.width, c.height);
    foto = c.toDataURL('image/jpeg', CALIDAD);
    captura.src = foto;
    captura.hidden = false;
    controlesVivo.hidden = true;
    controlesFoto.hidden = false;
    if (!reduced) { flash.classList.remove('dispara'); void flash.offsetWidth; flash.classList.add('dispara'); }
    $('enviar').focus({ preventScroll: true });
  }

  dispararBtn.addEventListener('click', disparar);
  voltearBtn.addEventListener('click', function () {
    facing = facing === 'user' ? 'environment' : 'user';
    encender();
  });
  $('repetir').addEventListener('click', function () {
    modoVivo();
    if (!stream) encender();
  });
  $('enviar').addEventListener('click', function () {
    if (!foto) return;
    apagar();
    revelar(mision, foto);
  });
  function salirDeCamara() { apagar(); mostrar('portada'); }
  $('camVolver').addEventListener('click', salirDeCamara);
  $('camErrorVolver').addEventListener('click', salirDeCamara);
  $('camReintentar').addEventListener('click', encender);

  /* Si sale de Safari con la cámara abierta, se apaga (el piloto verde no se
     queda encendido) y se vuelve a abrir al volver, si seguía ahí. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (stream) { apagar(); enPausa = true; }
    } else if (pantalla === 'camara' && enPausa && captura.hidden) {
      encender();
    } else if (pantalla === 'portada') {
      cargarEstado(true);          // vuelve horas después: puede haber misiones nuevas
    }
  });
  window.addEventListener('pagehide', apagar);

  /* --- el revelado ---------------------------------------------------------- */

  var animFoto = [], relojes = [], enviando = false;

  function pararAnimaciones() {
    animFoto.forEach(function (a) { a.cancel(); });
    animFoto = [];
  }

  function animar(nodo, marcos, opciones) {
    if (!nodo.animate) return null;
    var a = nodo.animate(marcos, opciones);
    animFoto.push(a);
    return a;
  }

  /* Hasta «casi» en 9 s y, desde ahí, respirando: aguanta una espera larga
     sin llegar nunca al color, que queda para cuando conteste. */
  function empezarRevelado() {
    pararAnimaciones();
    if (reduced) { revFoto.style.filter = CASI; revVelo.style.opacity = '.15'; return; }
    revFoto.style.filter = '';
    revVelo.style.opacity = '';
    var subida = animar(revFoto, [{ filter: VELADA }, { filter: CASI }],
      { duration: 9000, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'forwards' });
    animar(revVelo, [{ opacity: 1 }, { opacity: 0.14 }],
      { duration: 9000, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'forwards' });
    if (subida) subida.onfinish = function () {
      if (!enviando) return;
      animar(revFoto, [{ filter: CASI }, { filter: CASI_2 }],
        { duration: 2400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      animar(revVelo, [{ opacity: 0.14 }, { opacity: 0.26 }],
        { duration: 2400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    };
  }

  /* Desde donde se haya quedado hasta el color, sin saltos. */
  function terminarRevelado(hasta) {
    var filtro = getComputedStyle(revFoto).filter;
    var velo = getComputedStyle(revVelo).opacity;
    pararAnimaciones();
    revFoto.style.filter = hasta;
    revVelo.style.opacity = '0';
    if (reduced || !revFoto.animate) return;
    animar(revFoto, [{ filter: filtro === 'none' ? VELADA : filtro }, { filter: hasta }],
      { duration: 1400, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animar(revVelo, [{ opacity: velo }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
  }

  function lineas() {
    relojes.forEach(clearTimeout);
    relojes = ESPERA.map(function (par) {
      return setTimeout(function () { revLinea.textContent = par[1]; }, par[0]);
    });
  }

  function revelar(m, f) {
    mision = m;
    foto = f;
    revFoto.src = f;
    revTitulo.textContent = m.titulo || '';
    revComentario.textContent = '';
    revelado.className = 'revelado';
    revAcciones.hidden = true;
    mostrar('revelado');
    revelado.scrollTop = 0;
    revelado.focus({ preventScroll: true });
    mandar();
  }

  function mandar() {
    var m = mision, f = foto;
    var n = intentos[m.id] || 1;
    enviando = true;
    revelado.className = 'revelado';
    revAcciones.hidden = true;
    empezarRevelado();
    lineas();
    llamar({ accion: 'validar', mision: m.id, intento: n, foto: f }).then(function (d) {
      enviando = false;
      relojes.forEach(clearTimeout);
      terminarRevelado(d.cumple ? LIMPIA : APAGADA);
      revComentario.textContent = d.comentario || '';
      if (d.cumple) {
        intentos[m.id] = 1;
        m.hecha = true;
        m.bloqueada = false;
        m.foto = f;
        m.comentario = d.comentario || '';
        if (Object.prototype.hasOwnProperty.call(d, 'mitad')) m.mitad = d.mitad;   // la del corazón
        recien = m.id;
        if (d.final) estado.final = d.final;
        revelado.className = 'revelado is-listo is-aprobada';
        revLinea.textContent = d.final ? '¡Las completaste todas!' : '¡Misión cumplida!';
        acciones(d.final ? 'Abrir tu tarjeta' : 'Seguir', d.final ? function () { abrirTarjeta(true); } : volverAPortada);
      } else {
        intentos[m.id] = n + 1;
        revelado.className = 'revelado is-listo is-rechazada';
        revLinea.textContent = 'Casi. Prueba otra vez.';
        acciones('Repetir la foto', function () { abrirCamara(m); }, 'Luego', volverAPortada);
      }
      guardarIntentos();
    }, function (e) {
      enviando = false;
      relojes.forEach(clearTimeout);
      pararAnimaciones();
      revFoto.style.filter = CASI;
      revVelo.style.opacity = '.14';
      revelado.className = 'revelado is-listo is-error';
      revLinea.textContent = 'Tu foto no me llegó. ' + e.message;
      acciones('Reenviar la foto', mandar, 'Volver', volverAPortada);
    });
  }

  var alPrincipal = null, alSecundario = null;
  function acciones(txt1, fn1, txt2, fn2) {
    revPrincipal.textContent = txt1;
    alPrincipal = fn1;
    revSecundario.hidden = !txt2;
    revSecundario.textContent = txt2 || '';
    alSecundario = fn2 || null;
    revAcciones.hidden = false;
    revPrincipal.focus({ preventScroll: true });
  }
  revPrincipal.addEventListener('click', function () { if (alPrincipal) alPrincipal(); });
  revSecundario.addEventListener('click', function () { if (alSecundario) alSecundario(); });

  /* --- la tarjeta final ----------------------------------------------------- */

  var imagenTarjeta = null, preparando = null;

  function abrirTarjeta(conCierre) {
    var f = estado.final;
    if (!f) return;
    $('tarjetaTitulo').textContent = f.titulo || '';
    $('tarjetaFoto').src = f.foto || '';
    var msj = $('tarjetaMensaje');
    msj.textContent = '';
    (f.mensaje || []).forEach(function (t) { msj.appendChild(el('p', null, t)); });

    var par = parDelCorazon();
    var corazon = $('corazon');
    tarjeta.classList.toggle('tarjeta--par', !!par);
    corazon.hidden = !par;
    if (par) {
      $('mitadElla').src = par.ella.foto;
      var suya = $('mitadJuan');
      // Si la mitad de Juan no carga, la tarjeta vuelve a ser la de siempre.
      suya.onerror = function () {
        if (estado.final && estado.final.mitad === par.juan) { estado.final.mitad = null; abrirTarjeta(false); }
      };
      suya.src = par.juan;
      corazon.classList.toggle('corazon--espejo', par.ella.mitad === 'izquierda');
      juntarAlVerlo(corazon, conCierre ? 2600 : 300);
    }

    var collage = $('collage');
    collage.classList.toggle('collage--tres', !!par);
    Array.prototype.forEach.call(collage.querySelectorAll('.polaroid--mini'), function (n) { n.remove(); });
    fotosDelDia().forEach(function (m, i) {
      var p = el('figure', 'polaroid polaroid--mini');
      p.style.setProperty('--i', i);
      p.appendChild(el('span', 'polaroid__cinta'));
      var h = el('div', 'polaroid__hueco');
      var img = el('img');
      img.src = m.foto;
      img.alt = 'Tu foto: ' + (m.titulo || 'misión');
      h.appendChild(img);
      p.appendChild(h);
      collage.appendChild(p);
    });

    imagenTarjeta = null;
    preparando = dibujarTarjeta().then(function (r) { imagenTarjeta = r; return r; });
    preparando.catch(function () {});

    var entrar = function () {
      document.body.classList.remove('cerrando');
      mostrar('tarjeta');
      window.scrollTo(0, 0);
      tarjeta.classList.toggle('entra', !!conCierre && !reduced);
      tarjeta.focus({ preventScroll: true });
    };
    if (conCierre && !reduced) {
      mostrar('portada');
      pintarMisiones();
      document.body.classList.add('cerrando');
      setTimeout(entrar, 650);
    } else {
      entrar();
    }
  }

  /* Las de la órbita: todas las hechas menos la del corazón cuando va aparte. */
  function fotosDelDia() {
    var par = parDelCorazon();
    return estado.misiones.filter(function (m) {
      return m.hecha && m.foto && !(par && m === par.ella);
    }).slice(0, 4);
  }

  /* El par sólo existe si Juan ya subió su mitad (final.mitad) y ella hizo la
     misión del corazón, que es la que trae la clave `mitad` (no se busca por
     id). Si falta cualquiera de las dos, la tarjeta es la de siempre. */
  function parDelCorazon() {
    var f = estado.final;
    if (!f || !f.mitad) return null;
    var ella = estado.misiones.filter(function (m) {
      return Object.prototype.hasOwnProperty.call(m, 'mitad');
    })[0];
    return ella && ella.hecha && ella.foto ? { ella: ella, juan: f.mitad } : null;
  }

  /* Las dos mitades esperan separadas y se juntan cuando el corazón entra en
     pantalla. `espera` deja terminar antes la entrada de la tarjeta. */
  var observador = null;
  function juntarAlVerlo(n, espera) {
    if (observador) observador.disconnect();
    n.classList.remove('late');
    if (reduced || !('IntersectionObserver' in window)) { n.classList.remove('separado'); return; }
    n.classList.add('separado');
    var o = observador = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      n.classList.remove('separado');
      n.classList.add('late');
    }, { threshold: 0.6 });
    setTimeout(function () { if (o === observador) o.observe(n); }, espera);
  }

  function cargarImagen(src) {
    return new Promise(function (ok) {
      if (!src) { ok(null); return; }
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { ok(null); };
      i.src = src;
    });
  }

  /* La tarjeta en un lienzo de 1080×1920 (el formato de una historia), para
     que se la pueda guardar en el carrete. Se prepara nada más abrirse la
     tarjeta: así, al tocar «Guardar», navigator.share() sale dentro del toque,
     que es lo que exige iOS. */
  /* Las familias del lienzo salen de las mismas variables CSS que la página
     (--grito, --texto, --sans): cambiar de letra es cambiarla
     en styles.css y nada más. */
  function familia(variable, reserva) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || reserva;
  }

  function dibujarTarjeta() {
    var f = estado.final;
    var DISPLAY = familia('--grito', 'sans-serif');
    var TEXTO = familia('--texto', 'sans-serif');
    var SANS = familia('--sans', 'sans-serif');
    var W = 1080, H = 1920;
    var fuentes = Promise.all([
      document.fonts.load('800 80px ' + DISPLAY),
      document.fonts.load('400 40px ' + TEXTO)
    ]).catch(function () {}).then(function () { return document.fonts.ready; });
    var par = parDelCorazon();
    var orbita = fotosDelDia();
    var imgs = Promise.all([cargarImagen(f.foto)]
      .concat(orbita.map(function (m) { return cargarImagen(m.foto); }))
      .concat(par ? [cargarImagen(par.ella.foto), cargarImagen(par.juan)] : []));

    /* Dos composiciones: la de siempre, y con el corazón, donde la órbita
       sube y encoge para dejarle al par la mitad de abajo. */
    var L = par
      ? { tituloPx: 84, tituloY: 150, tituloPaso: 92, cy: 590, centro: 400, mini: 250,
          sitios: [[235, 450, -8], [850, 600, 7], [250, 765, 5]], textoTop: 1440, textoTam: 42 }
      : { tituloPx: 92, tituloY: 210, tituloPaso: 100, cy: 860, centro: 560, mini: 330,
          sitios: [[250, 560, -8], [835, 590, 7], [245, 1140, 6], [840, 1110, -5]], textoTop: 1330, textoTam: 46 };

    return Promise.all([fuentes, imgs]).then(function (r) {
      var fotos = r[1];
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');

      var cielo = ctx.createLinearGradient(0, 0, 0, H);
      cielo.addColorStop(0, '#a6cfe9');
      cielo.addColorStop(0.4, '#c3e0f2');
      cielo.addColorStop(0.8, '#e6f2f8');
      cielo.addColorStop(1, '#e6f2f8');
      ctx.fillStyle = cielo;
      ctx.fillRect(0, 0, W, H);

      var cx = W / 2, cy = L.cy;
      var sol = ctx.createRadialGradient(cx, cy, 0, cx, cy, 480);
      sol.addColorStop(0, 'rgba(253,242,223,.95)');
      sol.addColorStop(0.45, 'rgba(253,238,203,1)');
      sol.addColorStop(0.72, 'rgba(253,238,203,0)');
      ctx.fillStyle = sol;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#21455f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '800 ' + L.tituloPx + 'px ' + DISPLAY;
      // Equilibra el título: el ancho más estrecho que no añade líneas, para
      // que no quede una palabra sola abajo.
      var lineasTitulo = partir(ctx, f.titulo || '', 900);
      for (var ancho = 880; ancho > 400; ancho -= 20) {
        var probar = partir(ctx, f.titulo || '', ancho);
        if (probar.length > lineasTitulo.length) break;
        lineasTitulo = probar;
      }
      lineasTitulo.forEach(function (l, i) { ctx.fillText(l, cx, L.tituloY + i * L.tituloPaso); });

      fotos.slice(1, 1 + orbita.length).forEach(function (img, i) {
        var s = L.sitios[i];
        if (s) polaroidEnLienzo(ctx, img, s[0], s[1], L.mini, s[2], true);
      });
      polaroidEnLienzo(ctx, fotos[0], cx, cy, L.centro, -2, false);
      if (par) {
        var ps = fotos.slice(1 + orbita.length);
        parEnLienzo(ctx, ps[0], ps[1], par.ella.mitad === 'izquierda', cx, 1135, 620, SANS);
        ctx.fillStyle = '#21455f';
      }

      // El mensaje: baja de tamaño hasta que quepa.
      var parrafos = f.mensaje || [];
      var top = L.textoTop, fondo = 1800, tam = L.textoTam, bloques, alto;
      do {
        ctx.font = '400 ' + tam + 'px ' + TEXTO;
        bloques = parrafos.map(function (p) { return partir(ctx, p, 860); });
        alto = bloques.reduce(function (s, b) { return s + b.length * tam * 1.5; }, 0) + (bloques.length - 1) * tam * 0.7;
        tam -= 2;
      } while (top + alto > fondo && tam > 26);
      tam += 2;
      var y = top + Math.max(0, (fondo - top - alto) / 2) + tam;   // centrado en su hueco
      bloques.forEach(function (b) {
        b.forEach(function (l) { ctx.fillText(l, cx, y); y += tam * 1.5; });
        y += tam * 0.7;
      });

      ctx.font = '500 26px ' + SANS;
      ctx.fillStyle = '#3f5d72';
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '8px';
      ctx.fillText('22 · 09', cx, 1868);

      return new Promise(function (ok, ko) {
        c.toBlob(function (blob) {
          if (!blob) { ko(new Error('toBlob')); return; }
          ok({
            file: new File([blob], 'feliz-cumple-annie.jpg', { type: 'image/jpeg' }),
            url: c.toDataURL('image/jpeg', 0.9)
          });
        }, 'image/jpeg', 0.9);
      });
    });
  }

  function partir(ctx, texto, ancho) {
    var palabras = String(texto).split(/\s+/), lineas = [], linea = '';
    palabras.forEach(function (p) {
      var prueba = linea ? linea + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && linea) { lineas.push(linea); linea = p; }
      else linea = prueba;
    });
    if (linea) lineas.push(linea);
    return lineas;
  }

  function polaroidEnLienzo(ctx, img, x, y, w, grados, cinta) {
    var pad = w * 0.06, lado = w - pad * 2, h = pad + lado + w * (cinta ? 0.16 : 0.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(grados * Math.PI / 180);
    ctx.shadowColor = 'rgba(20,55,80,.28)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#fdfcf8';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowColor = 'transparent';
    var ix = -w / 2 + pad, iy = -h / 2 + pad;
    if (img) {
      var s = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, ix, iy, lado, lado);
    } else {
      ctx.fillStyle = '#34495a';
      ctx.fillRect(ix, iy, lado, lado);
    }
    if (cinta) {
      ctx.fillStyle = 'rgba(232,181,63,.62)';
      ctx.rotate(-3 * Math.PI / 180);
      ctx.fillRect(-w * 0.17, -h / 2 - 12, w * 0.34, 24);
    }
    ctx.restore();
  }

  /* Recorta `img` como cover dentro de w×h y, si hace falta, la voltea. */
  function fotoCover(ctx, img, x, y, w, h, espejo) {
    if (!img) { ctx.fillStyle = '#34495a'; ctx.fillRect(x, y, w, h); return; }
    var iw = img.naturalWidth, ih = img.naturalHeight, k = Math.max(w / iw, h / ih);
    var sw = w / k, sh = h / k;
    ctx.save();
    if (espejo) { ctx.translate(x + w, y); ctx.scale(-1, 1); x = 0; y = 0; }
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
    ctx.restore();
  }

  /* El corazón en el lienzo: un solo papel, las dos fotos 3:4 tocándose. */
  function parEnLienzo(ctx, ella, juan, espejo, x, y, ancho, sans) {
    var pad = ancho * 0.035, fw = ancho / 2 - pad, fh = fw * 4 / 3, pie = ancho * 0.09;
    var h = pad + fh + pie;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-1.5 * Math.PI / 180);
    ctx.shadowColor = 'rgba(20,55,80,.28)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#fdfcf8';
    ctx.fillRect(-ancho / 2, -h / 2, ancho, h);
    ctx.shadowColor = 'transparent';
    fotoCover(ctx, ella, -ancho / 2 + pad, -h / 2 + pad, fw, fh, espejo);
    fotoCover(ctx, juan, 0, -h / 2 + pad, fw, fh, false);
    ctx.font = '600 22px ' + sans;
    ctx.fillStyle = '#3f5d72';
    ctx.textAlign = 'center';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '5px';
    var ly = -h / 2 + pad + fh + pie * 0.62;
    ctx.fillText('ESPAÑA', -ancho / 2 + pad + fw / 2, ly);
    ctx.fillText('VENEZUELA', fw / 2, ly);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  function compartir(r) {
    var files = [r.file];
    if (navigator.canShare && navigator.share && navigator.canShare({ files: files })) {
      navigator.share({ files: files }).then(function () {
        guardarNota.textContent = '';
      }, function (e) {
        if (e && e.name === 'AbortError') return;     // cerró el menú: nada que hacer
        verImagen(r.url);
      });
    } else {
      verImagen(r.url);
    }
  }

  function verImagen(url) {
    $('guardadoImg').src = url;
    guardado.hidden = false;
    $('guardadoCerrar').focus();
  }

  guardarBtn.addEventListener('click', function () {
    guardarNota.textContent = '';
    if (imagenTarjeta) { compartir(imagenTarjeta); return; }
    guardarBtn.disabled = true;
    guardarNota.textContent = 'Preparando tu tarjeta…';
    (preparando || Promise.reject()).then(function (r) {
      guardarNota.textContent = '';
      compartir(r);
    }, function () {
      guardarNota.textContent = 'No pude preparar la imagen. Hazle una captura de pantalla, que también vale.';
    }).then(function () { guardarBtn.disabled = false; });
  });

  function cerrarGuardado() { guardado.hidden = true; guardarBtn.focus(); }
  $('guardadoCerrar').addEventListener('click', cerrarGuardado);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !guardado.hidden) cerrarGuardado();
  });

  /* --- modo prueba ---------------------------------------------------------- */

  if (PRUEBA) {
    var reiniciarBtn = $('reiniciar');
    reiniciarBtn.hidden = false;
    reiniciarBtn.addEventListener('click', function () {
      reiniciarBtn.disabled = true;
      llamar({ accion: 'reiniciar' }).then(function () {
        intentos = {};
        guardarIntentos();
        estado = { misiones: [], final: null };
        mostrar('portada');
        cargarEstado(false);
      }, function (e) {
        avisoTexto.textContent = 'No se pudo reiniciar: ' + e.message;
        aviso.hidden = false;
      }).then(function () { reiniciarBtn.disabled = false; });
    });
  }

  /* --- arranque --------------------------------------------------------------
     Con ?mock se carga un backend falso (mock.js) antes de pedir el estado.
     Sin él, mock.js ni se descarga. */
  pintarCargando();
  if (params.has('mock')) {
    var s = document.createElement('script');
    s.src = 'mock.js';
    s.onload = function () { cargarEstado(false); };
    document.head.appendChild(s);
  } else {
    cargarEstado(false);
  }
})();
