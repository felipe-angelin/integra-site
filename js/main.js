document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (!navToggle || !mainNav) {
    return;
  }

  const serviceDropdown = mainNav.querySelector('.nav-item-with-dropdown');
  const closeMobileMenu = () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');

    if (serviceDropdown) {
      serviceDropdown.classList.remove('is-open');
    }
  };

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));

    if (!isOpen && serviceDropdown) {
      serviceDropdown.classList.remove('is-open');
    }
  });

  const serviceLink = serviceDropdown ? serviceDropdown.querySelector(':scope > a') : null;

  if (serviceLink) {
    serviceLink.addEventListener('click', (event) => {
      if (window.innerWidth <= 840) {
        event.preventDefault();
        serviceDropdown.classList.toggle('is-open');
      }
    });
  }

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 840 && link !== serviceLink) {
        closeMobileMenu();
      }
    });
  });
});
