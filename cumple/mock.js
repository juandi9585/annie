/* Backend falso, para desarrollar sin Apps Script, sin Gemini y sin gastar
 * nada. Sólo se carga con ?mock en la URL; en producción ni se descarga.
 *
 * Implementa el mismo contrato en memoria (se pierde al recargar):
 *  · 4 misiones; la primera abierta, las demás bloqueadas hasta que esté hecha.
 *  · validar rechaza el intento 1 y aprueba a partir del 2.
 *  · tras la 4.ª devuelve `final`.
 *
 *  · La 3.ª es la del corazón: trae `mitad` (al aprobarla, 'izquierda').
 *
 * Extras: &lento     → validar tarda 14 s (para ver el revelado largo).
 *         &falla     → el primer validar de la sesión devuelve {error}.
 *         &sinmitad  → final.mitad = null (Juan aún no subió su mitad).
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var ESPERA_VALIDAR = params.has('lento') ? 14000 : 3500;
  var fallar = params.has('falla');
  var CORAZON = 'm3';

  var MISIONES = [
    { id: 'm1', titulo: 'La primera', camara: 'user',
      instruccion: 'Hazte una foto sonriendo con lo primero que te llegue hoy.' },
    { id: 'm2', titulo: 'La segunda', camara: 'environment',
      instruccion: 'Una foto de lo que acaba de llegar, bien de cerca.' },
    { id: 'm3', titulo: 'Medio corazón', camara: 'user', guia: 'mitad',
      instruccion: 'Haz medio corazón con una mano, justo en la guía de la cámara. La otra mitad la pongo yo.' },
    { id: 'm4', titulo: 'La última', camara: 'environment',
      instruccion: 'Enséñame dónde lo vas a poner.' }
  ];

  var hechas = {};

  function todas() { return MISIONES.every(function (m) { return hechas[m.id]; }); }

  function final() {
    return {
      titulo: '¡Feliz cumpleaños, mi amor!',
      mensaje: [
        'Lo completaste todo. Cada foto me llegó y me alegró el día desde aquí.',
        'Este es un texto de ejemplo del mock: el de verdad lo escribe Juan en el backend.'
      ],
      foto: '../assets/fotos/09-juntos.webp',   // cualquier foto; el backend manda un dataURL
      mitad: params.has('sinmitad') ? null : '../assets/fotos/07-noche.webp'
    };
  }

  function estado() {
    return {
      misiones: MISIONES.map(function (m, i) {
        var h = hechas[m.id];
        var r = { id: m.id, titulo: m.titulo, instruccion: m.instruccion, camara: m.camara, guia: m.guia,
                  bloqueada: i > 0 && !hechas.m1, hecha: !!h };
        if (h) { r.foto = h.foto; r.comentario = h.comentario; }
        if (m.id === CORAZON) r.mitad = h ? h.mitad : null;
        return r;
      }),
      final: todas() ? final() : null
    };
  }

  function validar(req) {
    if (fallar) { fallar = false; return { error: 'Error simulado del mock (&falla).' }; }
    if (req.intento < 2) {
      return { cumple: false, final: null,
               comentario: 'Mmm, no veo bien lo que te pedí. Acércate un poco más y que se vea claro, porfa.' };
    }
    hechas[req.mision] = { foto: req.foto,
                           comentario: 'Esa sí. Me encantó cómo te quedó, estás preciosa.' };
    var r = { cumple: true, comentario: hechas[req.mision].comentario, final: todas() ? final() : null };
    if (req.mision === CORAZON) r.mitad = hechas[req.mision].mitad = 'izquierda';
    return r;
  }

  window.BACKEND_MOCK = function (req) {
    var r;
    if (req.accion === 'estado') r = estado();
    else if (req.accion === 'validar') r = validar(req);
    else if (req.accion === 'reiniciar') { hechas = {}; r = { ok: true }; }
    else r = { error: 'accion desconocida' };
    return new Promise(function (ok) {
      setTimeout(function () { ok(JSON.parse(JSON.stringify(r))); },
                 req.accion === 'validar' ? ESPERA_VALIDAR : 600);
    });
  };
})();
