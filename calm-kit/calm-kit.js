/* ============================================================
   Calm Kit — persistent accessibility panel
   - Self-mounting: include this script and the panel appears
   - State persisted to localStorage
   - Broadcasts 'calm-kit-change' CustomEvent on document for
     other scripts (circuit, particles) to respond to motion level
   ============================================================ */

(() => {
  const STORAGE_KEY = 'inclusifund-calm-kit-v1';

  const DEFAULTS = {
    motion: 'full',        // 'off' | 'low' | 'full'
    textScale: '1',        // string to match button[data-val]
    lineHeight: '1',       // multiplier
    font: 'default',       // 'default' | 'hyperlegible' | 'dyslexic'
    focus: 'default',      // 'default' | 'high'
    contrast: 'default',   // 'default' | 'high' | 'low-blue'
  };

  // ---- State ----
  const loaded = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  })();

  const state = { ...DEFAULTS, ...loaded };

  // Honour OS prefers-reduced-motion on first visit only
  if (!loaded.motion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.motion = 'off';
  }

  // ---- Apply state to DOM ----
  const apply = () => {
    const h = document.documentElement;

    ['ck-motion-off', 'ck-motion-low', 'ck-motion-full'].forEach(c => h.classList.remove(c));
    h.classList.add(`ck-motion-${state.motion}`);

    ['ck-font-default', 'ck-font-hyperlegible', 'ck-font-dyslexic'].forEach(c => h.classList.remove(c));
    h.classList.add(`ck-font-${state.font}`);

    ['ck-focus-default', 'ck-focus-high'].forEach(c => h.classList.remove(c));
    h.classList.add(`ck-focus-${state.focus}`);

    ['ck-contrast-default', 'ck-contrast-high', 'ck-contrast-low-blue'].forEach(c => h.classList.remove(c));
    h.classList.add(`ck-contrast-${state.contrast}`);

    h.style.setProperty('--ck-text-scale', state.textScale);
    h.style.setProperty('--ck-line-height-mul', state.lineHeight);

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { /* ignore */ }

    document.dispatchEvent(new CustomEvent('calm-kit-change', { detail: { ...state } }));
  };

  // Apply classes before DOM ready so first paint is correct
  apply();

  // ---- Build and mount panel ----
  const mount = () => {
    if (document.getElementById('calm-kit')) return;

    const html = `
      <aside id="calm-kit" aria-label="Accessibility settings">
        <button class="ck-tab" aria-expanded="false" aria-controls="ck-panel">
          <span class="ck-tab-icon" aria-hidden="true"></span>
          <span class="ck-tab-label">Calm kit</span>
        </button>
        <div id="ck-panel" class="ck-panel" role="dialog" aria-modal="false" aria-labelledby="ck-title">
          <header class="ck-head">
            <h2 id="ck-title">Calm kit</h2>
            <button class="ck-close" type="button" aria-label="Close calm kit">×</button>
          </header>
          <div class="ck-body">
            <fieldset>
              <legend>Motion</legend>
              <div class="ck-seg" data-field="motion">
                <button type="button" data-val="off">Off</button>
                <button type="button" data-val="low">Low</button>
                <button type="button" data-val="full">Full</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Text size</legend>
              <div class="ck-seg" data-field="textScale">
                <button type="button" data-val="0.9">A−</button>
                <button type="button" data-val="1">A</button>
                <button type="button" data-val="1.15">A+</button>
                <button type="button" data-val="1.3">A++</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Line spacing</legend>
              <div class="ck-seg" data-field="lineHeight">
                <button type="button" data-val="0.85">Tight</button>
                <button type="button" data-val="1">Normal</button>
                <button type="button" data-val="1.2">Loose</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Font family</legend>
              <div class="ck-seg" data-field="font">
                <button type="button" data-val="default">Default</button>
                <button type="button" data-val="hyperlegible">Hyperlegible</button>
                <button type="button" data-val="dyslexic">Dyslexia</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Focus outlines</legend>
              <div class="ck-seg" data-field="focus">
                <button type="button" data-val="default">Default</button>
                <button type="button" data-val="high">High-vis</button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Contrast</legend>
              <div class="ck-seg" data-field="contrast">
                <button type="button" data-val="default">Default</button>
                <button type="button" data-val="high">High</button>
                <button type="button" data-val="low-blue">Warm night</button>
              </div>
            </fieldset>
            <div class="ck-preview" aria-label="Live preview">
              <p class="ck-preview-label">Preview</p>
              <p class="ck-preview-text">The unit is not the self. The unit is humankind. We rank up together.</p>
            </div>
          </div>
          <footer class="ck-foot">
            <button class="ck-reset" type="button">Reset</button>
            <span class="ck-saved">Saved automatically</span>
          </footer>
        </div>
      </aside>
    `;

    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const panel = wrap.firstElementChild;
    document.body.appendChild(panel);

    const tab = panel.querySelector('.ck-tab');
    const closeBtn = panel.querySelector('.ck-close');

    const open = () => {
      panel.classList.add('is-open');
      tab.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    };
    const close = () => {
      panel.classList.remove('is-open');
      tab.setAttribute('aria-expanded', 'false');
      tab.focus();
    };

    tab.addEventListener('click', () => {
      panel.classList.contains('is-open') ? close() : open();
    });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    // Segmented controls
    panel.querySelectorAll('.ck-seg').forEach(seg => {
      const field = seg.dataset.field;
      seg.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          state[field] = btn.dataset.val;
          paintActive(panel);
          apply();
        });
      });
    });

    panel.querySelector('.ck-reset').addEventListener('click', () => {
      Object.assign(state, DEFAULTS);
      paintActive(panel);
      apply();
    });

    paintActive(panel);
  };

  const paintActive = (panel) => {
    panel.querySelectorAll('.ck-seg').forEach(seg => {
      const field = seg.dataset.field;
      const current = String(state[field]);
      seg.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.val === current);
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
