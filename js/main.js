/* Adriana Grion | Advogada Previdenciária
   Menu, cabeçalho, WhatsApp flutuante e animações (GSAP + ScrollTrigger).
   Tudo é aprimoramento progressivo: sem JS ou com "reduzir movimento", o conteúdo aparece completo e estático. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function falhou() { root.classList.remove('anim'); }

  try { iniciar(); } catch (e) { if (window.console) console.error(e); falhou(); }

  function iniciar() {
    var ano = document.getElementById('ano');
    if (ano) ano.textContent = new Date().getFullYear();

    cabecalho();
    menuMovel();
    whatsappFlutuante();

    if (!window.gsap || !window.ScrollTrigger) { falhou(); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);

    simbolo();
    if (reduce) return;

    abertura();
    revelacoes();
    faixasDeServicos();
    trilhaDosPassos();
    paralaxeHero();
  }

  /* ---------- Cabeçalho: fundo sólido após rolar ---------- */
  function cabecalho() {
    var topo = document.getElementById('topo');
    var ticking = false;
    function atualizar() {
      topo.classList.toggle('is-solido', window.scrollY > 40);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    atualizar();
  }

  /* ---------- Menu móvel ---------- */
  function menuMovel() {
    var botao = document.querySelector('.burger');
    var painel = document.getElementById('painel-menu');
    if (!botao || !painel) return;

    function abrir(v) {
      painel.classList.toggle('is-aberto', v);
      document.body.classList.toggle('menu-aberto', v);
      botao.setAttribute('aria-expanded', String(v));
      botao.setAttribute('aria-label', v ? 'Fechar menu' : 'Abrir menu');
      if (v) { var a = painel.querySelector('a'); if (a) setTimeout(function () { a.focus({ preventScroll: true }); }, 60); }
    }
    botao.addEventListener('click', function () { abrir(botao.getAttribute('aria-expanded') !== 'true'); });
    painel.addEventListener('click', function (e) { if (e.target.closest('a')) abrir(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && painel.classList.contains('is-aberto')) { abrir(false); botao.focus(); }
    });
    window.matchMedia('(min-width: 1120px)').addEventListener('change', function (m) { if (m.matches) abrir(false); });
    /* Impede que o foco escape para a página atrás do painel aberto */
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-label', 'Menu');
    document.addEventListener('focusin', function (e) {
      if (!painel.classList.contains('is-aberto')) return;
      if (!painel.contains(e.target) && e.target !== botao) { var a = painel.querySelector('a'); if (a) a.focus(); }
    });
  }

  /* ---------- WhatsApp flutuante: aparece depois da primeira dobra ---------- */
  function whatsappFlutuante() {
    var bt = document.querySelector('.flutuante');
    if (!bt) return;
    var ticking = false;
    function atualizar() {
      bt.classList.toggle('is-visivel', window.scrollY > window.innerHeight * 0.55);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    atualizar();
  }

  /* ---------- Símbolo do Direito: rotação suave com volume ----------
     A imagem original é empilhada em camadas com pequeno deslocamento em Z (espessura),
     o conjunto gira em torno do eixo vertical e a luminosidade acompanha o ângulo. */
  function simbolo() {
    var el = document.getElementById('balanca');
    if (!el || reduce) return;
    if (simbolo3D(el)) return;
    simboloEmCamadas(el);
  }

  /* Balança em 3D real (WebGL). Se o navegador não suportar, usa as camadas CSS. */
  function simbolo3D(el) {
    if (!window.Balanca3D || !window.BALANCA_TEX) return false;
    var api = window.Balanca3D.init(el, window.BALANCA_TEX);
    if (!api) return false;

    api.rot = -Math.PI * 0.9; api.scale = .9;
    /* entrada: a placa gira até ficar de frente */
    var entrada = gsap.timeline({ delay: .5 })
      .to(api, { rot: 0, duration: 2.8, ease: 'power3.out' }, 0)
      .to(api, { scale: 1, duration: 2.2, ease: 'power2.out' }, 0);

    /* depois: giro completo com pausa de frente, desacelerando nas pontas */
    var loop = gsap.timeline({ repeat: -1, paused: true })
      .to(api, { rot: '+=' + (Math.PI * 2), duration: 11, ease: 'power2.inOut' })
      .to({}, { duration: 2.2 });
    entrada.eventCallback('onComplete', function () { api.rot = 0; loop.play(0); });

    gsap.to(el, { y: -10, duration: 5, ease: 'sine.inOut', repeat: -1, yoyo: true });

    /* inclinação suave acompanhando o mouse (só com ponteiro fino) */
    var hero = document.getElementById('inicio');
    if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var qx = gsap.quickTo(api, 'tx', { duration: 1.2, ease: 'power3.out' });
      var qy = gsap.quickTo(api, 'ty', { duration: 1.2, ease: 'power3.out' });
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        qx(((e.clientX - r.left) / r.width - .5) * .32);
        qy(((e.clientY - r.top) / r.height - .5) * .22);
      });
      hero.addEventListener('pointerleave', function () { qx(0); qy(0); });
    }

    gsap.ticker.add(function (t) { api.render(performance.now()); });
    ScrollTrigger.create({
      trigger: '#inicio', start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { api.active = self.isActive; }
    });
    el.__api = api;
    return true;
  }

  function simboloEmCamadas(el) {
    var img = el.querySelector('.balanca__img');
    var cena = document.createElement('div');
    cena.className = 'cena';

    var N = 9;
    var profundidade = Math.max(8, el.offsetHeight * 0.018);
    for (var i = 0; i < N; i++) {
      var c = img.cloneNode(false);
      c.removeAttribute('fetchpriority');
      c.className = 'camada' + (i === 0 || i === N - 1 ? '' : ' camada--miolo');
      var z = (i - (N - 1) / 2) * (profundidade / (N - 1));
      c.style.transform = 'translateZ(' + z.toFixed(2) + 'px)';
      cena.appendChild(c);
    }
    img.style.visibility = 'hidden';
    el.appendChild(cena);

    gsap.set(cena, { rotationX: -4, transformPerspective: 1500 });
    var giro = gsap.to(cena, {
      rotationY: 360, duration: 32, ease: 'none', repeat: -1,
      onUpdate: function () {
        var r = gsap.getProperty(cena, 'rotationY') * Math.PI / 180;
        el.style.filter = 'brightness(' + (0.78 + 0.22 * Math.abs(Math.cos(r))).toFixed(3) + ')';
      }
    });
    gsap.to(cena, { rotationX: 4, duration: 7, ease: 'sine.inOut', repeat: -1, yoyo: true });
    gsap.to(el, { y: -10, duration: 5, ease: 'sine.inOut', repeat: -1, yoyo: true });

    /* Só anima enquanto a primeira dobra está visível */
    ScrollTrigger.create({
      trigger: '#inicio', start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { self.isActive ? giro.resume() : giro.pause(); }
    });
  }

  /* ---------- Abertura da página (um único momento orquestrado) ---------- */
  function abertura() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.topo__barra', { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0, duration: .9 }, 0)
      .fromTo('.brilho', { autoAlpha: 0 }, { autoAlpha: 1, duration: 2.2, ease: 'power2.out' }, 0)
      .fromTo('.balanca', { autoAlpha: 0, scale: .93 }, { autoAlpha: 1, scale: 1, duration: 1.8 }, .15)
      .to('.arco--1', { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' }, .2)
      .to('.arco--2', { strokeDashoffset: 0, duration: 2.8, ease: 'power2.inOut' }, .45)
      .fromTo('.hero__id', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .9 }, .35);

    var titulo = document.querySelector('.hero__titulo');
    if (window.SplitText) {
      SplitText.create(titulo, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          gsap.set(titulo, { visibility: 'visible' });
          return gsap.from(self.lines, { yPercent: 115, duration: 1.15, stagger: .12, delay: .45, ease: 'power4.out' });
        }
      });
    } else {
      gsap.set(titulo, { visibility: 'visible' });
    }

    tl.fromTo(['.hero__lead', '.hero__acoes'], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .9, stagger: .12 }, 1.0)
      .fromTo('.hero__faixa', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.4);
  }

  /* ---------- Áreas de atuação: cards em faixa contínua ---------- */
  function faixasDeServicos() {
    var faixas = document.querySelectorAll('.faixa');
    faixas.forEach(function (f, i) {
      var trilho = f.querySelector('.faixa__trilho');
      var originais = Array.prototype.slice.call(trilho.children);
      originais.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.querySelectorAll('a,button').forEach(function (e) { e.tabIndex = -1; });
        trilho.appendChild(c);
      });
      /* velocidade constante em px/s, independente da largura */
      var metade = trilho.scrollWidth / 2;
      trilho.style.setProperty('--dur', Math.max(30, metade / (i ? 38 : 32)) + 's');
    });
    /* pausa quando a seção está fora da tela */
    var cx = document.querySelector('.faixas');
    if (cx && window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: cx, start: 'top bottom', end: 'bottom top',
        onToggle: function (s) { cx.classList.toggle('fora', !s.isActive); }
      });
    }
  }

  /* ---------- Revelações discretas ao rolar ---------- */
  function revelacoes() {
    /* Títulos: linhas revelam por máscara */
    gsap.utils.toArray('[data-split]').forEach(function (h) {
      if (!window.SplitText) { gsap.set(h, { visibility: 'visible' }); return; }
      SplitText.create(h, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          gsap.set(h, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: 115, duration: 1.05, stagger: .1, ease: 'power4.out',
            scrollTrigger: { trigger: h, start: 'top 88%', once: true }
          });
        }
      });
    });

    /* Parágrafos, retrato, mapa */
    gsap.utils.toArray('[data-reveal="fade"], [data-reveal="retrato"]').forEach(function (el) {
      gsap.fromTo(el, { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    /* Itens com fio: o fio se desenha e o conteúdo surge em seguida */
    gsap.utils.toArray('[data-reveal="linha"]').forEach(function (el) {
      var t = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      t.to(el, { '--w': 1, duration: 1.1, ease: 'power3.inOut' })
       .fromTo(el.children, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .9, stagger: .08, ease: 'power2.out' }, .12);
    });

    /* Arcos decorativos se desenham quando a seção entra */
    ['.fim__arco .arco'].forEach(function (sel) {
      var p = document.querySelector(sel);
      if (!p) return;
      gsap.fromTo(p, { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut',
        scrollTrigger: { trigger: p.closest('section'), start: 'top 70%', once: true }
      });
    });
  }

  /* ---------- Como funciona: o fio acompanha a rolagem ---------- */
  function trilhaDosPassos() {
    gsap.utils.toArray('.passos-caixa').forEach(function (caixa) {
      gsap.fromTo(caixa.querySelector('.passos__fio'), { '--p': 0 }, {
        '--p': 1, ease: 'none',
        scrollTrigger: { trigger: caixa, start: 'top 70%', end: 'bottom 62%', scrub: .6 }
      });
    });
    gsap.utils.toArray('.passo').forEach(function (p) {
      gsap.fromTo(p, { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: .9, ease: 'power2.out',
        scrollTrigger: { trigger: p, start: 'top 85%', once: true }
      });
    });
  }

  /* ---------- Hero: leve paralaxe do símbolo ---------- */
  function paralaxeHero() {
    gsap.to('.hero__simbolo', {
      yPercent: -7, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }
})();
