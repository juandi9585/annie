/* El sonido del Annieversario. Todo se sintetiza aquí con Web Audio: no hay
   archivos de audio, ni música de los juegos, ni nada que pueda dejar de
   existir. Suena con el primer toque de Annie (Safari no deja antes) y el
   botón de la esquina lo silencia; la elección se recuerda.

   app.js lo usa a través de window.SONIDO; si el navegador no tiene Web
   Audio, todo son funciones vacías y la página sigue igual. */
(() => {
  'use strict';

  const CLAVE = 'annieversario:sonido';
  let quiere = true;
  try { quiere = localStorage.getItem(CLAVE) !== 'no'; } catch (e) { /* sin memoria: suena */ }

  let ctx = null, salida = null, seco = null, sala = null, ruido = null;
  let fondoActual = null, temaFondo = 'noche';

  // ── notas ──────────────────────────────────────────────────────────────
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  // pentatónica de Fa: las estrellas, la celesta y los arpegios salen de aquí
  const PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91];
  const ACORDES = [ // Fa maj7 · Re m9 · Si♭ maj7 · Do sus
    [53, 60, 64, 69], [50, 57, 62, 65, 69], [46, 58, 62, 65, 69], [48, 55, 60, 65, 67],
  ];

  // ── la mesa de mezclas ─────────────────────────────────────────────────
  function arrancar() {
    if (!quiere) return;
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // en iPhone, que suene aunque el teléfono esté en silencio: lo pidió con su toque
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* no pasa nada */ }
    ctx = new AC();
    salida = ctx.createGain();
    salida.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    salida.connect(comp).connect(ctx.destination);
    salida.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2.5);

    seco = ctx.createGain(); seco.connect(salida);
    // la sala: una reverberación hecha de ruido que se apaga
    const largo = Math.round(ctx.sampleRate * 4.6), imp = ctx.createBuffer(2, largo, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = imp.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2.6);
    }
    sala = ctx.createConvolver(); sala.buffer = imp;
    const humedo = ctx.createGain(); humedo.gain.value = 0.55;
    sala.connect(humedo).connect(salida);

    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const r = ruido.getChannelData(0);
    for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;

    ctx.onstatechange = () => { if (ctx.state === 'running' && quiere && !fondoActual) fondo(temaFondo); };
    if (ctx.state !== 'running') ctx.resume();
    fondo(temaFondo);
  }
  addEventListener('pointerdown', arrancar, true);
  addEventListener('keydown', arrancar, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (quiere) ctx.resume();
  });

  const listo = () => ctx && quiere && ctx.state === 'running';
  const ahora = () => ctx.currentTime + 0.01;

  // envía un nodo a la mezcla: parte seca y parte a la sala
  function mandar(nodo, reverb = 0.3) {
    const s = ctx.createGain(); s.gain.value = 1 - reverb * 0.5; nodo.connect(s).connect(seco);
    const h = ctx.createGain(); h.gain.value = reverb; nodo.connect(h).connect(sala);
  }

  // una nota con sus parciales y su envolvente
  function nota(midi, t, o = {}) {
    const { tipo = 'sine', dur = 1.6, vol = 0.12, ataque = 0.006, parciales = [[1, 1]], reverb = 0.4, filtro = 0 } = o;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + ataque);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let destino = env;
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro; env.connect(f); destino = f; }
    for (const [mult, v] of parciales) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = tipo; osc.frequency.value = hz(midi) * mult; g.gain.value = v;
      osc.connect(g).connect(env);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    mandar(destino, reverb);
  }

  // un golpe de ruido filtrado (bloques, nubes, madera)
  function soplo(t, o = {}) {
    const { dur = 0.1, vol = 0.2, tipo = 'lowpass', desde = 600, hasta = desde, q = 0.7, ataque = 0.004, reverb = 0.15 } = o;
    const src = ctx.createBufferSource(); src.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = q;
    f.frequency.setValueAtTime(desde, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, hasta), t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + ataque);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(env);
    mandar(env, reverb);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // un tono que cae (el «tok» de la madera, el golpe sordo de un bloque)
  function caida(t, desde, hasta, dur, vol, tipo = 'sine') {
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(desde, t);
    osc.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env); mandar(env, 0.12);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // ── los instrumentos ───────────────────────────────────────────────────
  const celesta = (m, t, vol = 0.1) => nota(m, t, { dur: 2.4, vol, parciales: [[1, 1], [2, 0.32], [3, 0.1], [4.2, 0.05]], reverb: 0.7 });
  const piano = (m, t, vol = 0.09) => nota(m, t, { tipo: 'triangle', dur: 3.6, vol, ataque: 0.004, parciales: [[1, 1], [2, 0.22], [3, 0.06]], reverb: 0.6, filtro: 2400 });
  const cajita = (m, t, vol = 0.07) => nota(m, t, { dur: 1.4, vol, parciales: [[1, 1], [3, 0.28], [5.4, 0.08]], reverb: 0.45 });
  const marimba = (m, t, vol = 0.1) => nota(m, t, { dur: 0.6, vol, ataque: 0.003, parciales: [[1, 1], [4, 0.14], [9.8, 0.03]], reverb: 0.25 });
  // campana de cristal: una síntesis FM cuyo brillo se apaga antes que la nota
  function campana(m, t, vol = 0.035, dur = 4.5) {
    const f = hz(m);
    const portadora = ctx.createOscillator(), moduladora = ctx.createOscillator();
    const indice = ctx.createGain(), env = ctx.createGain();
    portadora.frequency.value = f;
    moduladora.frequency.value = f * 3.5;
    indice.gain.setValueAtTime(f * 1.6, t);
    indice.gain.exponentialRampToValueAtTime(f * 0.02, t + 1.4);
    moduladora.connect(indice).connect(portadora.frequency);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    portadora.connect(env); mandar(env, 0.85);
    portadora.start(t); moduladora.start(t);
    portadora.stop(t + dur + 0.05); moduladora.stop(t + dur + 0.05);
  }
  const blip = (m, t, vol = 0.035) => nota(m, t, { tipo: 'square', dur: 0.08, vol, ataque: 0.002, reverb: 0.05, filtro: 3200 });

  // ── los fondos: lo que suena mientras estás en un sitio ────────────────
  // Cada fondo es un bucle que programa notas un poco por delante del reloj.
  function bucle(paso, cada) {
    let vivo = true, siguiente = ctx.currentTime + 0.3, n = 0;
    const tic = () => {
      if (!vivo) return;
      while (siguiente < ctx.currentTime + 0.6) { const d = paso(siguiente, n++); siguiente += d || cada; }
      setTimeout(tic, 150);
    };
    tic();
    return () => { vivo = false; };
  }

  const FONDOS = {
    // la noche: un colchón de ondas puras que respira, un brillo agudo con
    // vibrato y campanas de cristal que suben y bajan sobre cada acorde
    noche() {
      const voces = [];
      const voz = (m, t, vol, o = {}) => {
        const { octava = 0, vibrato = 0, temblor = 0.25 } = o;
        const osc = ctx.createOscillator(), env = ctx.createGain(), f = ctx.createBiquadFilter();
        osc.type = 'sine'; osc.frequency.value = hz(m + octava);
        if (vibrato) {
          const lfo = ctx.createOscillator(), prof = ctx.createGain();
          lfo.frequency.value = 4.5 + Math.random(); prof.gain.value = vibrato;
          lfo.connect(prof).connect(osc.detune); lfo.start(t); lfo.stop(t + 8.8);
        }
        // la respiración: el volumen sube y baja muy despacio
        const resp = ctx.createOscillator(), hondo = ctx.createGain();
        resp.frequency.value = 0.15 + Math.random() * 0.2; hondo.gain.value = vol * temblor;
        resp.connect(hondo).connect(env.gain); resp.start(t); resp.stop(t + 8.8);
        f.type = 'lowpass'; f.frequency.value = 2200;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vol, t + 3);
        env.gain.setValueAtTime(vol, t + 5.4);
        env.gain.linearRampToValueAtTime(0, t + 8.6);
        osc.connect(f).connect(env); mandar(env, 0.75);
        osc.start(t); osc.stop(t + 8.8);
        voces.push(env);
      };
      const parar = bucle((t, n) => {
        const acorde = ACORDES[n % ACORDES.length];
        for (const m of acorde) {
          voz(m, t, 0.018);
          voz(m, t, 0.004, { octava: 24, vibrato: 9, temblor: 0.6 });
        }
        // el arpegio de cristal: sube por el acorde y vuelve a bajar
        const altas = acorde.slice(1).map((m) => m + 24);
        const camino = [...altas, ...altas.slice(0, -1).reverse()];
        camino.forEach((m, k) => campana(m, t + 0.4 + k * (5.2 / camino.length), 0.03));
        return 6;
      }, 6);
      return () => { parar(); voces.splice(0).forEach((g) => { try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); } catch (e) { /* ya acabó */ } }); };
    },
    // Minecraft: notas de piano sueltas, sin prisa, con mucho silencio
    minecraft() {
      const escala = [62, 64, 66, 69, 71, 74, 76, 78, 81];
      return bucle((t) => {
        const m = escala[Math.floor(Math.random() * escala.length)];
        piano(m, t);
        if (Math.random() < 0.35) piano(m - 12, t + 0.02, 0.06);
        if (Math.random() < 0.25) piano(escala[Math.floor(Math.random() * escala.length)], t + 0.45, 0.05);
        return 1.6 + Math.random() * 2.2;
      }, 2);
    },
    // Clash: un motivo alegre de marimba que va y viene
    clash() {
      const motivo = [[67, 71, 74], [69, 72, 76], [67, 71, 74], [66, 69, 74]];
      return bucle((t, n) => {
        const a = motivo[n % motivo.length];
        a.forEach((m, k) => marimba(m, t + k * 0.16, 0.07));
        marimba(a[0] - 12, t, 0.06);
        return 2.4;
      }, 2.4);
    },
    // Stardew: una nana de cajita de música
    stardew() {
      const nana = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 77, 74];
      return bucle((t, n) => {
        cajita(nana[n % nana.length], t);
        if (n % 4 === 0) nota(48 + [0, 5, 0, 7][(n / 4) % 4], t, { tipo: 'triangle', dur: 1.8, vol: 0.05, reverb: 0.3 });
        return 0.5;
      }, 0.5);
    },
    // el final: el mismo órgano de la noche, más lleno, y la celesta cayendo
    final() {
      const parar = FONDOS.noche();
      const cascada = bucle((t) => {
        const base = Math.floor(Math.random() * 4);
        for (let k = 0; k < 4; k++) campana(PENTA[base + 7 - k] + 12, t + k * 0.24, 0.03);
        return 4 + Math.random() * 2;
      }, 5);
      return () => { parar(); cascada(); };
    },
  };

  function fondo(tema) {
    temaFondo = FONDOS[tema] ? tema : 'noche';
    if (!listo()) return;
    if (fondoActual) fondoActual();
    fondoActual = FONDOS[temaFondo]();
  }

  // ── los efectos ────────────────────────────────────────────────────────
  const API = {
    // tocar una estrella: su nota de celesta
    toque(i) {
      if (!listo()) return;
      celesta(PENTA[i % PENTA.length], ahora(), 0.13);
    },

    // el telón de cada universo, al cubrir y al abrir
    telon(tema, fase, info = 0) {
      if (!listo()) return;
      const t = ahora();
      if (tema === 'minecraft') {
        // bloques que se colocan: golpes sordos repartidos por la ola
        const n = 12, tramo = (info || 500) / 1000;
        for (let k = 0; k < n; k++) {
          const tk = t + (k / n) * tramo + Math.random() * 0.03;
          soplo(tk, { dur: 0.09, vol: fase === 'cubre' ? 0.22 : 0.1, desde: 900, hasta: 300, reverb: 0.1 });
          caida(tk, 140 + Math.random() * 40, 70, 0.09, fase === 'cubre' ? 0.14 : 0.08);
        }
      } else if (tema === 'clash') {
        // las nubes: un soplo que crece y pasa
        soplo(t, { dur: 1.1, vol: 0.16, tipo: 'bandpass', desde: 260, hasta: 1500, q: 0.6, ataque: 0.5, reverb: 0.3 });
        if (fase === 'abre') {
          // el panel que rebota: madera y una fanfarria pequeña
          const p = t + 0.6;
          caida(p, 520, 200, 0.09, 0.2);
          [72, 76, 79, 84].forEach((m, k) => nota(m, p + 0.08 + k * 0.09, { tipo: 'square', dur: 0.32, vol: 0.035, filtro: 1800, reverb: 0.3 }));
        }
      } else if (tema === 'stardew') {
        if (fase === 'vuelve') return;
        if (fase === 'abre') [76, 79, 84, 79, 88].forEach((m, k) => blip(m, t + 0.35 + k * 0.07));
        else [84, 79, 76].forEach((m, k) => blip(m, t + k * 0.08, 0.03));
      } else {
        // la noche: la estrella se abre en un glissando de celesta
        const notas = fase === 'abre' ? [69, 72, 74, 77, 81, 84] : [84, 81, 77, 74, 72];
        notas.forEach((m, k) => celesta(m, t + k * 0.09, 0.07));
      }
    },

    // pasar de foto
    pasar(tema) {
      if (!listo()) return;
      const t = ahora();
      if (tema === 'minecraft') { soplo(t, { dur: 0.04, vol: 0.12, tipo: 'highpass', desde: 2500, reverb: 0 }); caida(t, 900, 700, 0.03, 0.05, 'square'); }
      else if (tema === 'clash') caida(t, 480, 220, 0.08, 0.16);
      else if (tema === 'stardew') blip(84, t, 0.04);
      else celesta(PENTA[6 + Math.floor(Math.random() * 4)], t, 0.07);
    },

    // al volver al cielo: las estrellas recién vistas se encienden cantando
    encender(indices) {
      if (!listo() || !indices.length) return;
      const t = ahora() + 0.25;
      indices.forEach((i, k) => celesta(PENTA[i % PENTA.length] + 12, t + k * 0.16, 0.08));
    },

    // las constelaciones se unen hacia la luna
    unir() {
      if (!listo()) return;
      const t = ahora() + 0.9;
      PENTA.forEach((m, k) => celesta(m, t + k * 0.14, 0.06));
    },

    // la luna: un acorde que crece mientras baja la cámara y resuelve
    // justo cuando se pinta «Feliz Annieversario»
    final() {
      if (!listo()) { temaFondo = 'final'; return; }
      if (fondoActual) fondoActual();
      fondoActual = null;
      const t = ahora();
      const sube = [41, 53, 57, 60, 64, 69];
      for (const m of sube) {
        for (const d of [-6, 6]) {
          const osc = ctx.createOscillator(), env = ctx.createGain(), f = ctx.createBiquadFilter();
          osc.type = 'sawtooth'; osc.frequency.value = hz(m); osc.detune.value = d;
          f.type = 'lowpass';
          f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 4.2);
          env.gain.setValueAtTime(0, t);
          env.gain.linearRampToValueAtTime(0.022, t + 4.2);
          env.gain.linearRampToValueAtTime(0.012, t + 7);
          env.gain.linearRampToValueAtTime(0, t + 10);
          osc.connect(f).connect(env); mandar(env, 0.55);
          osc.start(t); osc.stop(t + 10.2);
        }
      }
      // la resolución: cuando aparece el título
      [65, 69, 72, 77, 81, 84, 89].forEach((m, k) => celesta(m, t + 4.2 + k * 0.12, 0.09));
      setTimeout(() => { if (listo() && temaFondo === 'final') { if (fondoActual) fondoActual(); fondoActual = FONDOS.final(); } }, 6500);
      temaFondo = 'final';
    },

    fondo,
    // para comprobarlo desde la consola
    estado: () => (ctx ? ctx.state : 'sin empezar') + (quiere ? '' : ' (silenciado)'),
  };

  // ── el botón: silenciar o volver a oír ─────────────────────────────────
  const boton = document.getElementById('sonido');
  const pintarBoton = () => {
    if (!boton) return;
    boton.setAttribute('aria-pressed', String(quiere));
    boton.setAttribute('aria-label', quiere ? 'Silenciar el sonido' : 'Activar el sonido');
  };
  if (boton) {
    boton.addEventListener('click', () => {
      quiere = !quiere;
      try { localStorage.setItem(CLAVE, quiere ? 'si' : 'no'); } catch (e) { /* da igual */ }
      pintarBoton();
      if (quiere) {
        arrancar();
        if (ctx) {
          salida.gain.cancelScheduledValues(ctx.currentTime);
          salida.gain.setTargetAtTime(0.85, ctx.currentTime, 0.3);
          fondo(temaFondo);
        }
      } else if (ctx) {
        salida.gain.cancelScheduledValues(ctx.currentTime);
        salida.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
        if (fondoActual) { fondoActual(); fondoActual = null; }
        setTimeout(() => { if (!quiere) ctx.suspend(); }, 500);
      }
    });
    pintarBoton();
  }

  window.SONIDO = API;
})();
