/* ================================================================
   InclusiFund — homepage interactions
   All 12 sections, Calm Kit as the root store.
   ================================================================ */

(function () {
  "use strict";

  // ================================================================
  // 0. CALM KIT — root store. Every other section reads from this.
  // ================================================================
  const CALM_KEY = "inclusifund.calm.v1";
  const DEFAULTS = {
    motion: "full",   // off | low | full
    textSize: 17,     // px, 14..22
    lineHeight: 1.55,
    tracking: 0,
    font: "default",  // default | atkinson | opendyslexic
    focus: "visible", // visible | hidden
    contrast: "default", // default | high | low-blue
  };

  const Calm = {
    state: load(),
    listeners: [],
    set(patch) {
      this.state = Object.assign({}, this.state, patch);
      save(this.state);
      this.apply();
      this.listeners.forEach((fn) => fn(this.state));
    },
    apply() {
      const s = this.state;
      const root = document.documentElement;
      root.dataset.motion = s.motion;
      root.dataset.font = s.font;
      root.dataset.focus = s.focus;
      root.dataset.contrast = s.contrast;
      root.style.setProperty("--fs-body", s.textSize + "px");
      root.style.setProperty("--lh-body", s.lineHeight);
      root.style.setProperty("--tracking", s.tracking + "em");
    },
    subscribe(fn) { this.listeners.push(fn); },
  };
  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(CALM_KEY) || "{}"));
    } catch { return Object.assign({}, DEFAULTS); }
  }
  function save(s) { try { localStorage.setItem(CALM_KEY, JSON.stringify(s)); } catch {} }
  Calm.apply();
  window.Calm = Calm;

  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionOn = () => !prefersReducedMotion && Calm.state.motion !== "off";

  // ================================================================
  // Helpers
  // ================================================================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  function observeOnce(el, cb, opts = { threshold: 0.35 }) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { cb(e); io.disconnect(); }
      });
    }, opts);
    io.observe(el);
  }

  // ================================================================
  // S12 — CALM KIT dock UI
  // ================================================================
  function mountCalmKit() {
    const dock = $("#calm-dock");
    if (!dock) return;
    const edge = $(".calm-edge", dock);
    const closeBtn = $("#calm-close");
    function setOpen(open) {
      dock.classList.toggle("minimised", !open);
      edge.setAttribute("aria-expanded", String(open));
      edge.setAttribute("aria-label", open ? "Close Calm Kit" : "Open Calm Kit accessibility controls");
    }
    edge.addEventListener("click", () => setOpen(dock.classList.contains("minimised")));
    if (closeBtn) closeBtn.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !dock.classList.contains("minimised")) setOpen(false);
    });

    function seg(name, values) {
      const wrap = $(`[data-seg="${name}"]`);
      if (!wrap) return;
      wrap.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const val = b.dataset.v;
        Calm.set({ [name]: val });
      });
      function sync() {
        $$("button", wrap).forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === Calm.state[name]));
      }
      Calm.subscribe(sync);
      sync();
    }
    seg("motion", ["off", "low", "full"]);
    seg("font", ["default", "atkinson", "opendyslexic"]);
    seg("focus", ["visible", "hidden"]);
    seg("contrast", ["default", "high", "low-blue"]);

    const ts = $("#ck-textsize");
    if (ts) {
      ts.value = Calm.state.textSize;
      ts.addEventListener("input", () => Calm.set({ textSize: +ts.value }));
      $("#ck-textsize-val").textContent = Calm.state.textSize + "px";
      Calm.subscribe((s) => { ts.value = s.textSize; $("#ck-textsize-val").textContent = s.textSize + "px"; });
    }
    const lh = $("#ck-lineheight");
    if (lh) {
      lh.value = Calm.state.lineHeight;
      lh.addEventListener("input", () => Calm.set({ lineHeight: +lh.value }));
      Calm.subscribe((s) => { lh.value = s.lineHeight; });
    }
    const tr = $("#ck-tracking");
    if (tr) {
      tr.value = Calm.state.tracking;
      tr.addEventListener("input", () => Calm.set({ tracking: +tr.value }));
      Calm.subscribe((s) => { tr.value = s.tracking; });
    }

    // Text-size A−/A+ quick buttons
    $$("[data-ts]").forEach((b) => b.addEventListener("click", () => {
      const d = +b.dataset.ts;
      Calm.set({ textSize: Math.max(14, Math.min(24, Calm.state.textSize + d)) });
    }));
  }

  // ================================================================
  // S2 — ARCHETYPE PICKER  (data-archetype on <html>)
  // ================================================================
  function mountArchetype() {
    const row = $("#archetype-row");
    if (!row) return;
    const badge = $("#skin-badge-select");
    const current = localStorage.getItem("inclusifund.archetype") || "AC";
    setArchetype(current);

    row.addEventListener("click", (e) => {
      const tile = e.target.closest(".skin-tile");
      if (!tile) return;
      setArchetype(tile.dataset.key);
    });
    if (badge) {
      badge.addEventListener("change", () => setArchetype(badge.value));
    }

    function setArchetype(key) {
      document.documentElement.dataset.archetype = key;
      try { localStorage.setItem("inclusifund.archetype", key); } catch {}
      $$(".skin-tile", row).forEach((t) => t.setAttribute("aria-pressed", t.dataset.key === key));
      if (badge) badge.value = key;

      // Archetype presets — lightly influence Calm Kit values
      const presets = {
        A: { motion: "full", textSize: 18, lineHeight: 1.55 },
        B: { motion: "low", textSize: 16, lineHeight: 1.5 },
        C: { motion: "low", textSize: 20, lineHeight: 1.75, font: "atkinson" },
        D: { motion: "low", textSize: 16, lineHeight: 1.5 },
        E: { motion: "full", textSize: 17, lineHeight: 1.55 },
        F: { motion: "low", textSize: 15, lineHeight: 1.45 },
        AC: { motion: "full", textSize: 18, lineHeight: 1.65 },
      };
      if (presets[key]) Calm.set(presets[key]);
    }

    // Constellation pictogram (archetype E)
    const cons = $("#picto-cons");
    if (cons) {
      const svg = `
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke="#0A2A35" stroke-width="0.8" opacity="0.4">
            <line x1="20" y1="30" x2="50" y2="50"/>
            <line x1="50" y1="50" x2="80" y2="30"/>
            <line x1="50" y1="50" x2="70" y2="85"/>
            <line x1="70" y1="85" x2="35" y2="80"/>
            <line x1="35" y1="80" x2="20" y2="30"/>
          </g>
          <g fill="#0D9488">
            <circle cx="20" cy="30" r="3.2"><animate attributeName="r" values="2.5;4;2.5" dur="2.4s" repeatCount="indefinite"/></circle>
            <circle cx="50" cy="50" r="3.2" fill="#14B8A6"><animate attributeName="r" values="2.5;4;2.5" dur="2.4s" begin="0.4s" repeatCount="indefinite"/></circle>
            <circle cx="80" cy="30" r="3.2"><animate attributeName="r" values="2.5;4;2.5" dur="2.4s" begin="0.8s" repeatCount="indefinite"/></circle>
            <circle cx="70" cy="85" r="3.2" fill="#14B8A6"><animate attributeName="r" values="2.5;4;2.5" dur="2.4s" begin="1.2s" repeatCount="indefinite"/></circle>
            <circle cx="35" cy="80" r="3.2"><animate attributeName="r" values="2.5;4;2.5" dur="2.4s" begin="1.6s" repeatCount="indefinite"/></circle>
          </g>
        </svg>`;
      cons.innerHTML = svg;
    }

    // Lattice
    const latt = $("#picto-lattice");
    if (latt) {
      const pts = [];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) pts.push([i*18+4, j*18+4]);
      const circles = pts.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#0A2A35"/>`).join("");
      const lines = pts.map(([x,y], i) => pts[i+1] ? `<line x1="${x}" y1="${y}" x2="${pts[i+1][0]}" y2="${pts[i+1][1]}" stroke="#0A2A35" stroke-width="0.5" opacity="0.3"/>` : "").join("");
      latt.innerHTML = `<svg viewBox="0 0 88 88" xmlns="http://www.w3.org/2000/svg">${lines}${circles}</svg>`;
    }

    // Dot cloud (A)
    const dots = $("#picto-dots");
    if (dots) {
      let html = "";
      for (let i = 0; i < 16; i++) {
        const x = rand(15, 85), y = rand(15, 85), d = rand(0, 1.2);
        html += `<span style="left:${x}%; top:${y}%; animation-delay:${d}s"></span>`;
      }
      dots.innerHTML = html;
    }

    // Ticker
    const ticker = $("#picto-ticker");
    if (ticker) {
      let n = 9991;
      setInterval(() => {
        if (!motionOn()) return;
        n = n + Math.floor(Math.random() * 3);
        if (n > 9999) n = 0;
        ticker.textContent = String(n).padStart(4, "0");
      }, 700);
    }
  }

  // ================================================================
  // S1 — HERO particle break
  // ================================================================
  function mountHero() {
    const canvas = $("#hero-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const replayBtn = $("#hero-replay");

    const A_TEXT = "INCLUSIFUND";
    const B_TEXT = "INCLUSIFUND";
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let particles = [];
    let phase = "idle"; // idle, A, scatter, swirl, gather, B, done
    let phaseStart = 0;

    function resize() {
      const w = Math.min(1200, window.innerWidth * 0.96);
      const h = Math.min(540, window.innerHeight * 0.6);
      W = w; H = h;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", () => { resize(); sampleText(currentText()); });

    function textToPoints(text, italicWord) {
      // Offscreen to sample pixel coordinates
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const o = off.getContext("2d");
      o.fillStyle = "#2DD4BF";
      const fontSize = Math.min(W / (text.length * 0.55), H * 0.5);
      o.textBaseline = "middle";
      o.textAlign = "center";
      if (italicWord) {
        const parts = text.split(" ");
        const first = parts[0] + " ";
        const second = parts[1] || "";
        const fs = fontSize * 0.82;
        o.font = `400 ${fs}px "Fraunces", serif`;
        const firstW = o.measureText(first).width;
        o.font = `italic 400 ${fs}px "Fraunces", serif`;
        const secondW = o.measureText(second).width;
        const total = firstW + secondW;
        const startX = (W - total) / 2;
        o.font = `400 ${fs}px "Fraunces", serif`;
        o.fillStyle = "#2DD4BF";
        o.textAlign = "left";
        o.fillText(first, startX, H / 2);
        o.font = `italic 400 ${fs}px "Fraunces", serif`;
        o.fillStyle = "#5EEAD4";
        o.fillText(second, startX + firstW, H / 2);
      } else {
        o.font = `400 ${fontSize}px "Fraunces", serif`;
        o.fillText(text, W / 2, H / 2);
      }

      const img = o.getImageData(0, 0, W, H).data;
      const points = [];
      const step = Math.max(3, Math.floor(W / 380));
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const i = (y * W + x) * 4;
          if (img[i + 3] > 130) {
            points.push({ x, y, r: img[i], g: img[i + 1], b: img[i + 2] });
          }
        }
      }
      return points;
    }

    let target = [];
    function currentText() { return phase === "B" || phase === "done" ? B_TEXT : A_TEXT; }

    function sampleText(text) {
      target = textToPoints(text, false);
      // ensure particle count
      if (particles.length < target.length) {
        for (let i = particles.length; i < target.length; i++) {
          particles.push({ x: W / 2, y: H / 2, vx: 0, vy: 0, tx: 0, ty: 0, r: 45, g: 212, b: 191, size: rand(1.2, 2.4) });
        }
      } else if (particles.length > target.length * 1.4) {
        particles.length = target.length;
      }
      // Assign targets in-order
      for (let i = 0; i < particles.length; i++) {
        const t = target[i % target.length];
        particles[i].tx = t.x;
        particles[i].ty = t.y;
        particles[i].r = t.r;
        particles[i].g = t.g;
        particles[i].b = t.b;
      }
    }

    function scatter() {
      for (const p of particles) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(2, 7);
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
      }
    }

    function step(now) {
      ctx.clearRect(0, 0, W, H);
      const elapsed = (now - phaseStart) / 1000;

      for (const p of particles) {
        if (phase === "scatter") {
          // flight + slow swirl
          const cx = W / 2, cy = H / 2;
          const dx = p.x - cx, dy = p.y - cy;
          const a = 0.03;
          p.vx += -dy * a * 0.02;
          p.vy +=  dx * a * 0.02;
          p.vx *= 0.985;
          p.vy *= 0.985;
          p.x += p.vx;
          p.y += p.vy;
        } else if (phase === "gather") {
          const k = 0.09;
          p.vx = (p.vx + (p.tx - p.x) * k) * 0.78;
          p.vy = (p.vy + (p.ty - p.y) * k) * 0.78;
          p.x += p.vx;
          p.y += p.vy;
        } else {
          p.x = p.tx; p.y = p.ty;
        }
        ctx.fillStyle = `rgba(${p.r|0},${p.g|0},${p.b|0},0.95)`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      if (phase === "scatter" && elapsed > 1.4) {
        phase = "gather";
        phaseStart = now;
        sampleText(B_TEXT);
      } else if (phase === "gather" && elapsed > 0.9) {
        phase = "done";
      }

      if (phase === "scatter" || phase === "gather") requestAnimationFrame(step);
    }

    function play() {
      if (!motionOn()) { sampleText(B_TEXT); draw(); return; }
      sampleText(A_TEXT);
      draw();
      phase = "scatter";
      scatter();
      phaseStart = performance.now();
      requestAnimationFrame(step);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.fillStyle = `rgba(${p.r|0},${p.g|0},${p.b|0},0.95)`;
        ctx.fillRect(p.tx, p.ty, p.size, p.size);
      }
    }

    sampleText(A_TEXT);
    draw();
    observeOnce(canvas, () => setTimeout(play, 400));
    canvas.addEventListener("mouseenter", () => { if (phase === "done" || phase === "idle") { sampleText(A_TEXT); draw(); setTimeout(play, 100);} });
    if (replayBtn) replayBtn.addEventListener("click", () => { sampleText(A_TEXT); draw(); setTimeout(play, 100); });
  }

  // ================================================================
  // S3 — LIVING NETWORK GLOBE
  // ================================================================
  function mountGlobe() {
    const mount = $("#globe-mount");
    if (!mount) return;
    const svg = $("#uk-map", mount);
    const card = $("#globe-card");
    if (!svg) return;

    // UK projection — linear lat/lon → 400x720 viewBox
    const BOUNDS = { minLon: -6.8, maxLon: 2.0, minLat: 49.8, maxLat: 58.8 };
    const VW = 400, VH = 720;
    function proj(lat, lon) {
      const x = (lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon) * VW;
      const y = (BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat) * VH;
      return [x, y];
    }
    function pathFromLatLon(coords) {
      return coords.map(([la, lo], i) => {
        const [x, y] = proj(la, lo);
        return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }).join(" ") + " Z";
    }

    // Simplified GB coastline (clockwise from top-right)
    const GB = [
      [58.65,-3.02],[57.70,-2.20],[57.14,-2.10],[56.45,-2.80],[56.00,-2.30],
      [55.77,-1.99],[55.00,-1.43],[54.57,-1.05],[54.12,-0.08],[53.58,0.14],
      [53.10,0.45],[52.93,1.30],[52.48,1.75],[51.95,1.30],[51.37,1.43],
      [51.13,1.33],[50.85,0.58],[50.78,-0.28],[50.72,-0.80],[50.72,-1.55],
      [50.57,-2.25],[50.52,-2.45],[50.60,-3.30],[50.22,-3.65],[50.07,-5.72],
      [50.40,-5.05],[50.66,-4.76],[51.20,-4.20],[51.57,-4.30],[51.67,-4.00],
      [51.63,-3.25],[51.42,-3.18],[51.52,-3.85],[51.88,-5.30],[52.43,-4.08],
      [53.30,-4.63],[53.40,-3.10],[53.75,-3.05],[54.08,-3.22],[54.55,-3.58],
      [54.97,-3.47],[54.87,-4.40],[54.63,-4.86],[55.30,-5.77],[55.85,-5.45],
      [56.45,-6.15],[56.80,-5.60],[57.50,-5.90],[58.10,-5.15],[58.63,-5.00],
      [58.50,-4.00],[58.65,-3.02],
    ];
    // Simplified Northern Ireland coastline
    const NI = [
      [55.23,-6.15],[55.20,-6.25],[54.86,-5.80],[54.70,-5.70],[54.64,-5.55],
      [54.48,-5.45],[54.39,-5.56],[54.22,-5.65],[54.07,-6.00],[54.10,-6.25],
      [54.18,-6.33],[54.35,-7.63],[55.00,-7.32],[55.18,-6.72],[55.23,-6.15],
    ];

    // Anonymised ecosystem nodes — role descriptors only, no identifying names.
    // Per InclusiFund firewall: client-label language stays off public surfaces.
    const NODES = [
      { n:"A heritage-pub regen CIC",      loc:"South Coast",  lat:50.83, lon:-0.14, ms:"Lottery submission imminent",     gold:true },
      { n:"A heritage-pub launch partnership", loc:"South Coast", lat:50.84, lon:-0.16, ms:"Public launch this month",       gold:false },
      { n:"A creative-portal partner",     loc:"London",       lat:51.52, lon:-0.10, ms:"47K reach · weekly drops",         gold:true },
      { n:"A national-network amplifier",  loc:"London",       lat:51.56, lon:-0.12, ms:"300K+ network · partner tier",     gold:false },
      { n:"A white-label grant partner",   loc:"London",       lat:51.49, lon:-0.22, ms:"Multi-org pipeline live",          gold:true },
      { n:"A youth-skills CIC",            loc:"London",       lat:51.50, lon:-0.02, ms:"Apprentice cohort live",           gold:false },
      { n:"An equine-rescue CIC",          loc:"South East",   lat:50.95, lon:-0.45, ms:"Intake live · founder onboarded",  gold:true },
      { n:"A trades SME",                  loc:"North West",   lat:53.48, lon:-2.24, ms:"Paying client · monthly retainer", gold:false },
      { n:"A T5+ enterprise client",       loc:"Yorkshire",    lat:53.80, lon:-1.55, ms:"Drafting · evidence archived",     gold:true },
      { n:"A Scottish creative collective", loc:"Edinburgh",   lat:55.95, lon:-3.19, ms:"Partnership signed",               gold:false },
      { n:"A Welsh workshop partner",      loc:"Cardiff",      lat:51.48, lon:-3.18, ms:"Cohort 3 active",                  gold:true },
      { n:"A Glasgow community CIC",       loc:"Glasgow",      lat:55.86, lon:-4.25, ms:"First payout cleared",             gold:false },
    ];

    // Partnership wires between nodes
    const WIRES = [
      [0,1], [0,2], [2,3], [3,4], [5,2], [4,8], [6,0], [7,9], [10,6], [11,9], [5,4],
    ];

    const NS = "http://www.w3.org/2000/svg";
    function el(tag, attrs) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    // Draw coastlines
    svg.appendChild(el("path", { d: pathFromLatLon(GB), class: "uk-coast" }));
    svg.appendChild(el("path", { d: pathFromLatLon(NI), class: "uk-coast" }));

    // Draw wires (before nodes so dots sit on top)
    const wiresLayer = el("g", { class: "uk-wires-layer" });
    svg.appendChild(wiresLayer);
    const wirePaths = [];
    for (const [a, b] of WIRES) {
      const [x1, y1] = proj(NODES[a].lat, NODES[a].lon);
      const [x2, y2] = proj(NODES[b].lat, NODES[b].lon);
      const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18;
      const my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
      const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      const path = el("path", { d, class: "uk-wire", "data-a": a, "data-b": b });
      wiresLayer.appendChild(path);
      wirePaths.push({ a, b, path });
    }

    // Draw nodes
    const nodesLayer = el("g", { class: "uk-nodes-layer" });
    svg.appendChild(nodesLayer);
    NODES.forEach((node, i) => {
      const [x, y] = proj(node.lat, node.lon);
      const g = el("g", {
        class: "uk-node" + (node.gold ? " gold" : ""),
        "data-i": i,
        tabindex: 0,
        role: "button",
        "aria-label": `${node.n} — ${node.loc}`,
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
        style: `--delay: ${(i * 0.2).toFixed(2)}s`,
      });
      g.appendChild(el("circle", { class: "glow", r: 12 }));
      g.appendChild(el("circle", { class: "ring", r: 6, style: `animation-delay: ${(i * 0.2).toFixed(2)}s` }));
      g.appendChild(el("circle", { class: "dot", r: 5 }));
      const lbl = el("text", { class: "label", x: 9, y: 3 });
      lbl.textContent = node.loc;
      g.appendChild(lbl);
      nodesLayer.appendChild(g);

      function showCard(evt) {
        const r = mount.getBoundingClientRect();
        const nr = g.getBoundingClientRect();
        const cx = nr.left + nr.width / 2 - r.left;
        const cy = nr.top - r.top;
        card.innerHTML = `<strong>${node.n}</strong><div>${node.loc}</div><div class="milestone">${node.ms}</div>`;
        card.style.opacity = "1";
        const cardW = card.offsetWidth, cardH = card.offsetHeight;
        card.style.left = Math.max(8, Math.min(r.width - cardW - 8, cx - cardW / 2)) + "px";
        card.style.top = Math.max(8, cy - cardH - 8) + "px";
        // highlight wires connected to this node
        wirePaths.forEach((w) => {
          w.path.classList.toggle("hot", w.a === i || w.b === i);
        });
      }
      function hideCard() {
        card.style.opacity = "0";
        wirePaths.forEach((w) => w.path.classList.remove("hot"));
      }
      g.addEventListener("pointerenter", showCard);
      g.addEventListener("pointerleave", hideCard);
      g.addEventListener("focus", showCard);
      g.addEventListener("blur", hideCard);
    });

    // Diaspora note — the network isn't only UK, flag it honestly
    const note = document.createElement("div");
    note.className = "uk-diaspora-note";
    note.textContent = "+ 4 partners abroad — Accra · Lagos · Kingston · Paris";
    mount.appendChild(note);

    // Ticker
    const tickerEl = $("#globe-ticker");
    // Anonymised activity feed — role descriptors only. Specific £ + activity OK; no names.
    const events = [
      { who: "A heritage-pub CIC", what: "readied a £16.5K Lottery submission", ts: "2 min ago" },
      { who: "A creative-portal partner", what: "posted carousel to 47K reach", ts: "7 min ago" },
      { who: "A national-network amplifier", what: "joined partner tier", ts: "22 min ago" },
      { who: "A white-label grant partner", what: "drafted an nBS for a new CIC", ts: "35 min ago" },
      { who: "An equine-rescue CIC", what: "filed intake docs", ts: "48 min ago" },
      { who: "A paying trades SME", what: "renewed site hosting", ts: "1 hr ago" },
      { who: "A heritage-pub launch", what: "campaign moves into public phase", ts: "1 hr ago" },
      { who: "A Glasgow community CIC", what: "cleared first payout", ts: "2 hrs ago" },
      { who: "A Scottish creative collective", what: "closed a partnership", ts: "3 hrs ago" },
      { who: "A youth-skills CIC", what: "onboarded 12 apprentices", ts: "4 hrs ago" },
    ];
    let ei = 0;
    function pushEvent() {
      const e = events[ei++ % events.length];
      const div = document.createElement("div");
      div.className = "line";
      div.innerHTML = `<b>${e.who}</b> ${e.what} <em>${e.ts}</em>`;
      tickerEl.prepend(div);
      while (tickerEl.children.length > 3) tickerEl.removeChild(tickerEl.lastChild);
    }
    events.slice(0, 3).forEach(() => pushEvent());
    setInterval(pushEvent, 4200);

    // Counters
    animateCounter($("#count-communities"), 142, 1600);
    animateCounter($("#count-moved"), 1200000, 2000, "£");
    animateCounter($("#count-projects"), 87, 1400);
  }

  function animateCounter(el, target, dur = 1200, prefix = "") {
    if (!el) return;
    observeOnce(el, () => {
      const t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.floor(target * eased);
        el.textContent = prefix + val.toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function buildOutlines() {
    // abstract simplified outlines — UK + rough continent lines
    return [
      // UK mainland (rough)
      [[58,-5],[57,-2],[55,-1.5],[53,0],[51,1],[50,-1],[50,-4],[51,-5],[53,-4.5],[55,-5],[58,-5]],
      // Ireland
      [[55.3,-7.5],[54,-6],[52,-6.5],[51.5,-10],[54,-10],[55.3,-7.5]],
      // Europe swoosh
      [[70,20],[60,5],[50,-5],[45,10],[40,25],[50,30],[60,40],[70,20]],
      // West Africa
      [[15,-15],[5,-10],[0,10],[10,15],[15,0],[15,-15]],
      // Caribbean arc
      [[18,-77],[20,-75],[18,-68],[15,-65]],
    ];
  }

  // ================================================================
  // S4 — COSMIC ZOOM
  // ================================================================
  function mountZoom() {
    const stage = $("#zoom-stage");
    if (!stage) return;
    const canvas = $("#zoom-canvas");
    const ctx = canvas.getContext("2d");
    const factEl = $("#zoom-fact");
    const stepEl = $("#zoom-step");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    const LEVELS = [
      { label: "Level 1 · household",   fact: "£1 of food for tonight's family dinner.",     bodies: 1,   scale: 1 },
      { label: "Level 2 · community",   fact: "£4,200 · one community's year of workshops.", bodies: 18,  scale: 8 },
      { label: "Level 3 · InclusiFund", fact: "£1.2M moved to date · on track for £3M by October.", bodies: 70,  scale: 40 },
      { label: "Level 4 · sector gap",  fact: "1 in 3 UK CICs can't access their first £5K.", bodies: 180, scale: 160 },
      { label: "Level 5 · UK giving",   fact: "£13.1B UK philanthropy · where the gaps live.", bodies: 360, scale: 640 },
    ];
    let idx = 0, t0 = performance.now(), hold = 0, auto = true;

    // Seeded PRNG so cluster positions are stable across renders.
    function mulberry32(a) { return function() { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    const CLUSTER_FOCI = [ [0.0, 0.0], [0.55, -0.25], [-0.45, -0.35], [-0.55, 0.35], [0.40, 0.50], [0.10, -0.60] ];

    function resize() {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const ro = new ResizeObserver(resize); ro.observe(stage); resize();

    function renderSteps() {
      stepEl.innerHTML = "";
      LEVELS.forEach((_, i) => {
        const b = document.createElement("button");
        b.setAttribute("aria-label", `Go to level ${i+1}`);
        if (i === idx) b.setAttribute("aria-current", "true");
        b.addEventListener("click", () => { idx = i; auto = false; hold = 0; t0 = performance.now(); setFact(); });
        stepEl.appendChild(b);
      });
    }
    function setFact() {
      factEl.innerHTML = `<small>${LEVELS[idx].label}</small>${LEVELS[idx].fact}`;
      $$("button", stepEl).forEach((b, i) => b.toggleAttribute("aria-current", i === idx));
    }
    renderSteps(); setFact();

    // Each level's bodies are the previous level's bodies PLUS new ones clustered around foci —
    // the constellation builds up rather than scrambling. Seeded so positions are stable.
    let bodiesCache = {};
    const rng = mulberry32(0xBEEF);
    const gauss = () => { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const COLORS = ["#14B8A6", "#2DD4BF", "#5EEAD4", "#0D9488"];
    function bodiesFor(level) {
      if (bodiesCache[level]) return bodiesCache[level];
      const prev = level > 0 ? bodiesFor(level - 1).slice() : [];
      const target = LEVELS[level].bodies;
      const needed = Math.max(0, target - prev.length);
      for (let i = 0; i < needed; i++) {
        // Pick a focus; lower levels hug the centre, higher levels spread to outer foci.
        const fociCount = Math.min(CLUSTER_FOCI.length, 1 + level);
        const f = CLUSTER_FOCI[Math.floor(rng() * fociCount)];
        const spread = 0.18 + level * 0.02;
        prev.push({
          x: Math.max(-0.95, Math.min(0.95, f[0] + gauss() * spread)),
          y: Math.max(-0.95, Math.min(0.95, f[1] + gauss() * spread)),
          r: 2 + rng() * (level >= 3 ? 10 : 14),
          color: COLORS[Math.floor(rng() * COLORS.length)],
          phase: rng() * Math.PI * 2,
        });
      }
      bodiesCache[level] = prev;
      return prev;
    }

    function frame(now) {
      const el = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      const cur = LEVELS[idx];
      const next = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
      const holdTime = 2.0;
      const transTime = 1.0;
      let t;
      if (el < holdTime) t = 0;
      else t = Math.min(1, (el - holdTime) / transTime);

      const scale = lerp(cur.scale, next.scale, ease(t));

      // coin at center
      const coinR = 80 / scale;
      const cx = W/2, cy = H/2;
      if (coinR > 0.5) {
        ctx.fillStyle = "#14B8A6";
        ctx.beginPath(); ctx.arc(cx, cy, coinR, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#0B7A6F"; ctx.lineWidth = Math.max(0.5, coinR*0.06);
        ctx.beginPath(); ctx.arc(cx, cy, coinR*0.85, 0, Math.PI*2); ctx.stroke();
        if (coinR > 12) {
          ctx.fillStyle = "#0A2A35";
          ctx.font = `${coinR*0.6}px "Fraunces", serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("£", cx, cy + coinR*0.04);
        }
      }

      // bodies at current & next (crossfade)
      const bodiesA = bodiesFor(idx);
      const bodiesB = next !== cur ? bodiesFor(Math.min(idx+1, LEVELS.length-1)) : [];
      const aAlpha = 1 - t*0.7;
      const bAlpha = t;
      const baseR = Math.min(W, H) * 0.42;

      // Connective tissue — thin teal lines between close dots. Emerges from level 2 onwards.
      function drawLinks(bodies, alpha, level) {
        if (level < 2 || bodies.length < 4 || alpha < 0.02) return;
        const maxDist = 0.28 * baseR;
        ctx.strokeStyle = "#14B8A6";
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = Math.min(0.35, 0.08 + level * 0.05) * alpha;
        ctx.beginPath();
        for (let i = 0; i < bodies.length; i++) {
          const bi = bodies[i], xi = cx + bi.x * baseR, yi = cy + bi.y * baseR;
          for (let j = i + 1; j < bodies.length; j++) {
            const bj = bodies[j], xj = cx + bj.x * baseR, yj = cy + bj.y * baseR;
            const dx = xj - xi, dy = yj - yi, d2 = dx*dx + dy*dy;
            if (d2 < maxDist * maxDist) { ctx.moveTo(xi, yi); ctx.lineTo(xj, yj); }
          }
        }
        ctx.stroke();
      }
      drawLinks(bodiesA, aAlpha, idx);
      if (t > 0.05) drawLinks(bodiesB, bAlpha, Math.min(idx+1, LEVELS.length-1));

      for (const b of bodiesA) {
        const x = cx + b.x * baseR;
        const y = cy + b.y * baseR;
        const wob = 0.9 + 0.1 * Math.sin(now/1000 + b.phase);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.65 * aAlpha;
        ctx.beginPath(); ctx.arc(x, y, b.r * wob, 0, Math.PI*2); ctx.fill();
      }
      if (t > 0.05) {
        for (const b of bodiesB) {
          const x = cx + b.x * baseR;
          const y = cy + b.y * baseR;
          const wob = 0.9 + 0.1 * Math.sin(now/1000 + b.phase);
          ctx.fillStyle = b.color;
          ctx.globalAlpha = 0.65 * bAlpha;
          ctx.beginPath(); ctx.arc(x, y, b.r * wob, 0, Math.PI*2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (auto && el > holdTime + transTime + 0.4) {
        if (idx < LEVELS.length - 1) idx++;
        else idx = 0;
        setFact();          // bug fix: also update text on wrap (Level 5 → 1) so canvas + label stay in sync
        t0 = performance.now();
      }
      requestAnimationFrame(frame);
    }
    function ease(t) { return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
    observeOnce(stage, () => { t0 = performance.now(); });
    requestAnimationFrame(frame);

    stage.addEventListener("click", () => {
      auto = false;
      idx = (idx + 1) % LEVELS.length;
      setFact();
      t0 = performance.now();
      setTimeout(() => auto = true, 6000);
    });
  }

  // ================================================================
  // S5 — GRANT FUNNEL
  // ================================================================
  function mountFunnel() {
    const ta = $("#idea-textarea");
    if (!ta) return;
    const canvas = $("#funnel-canvas");
    const ctx = canvas.getContext("2d");
    const bandElig = $("#band-elig .meter i");
    const bandStrength = $("#band-strength .meter i");
    const bandFund = $("#band-fund .meter i");
    const list = $("#grants-list");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    new ResizeObserver(resize).observe(canvas); resize();

    const particles = [];
    function emitFromText(text) {
      const n = Math.min(40, text.split(/\s+/).length);
      for (let i = 0; i < n; i++) {
        particles.push({
          x: rand(W*0.2, W*0.8), y: H - 10,
          vx: rand(-0.4, 0.4), vy: rand(-3, -2),
          life: 0, max: rand(120, 220),
          color: ["#0D9488", "#14B8A6", "#0A2A35"][i % 3],
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      // funnel walls
      ctx.strokeStyle = "rgba(10,42,53,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W*0.15, H); ctx.lineTo(W*0.35, 0);
      ctx.moveTo(W*0.85, H); ctx.lineTo(W*0.65, 0);
      ctx.stroke();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        // bounce off funnel walls (linear sides)
        const topY = 0, botY = H;
        const tRatio = (botY - p.y) / (botY - topY);
        const leftX = W*0.15 + (W*0.35 - W*0.15) * tRatio;
        const rightX = W*0.85 + (W*0.65 - W*0.85) * tRatio;
        if (p.x < leftX) { p.x = leftX; p.vx *= -0.6; }
        if (p.x > rightX) { p.x = rightX; p.vx *= -0.6; }
        p.vy += 0.02;
        p.x += p.vx; p.y += p.vy;
        const a = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2); ctx.fill();
        if (p.life > p.max || p.y < -20) particles.splice(i,1);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function classify(text) {
      const t = text.toLowerCase();
      const wc = text.trim().split(/\s+/).filter(Boolean).length;
      // toy classifier
      const keywords = ["community","young","health","climate","food","housing","arts","digital","mental","training"];
      const hits = keywords.filter(k => t.includes(k)).length;
      const elig = Math.min(100, 30 + hits * 14 + wc * 0.5);
      const strength = Math.min(100, (t.includes("outcome") || t.includes("measure")) * 20 + wc * 1.2 + hits * 6);
      const fund = Math.min(100, (t.includes("£") || t.includes("funding") || t.includes("grant")) * 25 + wc * 1.1 + hits * 5);
      return { elig, strength, fund, hits };
    }

    const GRANTS = [
      { name: "National Lottery Reaching Communities", tag: "elig", amount: "£10K–£20K", dl: "rolling", detail: "Up to £20K for community projects that tackle inequality. Fit well for small CICs with a clear local outcome." },
      { name: "Comic Relief Global Majority Fund",     tag: "strength", amount: "£5K–£25K",  dl: "Nov 4",   detail: "Unrestricted grants to orgs led by and for global majority communities." },
      { name: "UK Shared Prosperity Fund (local)",     tag: "fund",     amount: "£3K–£50K",  dl: "Dec 1",   detail: "Local-authority allocated. Strongest fit if you can name the LA and named beneficiaries." },
      { name: "Tudor Trust — New Initiative",          tag: "strength", amount: "£10K–£30K", dl: "rolling", detail: "For community-rooted organisations with a specific marginalised group focus." },
      { name: "Youth Endowment Fund",                  tag: "elig",     amount: "£25K–£200K",dl: "Jan 12",  detail: "For interventions with young people at risk of violence — outcomes-led." },
      { name: "InclusiFund Seed (internal)",           tag: "fund",     amount: "£500–£5K",  dl: "rolling", detail: "Fast-turnaround seed from InclusiFund — zero-friction, eligibility-gated." },
    ];

    function renderGrants(score) {
      list.innerHTML = "";
      const scored = GRANTS.map((g) => ({ ...g, fit: Math.min(99, (score.elig + score.strength + score.fund) / 3 + (g.tag === "fund" ? 6 : 0) + rand(-4, 4)) }))
        .sort((a,b) => b.fit - a.fit);
      for (const g of scored) {
        const row = document.createElement("div");
        row.className = "grant-row";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-expanded", "false");
        row.innerHTML = `
          <div><div class="name">${g.name}</div><div class="meta">Deadline · ${g.dl}</div></div>
          <div class="fit">${g.fit.toFixed(0)}% fit</div>
          <div class="amt">${g.amount}</div>
          <button class="save" aria-label="Save ${g.name}">Save</button>
          <div class="detail">${g.detail}</div>
        `;
        row.addEventListener("click", () => {
          const ex = row.getAttribute("aria-expanded") === "true";
          row.setAttribute("aria-expanded", ex ? "false" : "true");
        });
        list.appendChild(row);
      }
    }

    let debounce;
    ta.addEventListener("input", () => {
      emitFromText(ta.value);
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const s = classify(ta.value);
        bandElig.style.width = s.elig + "%";
        bandStrength.style.width = s.strength + "%";
        bandFund.style.width = s.fund + "%";
        $("#band-elig").className = "band " + bandColor(s.elig);
        $("#band-strength").className = "band " + bandColor(s.strength);
        $("#band-fund").className = "band " + bandColor(s.fund);
        renderGrants(s);
      }, 200);
    });
    function bandColor(v) { return v > 65 ? "green" : v > 40 ? "amber" : "red"; }

    // prefill
    ta.value = "A community cooking and mental-health workshop for young people in Bristol, running monthly, reaching 30 people per session with measurable wellbeing outcomes.";
    ta.dispatchEvent(new Event("input"));
  }

  // ================================================================
  // S6 — VOICE
  // ================================================================
  function mountVoice() {
    const btn = $("#voice-btn");
    if (!btn) return;
    const canvas = $("#waveform-canvas");
    const ctx = canvas.getContext("2d");
    const transcript = $("#voice-transcript");
    const funnel = $("#voice-funnel");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W=0,H=0;
    function resize() {
      const r = canvas.getBoundingClientRect();
      W=r.width;H=r.height;canvas.width=W*DPR;canvas.height=H*DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    new ResizeObserver(resize).observe(canvas); resize();

    let recording = false, volume = 0;
    let audioCtx, analyser, source, stream;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        recording = true;
        btn.classList.add("recording");
        btn.textContent = "Listening…";
      } catch (err) {
        // fallback: simulate
        recording = true;
        btn.classList.add("recording");
        btn.textContent = "Listening (sim)";
      }
    }
    function stop() {
      recording = false;
      btn.classList.remove("recording");
      btn.textContent = "Hold to talk";
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      if (audioCtx) { audioCtx.close(); audioCtx = null; analyser = null; }
      finish();
    }
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); start(); });
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointerleave", () => { if (recording) stop(); });
    btn.addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); if (!recording) start(); } });
    btn.addEventListener("keyup", (e) => { if (e.code === "Space") { e.preventDefault(); stop(); } });

    // waveform frame
    const splashes = [];
    function frame(now) {
      ctx.clearRect(0, 0, W, H);
      let v = 0;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { sum += Math.abs(data[i] - 128); }
        v = Math.min(1, sum / data.length / 40);
      } else if (recording) {
        v = 0.25 + 0.25 * Math.sin(now/200) + Math.random()*0.15;
      }
      volume = lerp(volume, v, 0.15);

      // ribbon
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#0D9488";
      ctx.beginPath();
      for (let x = 0; x < W; x += 3) {
        const t = now/800 + x/80;
        const amp = (10 + volume*60) * (0.6 + 0.4*Math.sin(x/50));
        const y = H/2 + Math.sin(t) * amp + Math.sin(t*2.3)*amp*0.3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(20,184,166,0.6)";
      ctx.beginPath();
      for (let x = 0; x < W; x += 3) {
        const t = now/800 + x/80 + 0.7;
        const amp = (10 + volume*60) * (0.6 + 0.4*Math.sin(x/50));
        const y = H/2 + Math.sin(t) * amp * 0.8;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // splashes on peaks
      if (recording && volume > 0.55 && Math.random() < 0.4) {
        for (let i = 0; i < 4; i++) splashes.push({ x: W/2, y: H/2, vx: rand(-3,3), vy: rand(-4,-1), life: 0, max: 30, color: Math.random()<0.5?"#0D9488":"#14B8A6" });
      }
      for (let i = splashes.length-1; i>=0; i--) {
        const p = splashes[i]; p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1-p.life/p.max);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
        if (p.life>p.max) splashes.splice(i,1);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function finish() {
      transcript.innerHTML = `"I want to run a community kitchen in Leeds for unemployed parents, once a fortnight, with childcare on site."`;
      funnel.innerHTML = `
        <div class="band green"><span>eligibility</span><span class="meter"><i style="width:78%"></i></span></div>
        <div class="band amber"><span>strength</span><span class="meter"><i style="width:58%"></i></span></div>
        <div class="band green"><span>fundability</span><span class="meter"><i style="width:82%"></i></span></div>
      `;
    }
  }

  // ================================================================
  // S7 — ACTIVITY WALL
  // ================================================================
  function mountActivity() {
    const grid = $("#activity-grid");
    if (!grid) return;
    // Anonymised activity grid — composite + role-only descriptors, no identifying names.
    const EVENTS = [
      { who: "A first-time CIC founder", verb: "drafted their", obj: "nBS application", meta: "South West · 2m ago", href: "#" },
      { who: "A creative-portal partner", verb: "posted a carousel to", obj: "47K followers", meta: "London · 5m ago", href: "#" },
      { who: "A heritage-pub CIC", verb: "submitted", obj: "£16.5K to National Lottery", meta: "South Coast · 8m ago", href: "#" },
      { who: "A regen-strategy partner", verb: "met with", obj: "a landowner today", meta: "Midlands · 11m ago", href: "#" },
      { who: "A creative collective", verb: "closed", obj: "their first round", meta: "Edinburgh · 16m ago", href: "#" },
      { who: "A workshop partner", verb: "published", obj: "impact report 2026Q1", meta: "Cardiff · 22m ago", href: "#" },
      { who: "A community CIC", verb: "received", obj: "first payout of £6.4K", meta: "Yorkshire · 31m ago", href: "#" },
      { who: "A new constellation member", verb: "joined", obj: "the network", meta: "South Coast · 48m ago", href: "#" },
      { who: "An AIQ Practitioner", verb: "completed", obj: "AIQ · Practitioner band", meta: "Glasgow · 1h ago", href: "#" },
      { who: "A diaspora circle", verb: "formed", obj: "a cross-border syndicate", meta: "Lagos · 1h ago", href: "#" },
      { who: "A West Africa link", verb: "onboarded", obj: "three new members", meta: "Accra · 2h ago", href: "#" },
      { who: "A Belfast organisation", verb: "passed", obj: "eligibility for 4 grants", meta: "Belfast · 2h ago", href: "#" },
    ];
    const accents = ["t","f","g"];
    let idx = 0;
    const CARD_COUNT = 9;

    function makeCard() {
      const e = EVENTS[idx++ % EVENTS.length];
      const accent = accents[Math.floor(Math.random()*accents.length)];
      const card = document.createElement("a");
      card.className = "act-card";
      card.setAttribute("href", "https://community.inclusifund.co.uk");
      card.setAttribute("data-accent", accent);
      card.innerHTML = `
        <div class="foot"><span class="dot-accent"></span><span>in the room</span></div>
        <div class="who"><b>${e.who}</b></div>
        <div class="body" data-text="${e.verb} ${e.obj}"></div>
        <div class="foot"><span>${e.meta}</span><span class="caret">community</span></div>
      `;
      return card;
    }

    function typeInto(card) {
      const bodyEl = $(".body", card);
      const text = bodyEl.dataset.text;
      bodyEl.textContent = "";
      let i = 0;
      function type() {
        if (!bodyEl.isConnected) return;
        if (i < text.length) {
          bodyEl.textContent += text[i++];
          setTimeout(type, 22 + Math.random()*28);
        }
      }
      type();
    }

    for (let i = 0; i < CARD_COUNT; i++) {
      const c = makeCard();
      grid.appendChild(c);
      setTimeout(() => typeInto(c), 120 * i);
    }

    function rotate() {
      if (!motionOn()) return;
      const victim = grid.children[Math.floor(Math.random() * grid.children.length)];
      victim.classList.add("fading");
      setTimeout(() => {
        const repl = makeCard();
        victim.replaceWith(repl);
        typeInto(repl);
      }, 600);
    }
    setInterval(rotate, 3200);
  }

  // ================================================================
  // S8 — AIQ
  // ================================================================
  function mountAIQ() {
    const mount = $("#aiq-cards");
    if (!mount) return;
    const meterCanvas = $("#aiq-meter");
    const resultEl = $("#aiq-result");
    const ctx = meterCanvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    function resizeMeter() {
      const r = meterCanvas.getBoundingClientRect();
      meterCanvas.width = r.width*DPR; meterCanvas.height = r.height*DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    new ResizeObserver(resizeMeter).observe(meterCanvas); resizeMeter();

    const QUESTIONS = [
      { q: "How often do you use an AI assistant for real work?", opts: ["Never", "Monthly", "Weekly", "Daily"] },
      { q: "When it gets something wrong, what do you do?", opts: ["Give up", "Try again", "Rephrase carefully", "Dig into the reasoning"] },
      { q: "You're shipping a new idea next week. Which is closer to true?", opts: ["I avoid AI", "I use it for drafts", "It's in my workflow", "I build with it"] },
    ];

    const answers = [];
    let idx = 0;
    function render() {
      mount.innerHTML = "";
      QUESTIONS.forEach((q, i) => {
        const card = document.createElement("div");
        card.className = "aiq-card";
        const depth = i - idx;
        card.style.transform = `translateX(-50%) translateY(${depth*14}px) rotate(${(depth-0)*2.2}deg) scale(${1 - depth*0.04})`;
        card.style.zIndex = 10 - i;
        card.style.opacity = depth < -1 ? 0 : 1;
        card.innerHTML = `
          <div class="q"><small class="eyebrow" style="display:block;margin-bottom:8px;">Question ${i+1} / 3</small>${q.q}</div>
          <div class="aiq-chips">${q.opts.map((o,oi) => `<button class="chip" data-qi="${i}" data-oi="${oi}">${o}</button>`).join("")}</div>
        `;
        mount.appendChild(card);
      });
    }
    render();

    mount.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const qi = +chip.dataset.qi, oi = +chip.dataset.oi;
      if (qi !== idx) return;
      answers[qi] = oi;
      $$(`.chip[data-qi="${qi}"]`).forEach(c => c.setAttribute("aria-pressed", c === chip));
      // organic loader running
      loaderRunning = true; loaderProgress = (idx + 1) / QUESTIONS.length;
      setTimeout(() => {
        idx = Math.min(QUESTIONS.length, idx + 1);
        render();
        if (idx === QUESTIONS.length) reveal();
      }, 800);
    });

    function reveal() {
      const score = answers.reduce((a,b) => a+b, 0);
      const bands = ["Explorer", "Practitioner", "Architect", "Native"];
      const band = bands[Math.min(3, Math.floor(score / (QUESTIONS.length * 3 / bands.length)))];
      resultEl.innerHTML = `<div><div class="band">${band}</div><div class="pct">your provisional AIQ</div></div>`;
      resultEl.classList.add("show");
      const btn = document.createElement("a");
      btn.className = "btn";
      btn.style.marginTop = "24px";
      btn.href = "https://aiq.inclusifund.co.uk?a1=" + answers.join(",");
      btn.textContent = "See your full result at aiq.inclusifund.co.uk →";
      const container = $("#s8-aiq .aiq-layout > div:first-child");
      const existing = $("#aiq-cta");
      if (!existing) { btn.id = "aiq-cta"; container.appendChild(btn); }
    }

    let loaderRunning = false, loaderProgress = 0, loaderPhase = 0;
    function meterFrame() {
      const r = meterCanvas.getBoundingClientRect();
      const cx = r.width/2, cy = r.height/2;
      const R = Math.min(r.width, r.height)*0.42;
      ctx.clearRect(0,0,r.width,r.height);
      // ring track
      ctx.strokeStyle = "rgba(247,251,253,0.22)";
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke();

      // organic pulsing coral fill
      loaderPhase += 0.02;
      const nSeg = 64;
      ctx.beginPath();
      for (let i = 0; i <= nSeg; i++) {
        const a = (i/nSeg) * Math.PI * 2;
        const wob = 1 + 0.05*Math.sin(a*3 + loaderPhase) + 0.03*Math.sin(a*7 - loaderPhase*2);
        const rr = R * wob * (0.6 + loaderProgress*0.4);
        const x = cx + Math.cos(a-Math.PI/2) * rr;
        const y = cy + Math.sin(a-Math.PI/2) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, R*0.3, cx, cy, R);
      g.addColorStop(0, "rgba(20,184,166,0.7)");
      g.addColorStop(1, "rgba(13,148,136,0.9)");
      ctx.fillStyle = g;
      ctx.fill();

      // arc progress
      ctx.strokeStyle = "#14B8A6";
      ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI/2, -Math.PI/2 + Math.PI*2*loaderProgress);
      ctx.stroke();

      requestAnimationFrame(meterFrame);
    }
    requestAnimationFrame(meterFrame);
  }

  // ================================================================
  // S9 — TOOL CARDS + peep canvases
  // ================================================================
  function mountTools() {
    $$(".tool-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        const rx = -dy * 14;
        const ry = dx * 14;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        card.style.setProperty("--sheen-x", (dx*100+50) + "%");
        card.style.setProperty("--sheen-y", (dy*100+50) + "%");
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });

    // peep canvases — tiny synthetic tool demos
    $$(".peep-canvas").forEach((cv) => {
      const kind = cv.dataset.peep;
      const ctx = cv.getContext("2d");
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      function size() {
        const r = cv.getBoundingClientRect();
        cv.width = r.width*DPR; cv.height = r.height*DPR;
        ctx.setTransform(DPR,0,0,DPR,0,0);
      }
      new ResizeObserver(size).observe(cv); size();

      let t = 0;
      function f() {
        const r = cv.getBoundingClientRect();
        const w = r.width, h = r.height;
        t += 0.016;
        ctx.clearRect(0,0,w,h);
        ctx.fillStyle = "#F7FBFD"; ctx.fillRect(0,0,w,h);
        if (kind === "grant-finder") {
          ctx.fillStyle = "#0A2A35"; ctx.font = `10px Inter, sans`;
          ctx.fillText("Searching 384 funds…", 8, 14);
          const steps = Math.floor((t*2) % 5);
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < steps ? "#0D9488" : "#CDE9F0";
            ctx.fillRect(8, 24 + i*14, (w-16) * (0.5 + i*0.15), 8);
          }
        } else if (kind === "eligibility") {
          const sw = (Math.sin(t*2)+1)/2;
          ctx.fillStyle = sw > 0.5 ? "#14B8A6" : "#0D9488";
          ctx.fillRect(w/2-30, h/2-18, 60, 36);
          ctx.fillStyle = "#F7FBFD"; ctx.font = "bold 11px Inter,sans"; ctx.textAlign = "center";
          ctx.fillText(sw > 0.5 ? "ELIGIBLE" : "CHECKING", w/2, h/2+3);
          ctx.textAlign = "left";
        } else if (kind === "nbs") {
          ctx.fillStyle = "#0A2A35"; ctx.font = "10px Inter";
          ctx.fillText("drafting outcome 3/5", 8, 14);
          const prog = (t*0.5) % 1;
          for (let y = 24; y < h-8; y += 4) {
            ctx.fillStyle = "#0A2A35"; ctx.globalAlpha = 0.3 + 0.7*Math.max(0, prog - (y-24)/(h-32));
            ctx.fillRect(8, y, (w-16)*(0.6 + 0.4*Math.sin(t+y)), 1.5);
          }
          ctx.globalAlpha = 1;
        } else if (kind === "compliance") {
          const items = ["GDPR","Safeguarding","Trustee mix","Annual return"];
          items.forEach((it, i) => {
            ctx.fillStyle = ((t*1.5) % 4) > i ? "#14B8A6" : "#14B8A6";
            ctx.beginPath(); ctx.arc(16, 18 + i*14, 4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#0A2A35"; ctx.font = "10px Inter"; ctx.fillText(it, 26, 21 + i*14);
          });
        } else if (kind === "partnership") {
          const nodes = [[w*0.2,h*0.5],[w*0.5, h*0.3],[w*0.8, h*0.5],[w*0.5, h*0.8]];
          ctx.strokeStyle = "#14B8A6"; ctx.lineWidth = 1.2;
          for (let i = 0; i < nodes.length; i++) for (let j = i+1; j<nodes.length; j++) {
            ctx.globalAlpha = 0.5 + 0.5*Math.sin(t*2 + i + j);
            ctx.beginPath(); ctx.moveTo(nodes[i][0],nodes[i][1]); ctx.lineTo(nodes[j][0],nodes[j][1]); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          nodes.forEach((n,i)=>{ctx.fillStyle = i%2?"#0D9488":"#0A2A35"; ctx.beginPath();ctx.arc(n[0],n[1],5+Math.sin(t*2+i),0,Math.PI*2);ctx.fill();});
        } else if (kind === "impact") {
          ctx.strokeStyle = "#0D9488"; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x < w; x += 4) {
            const y = h*0.7 - (x/w * h * 0.45) - Math.sin(x/30 + t)*6;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle = "rgba(13,148,136,0.18)"; ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#0A2A35"; ctx.font = "bold 12px Inter"; ctx.fillText("+38%", 8, 16);
        }
        requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    });
  }

  // ================================================================
  // S10 — SPARK card sigil
  // ================================================================
  function mountSpark() {
    const form = $("#spark-form");
    if (!form) return;
    const name = $("#spark-name");
    const proj = $("#spark-project");
    const email = $("#spark-email");
    const card = $("#spark-card");
    const sigilMount = $("#spark-sigil");
    const nameEl = $("#spark-card-name");
    const projEl = $("#spark-card-project");
    const dateEl = $("#spark-card-date");
    const ang = { x: 130 };

    function hash(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }
    function seeded(n) {
      let s = n || 1;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function drawSigil(seed) {
      const r = seeded(seed || 1);
      const size = 200;
      let d = "";
      const petals = 4 + Math.floor(r()*4);
      const layers = 2 + Math.floor(r()*2);
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
      svg.setAttribute("xmlns", svgNS);

      // noise circle base
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", size/2); c.setAttribute("cy", size/2);
      c.setAttribute("r", size*0.42);
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", "#0A2A35");
      c.setAttribute("stroke-width", "1");
      c.setAttribute("stroke-dasharray", `2 ${3 + r()*3}`);
      c.setAttribute("opacity", "0.6");
      svg.appendChild(c);

      for (let l = 0; l < layers; l++) {
        const path = document.createElementNS(svgNS, "path");
        const radius = size*0.34 - l*18;
        const twist = r() * 0.6;
        let dd = "";
        for (let i = 0; i <= petals * 30; i++) {
          const tt = i / (petals * 30);
          const ang = tt * Math.PI * 2 * petals;
          const rr = radius * (0.6 + 0.4 * Math.sin(ang + twist));
          const x = size/2 + Math.cos(tt*Math.PI*2) * rr;
          const y = size/2 + Math.sin(tt*Math.PI*2) * rr;
          dd += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
        }
        path.setAttribute("d", dd);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", l === 0 ? "#0D9488" : (l === 1 ? "#14B8A6" : "#0A2A35"));
        path.setAttribute("stroke-width", (1.2 - l*0.3).toFixed(1));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("opacity", (0.9 - l*0.15).toFixed(2));
        svg.appendChild(path);
      }
      // central dot
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", size/2); dot.setAttribute("cy", size/2);
      dot.setAttribute("r", 4 + r()*3);
      dot.setAttribute("fill", "#0D9488");
      svg.appendChild(dot);
      sigilMount.innerHTML = "";
      sigilMount.appendChild(svg);
    }
    drawSigil(hash("spark seed"));

    function update() {
      const nm = name.value.trim() || "Your Name";
      const pr = proj.value.trim() || "Your community / project";
      nameEl.textContent = nm;
      projEl.textContent = pr;
      dateEl.textContent = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric"}).toUpperCase();
      drawSigil(hash(nm.toLowerCase()));
    }
    name.addEventListener("input", update);
    proj.addEventListener("input", update);
    update();

    // parallax
    const mount = $("#spark-card-mount");
    mount.addEventListener("mousemove", (e) => {
      const r = mount.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${dx*14}deg) rotateX(${-dy*14}deg)`;
      card.style.setProperty("--ang", (130 + dx*40) + "deg");
    });
    mount.addEventListener("mouseleave", () => { card.style.transform = ""; });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // Animate card flying up
      card.animate([
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { transform: "translateY(-40vh) scale(0.4)", opacity: 0 },
      ], { duration: 1400, easing: "cubic-bezier(.4,.1,.3,1)" });
      const globe = $("#s3-globe");
      setTimeout(() => globe && globe.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
      setTimeout(() => { card.style.transform = ""; }, 1600);
    });
  }

  // ================================================================
  // S11 — FUNDER
  // ================================================================
  function mountFunder() {
    const canvas = $("#funder-canvas");
    if (!canvas) return;
    const frames = $$(".funder-frame", canvas);
    const dotsWrap = $("#funder-dots");
    frames.forEach((_, i) => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", `Go to frame ${i+1}`);
      if (i===0) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => {
        frames[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
      dotsWrap.appendChild(b);
    });
    canvas.addEventListener("scroll", () => {
      const cx = canvas.scrollLeft + canvas.clientWidth/2;
      let closest = 0, d = Infinity;
      frames.forEach((f, i) => {
        const fc = f.offsetLeft + f.offsetWidth/2;
        const dd = Math.abs(fc - cx);
        if (dd < d) { d = dd; closest = i; }
      });
      $$("button", dotsWrap).forEach((b, i) => b.toggleAttribute("aria-current", i === closest));
    });

    // Toggle interactions + live mini-dash redraw
    const toggles = $$("#funder-toggles .toggle");
    const active = new Set(["reach", "moved"]);
    toggles.forEach((t) => {
      if (active.has(t.dataset.k)) t.setAttribute("aria-pressed", "true");
      t.addEventListener("click", () => {
        const k = t.dataset.k;
        if (active.has(k)) active.delete(k); else active.add(k);
        t.setAttribute("aria-pressed", active.has(k) ? "true" : "false");
        renderDash();
      });
    });

    function renderDash() {
      const dash = $("#funder-dash");
      const metrics = {
        reach:    { v: "142K",   l: "Reach this quarter" },
        moved:    { v: "£1.2M", l: "£ moved · £3M target Oct" },
        cost:     { v: "£38",    l: "£ / measurable outcome" },
        demo:     { v: "73%",    l: "Global-majority-led" },
        geo:      { v: "4 Nations", l: "Geographic spread" },
      };
      dash.innerHTML = Array.from(active).slice(0,4).map(k => `<div class="stat"><div class="v">${metrics[k].v}</div><div class="l">${metrics[k].l}</div></div>`).join("") || `<div class="stat"><div class="v">—</div><div class="l">Select metrics →</div></div>`;

      // redraw mini chart
      drawMiniChart();
    }
    renderDash();

    function drawMiniChart() {
      const cv = $("#funder-mini-chart");
      if (!cv) return;
      const ctx = cv.getContext("2d");
      const r = cv.getBoundingClientRect();
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = r.width*DPR; cv.height = r.height*DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
      const w = r.width, h = r.height;
      ctx.clearRect(0,0,w,h);
      ctx.strokeStyle = "#CDE9F0";
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, h*i/4); ctx.lineTo(w, h*i/4); ctx.stroke(); }
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        pts.push([i/12*w, h - (0.3 + 0.5*Math.sin(i/2 + active.size) + Math.random()*0.1)*h]);
      }
      ctx.strokeStyle = "#0D9488"; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = "rgba(13,148,136,0.12)"; ctx.fill();
    }

    // Mini UK map dots
    const mapEl = $("#funder-mini-map");
    if (mapEl) {
      const coords = [[30,20],[45,30],[40,50],[55,35],[35,65],[50,80],[28,45],[48,25]];
      mapEl.innerHTML = `
        <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <path d="M25,10 Q35,5 45,15 L55,25 Q60,40 55,60 L48,80 Q40,90 30,82 L22,70 Q15,55 18,40 L22,22 Q23,14 25,10 Z" fill="#E6F4F8" stroke="#0A2A35" stroke-width="0.5"/>
          ${coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${1.5+i%3}" fill="${i%2?'#0D9488':'#14B8A6'}"><animate attributeName="r" values="${1+i%3};${2.5+i%3};${1+i%3}" dur="${2+i*0.3}s" repeatCount="indefinite"/></circle>`).join("")}
        </svg>`;
    }
  }

  // ================================================================
  // Bootstrap
  // ================================================================
  function boot() {
    mountCalmKit();
    mountArchetype();
    mountHero();
    mountGlobe();
    mountZoom();
    mountFunnel();
    mountVoice();
    mountActivity();
    mountAIQ();
    mountTools();
    mountSpark();
    mountFunder();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
