(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const revealItems = [...document.querySelectorAll('[data-reveal], .portrait-frame')];
  const sections = [...document.querySelectorAll('[data-chapter]')];
  const railLinks = [...document.querySelectorAll('[data-rail]')];
  const langLinks = [...document.querySelectorAll('[data-lang]')];
  const nav = document.querySelector('.site-nav');
  const workflowSteps = [...document.querySelectorAll('[data-workflow-step]')];
  const workflowMarkers = [...document.querySelectorAll('[data-workflow-marker]')];

  requestAnimationFrame(() => body.classList.add('is-ready'));

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18 });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      const id = visible.target.id;
      const navTheme = visible.target.dataset.nav || 'dark';
      if (nav) nav.classList.toggle('is-light', navTheme === 'light');
      railLinks.forEach((link) => {
        link.setAttribute('aria-current', link.getAttribute('href') === '#' + id ? 'true' : 'false');
      });
    }, {
      threshold: [0.25, 0.5, 0.75],
      rootMargin: '-12% 0px -22% 0px'
    });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  if ('IntersectionObserver' in window && workflowSteps.length) {
    const workflowObserver = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      const index = active.target.dataset.workflowStep;
      workflowSteps.forEach((step) => step.classList.toggle('is-active', step.dataset.workflowStep === index));
      workflowMarkers.forEach((marker) => marker.classList.toggle('is-active', marker.dataset.workflowMarker === index));
    }, { threshold: [0.3, 0.55, 0.75], rootMargin: '-18% 0px -18% 0px' });

    workflowSteps.forEach((step) => workflowObserver.observe(step));
  } else {
    workflowSteps.forEach((step) => step.classList.add('is-active'));
  }

  langLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href) return;
      event.preventDefault();
      const hash = window.location.hash || '#top';
      window.location.href = href + hash;
    });
  });

  if (!reducedMotion) {
    const name = document.querySelector('.opening__name');
    const eyebrow = document.querySelector('.opening__eyebrow');
    const meta = document.querySelector('.opening__meta');
    const scrollHint = document.querySelector('.opening__scroll');
    let ticking = false;

    const paintOpening = () => {
      const viewport = Math.max(window.innerHeight, 1);
      const progress = Math.max(0, Math.min(1, window.scrollY / (viewport * 0.78)));

      if (name) {
        name.style.transform = `translate3d(${progress * -2.4}vw, ${progress * -3.4}vh, 0) scale(${1 - progress * 0.035})`;
        name.style.opacity = String(1 - progress * 0.32);
      }

      [eyebrow, meta, scrollHint].forEach((item, index) => {
        if (!item) return;
        const local = Math.max(0, Math.min(1, progress * (1.25 + index * 0.08)));
        item.style.opacity = String(1 - local * 0.9);
        item.style.transform = `translate3d(0, ${local * -14}px, 0)`;
      });

      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      document.documentElement.style.setProperty('--page-progress', String(window.scrollY / maxScroll));
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);

      ticking = false;
    };

    const requestPaint = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paintOpening);
    };

    paintOpening();
    window.addEventListener('scroll', requestPaint, { passive: true });
    window.addEventListener('resize', requestPaint);
  } else {
    const updateStaticProgress = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      document.documentElement.style.setProperty('--page-progress', String(window.scrollY / maxScroll));
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    updateStaticProgress();
    window.addEventListener('scroll', updateStaticProgress, { passive: true });
  }
})();
