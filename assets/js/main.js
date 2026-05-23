(() => {
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('[data-scroll-to]').forEach(el => {
    el.addEventListener('click', (e) => {
      const target = document.getElementById(el.dataset.scrollTo);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // Smooth scroll for all nav anchor links with exact nav offset
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // Lightbox
  const lightbox    = document.getElementById('lightbox');
  const lbImg       = lightbox.querySelector('.lightbox-img');
  const lbCaption   = lightbox.querySelector('.lightbox-caption');
  const lbClose     = lightbox.querySelector('.lightbox-close');
  const lbOverlay   = lightbox.querySelector('.lightbox-overlay');

  const openLightbox = (src, caption) => {
    lbImg.src = src;
    lbImg.alt = caption || '';
    lbCaption.textContent = caption || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    lbImg.src = '';
  };

  document.querySelectorAll('.lightbox-trigger').forEach(el => {
    el.addEventListener('click', () => openLightbox(el.dataset.src, el.dataset.caption));
  });

  lbClose.addEventListener('click', closeLightbox);
  lbOverlay.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // Circuit detail toggle — expand all cards on the same grid row
  const allCircuitCards = [...document.querySelectorAll('.circuit-card')];

  document.querySelectorAll('.circuit-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedCard = btn.closest('.circuit-card');
      const isOpen = clickedCard.classList.toggle('is-open');

      // Find all cards sharing the same visual row (same offsetTop)
      const rowTop = clickedCard.getBoundingClientRect().top;
      allCircuitCards.forEach(card => {
        if (Math.abs(card.getBoundingClientRect().top - rowTop) < 5) {
          card.classList.toggle('is-open', isOpen);
          const t = card.querySelector('.circuit-toggle');
          t.setAttribute('aria-expanded', isOpen);
          t.querySelector('span').textContent = isOpen ? 'Réduire' : 'En savoir plus';
        }
      });
    });
  });

  // ── Testimonials carousel ──────────────────────────────────────────
  const carousel  = document.getElementById('testiCarousel');
  const track     = document.getElementById('testiTrack');
  const prevBtn   = document.getElementById('testiPrev');
  const nextBtn   = document.getElementById('testiNext');
  const dotsWrap  = document.getElementById('testiDots');

  if (carousel && track && prevBtn && nextBtn && dotsWrap) {
    const cards     = [...track.querySelectorAll('.testi-card')];
    const total     = cards.length;
    let current     = 0;

    const visibleCount = () => {
      const w = carousel.offsetWidth;
      if (w < 600) return 1;
      if (w < 960) return 2;
      return 3;
    };

    // Build dots dynamically: one dot per possible position
    let prevVisible = 0;
    const buildDots = () => {
      const visible = visibleCount();
      if (visible === prevVisible) return;
      prevVisible = visible;
      const numDots = total - visible + 1;
      dotsWrap.innerHTML = '';
      for (let i = 0; i < numDots; i++) {
        const dot = document.createElement('button');
        dot.className = 'testi-dot';
        dot.setAttribute('aria-label', 'Page ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      }
    };

    const goTo = (index) => {
      const visible = visibleCount();
      const maxIndex = total - visible;
      current = Math.max(0, Math.min(index, maxIndex));

      // Card width = (carousel width - gaps) / visible
      const gap = 20;
      const cardW = (carousel.offsetWidth - gap * (visible - 1)) / visible;
      cards.forEach(c => { c.style.width = cardW + 'px'; });
      track.style.transform = `translateX(-${current * (cardW + gap)}px)`;

      [...dotsWrap.querySelectorAll('.testi-dot')].forEach((d, i) => d.classList.toggle('is-active', i === current));
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current >= maxIndex;
    };

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    // Reset on resize — rebuild dots if visible count changed
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { buildDots(); goTo(current); }, 120);
    });

    buildDots();
    goTo(visibleCount() <= 1 ? 0 : 1);

    // Auto-advance every 6 s
    let autoTimer = setInterval(() => {
      const visible = visibleCount();
      const next = current + 1 > total - visible ? 0 : current + 1;
      goTo(next);
    }, 6000);

    carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
    carousel.addEventListener('mouseleave', () => {
      autoTimer = setInterval(() => {
        const visible = visibleCount();
        const next = current + 1 > total - visible ? 0 : current + 1;
        goTo(next);
      }, 6000);
    });
  }

  // ── Burger menu ────────────────────────────────────────
  const burger = document.getElementById('navBurger');
  const navLinksList = nav ? nav.querySelector('.nav-links') : null;
  if (burger && navLinksList) {
    burger.addEventListener('click', () => {
      const isOpen = burger.classList.toggle('is-open');
      navLinksList.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    navLinksList.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('is-open');
        navLinksList.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

})();
