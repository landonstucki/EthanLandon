/**
 * Scroll Reveal Module
 * Fades content in as it scrolls into view.
 *
 * Everything is opt-in via the `data-reveal` attribute, and elements are
 * only hidden once JS confirms it can reveal them again - so with JS off,
 * or with reduced motion requested, the page just renders normally.
 */

const REVEAL_SELECTOR = "[data-reveal]";

/**
 * Start observing every [data-reveal] element on the page.
 * @param {Object} [options]
 * @param {number} [options.stagger=70] - Delay between siblings, in ms
 */
export function initScrollReveal({ stagger = 70 } = {}) {
  const targets = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
  if (!targets.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No IntersectionObserver, or the user asked for less motion: show everything.
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-revealed"));
    return;
  }

  // Only now do we commit to hiding things, so a JS failure can't leave the
  // page blank.
  document.documentElement.classList.add("reveal-ready");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const group = el.parentElement
        ? Array.from(el.parentElement.querySelectorAll(`:scope > ${REVEAL_SELECTOR}`))
        : [el];
      const position = Math.max(0, group.indexOf(el));

      el.style.transitionDelay = `${Math.min(position, 6) * stagger}ms`;
      el.classList.add("is-revealed");

      observer.unobserve(el);
    });
  }, {
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.08
  });

  targets.forEach(el => observer.observe(el));
}
