(() => {
  /* ---- Carrusel ---- */
  const pista = document.getElementById('pista');
  const fotos = [...pista.children];
  const ant = document.getElementById('ant');
  const sig = document.getElementById('sig');
  const puntos = document.getElementById('puntos');
  const dots = fotos.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'punto';
    b.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
    b.addEventListener('click', () => ir(i));
    puntos.append(b);
    return b;
  });
  const ir = (i) => {
    i = Math.max(0, Math.min(fotos.length - 1, i));
    pista.scrollTo({ left: i * pista.clientWidth });
  };
  const actual = () => Math.round(pista.scrollLeft / pista.clientWidth);
  function pintar() {
    const i = Math.max(0, Math.min(fotos.length - 1, actual()));
    dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    ant.disabled = i === 0;
    sig.disabled = i === fotos.length - 1;
  }
  ant.addEventListener('click', () => ir(actual() - 1));
  sig.addEventListener('click', () => ir(actual() + 1));
  let raf = 0;
  pista.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pintar); }, { passive: true });
  pista.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { ir(actual() + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { ir(actual() - 1); e.preventDefault(); }
  });
  pintar();

  /* ---- Tarjeta eShop ---- */
  const eshop = document.getElementById('eshop');
  const tarjeta = document.getElementById('miTarjeta');
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animacionTerminada = sinMovimiento; // sin animación: se puede voltear ya

  // La animación arranca al entrar en pantalla, no al cargar.
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) {
      eshop.classList.add('activa');
      io.disconnect();
    }
  }, { threshold: 0.6 });
  io.observe(document.getElementById('escena'));

  tarjeta.addEventListener('animationend', (evento) => {
    if (evento.animationName === 'giroRevelacion') {
      tarjeta.style.transition = 'none';
      tarjeta.style.animation = 'none';
      void tarjeta.offsetWidth;
      tarjeta.style.transition = '';
      animacionTerminada = true;
    }
  });

  tarjeta.addEventListener('click', () => {
    if (!animacionTerminada) return;
    const v = tarjeta.classList.toggle('volteada');
    tarjeta.setAttribute('aria-pressed', v);
  });
})();
