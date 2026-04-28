/* InclusiNews slide deck driver — arrow keys, click rail, optional auto-advance.
   Zero deps. Drop a single <script src="../_shared/deck.js"> at end of body. */

(function () {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!slides.length) return;

  const rail = document.querySelector('.deck-rail');
  let cur = 0;

  // Build rail dots
  if (rail) {
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'rail-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      rail.appendChild(dot);
    });
  }

  function goTo(i) {
    if (i < 0 || i >= slides.length) return;
    slides[cur].classList.remove('is-active');
    if (rail) rail.children[cur]?.classList.remove('is-active');
    cur = i;
    slides[cur].classList.add('is-active');
    if (rail) rail.children[cur]?.classList.add('is-active');
  }

  function next() { goTo(Math.min(cur + 1, slides.length - 1)); }
  function prev() { goTo(Math.max(cur - 1, 0)); }

  // Init first slide
  slides[0].classList.add('is-active');

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(slides.length - 1);
    } else if (e.key === 'f' || e.key === 'F') {
      // toggle fullscreen
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  });

  // Click anywhere to advance (right side) or go back (left side)
  document.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('.rail-dot')) return;
    if (e.clientX < window.innerWidth / 3) prev();
    else next();
  });

  // Auto-advance if data-auto-ms set on .deck
  const deck = document.querySelector('.deck');
  const auto = deck?.dataset.autoMs ? parseInt(deck.dataset.autoMs, 10) : 0;
  if (auto > 0) {
    setInterval(() => {
      if (cur < slides.length - 1) next();
    }, auto);
  }
})();
