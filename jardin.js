/* El jardín digital de Annie.
   Lee la lista de regalos de index.html y siembra una planta por regalo:
   una franja de césped por año, el año más nuevo delante y los demás
   alejándose hacia el horizonte. Las posiciones salen de cada regalo (no de
   Math.random), así que el jardín se ve igual en cada visita. */

(function () {
  'use strict';

  const regalos = JSON.parse(document.getElementById('regalos').textContent)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const loma = document.getElementById('loma');
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Ancho de referencia: el iPhone más estrecho que importa. Las posiciones
  // van en %, así que en pantallas más anchas las plantas sólo se separan más.
  const ANCHO_REF = 320;
  const ALTO_PLANTA = 170;          // px de la franja de delante
  const SEPARACION = 0.8;           // dos plantas vecinas: centros a ≥ 80 % de su ancho
  const PROPORCION = 80 / 140;      // ancho / alto de una planta

  // ── Azar con semilla ───────────────────────────────────────────────────
  function azar(texto) {
    let h = 1779033703 ^ texto.length;
    for (let i = 0; i < texto.length; i++) {
      h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  const entre = (r, a, b) => a + r() * (b - a);

  // ── Las especies (viewBox 0 0 80 140; el tallo nace en 40,140) ─────────
  const HOJAS =
    '<path d="M40 140C41 118 38 96 40 64" stroke="#3f7a3b" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 112C28 104 20 106 14 96C26 92 36 98 40 108Z" fill="#5f9e55"/>' +
    '<path d="M40 100C52 92 60 94 66 84C54 80 44 86 40 96Z" fill="#6aa95e"/>';

  function corona(n, rx, ry, cy, a, b, centro) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += '<ellipse rx="' + rx + '" ry="' + ry + '" cy="' + cy + '" fill="' + (i % 2 ? b : a) +
        '" transform="rotate(' + (360 / n) * i + ')"/>';
    }
    return '<g transform="translate(40 48)">' + s + centro + '</g>';
  }

  const ESPECIES = {
    tulipan:
      '<path d="M26 44C26 66 54 66 54 44L48 52L40 36L32 52Z" fill="#ef9f9a"/>' +
      '<path d="M32 52L40 36L48 52C46 62 34 62 32 52Z" fill="#e3827f"/>',
    flor: corona(6, 9, 17, -14, '#f4cf6e', '#f2c55a', '<circle r="8" fill="#c98f2a"/>'),
    girasol: corona(12, 5, 15, -18, '#f2c14e', '#eab43c',
      '<circle r="12" fill="#7a5230"/><circle r="7" fill="#8f6440"/>'),
    margarita: corona(8, 5, 14, -13, '#ffffff', '#f3f1ea', '<circle r="7" fill="#f2c14e"/>'),
    lavanda:
      '<g fill="#b9a2e0"><ellipse cx="40" cy="22" rx="5" ry="7"/><ellipse cx="34" cy="32" rx="5" ry="7" fill="#a98fd6"/>' +
      '<ellipse cx="46" cy="34" rx="5" ry="7"/><ellipse cx="35" cy="45" rx="5" ry="7"/>' +
      '<ellipse cx="45" cy="48" rx="5" ry="7" fill="#a98fd6"/><ellipse cx="40" cy="58" rx="5" ry="7"/></g>',
    rosa:
      '<circle cx="40" cy="46" r="16" fill="#e98aa0"/><path d="M30 46C30 36 50 36 50 46C46 40 34 40 30 46Z" fill="#d86f88"/>' +
      '<path d="M33 50C36 56 44 56 47 50C44 53 36 53 33 50Z" fill="#d86f88"/><circle cx="40" cy="44" r="5" fill="#c95a75"/>',
    campanilla:
      '<path d="M40 64C40 40 52 30 60 26" stroke="#3f7a3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 32C40 32 38 44 40 52L46 48L50 54L54 48L60 50C62 42 60 32 50 32Z" fill="#8fb6e6"/>' +
      '<path d="M26 40C18 40 16 50 18 56L23 53L26 58L29 53L34 55C36 48 34 40 26 40Z" fill="#a7c6ec"/>' +
      '<path d="M40 64C38 52 30 44 26 40" stroke="#3f7a3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
  };

  function svgPlanta(especie) {
    const flor = ESPECIES[especie] || ESPECIES.tulipan;
    return '<svg viewBox="0 0 80 140" aria-hidden="true" focusable="false">' + HOJAS + flor + '</svg>';
  }

  // ── Fechas ─────────────────────────────────────────────────────────────
  function partes(fecha) {
    const [a, m, d] = fecha.split('-').map(Number);
    return { anio: a, mes: m - 1, dia: d };
  }
  const fechaCorta = (f) => { const p = partes(f); return MESES[p.mes] + ' ' + p.anio; };
  const fechaLarga = (f) => { const p = partes(f); return p.dia + ' de ' + MESES_LARGOS[p.mes] + ' de ' + p.anio; };

  // ── El césped de una franja: una loma suave, distinta en cada año ──────
  function svgCesped(r, color, alto) {
    const y0 = entre(r, 6, 16), y1 = entre(r, 2, 10), y2 = entre(r, 4, 14), y3 = entre(r, 6, 16);
    return '<svg class="franja__cesped" viewBox="0 0 100 ' + alto + '" preserveAspectRatio="none" ' +
      'style="height:' + alto + 'px" aria-hidden="true" focusable="false">' +
      '<path d="M-2 ' + y0 + 'C20 ' + y1 + ' 45 ' + y2 + ' 70 ' + y1 + 'S95 ' + y3 + ' 102 ' + y3 +
      'L102 ' + alto + 'L-2 ' + alto + 'Z" fill="' + color + '"/></svg>';
  }

  // De la franja de delante (d = 0) hacia el horizonte: más pequeña y más azul.
  function mezcla(a, b, t) {
    const ca = a.match(/\w\w/g).map((x) => parseInt(x, 16));
    const cb = b.match(/\w\w/g).map((x) => parseInt(x, 16));
    return 'rgb(' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t)).join(',') + ')';
  }

  // ── Sembrar ────────────────────────────────────────────────────────────
  const porAnio = new Map();
  regalos.forEach((r) => {
    const anio = partes(r.fecha).anio;
    if (!porAnio.has(anio)) porAnio.set(anio, []);
    porAnio.get(anio).push(r);
  });
  const anios = [...porAnio.keys()].sort((a, b) => a - b);
  const masNuevo = regalos[regalos.length - 1];

  // Con muchos años, el jardín deja de apilarse: se vuelve un paisaje con
  // horizonte, y deslizar hacia abajo es caminar hacia atrás en el tiempo.
  const PERSPECTIVA = anios.length > 4;
  const franjas = [];

  anios.forEach((anio, i) => {
    const d = anios.length - 1 - i;                 // distancia al frente
    const escala = PERSPECTIVA ? 1 : Math.max(0.55, 1 - 0.15 * d);
    const lista = porAnio.get(anio);
    const r = azar('franja-' + anio);

    const alto = Math.round(ALTO_PLANTA * escala);
    const ancho = alto * PROPORCION;
    const porFila = Math.max(1, Math.floor((ANCHO_REF - 16) / (ancho * SEPARACION + 18)));
    const filas = Math.ceil(lista.length / porFila);
    // Sólo el año de delante lleva nombre y fecha bajo cada planta; los de
    // atrás son paisaje (su nombre está en la polaroid y para el lector de
    // pantalla). Así las franjas pueden encajarse sin pisar ningún rótulo.
    // (En perspectiva todas llevan rótulos: se encienden en la que está enfocada.)
    const conRotulos = PERSPECTIVA || d === 0;
    const etiqueta = conRotulos ? 44 : 0;
    const paso = conRotulos ? alto + etiqueta : Math.round(alto * 0.5);   // de una fila a la siguiente
    const contenido = 12 + alto + (filas - 1) * paso + etiqueta;
    // La de delante lleva prado de sobra debajo: es el suelo que pisa la página.
    // Las de atrás dejan asomar su propia tira de césped, como terrazas. En
    // perspectiva cada franja lleva prado hasta muy abajo: encogida en el
    // horizonte, su césped tiene que seguir tapando lo que queda detrás.
    const altoFranja = contenido + (PERSPECTIVA ? 1400 : conRotulos ? 120 : Math.round(alto * 0.45));

    const franja = document.createElement('section');
    franja.className = 'franja';
    franja.id = 'anio-' + anio;
    franja.setAttribute('aria-label', String(anio));
    franja.style.height = altoFranja + 'px';
    // Cada franja sube hasta que su césped empieza justo donde acaba el de
    // la de detrás: entre las dos no asoma cielo.
    franja.style.setProperty('--solape', (alto + 6) + 'px');
    franja.style.zIndex = String(i + 1);

    const verde = PERSPECTIVA
      ? mezcla('86bf74', '9fd08e', (d % 2) * 0.5)   // la bruma la pone la distancia, al deslizar
      : mezcla('86bf74', 'b6d6ea', Math.min(0.75, d * 0.2 + (d % 2) * 0.07));   // terrazas vecinas, un punto distintas
    franja.insertAdjacentHTML('beforeend', svgCesped(r, verde, altoFranja - alto + 14));

    const rotulo = document.createElement('p');
    rotulo.className = 'franja__anio';
    rotulo.textContent = anio;
    rotulo.style.color = d === 0 ? 'var(--cesped-dato)' : mezcla('22492a', '355d7a', Math.min(0.6, d * 0.2));
    if (!conRotulos) {           // en la tira de césped que asoma entre esta franja y la siguiente
      rotulo.style.bottom = 'auto';
      rotulo.style.top = (alto + 1) + 'px';
    }
    franja.appendChild(rotulo);

    const ul = document.createElement('ul');
    ul.className = 'franja__plantas';

    lista.forEach((regalo, k) => {
      const fila = Math.floor(k / porFila);
      const enFila = Math.min(porFila, lista.length - fila * porFila);
      const rr = azar(regalo.fecha + regalo.nombre);

      // Cada planta tiene su hueco; el azar sólo la mueve dentro del margen
      // que deja la regla de separación, así nunca se amontonan.
      const hueco = ANCHO_REF / enFila;
      const libre = Math.max(0, hueco - ancho * SEPARACION);
      const desfase = fila % 2 ? hueco * 0.25 : 0;  // filas al tresbolillo
      // …y nunca tan al borde que se corte su nombre (≈ 110 px de rótulo); en
      // las de atrás, sin pisar el año, que va a la izquierda.
      const izq = conRotulos ? 58 : 46 + ancho / 2;
      const der = conRotulos ? 58 : 6 + ancho / 2;
      const centro = Math.min(ANCHO_REF - der, Math.max(izq,
        hueco * ((k % porFila) + 0.5) + desfase + entre(rr, -libre / 2, libre / 2)));
      const altoPlanta = Math.round(alto * entre(rr, 0.92, 1.06));
      const anchoPlanta = Math.round(altoPlanta * PROPORCION);
      const base = 12 + alto + fila * paso + entre(rr, -6, 6) * escala;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'planta' + (regalo === masNuevo ? ' planta--nueva' : '');
      a.href = regalo.enlace;
      a.style.left = 'calc(' + (centro / ANCHO_REF) * 100 + '% - ' + anchoPlanta / 2 + 'px)';
      a.style.top = Math.round(base - altoPlanta) + 'px';
      a.style.width = anchoPlanta + 'px';
      a.style.setProperty('--mece', (rr() > 0.5 ? 3 : -3) + 'deg');
      a.setAttribute('aria-label', regalo.nombre + ', ' + fechaLarga(regalo.fecha));

      const tallo = document.createElement('span');
      tallo.className = 'planta__tallo';
      tallo.style.width = anchoPlanta + 'px';
      tallo.style.height = altoPlanta + 'px';
      tallo.style.rotate = entre(rr, -5, 5).toFixed(1) + 'deg';
      tallo.innerHTML = svgPlanta(regalo.especie);
      a.appendChild(tallo);

      const fecha = document.createElement('span');
      fecha.className = 'planta__fecha';
      fecha.setAttribute('aria-hidden', 'true');
      fecha.textContent = fechaCorta(regalo.fecha);
      const nombre = document.createElement('span');
      nombre.className = 'planta__nombre';
      nombre.setAttribute('aria-hidden', 'true');
      nombre.textContent = regalo.nombre;
      if (conRotulos) a.append(fecha, nombre);

      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        abrir(regalo);
      });

      li.appendChild(a);
      ul.appendChild(li);
    });

    franja.appendChild(ul);
    loma.appendChild(franja);
    franjas.push({ el: franja, d: d, anio: anio, contenido: contenido, alto: alto,
      plantas: ul, cesped: franja.querySelector('.franja__cesped') });
  });

  if (PERSPECTIVA) perspectiva();

  // ── La perspectiva ─────────────────────────────────────────────────────
  // La página se vuelve una escena fija del alto de la pantalla, y el scroll
  // mueve una cámara: en `camara = 0` el año más nuevo está delante; al
  // deslizar, ese año sale por abajo y los anteriores se acercan desde el
  // horizonte. Más allá de unos pocos años, se pierden en la bruma.
  function perspectiva() {
    const pagina = document.querySelector('.pagina');
    const escena = document.createElement('div');
    escena.className = 'escena';
    while (pagina.firstChild) escena.appendChild(pagina.firstChild);
    pagina.appendChild(escena);
    pagina.classList.add('pagina--perspectiva');

    const enfoque = document.createElement('p');      // el año enfocado, abajo a la izquierda
    enfoque.className = 'escena__anio';
    enfoque.setAttribute('aria-hidden', 'true');
    const pista = document.createElement('p');
    pista.className = 'escena__pista';
    pista.textContent = 'Desliza para volver a los años anteriores';
    escena.append(enfoque, pista);

    const VISIBLES = 3;            // años que caben entre el de delante y el horizonte
    const ultimo = franjas.length - 1;
    let paso = 0;

    function medir() {
      paso = Math.round(window.innerHeight * 0.6);
      pagina.style.height = (window.innerHeight + ultimo * paso) + 'px';
      // Un ancla por año: el scroll siempre se detiene con un año enfocado.
      pagina.querySelectorAll('.ancla').forEach((a) => a.remove());
      for (let k = 0; k <= ultimo; k++) {
        const ancla = document.createElement('div');
        ancla.className = 'ancla';
        ancla.style.top = (k * paso) + 'px';
        pagina.appendChild(ancla);
      }
      pintar();
    }

    function pintar() {
      const camara = Math.min(ultimo, Math.max(0, window.scrollY / paso));
      const alto = loma.clientHeight;
      const horizonte = 26;                          // donde la bruma se traga los años lejanos
      franjas.forEach((f) => {
        const rel = f.d - camara;                     // < 0: ya pasó; > 0: hacia el horizonte
        const delante = alto - f.contenido - 64;      // dónde se apoya enfocada (abajo quedan el año y la pista)
        let y, s, opacidad = 1;
        if (rel >= 0) {
          const p = 1 / (1 + 0.85 * rel);
          s = p;
          y = horizonte + (delante - horizonte) * p;
          if (rel > VISIBLES - 0.5) opacidad = Math.max(0, 1 - (rel - (VISIBLES - 0.5)));
        } else {
          s = 1 - rel * 0.25;
          y = delante - rel * alto * 0.9;
          opacidad = Math.max(0, 1 + rel * 1.4);
        }
        const el = f.el;
        // Sólo las plantas se encogen; el césped sigue de lado a lado y baja
        // su borde hasta donde quedan apoyadas.
        el.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
        f.plantas.style.transform = 'scale(' + s.toFixed(4) + ')';
        f.cesped.style.transform = 'translateX(-50%) translateY(' + ((s - 1) * (f.alto - 14)).toFixed(1) + 'px)';
        el.style.zIndex = String(1000 - Math.round(rel * 10));
        el.style.opacity = opacidad.toFixed(3);
        el.style.visibility = opacidad < 0.02 ? 'hidden' : 'visible';
        el.style.filter = rel > 0.05 ? 'saturate(' + (1 - Math.min(0.5, rel * 0.18)).toFixed(2) + ') brightness(' + (1 + Math.min(0.12, rel * 0.04)).toFixed(3) + ')' : 'none';
        el.classList.toggle('franja--enfocada', Math.abs(rel) < 0.5);
        if (Math.abs(rel) < 0.5) enfoque.textContent = f.anio;
      });
      pista.classList.toggle('escena__pista--oculta', camara > 0.15);
    }

    // Quien navega con teclado: enfocar una planta lleva la cámara a su año.
    franjas.forEach((f) => {
      f.el.addEventListener('focusin', () => {
        window.scrollTo({ top: f.d * paso, behavior: 'smooth' });
      });
    });

    let pendiente = false;
    window.addEventListener('scroll', () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; pintar(); });
    }, { passive: true });
    window.addEventListener('resize', medir);
    medir();
  }

  // La loma lejana, azul de bruma, asomando detrás de todo (como en la flor).
  const fondo = loma.lastElementChild;
  if (fondo && !PERSPECTIVA) {
    const lejania = document.createElement('div');
    lejania.className = 'lejania';
    lejania.style.height = (fondo.offsetHeight + 10) + 'px';
    lejania.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path d="M-2 14C18 4 40 6 62 10S90 8 102 4L102 100L-2 100Z" fill="#b6d6ea"/></svg>';
    loma.prepend(lejania);
  }

  // ── La polaroid ────────────────────────────────────────────────────────
  const polaroid = document.getElementById('polaroid');
  const foto = document.getElementById('polaroidFoto');
  const abrirEnlace = document.getElementById('polaroidAbrir');

  function abrir(regalo) {
    document.getElementById('polaroidFecha').textContent = fechaLarga(regalo.fecha);
    document.getElementById('polaroidNombre').textContent = regalo.nombre;
    const frase = document.getElementById('polaroidFrase');
    frase.textContent = regalo.frase || '';
    frase.hidden = !regalo.frase;

    // La polaroid se reutiliza: sin esto, mientras carga la foto nueva se
    // vería un instante la del regalo anterior. El hueco guarda su tamaño.
    foto.hidden = !regalo.foto;
    foto.style.visibility = 'hidden';
    foto.removeAttribute('src');
    if (regalo.foto) {
      foto.alt = 'Foto del regalo ' + regalo.nombre;
      const esta = regalo.foto;
      foto.onload = () => { if (foto.getAttribute('src') === esta) foto.style.visibility = ''; };
      foto.src = esta;
    }

    abrirEnlace.href = regalo.enlace;
    abrirEnlace.onclick = null;
    if (regalo.recuerdo && /^https?:/.test(regalo.enlace)) {
      // Un regalo que vive fuera: si esa web ya no responde, abre su copia de aquí.
      abrirEnlace.onclick = (e) => {
        e.preventDefault();
        const control = new AbortController();
        setTimeout(() => control.abort(), 4000);
        fetch(regalo.enlace, { mode: 'no-cors', signal: control.signal })
          .then(() => { location.href = regalo.enlace; })
          .catch(() => { location.href = regalo.recuerdo; });
      };
    }

    if (typeof polaroid.showModal === 'function') polaroid.showModal();
    else location.href = regalo.enlace;
  }

  // Tocar fuera de la polaroid (en el velo) la cierra; su propio borde de papel no.
  polaroid.addEventListener('click', (e) => {
    if (e.target !== polaroid) return;
    const c = polaroid.getBoundingClientRect();
    const dentro = e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom;
    if (!dentro) polaroid.close();
  });
})();
