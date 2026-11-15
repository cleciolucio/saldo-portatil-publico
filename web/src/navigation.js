const toggle = document.getElementById('navigationToggle');
const menu = document.getElementById('navigationLinks');
const current = document.getElementById('navigationCurrent');
const links = [...menu.querySelectorAll('a[href^="#"]')];
const compact = matchMedia('(max-width: 900px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  menu.hidden = compact.matches;
}
function navigate(hash, scroll = true) {
  const link = links.find((item) => item.hash === hash);
  if (!link) return;
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  for (const item of links) {
    if (item === link) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  }
  current.textContent = link.textContent;
  closeMenu();
  if (scroll) {
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
});
toggle.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  toggle.setAttribute('aria-expanded', 'true');
  menu.hidden = false;
  links[event.key === 'ArrowDown' ? 0 : links.length - 1].focus();
});
menu.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (
    !link ||
    !menu.contains(link) ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  navigate(link.hash);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && compact.matches && !menu.hidden) {
    closeMenu();
    toggle.focus();
  }
});
compact.addEventListener('change', closeMenu);
window.addEventListener('hashchange', () => navigate(location.hash || '#overview'));
closeMenu();
if (location.hash) requestAnimationFrame(() => navigate(location.hash));
