/* ============================================================
   We Are Not Self-Made — manifesto page behaviour
   - Scroll-reveal sections via IntersectionObserver
   - Circuit ecosystem background (cream-warm node network)
   - P2: particle frame-breaker hero
       "SELF-MADE." → disperse → "WITH EVERYONE."
   - All motion responds to Calm Kit state via 'calm-kit-change'
   ============================================================ */

(() => {

  // Read current calm-kit motion state from <html> class
  const getMotion = () => {
    const h = document.documentElement;
    if (h.classList.contains('ck-motion-off')) return 'off';
    if (h.classList.contains('ck-motion-low')) return 'low';
    return 'full';
  };

  let motion = getMotion();

  // --------------------------------------------------------
  // Section reveals via IntersectionObserver
  // --------------------------------------------------------
  const sections = document.querySelectorAll('[data-section]');

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentIntensity = parseFloat(entry.target.dataset.intensity || '0.3');
      }
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

  sections.forEach((s) => io.observe(s));

  // --------------------------------------------------------
  // Circuit canvas — drifting node network
  // --------------------------------------------------------
  const circuit = document.getElementById('circuit');
  const cctx = circuit.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let cW = 0, cH = 0;
  let nodes = [];
  let currentIntensity = 0.25;
  let renderedIntensity = 0.25;
  let circuitRAF = 0;

  const NODE_COUNT_DESKTOP = 60;
  const NODE_COUNT_MOBILE = 28;
  const LINK_DISTANCE = 180;

  const resizeCircuit = () => {
    cW = window.innerWidth;
    cH = window.innerHeight;
    circuit.width = cW * dpr;
    circuit.height = cH * dpr;
    circuit.style.width = cW + 'px';
    circuit.style.height = cH + 'px';
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.scale(dpr, dpr);

    const count = cW < 720 ? NODE_COUNT_MOBILE : NODE_COUNT_DESKTOP;
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * cW,
        y: Math.random() * cH,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 1.2 + Math.random() * 1.7,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.6 + Math.random() * 0.8,
      });
    }
  };

  let ct = 0;
  const circuitFrame = () => {
    const speed = motion === 'low' ? 0.3 : 1;
    ct += 0.01 * speed;
    renderedIntensity += (currentIntensity - renderedIntensity) * 0.03;

    cctx.clearRect(0, 0, cW, cH);

    const linkThreshold = LINK_DISTANCE * (0.6 + renderedIntensity * 0.8);
    const linkAlphaMul = 0.15 + renderedIntensity * 1.4;

    for (const n of nodes) {
      n.x += n.vx * speed;
      n.y += n.vy * speed;
      if (n.x < -20) n.x = cW + 20;
      if (n.x > cW + 20) n.x = -20;
      if (n.y < -20) n.y = cH + 20;
      if (n.y > cH + 20) n.y = -20;
    }

    // Teal palette: node base = teal-bright (20,184,166), warmth target = aqua pop (93,210,212)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkThreshold) {
          const proximity = 1 - dist / linkThreshold;
          const alpha = proximity * linkAlphaMul * 0.5;
          const warmth = renderedIntensity;
          const r = Math.round(20 + (93 - 20) * warmth);
          const g = Math.round(184 + (210 - 184) * warmth);
          const bl = Math.round(166 + (212 - 166) * warmth);
          cctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
          cctx.lineWidth = 0.6;
          cctx.beginPath();
          cctx.moveTo(a.x, a.y);
          cctx.lineTo(b.x, b.y);
          cctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      const pulse = 0.5 + 0.5 * Math.sin(ct * n.pulseSpeed + n.phase);
      const glow = 0.3 + renderedIntensity * 0.9 + pulse * 0.2 * renderedIntensity;
      const r = Math.round(20 + (93 - 20) * glow);
      const g = Math.round(184 + (210 - 184) * glow);
      const bl = Math.round(166 + (212 - 166) * glow);
      const alpha = 0.4 + renderedIntensity * 0.5;

      if (renderedIntensity > 0.4 && motion === 'full') {
        const haloRadius = n.r * (3 + pulse * 2);
        const grad = cctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloRadius);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${bl}, ${0.25 * renderedIntensity})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${bl}, 0)`);
        cctx.fillStyle = grad;
        cctx.beginPath();
        cctx.arc(n.x, n.y, haloRadius, 0, Math.PI * 2);
        cctx.fill();
      }

      cctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha})`;
      cctx.beginPath();
      cctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      cctx.fill();
    }

    circuitRAF = requestAnimationFrame(circuitFrame);
  };

  const startCircuit = () => {
    if (circuitRAF) return;
    resizeCircuit();
    circuitFrame();
  };
  const stopCircuit = () => {
    if (circuitRAF) cancelAnimationFrame(circuitRAF);
    circuitRAF = 0;
    cctx.clearRect(0, 0, cW, cH);
  };

  // =========================================================
  // P2: Particle frame-breaker
  // "SELF-MADE." → disperse → "WITH EVERYONE."
  // =========================================================

  const stage = document.getElementById('particle-stage');
  const pcanvas = stage.querySelector('.particle-canvas');
  const pctx = pcanvas.getContext('2d');
  const replayBtn = document.querySelector('.hero-replay');

  const PHRASES = ['SELF-MADE.', 'WITH EVERYONE.'];
  const TOTAL_PHASES = 3;        // 0 = SELF-MADE, 1 = WITH EVERYONE, 2 = humans linked

  let pW = 0, pH = 0;
  let particles = [];
  let particleRAF = 0;
  let phaseTargets = [[], [], []];
  let phaseIdx = 0;              // 0 = SELF-MADE, 1 = WITH EVERYONE, 2 = humans
  let state = 'idle';            // 'converging' | 'holding' | 'dispersing' | 'done'
  let stateStart = 0;
  let stateHandled = false;

  const samplePointsForPhrase = (phrase) => {
    const off = document.createElement('canvas');
    off.width = pW; off.height = pH;
    const octx = off.getContext('2d');
    octx.clearRect(0, 0, pW, pH);

    // Font-size scales so phrase roughly fills the stage
    let fontSize = Math.min(pH * 0.65, pW * 0.14);
    octx.font = `900 ${fontSize}px "Fraunces", Georgia, serif`;
    // Reduce if too wide
    let measured = octx.measureText(phrase).width;
    if (measured > pW * 0.92) {
      fontSize *= (pW * 0.92) / measured;
      octx.font = `900 ${fontSize}px "Fraunces", Georgia, serif`;
    }
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#000';
    octx.fillText(phrase, pW / 2, pH / 2);

    const data = octx.getImageData(0, 0, pW, pH).data;
    const step = Math.max(3, Math.round(pW / 280));
    const pts = [];
    for (let y = 0; y < pH; y += step) {
      for (let x = 0; x < pW; x += step) {
        const i = (y * pW + x) * 4;
        if (data[i + 3] > 128) pts.push({ x, y });
      }
    }
    return pts;
  };

  // Sample target points for a row of stick-figure humans, arms linked.
  // Used as phase 2 — "we are with everyone" rendered as a community.
  const sampleHumansLinked = () => {
    const off = document.createElement('canvas');
    off.width = pW; off.height = pH;
    const octx = off.getContext('2d');
    octx.clearRect(0, 0, pW, pH);
    octx.fillStyle = '#000';
    octx.strokeStyle = '#000';
    octx.lineCap = 'round';

    const N = pW < 720 ? 4 : 5;
    const margin = pW * 0.08;
    const slot = (pW - 2 * margin) / N;
    const headR = Math.min(pH * 0.07, slot * 0.16);
    const cy = pH * 0.50;
    const headCy = cy - headR * 1.7;
    const bodyTop = cy - headR * 0.3;
    const bodyBot = cy + pH * 0.18;
    const armY = cy + pH * 0.04;
    const stroke = Math.max(2, headR * 0.45);

    for (let i = 0; i < N; i++) {
      const cx = margin + slot * (i + 0.5);
      // head
      octx.beginPath();
      octx.arc(cx, headCy, headR, 0, Math.PI * 2);
      octx.fill();
      // body
      octx.lineWidth = stroke;
      octx.beginPath();
      octx.moveTo(cx, bodyTop);
      octx.lineTo(cx, bodyBot);
      octx.stroke();
      // legs
      octx.beginPath();
      octx.moveTo(cx, bodyBot);
      octx.lineTo(cx - slot * 0.13, bodyBot + pH * 0.13);
      octx.moveTo(cx, bodyBot);
      octx.lineTo(cx + slot * 0.13, bodyBot + pH * 0.13);
      octx.stroke();
      // arms — linked to neighbours; outermost arms reach toward edge
      const armEndL = i > 0 ? cx - slot * 0.5 : cx - slot * 0.4;
      const armEndR = i < N - 1 ? cx + slot * 0.5 : cx + slot * 0.4;
      octx.beginPath();
      octx.moveTo(cx, armY - headR * 0.2);
      octx.lineTo(armEndL, armY);
      octx.moveTo(cx, armY - headR * 0.2);
      octx.lineTo(armEndR, armY);
      octx.stroke();
    }

    const data = octx.getImageData(0, 0, pW, pH).data;
    const step = Math.max(2, Math.round(pW / 320));
    const pts = [];
    for (let y = 0; y < pH; y += step) {
      for (let x = 0; x < pW; x += step) {
        const i = (y * pW + x) * 4;
        if (data[i + 3] > 128) pts.push({ x, y });
      }
    }
    return pts;
  };

  const resizeParticles = () => {
    const rect = stage.getBoundingClientRect();
    pW = Math.max(rect.width, 320);
    pH = Math.max(rect.height, 200);
    pcanvas.width = pW * dpr;
    pcanvas.height = pH * dpr;
    pcanvas.style.width = pW + 'px';
    pcanvas.style.height = pH + 'px';
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.scale(dpr, dpr);

    phaseTargets = [...PHRASES.map(samplePointsForPhrase), sampleHumansLinked()];

    // Rebuild particle pool sized to the largest phase
    const N = Math.max(...phaseTargets.map((t) => t.length));
    particles = [];
    for (let i = 0; i < N; i++) {
      const t0 = phaseTargets[phaseIdx][i % phaseTargets[phaseIdx].length];
      // Start scattered around the stage, will converge
      particles.push({
        x: Math.random() * pW,
        y: Math.random() * pH,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        tx: t0.x,
        ty: t0.y,
        r: 1.1 + Math.random() * 0.8,
        jitter: Math.random() * Math.PI * 2,
      });
    }
  };

  const setTargetsTo = (idx) => {
    phaseIdx = idx;
    const tgts = phaseTargets[idx];
    for (let i = 0; i < particles.length; i++) {
      const t = tgts[i % tgts.length];
      particles[i].tx = t.x;
      particles[i].ty = t.y;
    }
  };

  const disperseBurst = () => {
    const cx = pW / 2, cy = pH / 2;
    for (const p of particles) {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const nx = dx / d, ny = dy / d;
      const force = 5 + Math.random() * 5;
      p.vx += nx * force - ny * 2.2;
      p.vy += ny * force + nx * 2.2;
    }
  };

  const drawParticles = (now) => {
    const motionNow = getMotion();
    // In 'off' mode the canvas itself is hidden by CSS — stop loop
    if (motionNow === 'off') {
      cancelAnimationFrame(particleRAF);
      particleRAF = 0;
      return;
    }

    const speed = motionNow === 'low' ? 0.45 : 1;
    const spring = 0.09 * speed;
    const damping = motionNow === 'low' ? 0.90 : 0.82;

    // State transitions
    const elapsed = now - stateStart;
    if (state === 'converging' && elapsed > 1700 / speed) {
      state = 'holding';
      stateStart = now;
      stateHandled = false;
    } else if (state === 'holding' && elapsed > (phaseIdx === TOTAL_PHASES - 1 ? 99999 : 2400) / speed) {
      // Final phase stays until replay; earlier phases auto-advance
      state = 'dispersing';
      stateStart = now;
      if (!stateHandled) { disperseBurst(); stateHandled = true; }
    } else if (state === 'dispersing' && elapsed > 900 / speed) {
      // Switch targets to next phase and converge
      setTargetsTo(Math.min(phaseIdx + 1, TOTAL_PHASES - 1));
      state = 'converging';
      stateStart = now;
      stateHandled = false;
    }

    // Per-phase colour. Phase 0 = ink (the lie), 1 = brand teal (the truth),
    // 2 = bright teal (the community lit up). Dispersal warms toward aqua pop.
    let r0, g0, b0;
    const inkRGB = [10, 42, 53];      // deep teal-navy ink
    const terraRGB = [15, 139, 141];  // brand teal — primary accent
    const forestRGB = [20, 184, 166]; // bright teal — networks/nodes
    const goldRGB = [93, 210, 212];   // bright aqua pop

    const phaseRGB = [inkRGB, terraRGB, forestRGB];

    if (state === 'dispersing') {
      const prog = Math.min(elapsed / (900 / speed), 1);
      const from = phaseRGB[phaseIdx];
      r0 = from[0] + (goldRGB[0] - from[0]) * prog;
      g0 = from[1] + (goldRGB[1] - from[1]) * prog;
      b0 = from[2] + (goldRGB[2] - from[2]) * prog;
    } else {
      const base = phaseRGB[phaseIdx];
      r0 = base[0]; g0 = base[1]; b0 = base[2];
    }

    pctx.clearRect(0, 0, pW, pH);

    // Physics + draw
    for (const p of particles) {
      // spring toward target
      p.vx = p.vx * damping + (p.tx - p.x) * spring;
      p.vy = p.vy * damping + (p.ty - p.y) * spring;

      // Tiny idle jitter when holding — keeps text breathing
      if (state === 'holding' && motionNow === 'full') {
        p.jitter += 0.03;
        p.vx += Math.cos(p.jitter) * 0.02;
        p.vy += Math.sin(p.jitter) * 0.02;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Softly keep dispersing particles in frame-ish
      if (state === 'dispersing') {
        if (p.x < -40 || p.x > pW + 40) p.vx *= 0.92;
        if (p.y < -40 || p.y > pH + 40) p.vy *= 0.92;
      }

      pctx.fillStyle = `rgba(${r0}, ${g0}, ${b0}, 0.85)`;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pctx.fill();
    }

    particleRAF = requestAnimationFrame(drawParticles);
  };

  const startParticles = () => {
    if (particleRAF) cancelAnimationFrame(particleRAF);
    resizeParticles();
    phaseIdx = 0;
    state = 'converging';
    stateStart = performance.now();
    stateHandled = false;
    particleRAF = requestAnimationFrame(drawParticles);
  };

  const replayParticles = () => {
    // Reset particles to scattered positions, re-run full sequence
    for (const p of particles) {
      p.x = Math.random() * pW;
      p.y = Math.random() * pH;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = (Math.random() - 0.5) * 2;
    }
    setTargetsTo(0);
    state = 'converging';
    stateStart = performance.now();
    stateHandled = false;
    if (!particleRAF) particleRAF = requestAnimationFrame(drawParticles);
  };

  const stopParticles = () => {
    if (particleRAF) cancelAnimationFrame(particleRAF);
    particleRAF = 0;
    if (pW && pH) pctx.clearRect(0, 0, pW, pH);
  };

  replayBtn.addEventListener('click', replayParticles);

  // --------------------------------------------------------
  // Boot
  // --------------------------------------------------------
  const boot = () => {
    motion = getMotion();
    if (motion !== 'off') {
      startCircuit();
      // Small delay so fonts settle before we sample pixels
      setTimeout(startParticles, 250);
    }
  };

  // Wait for fonts if possible — improves particle accuracy
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
  } else {
    boot();
  }

  // --------------------------------------------------------
  // Listen for Calm Kit changes
  // --------------------------------------------------------
  document.addEventListener('calm-kit-change', () => {
    motion = getMotion();
    if (motion === 'off') {
      stopCircuit();
      stopParticles();
    } else {
      if (!circuitRAF) startCircuit();
      if (!particleRAF) setTimeout(startParticles, 120);
    }
  });

  // --------------------------------------------------------
  // Resize
  // --------------------------------------------------------
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCircuit();
      if (particleRAF) {
        const wasPhase = phaseIdx;
        resizeParticles();
        setTargetsTo(wasPhase);
      }
    }, 180);
  });

})();
