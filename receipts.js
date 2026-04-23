/* ============================================================
   Receipts — cosmic-scale £ zoom
   Scroll drives a camera zoom across concentric "magnitude" circles.
   Each stop holds for one viewport-height; between stops the camera
   pulls back by the ratio between successive world radii.
   ============================================================ */

(() => {

  const STOPS = [
    {
      value: null,
      intro: true,
      amountLabel: '',
      role: 'A ledger of what we move',
      fact: 'Seven figures, true to the pound. Scroll down — you set the pace.',
      accent: 'intro',
      color: { r: 13, g: 148, b: 136 }, // brand teal
    },
    {
      value: 1,
      role: 'The single £1 — one donation, one bucket',
      fact: 'One pound, dropped into one bucket, by one person. Every fund on this page — ours, theirs, the billion-pound ones — starts with someone willing to add the first.',
      accent: 'default',
      color: { r: 20, g: 184, b: 166 }, // teal-bright
    },
    {
      value: 500,
      role: "A UK family-of-four's monthly food shop (cost benchmark)",
      fact: '£500 is roughly what it costs to feed a UK family of four for a month. One pound became five hundred. The unit stacked up.',
      accent: 'default',
      color: { r: 20, g: 184, b: 166 },
    },
    {
      value: 16_500,
      role: 'Grant Earth Village CIC submitted to the Lottery last week',
      fact: 'The exact sum Earth Village CIC submitted to the National Lottery last week — a full year of community programming in Nottingham, costed on one form.',
      accent: 'default',
      color: { r: 20, g: 184, b: 166 },
    },
    {
      value: 1_200_000,
      role: 'What InclusiFund has moved so far · £3M target by October',
      fact: "What we've moved into grassroots hands so far. Tracking to £3M by October — every grant above, every £1 that stacks into one, multiplied through our pipeline.",
      accent: 'milestone',
      color: { r: 15, g: 139, b: 141 }, // brand teal deep
    },
    {
      value: 4_200_000_000,
      role: "UK small-charity sector's annual funding shortfall",
      fact: 'What UK small charities (income under £1M) are short of every single year. Need minus supply, across the whole sector. Roughly 3,500 × what we move today.',
      accent: 'shadow',
      color: { r: 53, g: 90, b: 104 },  // ink-soft teal
    },
    {
      value: 138_000_000_000,
      role: "Liquid wealth held by the UK's top 1% — cash and shares",
      fact: "The UK's top 1% hold roughly £138 billion in liquid, easily-movable wealth. Cash and shares. Thirty-three times the entire sector's annual gap.",
      accent: 'shadow',
      color: { r: 10, g: 42, b: 53 },   // deep ink
    },
    {
      value: null,
      amountLabel: 'You.',
      role: 'So what now',
      fact: "You can't personally close £138bn. But the system isn't held up by scale — it's held up by the absence of people like you moving. Every ecosystem starts with the first node lighting up.",
      accent: 'final',
      color: { r: 15, g: 139, b: 141 },
    },
  ];

  // world radius = sqrt(value). For null-value stops (intro + "You"),
  // mirror a sensible reference so camera math stays smooth.
  STOPS.forEach((s, i) => {
    s.worldR = Math.sqrt(s.value ?? STOPS[4].value);
  });
  // Intro shares £1's worldR so camera Z stays constant across the intro→£1 leg.
  // The £1 circle handles the "huge → focus" shrink via introScale instead.
  STOPS[0].worldR = STOPS[1].worldR;

  const canvas = document.getElementById('receipts-canvas');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  let scroller = null;       // the scroll-driver element (main.r-scroll)
  let totalStops = STOPS.length;
  let progress = 0;          // float 0..(totalStops-1)
  let renderedProgress = 0;
  let running = true;

  // DOM overlay refs
  const amountEl = document.getElementById('r-amount');
  const labelEl = document.getElementById('r-label');
  const factEl = document.getElementById('r-fact');
  const contextEl = document.getElementById('r-context');
  const railDots = document.querySelectorAll('.r-rail-dot');
  const overlayEl = document.querySelector('.r-overlay');

  let lastStopIdx = -1;

  // ---- Slide-zero pixel headline ("The Receipts.") ----
  const HEADLINE_TEXT = 'The Receipts.';
  let headlineParticles = [];

  const sampleHeadline = () => {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.clearRect(0, 0, W, H);
    let fontSize = Math.min(H * 0.18, W * 0.12);
    octx.font = `900 ${fontSize}px "Fraunces", Georgia, serif`;
    let measured = octx.measureText(HEADLINE_TEXT).width;
    if (measured > W * 0.86) {
      fontSize *= (W * 0.86) / measured;
      octx.font = `900 ${fontSize}px "Fraunces", Georgia, serif`;
    }
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#000';
    octx.fillText(HEADLINE_TEXT, W / 2, H / 2);

    const data = octx.getImageData(0, 0, W, H).data;
    const step = Math.max(3, Math.round(W / 280));
    const pts = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        if (data[i + 3] > 128) pts.push({ x, y });
      }
    }

    if (headlineParticles.length !== pts.length) {
      headlineParticles = pts.map((t) => ({
        x: W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: H / 2 + (Math.random() - 0.5) * H * 0.6,
        vx: 0, vy: 0,
        tx: t.x, ty: t.y,
        r: 1.1 + Math.random() * 0.7,
      }));
    } else {
      headlineParticles.forEach((p, i) => { p.tx = pts[i].x; p.ty = pts[i].y; });
    }
  };

  // ---- Calm Kit integration ----
  const getMotion = () => {
    const h = document.documentElement;
    if (h.classList.contains('ck-motion-off')) return 'off';
    if (h.classList.contains('ck-motion-low')) return 'low';
    return 'full';
  };
  let motion = getMotion();

  // ---- Sizing ----
  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    sampleHeadline();
  };
  resize();
  window.addEventListener('resize', () => {
    resize();
  });

  // Target screen radius for the *focused* stop's circle
  const focusRadius = () => Math.min(W, H) * 0.32;

  // ---- Scroll progress ----
  const onScroll = () => {
    // Progress across the body scroll, mapped to 0..(totalStops-1)
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const sY = window.scrollY || document.documentElement.scrollTop;
    const raw = docH > 0 ? sY / docH : 0;
    progress = raw * (totalStops - 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Rail click → smooth scroll to stop ----
  railDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.stop, 10);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const targetY = (idx / (totalStops - 1)) * docH;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });

  // ---- Format helpers ----
  const formatCurrency = (val) => {
    if (val == null) return 'You';
    if (val >= 1_000_000_000) return `£${(val / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} billion`;
    if (val >= 1_000_000) return `£${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')} million`;
    return '£' + val.toLocaleString('en-GB');
  };

  // ---- Overlay copy transitions ----
  const updateOverlay = (idx) => {
    if (idx === lastStopIdx) return;
    lastStopIdx = idx;
    const s = STOPS[idx];

    overlayEl.classList.add('is-transit');
    setTimeout(() => {
      amountEl.textContent = s.amountLabel || formatCurrency(s.value);
      if (labelEl) labelEl.textContent = s.role;
      factEl.textContent = s.fact;
      contextEl.textContent = `Step ${idx + 1} of ${totalStops}`;
      document.body.dataset.stopAccent = s.accent;
      railDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      overlayEl.classList.remove('is-transit');
    }, 220);
  };

  // ---- Render loop ----
  const frame = () => {
    if (!running) return;

    motion = getMotion();
    if (motion === 'off') {
      requestAnimationFrame(frame);
      return;
    }

    // Ease rendered progress toward scroll progress
    const easeRate = motion === 'low' ? 0.06 : 0.12;
    renderedProgress += (progress - renderedProgress) * easeRate;

    // Determine "current" integer stop for overlay copy
    const nearestIdx = Math.max(0, Math.min(totalStops - 1, Math.round(renderedProgress)));
    updateOverlay(nearestIdx);

    // --- Camera zoom ---
    // At integer progress k, focused circle has screen radius = focusRadius()
    //   → Z(k) = focusRadius() / STOPS[k].worldR
    // Between integers, interpolate log(Z) linearly.
    const k0 = Math.floor(renderedProgress);
    const k1 = Math.min(totalStops - 1, k0 + 1);
    const t = renderedProgress - k0;

    const z0 = focusRadius() / STOPS[k0].worldR;
    const z1 = focusRadius() / STOPS[k1].worldR;
    const Z = Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * t);

    // Color: lerp current stop → next stop
    const c0 = STOPS[k0].color;
    const c1 = STOPS[k1].color;
    const cr = c0.r + (c1.r - c0.r) * t;
    const cg = c0.g + (c1.g - c0.g) * t;
    const cb = c0.b + (c1.b - c0.b) * t;

    // --- Paint ---
    ctx.clearRect(0, 0, W, H);

    // Background radial wash — aqua near start, deeper as you fall into the shadow stops
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
    const warmth = 1 - renderedProgress / (totalStops - 1);
    bgGrad.addColorStop(0, `rgba(93, 210, 212, ${0.04 + warmth * 0.10})`);
    bgGrad.addColorStop(0.6, 'rgba(247, 251, 253, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Draw all stops as concentric circles at (cx, cy) = centre
    const cx = W / 2;
    const cy = H / 2;

    // Slide-zero: £1 (stop 1) starts huge during intro and shrinks to focus radius.
    // Camera Z is constant from progress 0→1 (intro & £1 share worldR), so the
    // shrink lives in this multiplier rather than the camera.
    const introScale = renderedProgress < 1 ? 1 + (1 - renderedProgress) * 3 : 1;

    for (let i = 0; i < totalStops; i++) {
      const s = STOPS[i];
      if (s.intro) continue;                     // intro stop is headline-only
      const scale = i === 1 ? introScale : 1;
      const rScreen = s.worldR * Z * scale;
      if (rScreen < 0.3) continue;              // too small to matter
      if (rScreen > Math.max(W, H) * 4) continue; // vastly off-screen

      // Proximity to focus determines visual emphasis
      const distFromFocus = Math.abs(i - renderedProgress);
      const emphasis = Math.max(0, 1 - distFromFocus / 2);

      // Line width + opacity scales with emphasis
      const baseAlpha = 0.15 + emphasis * 0.55;
      const lineW = 1 + emphasis * 2.5;

      // Color — lerp toward focus color as emphasis rises
      const stopC = s.color;
      const focusC = { r: cr, g: cg, b: cb };
      const r = stopC.r + (focusC.r - stopC.r) * emphasis * 0.3;
      const g = stopC.g + (focusC.g - stopC.g) * emphasis * 0.3;
      const b = stopC.b + (focusC.b - stopC.b) * emphasis * 0.3;

      // Filled soft glow for the focused-ish circles
      if (emphasis > 0.35 && motion === 'full') {
        const glow = ctx.createRadialGradient(cx, cy, rScreen * 0.1, cx, cy, rScreen);
        glow.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${0.07 * emphasis})`);
        glow.addColorStop(1, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, rScreen, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stroke the circle outline
      ctx.strokeStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${baseAlpha})`;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.arc(cx, cy, rScreen, 0, Math.PI * 2);
      ctx.stroke();

      // Small filled dot at the centre for context (so viewer knows these are concentric)
      if (rScreen > 6 && emphasis > 0.25) {
        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${0.3 * emphasis})`;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(3, rScreen * 0.015), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Slide-zero headline — pixel particles spelling "The Receipts."
    // Visible only during the intro→£1 leg, opacity fades to 0 by progress 1.
    if (renderedProgress < 1.05 && headlineParticles.length) {
      const headlineOpacity = Math.max(0, Math.min(1, 1 - renderedProgress));
      const spring = 0.10;
      const damping = 0.82;
      ctx.fillStyle = `rgba(13, 148, 136, ${headlineOpacity * 0.9})`;
      for (const p of headlineParticles) {
        p.vx = p.vx * damping + (p.tx - p.x) * spring;
        p.vy = p.vy * damping + (p.ty - p.y) * spring;
        p.x += p.vx;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Particle swarm on the focused circle — "dust of pounds"
    // Skip during intro: the giant scaled £1 circle would have dust at the wrong radius.
    if (motion === 'full' && !STOPS[nearestIdx].intro) {
      const focusStop = STOPS[nearestIdx];
      const focusR = focusStop.worldR * Z;
      const t2 = performance.now() * 0.0005;
      const particleCount = Math.max(12, Math.min(60, focusR / 6));
      for (let p = 0; p < particleCount; p++) {
        const a = (p / particleCount) * Math.PI * 2 + t2;
        const jitter = Math.sin(t2 * 3 + p) * 4;
        const px = cx + Math.cos(a) * (focusR + jitter);
        const py = cy + Math.sin(a) * (focusR + jitter);
        const { r, g, b } = focusStop.color;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.beginPath();
        ctx.arc(px, py, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(frame);
  };

  // ---- Boot ----
  const boot = () => {
    motion = getMotion();
    resize();
    onScroll();
    if (motion !== 'off') frame();
    updateOverlay(0);
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
  } else {
    boot();
  }

  // ---- Listen to Calm Kit changes ----
  document.addEventListener('calm-kit-change', () => {
    motion = getMotion();
    if (motion !== 'off' && !running) { running = true; frame(); }
  });

  // ---- Keyboard nav (Arrow keys jump between stops) ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      const idx = Math.min(totalStops - 1, Math.round(renderedProgress) + 1);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: (idx / (totalStops - 1)) * docH, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      const idx = Math.max(0, Math.round(renderedProgress) - 1);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: (idx / (totalStops - 1)) * docH, behavior: 'smooth' });
    }
  });

})();
