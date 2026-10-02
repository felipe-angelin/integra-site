document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (!navToggle || !mainNav) {
    return;
  }

  // Trata todos os menus com submenu (Servicos, Treinamentos, e qualquer um
  // que vier depois), nao só o primeiro - cada um abre/fecha sua própria
  // dropdown no mobile sem navegar direto pela ancora.
  const dropdowns = Array.from(mainNav.querySelectorAll('.nav-item-with-dropdown'));
  const dropdownLinks = [];

  const closeMobileMenu = () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    dropdowns.forEach((dropdown) => dropdown.classList.remove('is-open'));
  };

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));

    if (!isOpen) {
      dropdowns.forEach((dropdown) => dropdown.classList.remove('is-open'));
    }
  });

  dropdowns.forEach((dropdown) => {
    const triggerLink = dropdown.querySelector(':scope > a');

    if (!triggerLink) {
      return;
    }

    dropdownLinks.push(triggerLink);

    triggerLink.addEventListener('click', (event) => {
      if (window.innerWidth <= 840) {
        event.preventDefault();
        dropdown.classList.toggle('is-open');
      }
    });
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 840 && !dropdownLinks.includes(link)) {
        closeMobileMenu();
      }
    });
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const indexEls = document.querySelectorAll('.discipline-index');

  if (!indexEls.length || !('IntersectionObserver' in window)) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animateCount = (el) => {
    const target = parseInt(el.textContent, 10);

    if (Number.isNaN(target)) {
      return;
    }

    if (prefersReducedMotion) {
      el.textContent = String(target).padStart(2, '0');
      return;
    }

    const duration = 500;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = String(Math.round(progress * target)).padStart(2, '0');

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  indexEls.forEach((el) => observer.observe(el));
});
