/**
 * Navigation Module
 * Handles responsive hamburger menu and dropdown navigation
 */

export function initNavigation() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  // Create hamburger button
  const hamburger = document.createElement('button');
  hamburger.className = 'hamburger-menu';
  hamburger.setAttribute('aria-label', 'Toggle navigation menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = `
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
  `;

  // Insert hamburger before nav
  nav.parentNode.insertBefore(hamburger, nav);

  // Create dropdown wrapper for nav links
  const navLinks = nav.innerHTML;
  nav.innerHTML = `<div class="nav-dropdown">${navLinks}</div>`;
  const dropdown = nav.querySelector('.nav-dropdown');

  // Toggle menu on hamburger click
  hamburger.addEventListener('click', () => {
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', !isExpanded);
    hamburger.classList.toggle('active');
    dropdown.classList.toggle('open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
      dropdown.classList.remove('open');
    }
  });

  // Close menu when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
      dropdown.classList.remove('open');
    }
  });

  // Close menu when a link is clicked
  dropdown.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
      dropdown.classList.remove('open');
    });
  });
}
