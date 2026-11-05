// Mobilné rozbaľovacie menu pre verejný a interný kalendár.
// Nezasahuje do autentifikácie, načítania udalostí ani odberu ICS.
(() => {
  const button = document.querySelector('.mobile-menu-toggle');
  const nav = document.getElementById('main-navigation');
  if (!button || !nav) return;

  const isMobile = window.matchMedia('(max-width: 780px)');
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Zavrieť navigačné menu' : 'Otvoriť navigačné menu');
    const text = button.querySelector('.mobile-menu-text');
    if (text) text.textContent = open ? 'Zavrieť' : 'Menu';
  };

  button.addEventListener('click', () => {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });

  // Po zvolení položky sa menu zavrie; funguje aj pre tlačidlo ICS.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (button.getAttribute('aria-expanded') === 'true' &&
        !nav.contains(event.target) && !button.contains(event.target)) {
      setOpen(false);
    }
  });

  // Pri prechode z mobilnej na desktopovú veľkosť menu nezostane otvorené.
  isMobile.addEventListener('change', () => setOpen(false));
})();
