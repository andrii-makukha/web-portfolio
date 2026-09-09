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

  const getMenuFocusable = () => {
    if (!mobileMenu) return [];
    return [...mobileMenu.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => {
      const style = window.getComputedStyle(element);
      return !element.hidden &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.hasAttribute('disabled') &&
        element.getAttribute('aria-hidden') !== 'true';
    });
  };

  const trapMenuFocus = (event) => {
    if (event.key !== 'Tab' || !body.classList.contains('menu-open') || !mobileMenu) return;
    const focusable = getMenuFocusable();
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !mobileMenu.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !mobileMenu.contains(active))) {
      event.preventDefault();
      first.focus();
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
      if (!body.classList.contains('menu-open')) return;
      if (event.key === 'Escape') {
        closeMenu({ restoreFocus: true });
        return;
      }
      trapMenuFocus(event);
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

  const findActiveByProbe = (items, probe) => {
    if (!items.length) return null;

    const containing = items.find((item) => {
      const rect = item.getBoundingClientRect();
      return rect.top <= probe && rect.bottom > probe;
    });
    if (containing) return containing;

    return items.reduce((closest, item) => {
      const rect = item.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - probe);
      if (!closest || distance < closest.distance) return { item, distance };
      return closest;
    }, null)?.item || items[0];
  };

  const updateWorkflowState = () => {
    if (!workflowSteps.length) return;
    const probe = window.innerHeight * 0.5;
    const active = findActiveByProbe(workflowSteps, probe);
    if (!active) return;

    const index = active.dataset.workflowStep;
    workflowSteps.forEach((step) => {
      step.classList.toggle('is-active', step === active);
    });
    workflowMarkers.forEach((marker) => {
      marker.classList.toggle('is-active', marker.dataset.workflowMarker === index);
    });
  };

  const updateJourneyState = () => {
    if (!journeyEvents.length) return;
    const probe = window.innerHeight * 0.5;
    const active = findActiveByProbe(journeyEvents, probe);
    if (!active) return;

    journeyEvents.forEach((event) => {
      event.classList.toggle('is-active', event === active);
    });
    if (journeyCurrent) journeyCurrent.textContent = active.dataset.journeyYear || '';
  };

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
    updateWorkflowState();
    updateJourneyState();
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