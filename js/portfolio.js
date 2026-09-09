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
  const journeyEvents = [...document.querySelectorAll('[data-journey-event]')];
  const journeyCurrent = document.querySelector('[data-journey-current]');
  const menuToggle = document.querySelector('.site-nav__menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuLabel = menuToggle?.querySelector('span');
  const mainContent = document.querySelector('#main-content');
  const skipLink = document.querySelector('.skip-link');
  const openingName = document.querySelector('.opening__name');
  const openingEyebrow = document.querySelector('.opening__eyebrow');
  const openingMeta = document.querySelector('.opening__meta');
  const openingScroll = document.querySelector('.opening__scroll');

  const setBackgroundInteractive = (interactive) => {
    if (!mainContent) return;
    mainContent.inert = !interactive;
    if (interactive) {
      mainContent.removeAttribute('aria-hidden');
    } else {
      mainContent.setAttribute('aria-hidden', 'true');
    }
  };

  const setMenuLabel = (isOpen) => {
    if (!menuToggle || !menuLabel) return;
    const label = isOpen ? menuToggle.dataset.closeLabel : menuToggle.dataset.openLabel;
    if (label) menuLabel.textContent = label;
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    body.classList.remove('menu-open');
    setBackgroundInteractive(true);
    setMenuLabel(false);
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  };

  const openMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'true');
    mobileMenu.hidden = false;
    body.classList.add('menu-open');
    setBackgroundInteractive(false);
    setMenuLabel(true);
    const firstLink = mobileMenu.querySelector('a');
    if (firstLink) requestAnimationFrame(() => firstLink.focus({ preventScroll: true }));
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu() : openMenu();
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && body.classList.contains('menu-open')) {
        closeMenu({ restoreFocus: true });
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1180 && body.classList.contains('menu-open')) closeMenu();
    });
  }

  if (skipLink && mainContent) {
    skipLink.addEventListener('click', () => {
      requestAnimationFrame(() => mainContent.focus({ preventScroll: true }));
    });
  }

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

  if ('IntersectionObserver' in window && journeyEvents.length) {
    const journeyObserver = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!active) return;
      journeyEvents.forEach((event) => event.classList.toggle('is-active', event === active.target));
      if (journeyCurrent) journeyCurrent.textContent = active.target.dataset.journeyYear || '';
    }, { threshold: [0.3, 0.55, 0.75], rootMargin: '-18% 0px -18% 0px' });

    journeyEvents.forEach((event) => journeyObserver.observe(event));
  } else {
    journeyEvents.forEach((event) => event.classList.add('is-active'));
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

  const updateActiveChapter = () => {
    if (!sections.length) return;

    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const probe = Math.min(
      window.innerHeight * 0.5,
      Math.max(navHeight + 24, window.innerHeight * 0.32)
    );

    let activeSection = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= probe && rect.bottom > probe;
    });

    if (!activeSection) {
      activeSection = sections.reduce((closest, section) => {
        const distance = Math.abs(section.getBoundingClientRect().top - probe);
        if (!closest || distance < closest.distance) return { section, distance };
        return closest;
      }, null)?.section || sections[0];
    }

    const id = activeSection.id;
    const navTheme = activeSection.dataset.nav || 'dark';

    if (nav) nav.classList.toggle('is-light', navTheme === 'light');

    railLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === '#' + id;
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  let ticking = false;

  const paintScrollState = () => {
    const scrollY = window.scrollY;
    const viewport = Math.max(window.innerHeight, 1);
    const openingProgress = Math.max(0, Math.min(1, scrollY / (viewport * 0.78)));

    if (!reducedMotion) {
      if (openingName) {
        openingName.style.transform =
          `translate3d(${openingProgress * -2.4}vw, ${openingProgress * -3.4}vh, 0) scale(${1 - openingProgress * 0.035})`;
        openingName.style.opacity = String(1 - openingProgress * 0.32);
      }

      [openingEyebrow, openingMeta, openingScroll].forEach((item, index) => {
        if (!item) return;
        const local = Math.max(0, Math.min(1, openingProgress * (1.25 + index * 0.08)));
        item.style.opacity = String(1 - local * 0.9);
        item.style.transform = `translate3d(0, ${local * -14}px, 0)`;
      });
    }

    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    document.documentElement.style.setProperty(
      '--page-progress',
      String(Math.max(0, Math.min(1, scrollY / maxScroll)))
    );

    if (nav) nav.classList.toggle('is-scrolled', scrollY > 24);
    updateActiveChapter();
    ticking = false;
  };

  const requestPaint = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paintScrollState);
  };

  paintScrollState();
  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', requestPaint);
  window.addEventListener('orientationchange', requestPaint);
})();