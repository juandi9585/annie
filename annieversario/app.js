/* Together in every universe — el cuadro, las constelaciones y los universos.
   Sin dependencias. Todo lo que se pinta sale de una semilla: el cuadro es el
   mismo cada vez que Annie vuelve. */
(() => {
  'use strict';

  const DATOS = JSON.parse(document.getElementById('universos').textContent);
  // el sonido (sonido.js); sin él, todo sigue igual en silencio
  const S = window.SONIDO || new Proxy({}, { get: () => () => {} });
  const TEMAS = new Set(['minecraft', 'clash', 'stardew']); // el resto: la noche
  const MOVIMIENTO = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLAVE = 'annieversario:vistas';

  const $ = (id) => document.getElementById(id);
  const lienzo = $('cuadro');
  const ctx = lienzo.getContext('2d');
  const cielo = $('cielo');
  const capaEstrellas = $('estrellas');
  const trazos = $('trazos');
  const luna = $('luna');
  const pista = $('pista');
  const universo = $('universo');
  const telon = $('telon');
  const final = $('final');

  // ── azar con semilla ───────────────────────────────────────────────────
  function azar(texto) {
    let h = 1779033703 ^ texto.length;
    for (let i = 0; i < texto.length; i++) {
      h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }
  const entre = (r, a, b) => a + r() * (b - a);
  const elige = (r, lista) => lista[Math.floor(r() * lista.length)];

  // ruido de valor suave (para que el color del cielo forme masas, no sal)
  const RUIDO = (() => {
    const r = azar('ruido'), n = 64, t = new Float32Array(n * n);
    for (let i = 0; i < t.length; i++) t[i] = r();
    const s = (k) => k * k * (3 - 2 * k);
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
      const v = (a, b) => t[((b & 63) * n) + (a & 63)];
      const a = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * fx;
      const b = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * fx;
      return a + (b - a) * fy;
    };
  })();

  // ── las fotos, aplanadas: cada una es una estrella ─────────────────────
  const ESTRELLAS = [];
  DATOS.universos.forEach((u, iu) => u.fotos.forEach((foto, ifoto) =>
    ESTRELLAS.push({ iu, ifoto, foto, clave: u.id + '/' + foto })));

  let vistas = new Set();
  try { vistas = new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')); } catch (e) { /* sin memoria: empieza de cero */ }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify([...vistas])); } catch (e) { /* da igual */ } };
  const completo = () => ESTRELLAS.every((s) => vistas.has(s.clave));

  // ── geometría del cuadro ───────────────────────────────────────────────
  let W = 0, H = 0, M = 0, DPR = 1, ESC = 1, VERTICAL = true;
  let HORIZONTE = 0, LUNA = null, CIPRES = null, REMOLINOS = [], VORTICES = [], ETIQUETAS = [], CASA = null;

  function suelo(x) {
    return HORIZONTE + Math.sin((x / W) * Math.PI * 1.6 + 1) * H * 0.022 + Math.sin(x / W * 11) * H * 0.006;
  }

  function medir() {
    W = innerWidth; H = innerHeight; M = Math.min(W, H);
    VERTICAL = H >= W;
    DPR = Math.min(devicePixelRatio || 1, 2);
    ESC = Math.max(0.8, Math.min(1.5, M / 420));
    HORIZONTE = H * (VERTICAL ? 0.76 : 0.74);
    LUNA = { x: W * (VERTICAL ? 0.8 : 0.88), y: H * (VERTICAL ? 0.225 : 0.2), r: M * (VERTICAL ? 0.07 : 0.075) };
    // la luna nunca roza el título: en pantallas bajas, baja con él
    if (VERTICAL) LUNA.y = Math.max(LUNA.y, $('titulo').getBoundingClientRect().bottom + LUNA.r * 2);
    CIPRES = {
      x: W * (VERTICAL ? 0.1 : 0.11),
      cima: H * (VERTICAL ? (H < 760 ? 0.5 : 0.4) : 0.16),
      ancho: Math.min(W * (VERTICAL ? 0.17 : 0.1), 160),
    };
    REMOLINOS = [
      { x: W * 0.44, y: H * (VERTICAL ? 0.5 : 0.42), r: M * 0.3, s: -1 },
      { x: W * 0.64, y: H * (VERTICAL ? 0.4 : 0.3), r: M * 0.2, s: 1 },
    ];
  }

  // ── las constelaciones ─────────────────────────────────────────────────
  // Cada universo ocupa un hueco del cielo; sus estrellas caminan desde ahí.
  // en coordenadas de la franja libre: 0 bajo el título, 1 sobre las colinas
  const NOMBRE_MAX = 150; // px: lo más ancho que puede ser el nombre de una constelación
  const HUECOS_V = [[0.3, 0.12], [0.7, 0.3], [0.34, 0.5], [0.72, 0.72], [0.5, 0.92], [0.55, 0.08], [0.2, 0.3]];
  const HUECOS_H = [[0.22, 0.2], [0.46, 0.12], [0.66, 0.5], [0.38, 0.78], [0.86, 0.72], [0.62, 0.92], [0.18, 0.62]];

  function colocar() {
    const huecos = VERTICAL ? HUECOS_V : HUECOS_H;
    const techo = $('titulo').getBoundingClientRect().bottom + 22;
    const pisoPista = H - (pista.offsetHeight + 34);
    const lim = { x0: 24, x1: W - 24, y0: techo, y1: Math.min(HORIZONTE - 30, pisoPista) };
    const banda = Math.max(120, lim.y1 - lim.y0);
    // el paso entre estrellas sale del cielo que queda libre, no del tamaño de la pantalla
    const paso = Math.max(42, Math.min(92, Math.sqrt(((lim.x1 - lim.x0) * banda) / ESTRELLAS.length) * 0.46));
    // entre constelaciones, más aire que dentro de una: así se lee qué estrellas van juntas
    const sep = Math.max(84, paso * 1.9);
    const puestas = [], cajas = [];
    const dentroCipres = (x, y) => x < CIPRES.x + CIPRES.ancho * 0.7 && y > CIPRES.cima - 30;
    const cercaLuna = (x, y) => Math.hypot(x - LUNA.x, y - LUNA.y) < LUNA.r * 2.1 + 24 * ESC;
    const choca = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const enCaja = (x, y, c) => x > c.x0 - 16 && x < c.x1 + 16 && y > c.y0 - 16 && y < c.y1 + 16;
    // la caja del nombre: centrada bajo la estrella más baja
    const caja = (u, pts) => {
      const bajo = Math.max(...pts.map((p) => p[1]));
      // los nombres largos se parten en dos líneas (ver .constelacion: max-width)
      const largo = u.nombre.length * 8.4 * ESC, ancho = Math.min(largo, NOMBRE_MAX), lineas = Math.ceil(largo / NOMBRE_MAX);
      const cx = Math.max(ancho / 2 + 8, Math.min(W - ancho / 2 - 8, pts.reduce((s, p) => s + p[0], 0) / pts.length));
      const top = bajo + 26 * ESC;
      return { x0: cx - ancho / 2, x1: cx + ancho / 2, y0: top - 4, y1: top + 24 * ESC * lineas, cx, top };
    };

    // las constelaciones grandes se colocan primero: las pequeñas caben en cualquier hueco
    const orden = DATOS.universos.map((u, iu) => iu).sort((a, b) => DATOS.universos[b].fotos.length - DATOS.universos[a].fotos.length);
    orden.forEach((iu) => {
      const u = DATOS.universos[iu];
      const propias = ESTRELLAS.filter((s) => s.iu === iu);
      const [hx, hy] = huecos[iu % huecos.length];
      const cx = lim.x0 + hx * (lim.x1 - lim.x0), cy = lim.y0 + hy * banda;
      let mejor = null;
      for (let intento = 0; intento < 260; intento++) {
        const r = azar(u.id + ':' + intento);
        let a = entre(r, 0, Math.PI * 2), x = 0, y = 0;
        const pts = propias.map((_, k) => {
          if (k) { a += entre(r, -1.2, 1.2); x += Math.cos(a) * paso * entre(r, 0.85, 1.1); y += Math.sin(a) * paso * entre(r, 0.85, 1.1); }
          return [x, y];
        });
        const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        // primero cerca de su hueco; si no cabe, en cualquier sitio libre del cielo
        const ox = intento < 50 ? cx + entre(r, -1, 1) * intento * 4 : entre(r, lim.x0, lim.x1);
        const oy = intento < 50 ? cy + entre(r, -1, 1) * intento * 3 : entre(r, lim.y0, lim.y1);
        const fin = pts.map(([px, py]) => [px - mx + ox, py - my + oy]);
        const c = caja(u, fin);
        let fallos = 0;
        for (const [px, py] of fin) {
          if (px < lim.x0 || px > lim.x1 || py < lim.y0 || py > lim.y1) fallos += 3;
          if (dentroCipres(px, py)) fallos += 4;
          if (cercaLuna(px, py)) fallos += 2;
          fallos += puestas.filter((q) => Math.hypot(px - q.x, py - q.y) < sep).length * 3;
          fallos += cajas.filter((k) => k && enCaja(px, py, k)).length * 3;
        }
        if (c.y1 > pisoPista || c.x0 < 4 || c.x1 > W - 4) fallos += 3;
        if (dentroCipres(c.x0, c.y0)) fallos += 3;
        fallos += cajas.filter((k) => k && choca(c, k)).length * 3;
        fallos += puestas.filter((q) => enCaja(q.x, q.y, c)).length * 3;
        const nota = fallos * 1e6 + Math.hypot(ox - cx, oy - cy);
        if (!mejor || nota < mejor.nota) mejor = { fin, c, nota };
        if (!fallos && intento < 50) break;
      }
      mejor.fin.forEach(([x, y], k) => {
        const px = Math.max(lim.x0, Math.min(lim.x1, x)), py = Math.max(lim.y0, Math.min(lim.y1, y));
        propias[k].x = px; propias[k].y = py; puestas.push(propias[k]);
      });
      cajas[iu] = caja(u, propias.map((p) => [p.x, p.y]));
    });

    // la caja de cada nombre de constelación (para que ni la iglesia ni los lazos la crucen)
    ETIQUETAS = cajas;

    VORTICES = [
      ...REMOLINOS,
      { x: LUNA.x, y: LUNA.y, r: LUNA.r * 2.4, s: 1 },
      ...ESTRELLAS.map((s, i) => ({ x: s.x, y: s.y, r: 30 * ESC, s: i % 2 ? 1 : -1 })),
    ];
  }

  // ── el campo de flujo: hacia dónde va cada pincelada ───────────────────
  function campo(x, y) {
    if (y > suelo(x) - 4) return Math.sin(x / W * 7 + y * 0.02) * 0.22 + Math.sin(x * 0.013) * 0.12;
    const a0 = 0.2 * Math.sin(x * 0.011 + y * 0.017) + 0.24 * Math.sin(y * 0.009 - x * 0.004) - 0.04;
    let vx = Math.cos(a0), vy = Math.sin(a0);
    for (const v of VORTICES) {
      const dx = x - v.x, dy = y - v.y, d2 = dx * dx + dy * dy, rr = v.r * v.r;
      if (d2 > rr * 6) continue;
      const w = Math.exp(-d2 / rr), d = Math.sqrt(d2) + 1e-3;
      const tx = (-dy / d) * v.s - (dx / d) * 0.16, ty = (dx / d) * v.s - (dy / d) * 0.16;
      vx = vx * (1 - w) + tx * w; vy = vy * (1 - w) + ty * w;
    }
    return Math.atan2(vy, vx);
  }

  // ── la paleta ──────────────────────────────────────────────────────────
  const CIELO = ['#0a1b45', '#0f285d', '#163874', '#1d4a8e', '#2559a3', '#2f6bb2', '#3f7fbd', '#5a95c9', '#7cb0d6', '#a3c9de', '#cbe0dc', '#e9e7bd'];
  const VERDOSO = ['#0b2440', '#123852', '#1b4d64', '#276474', '#3b7d86', '#5c9a98', '#8cbcb0', '#bcd8c4'];
  const COLINAS = ['#0c1f48', '#12295a', '#183569', '#1f4279', '#27508a', '#335f97', '#4c77a8'];
  const HALO = [
    ['#fffbe6', '#fdf0b4', '#fae38a'],
    ['#f4cf4a', '#efc23e', '#f7dc6f'],
    ['#dbe7c0', '#eef0cf', '#c6dccc'],
    ['#93bde0', '#a9cde5', '#7fb0db'],
  ];
  const HALO_LUNA = [['#f0a530', '#f5bd3e', '#e8922a'], ['#f6d04a', '#f9e07a', '#f2c23c'], ['#f6ecb4', '#e9e6c2', '#fbf3cf'], ['#9cc3df', '#b8d5e2', '#86b3da']];

  function luces() {
    return [
      { x: LUNA.x, y: LUNA.y, R: LUNA.r * 2.1, p: HALO_LUNA },
      ...ESTRELLAS.map((s) => ({ x: s.x, y: s.y, R: 24 * ESC, p: HALO })),
    ];
  }

  function colorCielo(x, y, r, aclarar = 0) {
    for (const l of LUCES) {
      const d = Math.hypot(x - l.x, y - l.y);
      if (d < l.R) {
        const k = Math.min(3, Math.floor((d / l.R) * 4 + (r() - 0.5) * 0.7));
        return elige(r, l.p[Math.max(0, k)]);
      }
    }
    const t = y / HORIZONTE;
    let b = 0.06 + RUIDO(x * 0.007, y * 0.007) * 0.5 + (r() - 0.5) * 0.26;
    for (const v of REMOLINOS) {
      const d = Math.hypot(x - v.x, y - v.y), w = Math.exp(-(d * d) / (v.r * v.r));
      b += w * 0.48 * Math.min(1, d / (v.r * 0.3)) * (0.5 + 0.5 * Math.sin(d / (v.r * 0.11)));
    }
    b += Math.max(0, t - 0.72) * 1.1;
    b += aclarar;
    // vetas verdeazuladas, como en el cuadro
    if (RUIDO(x * 0.004 + 31, y * 0.004 + 17) > 0.62 && r() < 0.6) return VERDOSO[Math.max(0, Math.min(VERDOSO.length - 1, Math.round(b * (VERDOSO.length - 1))))];
    return CIELO[Math.max(0, Math.min(CIELO.length - 1, Math.round(b * (CIELO.length - 1))))];
  }
  let LUCES = [];

  // una pincelada que sigue el campo
  function pincelada(c, x, y, pasos, largo, ancho, color, sentido = 1) {
    c.beginPath();
    c.moveTo(x, y);
    for (let i = 0; i < pasos; i++) {
      const a = campo(x, y);
      x += Math.cos(a) * largo * sentido; y += Math.sin(a) * largo * sentido;
      c.lineTo(x, y);
    }
    c.strokeStyle = color; c.lineWidth = ancho; c.stroke();
  }

  // ── pintar el cuadro (una vez por tamaño) ──────────────────────────────
  const fondo = document.createElement('canvas');

  function pintar() {
    fondo.width = Math.round(W * DPR); fondo.height = Math.round(H * DPR);
    const c = fondo.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const r = azar('noche estrellada');

    // imprimación
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c2154'); g.addColorStop(0.7, '#1f4a8c'); g.addColorStop(1, '#0d2150');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // el cielo
    const n = Math.min(26000, Math.round((W * HORIZONTE) / 26));
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * (HORIZONTE + H * 0.03);
      if (y > suelo(x)) continue;
      pincelada(c, x, y, 3 + Math.floor(r() * 4), entre(r, 3.6, 5.6) * ESC, entre(r, 2.4, 4.4) * ESC, colorCielo(x, y, r));
    }

    // la luna: una medialuna naranja en su halo
    c.save();
    c.translate(LUNA.x, LUNA.y);
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * LUNA.r * 0.62;
      const px = Math.cos(a) * d, py = Math.sin(a) * d;
      const sombra = Math.hypot(px - LUNA.r * 0.32, py + LUNA.r * 0.2) < LUNA.r * 0.5;
      c.beginPath();
      c.arc(0, 0, d, a, a + entre(r, 0.25, 0.6));
      c.strokeStyle = sombra ? elige(r, ['#f6e3a0', '#f3d77e', '#eedc9a']) : elige(r, ['#f0a530', '#f3b43a', '#e98f26', '#f6c447']);
      c.lineWidth = entre(r, 2.4, 4) * ESC; c.stroke();
    }
    c.restore();

    // las colinas
    const nc = Math.round((W * (H - HORIZONTE)) / 22);
    for (let i = 0; i < nc; i++) {
      const x = r() * W, y = suelo(x) + r() * (H - suelo(x));
      const prof = (y - suelo(x)) / (H - HORIZONTE);
      const k = Math.max(0, Math.min(COLINAS.length - 1, Math.round((1 - prof) * 4 + (r() - 0.5) * 3 + RUIDO(x * 0.01, y * 0.01) * 2 - 1)));
      pincelada(c, x, y, 3 + Math.floor(r() * 3), entre(r, 4, 6) * ESC, entre(r, 2.6, 4.2) * ESC, COLINAS[k]);
    }
    // una veta clara en la cresta, como la luz del horizonte
    for (let i = 0; i < W / 3; i++) {
      const x = r() * W, y = suelo(x) + entre(r, -2, 6);
      pincelada(c, x, y, 3, 5 * ESC, 2.4 * ESC, elige(r, ['#4f7fae', '#6b93bb', '#3b689c', '#8aa9c4']));
    }

    pueblo(c, r);
    cipres(c, r);
  }

  function pueblo(c, r) {
    // casas apiñadas en grupos sobre la ladera, con claros entre grupo y grupo
    const fondoValle = H - HORIZONTE;
    const ladera = (x, k) => suelo(x) + fondoValle * (0.3 + k * 0.3) + Math.sin(x / W * 5 + k * 2.3) * fondoValle * 0.07;
    const casas = [];
    for (let k = 0; k < 2; k++) {
      let x = W * 0.1 + entre(r, 0, 30);
      while (x < W) {
        const n = 2 + Math.floor(r() * 5);
        for (let i = 0; i < n && x < W; i++) {
          const w = entre(r, 10, 22) * ESC, h = entre(r, 7, 18) * ESC;
          casas.push({ x, y: ladera(x + w / 2, k) + entre(r, -4, 4) * ESC, w, h, techo: h * entre(r, 0.35, 1) });
          x += w + entre(r, 1, 7) * ESC;
        }
        x += entre(r, 18, 64) * ESC;
      }
    }
    // la iglesia: cuerpo oscuro y una aguja alta y llena
    const aguja = (x) => ({ x: x + 14 * ESC, y: ladera(x, 0) - 90 * ESC });
    const holgura = (x) => {
      const a = aguja(x);
      return Math.min(...ESTRELLAS.map((e) => Math.hypot(e.x - a.x, e.y - a.y)),
        ...ETIQUETAS.map((e) => Math.hypot(Math.max(e.x0 - a.x, 0, a.x - e.x1), Math.max(e.y0 - a.y, 0, a.y - e.y1))));
    };
    const igx = [0.56, 0.68, 0.46, 0.8, 0.36, 0.9].map((k) => W * k).reduce((m, x) => (holgura(x) > holgura(m) ? x : m));
    casas.push({ x: igx, y: ladera(igx, 0) + 4 * ESC, w: 20 * ESC, h: 24 * ESC, techo: 0, iglesia: true });
    // la casa del jardín: la de la primera fila más cerca de su sitio, lejos de la iglesia
    const sitio = W * (VERTICAL ? 0.62 : 0.3);
    // ...y donde su rótulo no choque con un nombre de constelación ni con la pista del centro
    const libre = (k) => !ETIQUETAS.some((e) => k.x + k.w + 40 > e.x0 && k.x - 40 < e.x1 && k.y + 60 > e.y0 && k.y - 50 < e.y1)
      && Math.abs(k.x + k.w / 2 - W / 2) > 120;
    const candidatas = casas.filter((k) => !k.iglesia && k.y < ladera(k.x, 0) + 10 * ESC && Math.abs(k.x - igx) > 70 * ESC && k.x > CIPRES.x + CIPRES.ancho * 0.6)
      .sort((a, b) => Math.abs(a.x - sitio) - Math.abs(b.x - sitio));
    const casa = candidatas.find(libre) || candidatas[0];
    casa.w = 26 * ESC; casa.h = 19 * ESC; casa.techo = 15 * ESC; casa.jardin = true;
    casas.sort((a, b) => a.y - b.y);

    c.lineCap = 'round';
    const muro = ['#1b2b52', '#22355f', '#2a3f6c', '#15234a', '#33497a'];
    const tejado = ['#2b3b5f', '#3a4b70', '#1d2a4c', '#4a5b7c', '#24304d'];
    const triangulo = (x0, y0, x1, x2, cima) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, cima); c.lineTo(x2, y0); c.closePath(); };
    casas.forEach(({ x, y, w, h, techo, iglesia }) => {
      c.fillStyle = iglesia ? '#111c3c' : elige(r, muro);
      c.fillRect(x, y - h, w, h);
      for (let i = 0; i < w / 2.4; i++) {
        const px = x + i * 2.4 + entre(r, -0.6, 0.6);
        c.beginPath(); c.moveTo(px, y); c.lineTo(px + entre(r, -1, 1), y - h);
        c.strokeStyle = iglesia ? elige(r, ['#0e1838', '#18264a', '#1d2d55']) : elige(r, muro); c.lineWidth = 2.6 * ESC; c.stroke();
      }
      if (iglesia) {
        // la torre y su aguja, rellenas a pinceladas verticales
        const tx = x + w * 0.62, tw = 8 * ESC, cima = y - h - 64 * ESC;
        c.fillStyle = '#0d1734'; c.fillRect(tx, y - h - 16 * ESC, tw, 16 * ESC);
        triangulo(tx - 1, y - h - 16 * ESC, tx + tw / 2, tx + tw + 1, cima); c.fill();
        for (let i = 0; i < 14; i++) {
          const px = tx + entre(r, 0, tw);
          c.beginPath(); c.moveTo(px, y - h); c.lineTo(tx + tw / 2 + (px - tx - tw / 2) * 0.2, cima + entre(r, 2, 14) * ESC);
          c.strokeStyle = elige(r, ['#0b1430', '#1a2850', '#22335e']); c.lineWidth = 1.8 * ESC; c.stroke();
        }
        triangulo(x - 2, y - h, x + w * 0.3, x + w * 0.6, y - h - 9 * ESC); c.fillStyle = '#1d2a4c'; c.fill();
        return;
      }
      triangulo(x - 2, y - h, x + w / 2 + entre(r, -2, 2), x + w + 2, y - h - techo);
      c.fillStyle = elige(r, tejado); c.fill();
      for (let i = 0; i < 6; i++) {
        c.beginPath(); c.moveTo(x - 1 + i * 0.8, y - h); c.lineTo(x + w / 2, y - h - techo); c.lineTo(x + w + 1 - i * 0.8, y - h);
        c.strokeStyle = elige(r, tejado); c.lineWidth = 2 * ESC; c.stroke();
      }
      // el contorno, a pincel y roto: unos trozos sí y otros no
      c.strokeStyle = '#0a1430'; c.lineWidth = 1.7 * ESC;
      [[x - 2, y - h, x + w + 2, y - h], [x + w, y - h, x + w, y], [x, y - h, x, y], [x - 2, y - h, x + w / 2, y - h - techo]].forEach(([a, b, d, e]) => {
        if (r() < 0.45) return;
        c.beginPath(); c.moveTo(a, b); c.lineTo(d + entre(r, -1, 1), e); c.stroke();
      });
    });

    // las ventanas encendidas
    c.save();
    c.shadowColor = 'rgba(250, 210, 90, 0.8)'; c.shadowBlur = 8 * ESC;
    casas.forEach((k) => {
      if (k.jardin) {
        // dos ventanas bien encendidas y una puerta con luz
        c.fillStyle = '#f7d35a';
        c.fillRect(k.x + k.w * 0.14, k.y - k.h * 0.72, 4.4 * ESC, 4.4 * ESC);
        c.fillRect(k.x + k.w * 0.68, k.y - k.h * 0.72, 4.4 * ESC, 4.4 * ESC);
        c.fillStyle = '#f0b737';
        c.fillRect(k.x + k.w * 0.42, k.y - k.h * 0.5, 4.6 * ESC, k.h * 0.5);
        return;
      }
      const nv = k.iglesia ? 1 : r() < 0.75 ? 1 + Math.floor(r() * 2) : 0;
      for (let i = 0; i < nv; i++) {
        c.fillStyle = elige(r, ['#f4c542', '#f7d35a', '#f0b737']);
        c.fillRect(k.x + entre(r, 0.15, 0.65) * k.w, k.y - entre(r, 0.35, 0.8) * k.h, 3.4 * ESC, 3.4 * ESC);
      }
    });
    c.restore();

    // las flores delante de la casa del jardín, a toques de pincel
    for (let i = 0; i < 26; i++) {
      const x = casa.x + entre(r, -10, casa.w + 10) * 1, y = casa.y + entre(r, 1, 7) * ESC;
      c.beginPath(); c.moveTo(x, y + 3 * ESC); c.lineTo(x + entre(r, -1, 1), y - 2 * ESC);
      c.strokeStyle = elige(r, ['#2f5a2a', '#3d6b2f', '#4a7a34']); c.lineWidth = 1.6 * ESC; c.stroke();
      c.beginPath(); c.arc(x, y - 2 * ESC, entre(r, 1.3, 2.2) * ESC, 0, Math.PI * 2);
      c.fillStyle = elige(r, ['#f2a7b8', '#f7dc6f', '#e98ab0', '#fbe9a6', '#f4cf4a']); c.fill();
    }
    CASA = { x: casa.x + casa.w / 2, y: casa.y - casa.h / 2 };
  }

  function cipres(c, r) {
    const base = H + 10, alto = base - CIPRES.cima;
    const mitad = (t) => (CIPRES.ancho / 2) * Math.pow(1 - t, 0.62) * (0.78 + 0.22 * Math.sin(t * 22 + 1.3));
    const centro = (t) => CIPRES.x + Math.sin(t * 5.5) * CIPRES.ancho * 0.12 * t;
    const tonos = ['#060d08', '#0a150c', '#0f1d12', '#152616', '#1c2f1b', '#253620', '#2c2814', '#1a2a2c', '#3c4a22'];
    const n = Math.round((CIPRES.ancho * alto) / (9 * ESC));
    for (let i = 0; i < n; i++) {
      const t = Math.pow(r(), 1.15), u = entre(r, -1, 1);
      const x = centro(t) + u * mitad(t), y = base - t * alto;
      const a = -Math.PI / 2 + u * 0.5 * (1 - t * 0.5) + Math.sin(t * 26 + u * 3) * 0.55;
      const l = entre(r, 10, 24) * ESC;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + u * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      c.strokeStyle = elige(r, tonos); c.lineWidth = entre(r, 2.4, 4.6) * ESC; c.stroke();
    }
  }

  // ── el marco de museo, pintado con el mismo pincel (border-image 9-slice) ──
  function marcoPintado() {
    const t = 96, g = 26, s = document.createElement('canvas');
    s.width = s.height = t * 2;
    const c = s.getContext('2d'), r = azar('marco');
    c.scale(2, 2); c.lineCap = 'round';
    // cada lado en su trapecio: las esquinas quedan en inglete, como un marco de verdad
    const lados = [
      [[0, 0], [t, 0], [t - g, g], [g, g]],
      [[t, 0], [t, t], [t - g, t - g], [t - g, g]],
      [[t, t], [0, t], [g, t - g], [t - g, t - g]],
      [[0, t], [0, 0], [g, g], [g, t - g]],
    ];
    // la moldura por bandas, de fuera a dentro: canto oscuro, luz, oro, ocre, filo claro, canto
    const bandas = [[0, 3, ['#4a300b', '#5e3f10']], [3, 8, ['#fbe9a6', '#f7dc6f', '#fff3c4', '#e9c45a']], [8, 15, ['#f4cf4a', '#e7b93a', '#f2c64a', '#d9a73a']],
      [15, 20, ['#c9952c', '#a8741f', '#b98a33', '#8a5f1c']], [20, 23, ['#f7dc6f', '#fbe9a6', '#e7b93a']], [23, 26, ['#3d2a0b', '#5e3f10']]];
    lados.forEach((pts, lado) => {
      c.save();
      c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
      c.fillStyle = '#9d6d1f'; c.fill();
      const horiz = lado % 2 === 0;
      for (const [q0, q1, cols] of bandas) {
        for (let i = 0; i < 150; i++) {
          // pinceladas cortas, un poco torcidas, de grosor y opacidad desiguales
          const p = entre(r, -8, t), q = entre(r, q0, q1), largo = entre(r, 6, 16), ladeo = entre(r, -0.6, 0.6);
          const x = [p, t - q, p, q][lado], y = [q, p, t - q, p][lado];
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + (horiz ? largo : ladeo), y + (horiz ? ladeo : largo));
          c.strokeStyle = elige(r, cols);
          c.globalAlpha = (lado === 1 || lado === 2 ? 0.78 : 0.95) * entre(r, 0.75, 1);
          c.lineWidth = Math.min(q1 - q0 + 0.6, entre(r, 1.4, 3.4)); c.stroke();
        }
      }
      c.restore();
    });
    // el inglete, marcado con un trazo fino
    c.globalAlpha = 0.55; c.strokeStyle = '#4a300b'; c.lineWidth = 0.8;
    [[0, 0, g, g], [t, 0, t - g, g], [t, t, t - g, t - g], [0, t, g, t - g]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
    c.globalAlpha = 1;
    return s.toDataURL();
  }

  // ── las estrellas pintadas, como sellos que giran ──────────────────────
  function sello(encendida) {
    const t = Math.round(84 * ESC * DPR), s = document.createElement('canvas');
    s.width = s.height = t;
    const c = s.getContext('2d'), r = azar(encendida ? 'sello+' : 'sello');
    c.translate(t / 2, t / 2); c.scale(DPR, DPR); c.lineCap = 'round';
    const R = 40 * ESC;
    const anillos = encendida
      ? [['#fffdf0', '#fff6cf'], ['#fae38a', '#f7dc6f'], ['#f4cf4a', '#efc23e'], ['#eef0cf', '#dbe7c0'], ['#a9cde5', '#cfe3ea']]
      : [['#f6f1d4', '#e9ecd6'], ['#d9e3c7', '#e8e6c2'], ['#b8d0de', '#a6c6df'], ['#8db5dc', '#9cc0e3']];
    anillos.forEach((cols, k) => {
      const d0 = (k / anillos.length) * R * (encendida ? 0.95 : 0.7), d1 = ((k + 1) / anillos.length) * R * (encendida ? 0.95 : 0.7);
      const n = 6 + k * 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.6, d = entre(r, d0, d1);
        c.beginPath(); c.arc(0, 0, Math.max(1, d), a, a + entre(r, 0.4, 1.0));
        c.strokeStyle = elige(r, cols); c.globalAlpha = encendida ? 0.95 : 0.85;
        c.lineWidth = (k ? entre(r, 2, 3.4) : 4) * ESC; c.stroke();
      }
    });
    c.globalAlpha = 1;
    c.beginPath(); c.arc(0, 0, (encendida ? 4.2 : 2.8) * ESC, 0, Math.PI * 2);
    c.fillStyle = '#fffef5'; c.fill();
    return s;
  }
  let SELLOS = null, MARCO = null;

  // ── el cielo vivo: pinceladas que corren por encima ───────────────────
  let viento = [];
  function sembrarViento() {
    const r = azar('viento'), n = Math.min(520, Math.round((W * HORIZONTE) / 1700));
    viento = Array.from({ length: n }, () => nueva(r, true));
  }
  function nueva(r, al_azar) {
    const x = Math.random() * W, y = Math.random() * HORIZONTE;
    const max = 140 + Math.random() * 220;
    return { x, y, vida: al_azar ? Math.random() * max : 0, max, color: colorCielo(x, y, Math.random, 0.22), ancho: (2 + Math.random() * 2.2) * ESC };
  }

  let encendiendo = new Map(); // clave -> instante en que se encendió (para el destello)
  let foco = -1;

  function cuadro(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineCap = 'round';

    if (MOVIMIENTO) {
      const vel = 0.42 * ESC;
      for (const p of viento) {
        const a = campo(p.x, p.y);
        p.x += Math.cos(a) * vel; p.y += Math.sin(a) * vel; p.vida++;
        if (p.vida > p.max || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > suelo(p.x)) { Object.assign(p, nueva(null, false)); continue; }
        ctx.globalAlpha = Math.sin((p.vida / p.max) * Math.PI) * 0.6;
        pincelada(ctx, p.x, p.y, 4, 5 * ESC, p.ancho, p.color, -1);
      }
      ctx.globalAlpha = 1;
    }

    // el resplandor de la luna cuando ya se puede tocar
    if (completo()) {
      const pulso = MOVIMIENTO ? 0.5 + 0.5 * Math.sin(t / 700) : 0.7;
      const g = ctx.createRadialGradient(LUNA.x, LUNA.y, LUNA.r * 0.4, LUNA.x, LUNA.y, LUNA.r * (2.6 + pulso * 0.6));
      g.addColorStop(0, `rgba(255, 226, 130, ${0.55 + pulso * 0.25})`);
      g.addColorStop(1, 'rgba(255, 226, 130, 0)');
      ctx.fillStyle = g; ctx.fillRect(LUNA.x - LUNA.r * 4, LUNA.y - LUNA.r * 4, LUNA.r * 8, LUNA.r * 8);
    }

    ESTRELLAS.forEach((s, i) => {
      const vista = vistas.has(s.clave);
      const img = SELLOS[vista ? 1 : 0];
      const desde = encendiendo.get(s.clave);
      const destello = desde ? Math.max(0, 1 - (t - desde) / 1400) : 0;
      const latido = MOVIMIENTO ? Math.sin(t / 900 + i * 1.7) : 0;
      const k = (vista ? 0.62 : 0.5) * (1 + latido * 0.06 + destello * 0.9) * (foco === i ? 1.22 : 1);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((MOVIMIENTO ? t / (6000 + i * 300) : 0) * (i % 2 ? 1 : -1) + i);
      ctx.scale(k, k);
      ctx.drawImage(img, -img.width / DPR / 2, -img.height / DPR / 2, img.width / DPR, img.height / DPR);
      ctx.restore();
    });
  }

  let rafId = 0, quieto = false;
  function bucle(t) {
    cuadro(t);
    if (MOVIMIENTO && !quieto) rafId = requestAnimationFrame(bucle);
    else rafId = 0;
  }
  function despertar() {
    if (!rafId && !document.hidden) rafId = requestAnimationFrame(bucle);
  }
  function dormir(si) { quieto = si; if (!si) despertar(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) despertar(); });

  // ── botones de estrellas y trazos ──────────────────────────────────────
  const SVG = 'http://www.w3.org/2000/svg';
  function cruzaCaja(e, a, b) {
    for (let k = 0.08; k < 0.93; k += 0.04) {
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      if (x > e.x0 && x < e.x1 && y > e.y0 && y < e.y1) return true;
    }
    return false;
  }
  function distSegmento(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function construir() {
    capaEstrellas.textContent = '';
    trazos.textContent = '';
    trazos.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // las líneas se interrumpen bajo los nombres: ningún trazo tacha una palabra
    const mascara = document.createElementNS(SVG, 'mask');
    mascara.id = 'sinNombres';
    mascara.setAttribute('maskUnits', 'userSpaceOnUse');
    const todo = document.createElementNS(SVG, 'rect');
    Object.entries({ x: 0, y: 0, width: W, height: H, fill: '#fff' }).forEach(([k, v]) => todo.setAttribute(k, v));
    mascara.append(todo);
    ETIQUETAS.forEach((e) => {
      const hueco = document.createElementNS(SVG, 'rect');
      Object.entries({ x: e.x0 - 6, y: e.y0, width: e.x1 - e.x0 + 12, height: e.y1 - e.y0, rx: 10, fill: '#000' }).forEach(([k, v]) => hueco.setAttribute(k, v));
      mascara.append(hueco);
    });
    const capa = document.createElementNS(SVG, 'g');
    capa.setAttribute('mask', 'url(#sinNombres)');
    trazos.append(mascara, capa);

    DATOS.universos.forEach((u, iu) => {
      const propias = ESTRELLAS.filter((s) => s.iu === iu);
      for (let k = 1; k < propias.length; k++) {
        const a = propias[k - 1], b = propias[k];
        const l = document.createElementNS(SVG, 'line');
        l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
        l.dataset.a = a.clave; l.dataset.b = b.clave;
        l.style.setProperty('--largo', Math.hypot(b.x - a.x, b.y - a.y));
        capa.append(l);
      }
      // el nombre del universo, bajo su constelación
      const nombre = document.createElement('span');
      nombre.className = 'constelacion';
      nombre.dataset.universo = iu;
      nombre.textContent = u.nombre;
      nombre.style.left = ETIQUETAS[iu].cx + 'px';
      nombre.style.top = ETIQUETAS[iu].top + 'px';
      capaEstrellas.append(nombre);
    });
    // los lazos entre constelaciones, sólo al final: desde la luna, cada
    // constelación se ata a la más cercana que aún esté suelta (sin cruzar el
    // cielo entero). Se dibujan de fuera hacia dentro: el último llega a la luna.
    const grupos = DATOS.universos.map((_, iu) => ESTRELLAS.filter((s) => s.iu === iu));
    const lazos = [];
    const atados = [[{ x: LUNA.x, y: LUNA.y }]];
    const sueltos = grupos.slice();
    while (sueltos.length) {
      let mejor = null;
      for (const g of sueltos) for (const s of g) for (const a of atados) for (const t of a) {
        const d = Math.hypot(s.x - t.x, s.y - t.y);
        if (mejor && d >= mejor.d) continue;
        if (ESTRELLAS.some((e) => e !== s && e !== t && distSegmento(e, s, t) < 26 * ESC)) continue;
        if (ETIQUETAS.some((e) => cruzaCaja(e, s, t))) continue;
        mejor = { d, g, s, t };
      }
      if (!mejor) { // sin camino limpio: el más corto, aunque roce
        for (const g of sueltos) for (const s of g) for (const a of atados) for (const t of a) {
          const d = Math.hypot(s.x - t.x, s.y - t.y);
          if (!mejor || d < mejor.d) mejor = { d, g, s, t };
        }
      }
      lazos.push(mejor);
      atados.push(mejor.g);
      sueltos.splice(sueltos.indexOf(mejor.g), 1);
    }
    lazos.forEach(({ s, t, d }, i) => {
      const l = document.createElementNS(SVG, 'line');
      l.setAttribute('x1', s.x); l.setAttribute('y1', s.y); l.setAttribute('x2', t.x); l.setAttribute('y2', t.y);
      l.classList.add('lazo');
      l.style.setProperty('--largo', d);
      l.style.setProperty('--orden', lazos.length - 1 - i);
      capa.append(l);
    });

    ESTRELLAS.forEach((s, i) => {
      const u = DATOS.universos[s.iu];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'estrella';
      b.style.left = s.x + 'px'; b.style.top = s.y + 'px';
      b.setAttribute('aria-label', `${u.nombre}, foto ${s.ifoto + 1} de ${u.fotos.length}`);
      b.addEventListener('click', () => { if (!ocupado && !abierto) S.toque(i); abrir(s.iu, s.ifoto, s); });
      b.addEventListener('pointerenter', () => { foco = i; despertar(); if (!MOVIMIENTO) cuadro(0); });
      b.addEventListener('pointerleave', () => { foco = -1; if (!MOVIMIENTO) cuadro(0); });
      b.addEventListener('focus', () => { foco = i; if (!MOVIMIENTO) cuadro(0); });
      b.addEventListener('blur', () => { foco = -1; if (!MOVIMIENTO) cuadro(0); });
      s.boton = b;
      capaEstrellas.append(b);
    });

    const jardin = $('jardin');
    jardin.style.left = CASA.x + 'px'; jardin.style.top = CASA.y + 'px';
    luna.style.left = LUNA.x + 'px'; luna.style.top = LUNA.y + 'px';
    luna.style.setProperty('--r', LUNA.r + 'px');
    actualizar(false);
  }

  function actualizar(animar) {
    ESTRELLAS.forEach((s) => s.boton.classList.toggle('estrella--vista', vistas.has(s.clave)));
    trazos.querySelectorAll('line[data-a]').forEach((l) => {
      const on = vistas.has(l.dataset.a) && vistas.has(l.dataset.b);
      if (on && !l.classList.contains('encendida')) l.classList.add('encendida', ...(animar ? ['nueva'] : []));
    });
    capaEstrellas.querySelectorAll('.constelacion').forEach((n) => {
      const iu = +n.dataset.universo;
      n.classList.toggle('constelacion--vista', ESTRELLAS.some((s) => s.iu === iu && vistas.has(s.clave)));
    });
    const listo = completo();
    trazos.classList.toggle('unidos', listo);
    trazos.classList.toggle('unidos--ahora', listo && animar);
    luna.setAttribute('aria-disabled', String(!listo));
    luna.setAttribute('aria-label', listo ? 'La luna: abrir el final' : 'La luna');
    luna.classList.toggle('luna--despierta', listo);
    if (listo) pista.textContent = 'Toca la luna';
    else pista.textContent = vistas.size ? '' : 'Toca una estrella';
    pista.classList.toggle('pista--fuera', !pista.textContent);
    if (!MOVIMIENTO) cuadro(0);
  }

  // ── el telón: cómo se entra en cada universo ───────────────────────────
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

  // texturas pixeladas de Minecraft, hechas aquí mismo (16×16, con semilla)
  function bloque(tipo, semilla) {
    const s = document.createElement('canvas'); s.width = s.height = 16;
    const c = s.getContext('2d'), r = azar(tipo + semilla);
    const tierra = ['#866043', '#79553a', '#5d4130', '#9b7653', '#6c4b34', '#8f6a48'];
    const hierba = ['#5d9b36', '#4c8a2b', '#6eb041', '#58952f', '#3f7a24'];
    const piedra = ['#7f7f7f', '#6d6d6d', '#8f8f8f', '#5f5f5f', '#747474'];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let p = tipo === 'piedra' ? piedra : tierra;
      if (tipo === 'hierba' && (y < 3 || (y < 5 + (r() < 0.5 ? 1 : 0) && r() < 0.55))) p = hierba;
      c.fillStyle = elige(r, p); c.fillRect(x, y, 1, 1);
    }
    return s.toDataURL();
  }
  const TEXTURAS = {};
  function texturas() {
    if (TEXTURAS.tierra) return TEXTURAS;
    TEXTURAS.tierra = bloque('tierra', 1);
    TEXTURAS.hierba = bloque('hierba', 1);
    TEXTURAS.piedra = bloque('piedra', 1);
    TEXTURAS.tierra2 = bloque('tierra', 2);
    document.documentElement.style.setProperty('--mc-tierra', `url(${TEXTURAS.tierra})`);
    document.documentElement.style.setProperty('--mc-piedra', `url(${TEXTURAS.piedra})`);
    return TEXTURAS;
  }

  async function cubrir(tema, origen) {
    telon.className = 'telon';
    telon.textContent = '';
    if (!MOVIMIENTO) { telon.classList.add('telon--fundido'); await espera(10); telon.classList.add('telon--cubre'); await espera(220); return; }

    if (tema === 'minecraft') {
      const tx = texturas(), lado = Math.ceil(Math.max(W, H) / 12);
      const cols = Math.ceil(W / lado), filas = Math.ceil(H / lado);
      telon.classList.add('telon--bloques');
      telon.style.setProperty('--lado', lado + 'px');
      telon.style.setProperty('--cols', cols);
      const r = azar('bloques' + Date.now());
      const frag = document.createDocumentFragment();
      // los bloques se colocan en ola desde la estrella tocada, como al construir
      const oc = origen.x / lado, of = origen.y / lado;
      let ultimo = 0;
      for (let i = 0; i < cols * filas; i++) {
        const d = document.createElement('i');
        const fila = Math.floor(i / cols), col = i % cols;
        const dist = Math.hypot(col + 0.5 - oc, fila + 0.5 - of);
        const retraso = Math.round(dist * 34 + r() * 50);
        ultimo = Math.max(ultimo, retraso);
        d.style.backgroundImage = `url(${fila < filas * 0.25 ? tx.piedra : r() < 0.15 ? tx.hierba : r() < 0.5 ? tx.tierra : tx.tierra2})`;
        d.style.setProperty('--d', retraso + 'ms');
        frag.append(d);
      }
      telon.style.setProperty('--fin', ultimo + 'ms');
      telon.append(frag);
      S.telon('minecraft', 'cubre', ultimo);
      await espera(20);
      telon.classList.add('telon--cubre');
      await espera(ultimo + 260);
    } else if (tema === 'clash') {
      telon.classList.add('telon--nubes');
      telon.innerHTML = '<i class="nube nube--izq"></i><i class="nube nube--der"></i>';
      S.telon('clash', 'cubre');
      await espera(20);
      telon.classList.add('telon--cubre');
      await espera(1000);
    } else if (tema === 'stardew') {
      telon.classList.add('telon--fundido', 'telon--negro');
      S.telon('stardew', 'cubre');
      await espera(20);
      telon.classList.add('telon--cubre');
      await espera(720);
    } else {
      // la noche: la estrella misma se abre (lo hace el universo con clip-path)
      universo.style.setProperty('--ox', origen.x + 'px');
      universo.style.setProperty('--oy', origen.y + 'px');
    }
  }

  async function descubrir(tema, entrando) {
    if (!telon.classList.contains('telon--cubre')) return;
    if (MOVIMIENTO || tema !== 'noche') S.telon(tema, entrando ? 'abre' : 'vuelve', parseInt(telon.style.getPropertyValue('--fin'), 10) || 0);
    if (tema === 'minecraft' && MOVIMIENTO) {
      telon.classList.add('telon--abre');
      await espera(parseInt(telon.style.getPropertyValue('--fin'), 10) + 280);
    } else if (tema === 'clash' && MOVIMIENTO) {
      await espera(160);
      telon.classList.add('telon--abre');
      await espera(1050);
    } else {
      if (tema === 'stardew') await espera(MOVIMIENTO ? 140 : 0);
      telon.classList.remove('telon--cubre');
      await espera(MOVIMIENTO ? 720 : 220);
    }
    telon.className = 'telon';
    telon.textContent = '';
  }

  // ── abrir un universo ──────────────────────────────────────────────────
  const foto = $('universoFoto');
  const ventana = $('universoVentana');
  let abierto = null; // { iu, ifoto, desde }
  let ocupado = false;

  function temaDe(iu) {
    const id = DATOS.universos[iu].id;
    return TEMAS.has(id) ? id : 'noche';
  }

  function mostrar(iu, ifoto) {
    const u = DATOS.universos[iu];
    abierto.iu = iu; abierto.ifoto = ifoto;
    $('universoNombre').textContent = u.nombre;
    const n = u.fotos.length;
    $('universoCuenta').textContent = n > 1 ? `${ifoto + 1} / ${n}` : '';
    universo.classList.toggle('universo--sola', n < 2);
    $('universoAntes').disabled = ifoto === 0;
    $('universoDespues').disabled = ifoto === n - 1;

    // nunca enseñar un instante la foto anterior
    const ruta = 'fotos/' + u.fotos[ifoto];
    foto.style.visibility = 'hidden';
    foto.alt = `${u.nombre}, foto ${ifoto + 1} de ${n}`;
    const lista = () => {
      if (foto.getAttribute('src') !== ruta) return;
      if (foto.naturalWidth) ventana.style.setProperty('--ar', foto.naturalWidth / foto.naturalHeight);
      foto.style.visibility = '';
    };
    foto.onload = lista;
    foto.onerror = () => { if (foto.getAttribute('src') === ruta) foto.style.visibility = ''; };
    if (foto.getAttribute('src') === ruta && foto.complete) lista();
    else foto.setAttribute('src', ruta);

    const s = ESTRELLAS.find((e) => e.iu === iu && e.ifoto === ifoto);
    if (!vistas.has(s.clave)) { vistas.add(s.clave); guardar(); s.nueva = true; }
    // adelantar las siguientes
    u.fotos.forEach((f) => { const i = new Image(); i.src = 'fotos/' + f; });
  }

  async function abrir(iu, ifoto, estrella) {
    if (ocupado || abierto) return;
    ocupado = true;
    const tema = temaDe(iu);
    abierto = { iu, ifoto, desde: estrella };
    universo.dataset.universo = tema;
    if (tema === 'minecraft') texturas();
    mostrar(iu, ifoto);

    await cubrir(tema, estrella);
    cielo.inert = true;
    document.body.dataset.abierto = tema;
    universo.hidden = false;
    universo.classList.remove('universo--cierra');
    if (tema === 'noche' && MOVIMIENTO) {
      universo.classList.add('universo--abre');
      await espera(20);
      universo.classList.add('universo--abierto');
    } else {
      universo.classList.add('universo--abierto');
    }
    dormir(true);
    $('universoSalir').focus({ preventScroll: true });
    universo.classList.add('universo--revela');
    if (tema === 'noche') S.telon('noche', 'abre');
    S.fondo(tema);
    await descubrir(tema, true);
    if (tema === 'noche') await espera(MOVIMIENTO ? 1050 : 0);
    universo.classList.remove('universo--abre');
    ocupado = false;
  }

  async function cerrar() {
    if (ocupado || !abierto) return;
    ocupado = true;
    const tema = universo.dataset.universo;
    const { desde } = abierto;
    if (MOVIMIENTO) {
      universo.classList.add('universo--sale');
      await espera(tema === 'noche' ? 160 : 300);
    }
    if (tema === 'noche') S.telon('noche', 'cubre');
    if (tema === 'noche' && MOVIMIENTO) {
      dormir(false);
      universo.style.setProperty('--ox', desde.x + 'px');
      universo.style.setProperty('--oy', desde.y + 'px');
      universo.classList.add('universo--cierra');
      await espera(900);
    } else {
      await cubrir(tema, desde);
      dormir(false);
    }
    universo.hidden = true;
    delete document.body.dataset.abierto;
    universo.classList.remove('universo--abierto', 'universo--cierra', 'universo--revela', 'universo--sale');
    cielo.inert = false;
    abierto = null;

    const ahora = performance.now(), nuevas = [];
    ESTRELLAS.forEach((s, i) => { if (s.nueva) { encendiendo.set(s.clave, ahora); s.nueva = false; nuevas.push(i); } });
    actualizar(true);
    S.fondo('noche');
    S.encender(nuevas);
    if (nuevas.length && completo()) S.unir();
    if (tema !== 'noche' || !MOVIMIENTO) await descubrir(tema, false);
    if (desde.boton) desde.boton.focus({ preventScroll: true });
    ocupado = false;
  }

  function pasar(d) {
    if (!abierto || ocupado) return;
    const n = DATOS.universos[abierto.iu].fotos.length, sig = abierto.ifoto + d;
    if (sig < 0 || sig >= n) return;
    ventana.classList.remove('universo__ventana--pasa', 'universo__ventana--vuelve');
    void ventana.offsetWidth;
    ventana.classList.add(d > 0 ? 'universo__ventana--pasa' : 'universo__ventana--vuelve');
    S.pasar(universo.dataset.universo);
    mostrar(abierto.iu, sig);
  }

  $('universoSalir').addEventListener('click', cerrar);
  $('universoAntes').addEventListener('click', () => pasar(-1));
  $('universoDespues').addEventListener('click', () => pasar(1));
  document.addEventListener('keydown', (e) => {
    if (abierto) {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight') pasar(1);
      else if (e.key === 'ArrowLeft') pasar(-1);
      else if (e.key === 'Tab') {
        // el foco se queda dentro del universo abierto
        const f = [...universo.querySelectorAll('button:not([disabled])')];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    } else if (!final.hidden && e.key === 'Escape') volver();
  });
  // deslizar sobre la foto
  let toque = null;
  ventana.addEventListener('pointerdown', (e) => { toque = { x: e.clientX, y: e.clientY }; });
  ventana.addEventListener('pointerup', (e) => {
    if (!toque) return;
    const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
    toque = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) pasar(dx < 0 ? 1 : -1);
  });
  ventana.addEventListener('pointercancel', () => { toque = null; });

  // ── la luna y el final ─────────────────────────────────────────────────
  luna.addEventListener('click', () => {
    if (completo()) return abrirFinal();
    // aún no: las estrellas que faltan parpadean
    const ahora = performance.now();
    ESTRELLAS.forEach((s) => { if (!vistas.has(s.clave)) encendiendo.set(s.clave, ahora); });
    luna.classList.remove('luna--aun'); void luna.offsetWidth; luna.classList.add('luna--aun');
    pista.textContent = 'Aún quedan estrellas';
    pista.classList.remove('pista--fuera');
    despertar();
  });

  const fotoFinal = $('finalFoto');
  async function abrirFinal() {
    if (ocupado) return;
    ocupado = true;
    fotoFinal.src = 'fotos/' + DATOS.cierre;
    document.documentElement.style.setProperty('--lx', (LUNA.x / W) * 100 + '%');
    document.documentElement.style.setProperty('--ly', (LUNA.y / H) * 100 + '%');
    document.body.classList.add('hacia-la-luna');
    S.final();
    await espera(MOVIMIENTO ? 1100 : 0);
    final.hidden = false;
    final.scrollTop = 0;
    cielo.inert = true;
    await espera(20);
    document.body.classList.add('al-final');
    await espera(MOVIMIENTO ? 900 : 0);
    dormir(true);
    const t = $('finalTitulo'); t.tabIndex = -1; t.focus({ preventScroll: true });
    ocupado = false;
  }
  async function volver() {
    if (ocupado) return;
    ocupado = true;
    dormir(false);
    document.body.classList.remove('al-final', 'hacia-la-luna');
    S.fondo('noche');
    await espera(MOVIMIENTO ? 900 : 0);
    final.hidden = true;
    cielo.inert = false;
    luna.focus({ preventScroll: true });
    ocupado = false;
  }
  $('finalVolver').addEventListener('click', volver);

  // ── arranque y cambios de tamaño ───────────────────────────────────────
  function montar() {
    medir();
    lienzo.width = Math.round(W * DPR); lienzo.height = Math.round(H * DPR);
    colocar();
    LUCES = luces();
    pintar();
    SELLOS = [sello(false), sello(true)];
    if (!MARCO) { MARCO = marcoPintado(); document.documentElement.style.setProperty('--marco', `url(${MARCO})`); }
    sembrarViento();
    construir();
    cuadro(performance.now());
    despertar();
  }

  let medida = [innerWidth, innerHeight], espera_ = 0;
  addEventListener('resize', () => {
    // la barra de Safari cambia el alto un poco al hacer scroll: eso no repinta
    if (innerWidth === medida[0] && Math.abs(innerHeight - medida[1]) < 140) return;
    clearTimeout(espera_);
    espera_ = setTimeout(() => { medida = [innerWidth, innerHeight]; montar(); }, 180);
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    montar();
    document.body.classList.add('listo');
  });
})();
