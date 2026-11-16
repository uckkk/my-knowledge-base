/* Stone 效果 Web 等价：连续 SDF 表面，不是 Metal。参数来自源码。 */
(function (global) {
  "use strict";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function smin(a, b, k) {
    k = Math.max(k, 1e-3);
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }
  const smax = (a, b, k) => -smin(-a, -b, k);

  function sdCircle(px, py, cx, cy, r) {
    return Math.hypot(px - cx, py - cy) - r;
  }

  function sdRoundBox(px, py, hx, hy, r) {
    r = Math.min(r, Math.min(hx, hy));
    const qx = Math.abs(px) - hx + r;
    const qy = Math.abs(py) - hy + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function sdTaper(px, py, ax, ay, bx, by, ra, rb) {
    const pax = px - ax, pay = py - ay;
    const bax = bx - ax, bay = by - ay;
    const h = clamp((pax * bax + pay * bay) / Math.max(bax * bax + bay * bay, 1e-4), 0, 1);
    return Math.hypot(pax - bax * h, pay - bay * h) - mix(ra, rb, h);
  }

  function sdPolygon(px, py, verts) {
    let d = Infinity, s = 1;
    for (let i = 0, j = verts.length - 2; i < verts.length; j = i, i += 2) {
      const ex = verts[j] - verts[i], ey = verts[j + 1] - verts[i + 1];
      const wx = px - verts[i], wy = py - verts[i + 1];
      const t = clamp((wx * ex + wy * ey) / Math.max(ex * ex + ey * ey, 1e-8), 0, 1);
      d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
      const c1 = py >= verts[i + 1], c2 = py < verts[j + 1], c3 = ex * wy - ey * wx > 0;
      if (c1 !== c2 && c3 === c1) s = -s;
    }
    return d * s;
  }

  function regularPoly(n, r, rot) {
    const v = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i * Math.PI * 2) / n;
      v.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    return v;
  }

  function shapeSDF(px, py, kind, r) {
    const x = px, y = py;
    switch (kind) {
      case "circle":
        return Math.hypot(x, y) - r;
      case "squircle":
        return sdRoundBox(x, y, r * 0.92, r * 0.92, r * 0.62);
      case "capsule":
        return sdRoundBox(x, y, r * 0.62, r * 0.92, r * 0.62);
      case "triangle":
      case "rice":
        return sdPolygon(x, y, [0, -r * 0.95, r * 0.92, r * 0.78, -r * 0.92, r * 0.78]) - r * 0.14;
      case "diamond":
        return sdPolygon(x, y, [0, -r, r * 0.78, 0, 0, r, -r * 0.78, 0]) - r * 0.08;
      case "blob": {
        const d0 = Math.hypot(x, y - r * 0.08) - r * 0.82;
        const d1 = Math.hypot(x - r * 0.28, y + r * 0.18) - r * 0.58;
        const d2 = Math.hypot(x + r * 0.3, y + r * 0.12) - r * 0.55;
        return smin(smin(d0, d1, r * 0.35), d2, r * 0.32);
      }
      case "hexagon":
        return sdPolygon(x, y, regularPoly(6, r, Math.PI / 6)) - r * 0.06;
      case "teardrop": {
        const d0 = Math.hypot(x, y - r * 0.22) - r * 0.72;
        const tip = sdTaper(x, y, 0, -r * 0.05, 0, -r * 0.98, r * 0.62, r * 0.08);
        return smin(d0, tip, r * 0.28);
      }
      case "bean": {
        const d0 = Math.hypot(x - r * 0.28, y) - r * 0.66;
        const d1 = Math.hypot(x + r * 0.28, y + r * 0.04) - r * 0.62;
        return smin(d0, d1, r * 0.42);
      }
      case "pentagon":
        return sdPolygon(x, y, regularPoly(5, r, -Math.PI / 2)) - r * 0.08;
      case "star": {
        const v = [];
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const b = a + Math.PI / 5;
          v.push(Math.cos(a) * r, Math.sin(a) * r, Math.cos(b) * r * 0.42, Math.sin(b) * r * 0.42);
        }
        return sdPolygon(x, y, v) - r * 0.05;
      }
      case "twin": {
        const d0 = Math.hypot(x, y + r * 0.08) - r * 0.72;
        const e0 = Math.hypot(x - r * 0.55, y - r * 0.5) - r * 0.28;
        const e1 = Math.hypot(x + r * 0.55, y - r * 0.5) - r * 0.28;
        return smin(smin(d0, e0, r * 0.28), e1, r * 0.28);
      }
      default:
        return Math.hypot(x, y) - r;
    }
  }

  const TINTS = {
    ink: { light: [16, 16, 19], dark: [12, 12, 15], on: [255, 255, 255], zh: "墨" },
    porcelain: { light: [247, 244, 238], dark: [238, 234, 226], on: [26, 26, 23], zh: "瓷" },
    vermilion: { light: [200, 48, 43], dark: [220, 68, 55], on: [255, 255, 255], zh: "朱" },
    jade: { light: [14, 122, 92], dark: [23, 148, 112], on: [255, 255, 255], zh: "翠" },
    lapis: { light: [31, 79, 180], dark: [55, 103, 210], on: [255, 255, 255], zh: "青" },
    amethyst: { light: [106, 61, 176], dark: [132, 86, 203], on: [255, 255, 255], zh: "紫" },
  };
  const STATES = {
    idle: null,
    loading: null,
    success: { light: [26, 154, 86], dark: [38, 178, 107] },
    warning: { light: [224, 150, 15], dark: [240, 170, 42], on: [42, 28, 4] },
    destructive: { light: [210, 48, 46], dark: [229, 75, 71] },
    disabled: null,
  };

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function pigment(tint, state) {
    const dark = isDark();
    const st = STATES[state];
    if (st && st[dark ? "dark" : "light"]) return st[dark ? "dark" : "light"].map((c) => c / 255);
    const t = TINTS[tint] || TINTS.ink;
    return t[dark ? "dark" : "light"].map((c) => c / 255);
  }

  function onColor(tint, state) {
    if (state === "warning") return [42 / 255, 28 / 255, 4 / 255];
    const t = TINTS[tint] || TINTS.ink;
    return t.on.map((c) => c / 255);
  }

  function lacquerShade(d, gx, gy, tiltX, tiltY, base, bevel, finish) {
    const cov = clamp(0.5 - d / 0.8, 0, 1);
    if (cov <= 0) return [0, 0, 0, 0];
    const depth = clamp(-d / Math.max(bevel, 0.5), 0, 1);
    let s = 1 - depth;
    s = s * s;
    let nx = gx * s * 1.7, ny = gy * s * 1.7, nz = 1;
    const inv = 1 / Math.hypot(nx, ny, nz);
    nx *= inv; ny *= inv; nz *= inv;
    const rx = 2 * nz * nx, ry = 2 * nz * ny;
    const ex = rx + tiltX * 0.35, ey = ry + tiltY * 0.35;
    const softbox = (1 - smoothstep(-0.55, -0.12, ey)) * (1 - smoothstep(0.55, 0.95, Math.abs(ex)));
    const wqx = Math.abs(ex - 0.48) - 0.1, wqy = Math.abs(ey + 0.3) - 0.16;
    const window = 1 - smoothstep(0, 0.05, Math.max(wqx, wqy));
    const floorRefl = smoothstep(0.25, 0.75, ey) * 0.32;
    let fres = Math.max(1 - nz, 0);
    fres = clamp(fres * 3, 0, 1);
    const env = (softbox * 0.85 + window * 0.9 + floorRefl) * (0.12 + 0.88 * fres);
    const l1x = -0.45 - tiltX * 0.5, l1y = -0.6 - tiltY * 0.5, l1z = 0.65;
    const l2x = 0.55 - tiltX * 0.5, l2y = -0.35 - tiltY * 0.5, l2z = 0.75;
    const n1 = 1 / Math.hypot(l1x, l1y, l1z + 1);
    const n2 = 1 / Math.hypot(l2x, l2y, l2z + 1);
    const h1x = l1x * n1, h1y = l1y * n1, h1z = (l1z + 1) * n1;
    const h2x = l2x * n2, h2y = l2y * n2, h2z = (l2z + 1) * n2;
    const g1 = Math.pow(Math.max(nx * h1x + ny * h1y + nz * h1z, 0), 220);
    const g2 = Math.pow(Math.max(nx * h2x + ny * h2y + nz * h2z, 0), 420);
    const face = 0.035 * (1 - depth * 0.6);
    const gloss = finish === "matte" ? 0.22 : 1;
    const col0 = clamp(base[0] + env * gloss + (g1 + g2) * 1.25 * gloss + face, 0, 1);
    const col1 = clamp(base[1] + env * gloss + (g1 + g2) * 1.25 * gloss + face, 0, 1);
    const col2 = clamp(base[2] + env * gloss + (g1 + g2) * 1.25 * gloss + face, 0, 1);
    return [col0, col1, col2, cov];
  }

  function gradient(fn, x, y, eps) {
    const e = eps || 0.8;
    return [(fn(x + e, y) - fn(x - e, y)) / (2 * e), (fn(x, y + e) - fn(x, y - e)) / (2 * e)];
  }


  function requireCanvas(el, label) {
    if (!el || typeof el.getContext !== "function") {
      throw new Error("StoneFX: " + (label || "目标") + " 不是 canvas");
    }
    return el;
  }

  function measureCanvas(canvas, cssH, minW, opts) {
    opts = opts || {};
    requireCanvas(canvas, "measureCanvas");
    cssH = Math.max(1, cssH || 180);
    if (!opts.fixed) {
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = cssH + "px";
    }
    const parent = canvas.parentElement;
    let cssW = 0;
    if (parent) {
      cssW = parent.clientWidth || (parent.getBoundingClientRect ? parent.getBoundingClientRect().width : 0);
    }
    if (!cssW) cssW = canvas.clientWidth;
    if (!cssW && canvas.getBoundingClientRect) cssW = canvas.getBoundingClientRect().width;
    cssW = Math.max(cssW || 0, minW || 160);
    return { cssW: Math.round(cssW), cssH: Math.round(cssH) };
  }

  function rasterSDF(canvas, field, opts) {
    const o = opts || {};
    requireCanvas(canvas, "rasterSDF");
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let cssW, cssH;
    if (o.fixed) {
      cssW = o.cssW || canvas.clientWidth || 52;
      cssH = o.height || canvas.clientHeight || 32;
    } else {
      const m = measureCanvas(canvas, o.height || o.cssH, o.minW);
      cssW = o.cssW || m.cssW;
      cssH = m.cssH;
    }
    const step = o.step || (cssW * cssH > 180000 ? 2 : 1);
    const w = Math.max(1, Math.round(cssW * dpr / step));
    const h = Math.max(1, Math.round(cssH * dpr / step));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const base = o.base || [0.05, 0.05, 0.06];
    const bevel = o.bevel || 7;
    const finish = o.finish || "gloss";
    const tiltX = o.tiltX || 0;
    const tiltY = o.tiltY || 0;
    const glass = o.opacity == null ? 1 : o.opacity;
    const ghost = !!o.ghost;
    const sx = cssW / w, sy = cssH / h;
    for (let y = 0; y < h; y++) {
      const py = (y + 0.5) * sy;
      for (let x = 0; x < w; x++) {
        const px = (x + 0.5) * sx;
        const d = field(px, py);
        let shade = 1;
        if (ghost) {
          const edge = Math.abs(d);
          if (edge > 3.2 && d > 0) { const i = (y * w + x) * 4; data[i+3] = 0; continue; }
          shade = d < 0 ? mix(0.2, 0.08, clamp(-d / bevel, 0, 1)) : 1;
        }
        const g = gradient(field, px, py, 0.9);
        const c = lacquerShade(d, g[0], g[1], tiltX, tiltY, base, bevel, finish);
        const i = (y * w + x) * 4;
        data[i] = Math.round(c[0] * 255);
        data[i + 1] = Math.round(c[1] * 255);
        data[i + 2] = Math.round(c[2] * 255);
        data[i + 3] = Math.round(c[3] * 255 * glass * shade);
      }
    }
    ctx.putImageData(img, 0, 0);
    return { cssW, cssH, dpr };
  }

  /* ----- springs ----- */
  function springStep(pos, vel, target, dt, response, damping) {
    const omega = (2 * Math.PI) / Math.max(response, 0.04);
    const acc = -2 * damping * omega * vel - omega * omega * (pos - target);
    const v = vel + acc * dt;
    const x = pos + v * dt;
    return [x, v];
  }

  function reduceMotion() {
    return document.documentElement.classList.contains("reduce-motion");
  }

  /* ----- Goo field (drag blobs) ----- */
  function mountGooField(canvas) {
    const blobs = [
      { x: 110, y: 90, r: 36 },
      { x: 190, y: 100, r: 28 },
      { x: 150, y: 150, r: 22 },
    ];
    let drag = -1, dirty = true, running = false;

    function field(px, py) {
      let d = 1e5;
      for (const b of blobs) d = smin(d, sdCircle(px, py, b.x, b.y, b.r), 22);
      return d;
    }
    function draw() {
      const dark = isDark();
      const base = dark ? [0.05, 0.12, 0.1] : [0.06, 0.22, 0.16];
      rasterSDF(canvas, field, { base, bevel: 10, height: 200 });
      dirty = false;
    }
    function loop() {
      running = false;
      if (dirty) draw();
    }
    function request() {
      dirty = true;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    requireCanvas(canvas, "goo-field");
    measureCanvas(canvas, 200, 320);
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      const p = pos(e);
      let best = 0, bd = 1e9;
      blobs.forEach((b, i) => {
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < bd) { bd = d; best = i; }
      });
      drag = best;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (drag < 0) return;
      const p = pos(e);
      blobs[drag].x = p.x;
      blobs[drag].y = p.y;
      request();
    });
    canvas.addEventListener("pointerup", () => { drag = -1; });
    canvas.addEventListener("pointercancel", () => { drag = -1; });
    draw();
    return { redraw: request };
  }

  /* ----- Goo morph ----- */
  function mountGooMorph(canvas) {
    requireCanvas(canvas, "goo-morph");
    let progress = 0, target = 0, vel = 0, raf = 0;
    measureCanvas(canvas, 220, 320);

    function field(px, py, t, W, H) {
      const from = { x: W / 2, y: 168, hx: 28, hy: 28, r: 28 };
      const to = { x: W / 2, y: 70, hx: W / 2 - 8, hy: 70, r: 20 };
      const x = mix(from.x, to.x, t);
      const y = mix(from.y, to.y, t);
      const hx = mix(from.hx, to.hx, t);
      const hy = mix(from.hy, to.hy, t);
      const rad = mix(from.r, to.r, t);
      let d = sdRoundBox(px - x, py - y, hx, hy, rad);
      if (t > 0.12 && t < 0.88) {
        const u = (t - 0.12) / 0.76;
        const dropY = mix(from.y, to.y + 40, u);
        const dropR = 7 * Math.sin(Math.PI * u);
        d = smin(d, sdCircle(px, py, W / 2 + 36 * Math.sin(u * 3), dropY, dropR), 14);
        d = smin(d, sdCircle(px, py, W / 2 - 28, mix(from.y, to.y + 20, u * 0.8), 5 * Math.sin(Math.PI * u)), 12);
      }
      return d;
    }

    function draw() {
      const W = measureCanvas(canvas, 220, 320).cssW;
      const base = isDark() ? [0.07, 0.08, 0.12] : [0.07, 0.07, 0.09];
      rasterSDF(canvas, (px, py) => field(px, py, progress, W, 220), { base, bevel: 9, height: 220, cssW: W });
    }

    function tick() {
      raf = 0;
      const rm = reduceMotion();
      if (rm) {
        progress = target;
      } else {
        const dt = 1 / 60;
        const preset = target > progress ? { r: 0.55, d: 0.7 } : { r: 0.45, d: 1 };
        const s = springStep(progress, vel, target, dt, preset.r, preset.d);
        progress = s[0]; vel = s[1];
      }
      draw();
      if (Math.abs(progress - target) > 0.001 || Math.abs(vel) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    }

    canvas.addEventListener("click", () => {
      target = target > 0.5 ? 0 : 1;
      vel = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    draw();
    return { redraw: draw, toggle() { canvas.click(); } };
  }

  /* ----- Goo toggle ----- */
  function mountGooToggle(canvas, input) {
    requireCanvas(canvas, "goo-toggle");
    let on = !!input.checked, amt = on ? 1 : 0, vel = 0, raf = 0;
    const W = 52, H = 32;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    canvas.width = W * 2; canvas.height = H * 2;

    function field(px, py) {
      const track = sdRoundBox(px - W / 2, py - H / 2, W / 2, H / 2, H / 2);
      const tx = mix(16, 36, amt);
      const thumb = sdCircle(px, py, tx, H / 2, 14);
      return smin(track, thumb, 7);
    }

    function draw() {
      const acc = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#f2551d";
      const rgb = hexToRgb(acc);
      const off = isDark() ? [0.23, 0.23, 0.24] : [0.84, 0.84, 0.82];
      const base = [
        mix(off[0], rgb[0], amt),
        mix(off[1], rgb[1], amt),
        mix(off[2], rgb[2], amt),
      ];
      rasterSDF(canvas, field, { base, bevel: 5, finish: "gloss", fixed: true, cssW: W, height: H });
    }

    function tick() {
      raf = 0;
      const s = springStep(amt, vel, on ? 1 : 0, 1 / 60, 0.32, 0.82);
      amt = s[0]; vel = s[1];
      draw();
      if (Math.abs(amt - (on ? 1 : 0)) > 0.002 || Math.abs(vel) > 0.002) raf = requestAnimationFrame(tick);
    }

    canvas.addEventListener("click", () => {
      if (input.disabled) return;
      on = !on;
      input.checked = on;
      input.dispatchEvent(new Event("change"));
      if (reduceMotion()) { amt = on ? 1 : 0; vel = 0; draw(); return; }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    draw();
    return { redraw: draw };
  }

  function hexToRgb(hex) {
    hex = hex.replace("#", "").trim();
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /* ----- Lacquer goo button ----- */
  function mountLacquerButton(canvas, opts) {
    requireCanvas(canvas, "lacquer-button");
    const o = Object.assign({
      title: "锁定描图",
      style: "filled", // filled glass icon ghost
      tint: "ink",
      state: "idle",
      finish: "gloss",
    }, opts || {});
    const isIcon = o.style === "icon";
    const cssH = isIcon ? 160 : 180;
    canvas.style.height = cssH + "px";
    canvas.style.width = "100%";

    const st = {
      pointer: null,
      down: false,
      latched: false,
      snapped: false,
      lobe: 0,
      lobeV: 0,
      finger: null,
    };

    function layout() {
      const m = measureCanvas(canvas, cssH, isIcon ? 120 : 160);
      const W = m.cssW, H = m.cssH;
      if (isIcon) {
        return { W, H, cx: W / 2, cy: H / 2, hx: 28, hy: 28, r: 28 };
      }
      return { W, H, cx: W / 2, cy: H / 2, hx: Math.min(110, W * 0.36), hy: 28, r: 28 };
    }

    function field(px, py, L) {
      const body = sdRoundBox(px - L.cx, py - L.cy, L.hx, L.hy, L.r);
      if (st.lobe < 0.04 || !st.finger) return body;
      const dx = st.finger.x - L.cx, dy = st.finger.y - L.cy;
      const len = Math.max(Math.hypot(dx, dy), 1e-3);
      const nx = dx / len, ny = dy / len;
      const edge = Math.hypot(L.hx * nx, L.hy * ny);
      const baseX = L.cx + nx * Math.min(edge, L.hx);
      const baseY = L.cy + ny * Math.min(edge, L.hy);
      const pullD = Math.max(0, len - edge);
      const neckLen = st.lobe * Math.min(pullD + 2, 14 + pullD * 0.88);
      const tipX = baseX + nx * (7 + neckLen);
      const tipY = baseY + ny * (7 + neckLen);
      const rootR = mix(10, 16, st.lobe) * (isIcon ? 0.85 : 1);
      const tipR = mix(5, 3.2, clamp(pullD / 90, 0, 1));
      let dN = sdTaper(px, py, baseX, baseY, tipX, tipY, rootR, tipR);
      const shTipX = baseX + nx * Math.min(neckLen * 0.48, 16);
      const shTipY = baseY + ny * Math.min(neckLen * 0.48, 16);
      dN = smin(dN, sdTaper(px, py, baseX, baseY, shTipX, shTipY, rootR * 1.28, rootR * 0.82), 12);
      let d = smin(body, dN, Math.max(6, 10 + pullD * 0.08));

      // forked filaments as tapered capsules, not strokes
      if (st.lobe > 0.25 && pullD > 18) {
        const tgX = -ny, tgY = nx;
        const fork = clamp((pullD - 18) / 70, 0, 1) * st.lobe;
        for (const side of [-1, 1]) {
          const spread = 10 * fork + 4;
          const ax = tipX + tgX * side * 2, ay = tipY + tgY * side * 2;
          const bx = st.finger.x + tgX * side * spread;
          const by = st.finger.y + tgY * side * spread * 0.8;
          const midX = mix(ax, bx, 0.45) + tgX * side * (6 * fork);
          const midY = mix(ay, by, 0.45) + tgY * side * (6 * fork);
          const rA = tipR * 0.9, rM = mix(3.2, 1.6, fork), rB = mix(2.2, 0.9, fork);
          let fil = sdTaper(px, py, ax, ay, midX, midY, rA, rM);
          fil = smin(fil, sdTaper(px, py, midX, midY, bx, by, rM, rB), 6);
          // branch
          const cx2 = midX + nx * 14 + tgX * side * 16 * fork;
          const cy2 = midY + ny * 14 + tgY * side * 16 * fork;
          fil = smin(fil, sdTaper(px, py, midX, midY, cx2, cy2, rM * 0.85, 1.1), 5);
          d = smin(d, fil, 8);
        }
        if (!st.snapped) {
          const bead = sdCircle(px, py, st.finger.x, st.finger.y, mix(7, 4, clamp(pullD / 120, 0, 1)));
          d = smin(d, bead, 8);
        }
      }
      return d;
    }

    function draw() {
      const L = layout();
      const base = pigment(o.tint, o.state === "loading" ? "idle" : o.state);
      const ghost = o.style === "ghost";
      const opacity = o.style === "glass" ? 0.42 : (o.state === "disabled" ? 0.45 : 1);
      rasterSDF(canvas, (px, py) => field(px, py, L), {
        base, bevel: 8, finish: o.finish, opacity, ghost, height: cssH,
      });
      const ctx = canvas.getContext("2d");
      const ink = onColor(o.tint, o.state);
      ctx.save();
      ctx.setTransform(canvas.width / L.W, 0, 0, canvas.height / cssH, 0, 0);
      ctx.fillStyle = `rgba(${Math.round(ink[0]*255)},${Math.round(ink[1]*255)},${Math.round(ink[2]*255)},${o.state === "disabled" ? 0.45 : 0.92})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (isIcon) {
        ctx.font = "600 18px " + getComputedStyle(document.body).fontFamily;
        ctx.fillText(o.title || "●", L.cx, L.cy);
      } else {
        ctx.font = "600 17px " + getComputedStyle(document.body).fontFamily;
        if (o.state === "loading") {
          const t = (performance.now() / 800) % 1;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(L.cx, L.cy, 9, t * Math.PI * 2, t * Math.PI * 2 + 4);
          ctx.stroke();
        } else {
          ctx.fillText(o.title, L.cx, L.cy);
        }
      }
      ctx.restore();
    }

    let raf = 0;
    function tick() {
      raf = 0;
      const L = layout();
      let target = 0;
      if (st.down && st.finger && !st.snapped && o.state !== "disabled") {
        const dx = st.finger.x - L.cx, dy = st.finger.y - L.cy;
        const inside = Math.abs(dx) <= L.hx + 8 && Math.abs(dy) <= L.hy + 8;
        target = inside && !st.latched ? 0.15 : 1;
        const pull = Math.hypot(dx, dy);
        if (pull > 118) {
          st.snapped = true;
          target = 0;
        }
      }
      if (reduceMotion()) {
        st.lobe = target;
        st.lobeV = 0;
        draw();
        if (st.down) raf = requestAnimationFrame(tick);
        return;
      }
      const retracting = !st.down && st.lobe > 0.04;
      const resp = retracting ? 0.42 : (st.latched ? 0.34 : 0.5);
      const damp = retracting ? 0.4 : 0.7;
      const s = springStep(st.lobe, st.lobeV, target, 1 / 60, resp, damp);
      st.lobe = s[0]; st.lobeV = s[1];
      if (st.lobe < 0.02 && !st.down) { st.lobe = 0; st.lobeV = 0; st.finger = null; st.snapped = false; st.latched = false; }
      draw();
      if (st.down || st.lobe > 0.01 || Math.abs(st.lobeV) > 0.001) raf = requestAnimationFrame(tick);
    }

    function ptr(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener("pointerdown", (e) => {
      if (o.state === "disabled") return;
      canvas.setPointerCapture(e.pointerId);
      st.down = true; st.snapped = false; st.latched = false;
      st.finger = ptr(e);
      if (!raf) raf = requestAnimationFrame(tick);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!st.down) return;
      st.finger = ptr(e);
      const L = layout();
      const pull = Math.hypot(st.finger.x - L.cx, st.finger.y - L.cy);
      if (pull > 36) st.latched = true;
    });
    canvas.addEventListener("pointerup", () => { st.down = false; });
    canvas.addEventListener("pointercancel", () => { st.down = false; });

    o.set = function (patch) { Object.assign(o, patch); draw(); };
    draw();
    return { redraw: draw, set: o.set };
  }

  /* ----- Gaze v8 ----- */
  const GAZE = {
    socketAx: 0.34, socketAy: 0.08,
    socketW: 0.115, socketH: 0.1107,
    travelX: 0.25, travelY: 0.24,
    pupil: 0.02,
    eyeScale: 0.82,
    inkBlend: 0.52,
    glintBlend: 0.14,
    mouthX: 0, mouthY: 0.33,
    mouthLimX: 0.11, mouthLimY: 0.035,
  };

  function lookToward(px, py, cx, cy, radius, limit) {
    const lim = limit == null ? 0.52 : limit;
    const dx = px - cx, dy = py - cy;
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, (len / Math.max(radius, 1)) * 0.85);
    return { x: clamp((dx / len) * reach, -lim, lim), y: clamp((dy / len) * reach, -lim, lim) };
  }

  const bodyCache = new Map();
  function themeKey() {
    return (isDark() ? "d" : "l") + "|" + (document.documentElement.getAttribute("data-finish") || "gloss");
  }
  function bodySprite(shape, tint, r, finish) {
    const key = [themeKey(), shape, tint, Math.round(r * 10), finish].join("|");
    if (bodyCache.has(key)) return bodyCache.get(key);
    const base = pigment(tint, "idle");
    const size = Math.ceil(r * 2.4);
    const off = document.createElement("canvas");
    const dpr = 2;
    off.width = size * dpr; off.height = size * dpr;
    const field = (px, py) => shapeSDF(px - size / 2, py - size / 2, shape, r);
    const octx = off.getContext("2d");
    const img = octx.createImageData(off.width, off.height);
    const data = img.data;
    const sx = size / off.width, sy = size / off.height;
    for (let y = 0; y < off.height; y++) {
      const py = (y + 0.5) * sy;
      for (let x = 0; x < off.width; x++) {
        const px = (x + 0.5) * sx;
        const d = field(px, py);
        const g = gradient(field, px, py, 0.7);
        const c = lacquerShade(d, g[0], g[1], 0, 0, base, Math.max(5, r * 0.16), finish);
        const i = (y * off.width + x) * 4;
        data[i] = c[0] * 255; data[i+1] = c[1] * 255; data[i+2] = c[2] * 255; data[i+3] = c[3] * 255;
      }
    }
    octx.putImageData(img, 0, 0);
    const rec = { canvas: off, size };
    bodyCache.set(key, rec);
    return rec;
  }
  function clearBodyCache() { bodyCache.clear(); }

  function drawFace(ctx, cx, cy, r, shape, tint, pose, finish) {
    const sprite = bodySprite(shape, tint, r, finish || "gloss");
    ctx.drawImage(sprite.canvas, cx - sprite.size / 2, cy - sprite.size / 2, sprite.size, sprite.size);

    const look = pose.look || { x: 0, y: 0 };
    const blink = pose.blink || 0;
    const expr = pose.expression || "idle";
    const blush = pose.blush || (expr === "kiss" || expr === "pout" ? 0.45 : expr === "brightSmile" ? 0.25 : 0);
    const scaleY = mix(1, 0.08, blink);

    // blush
    if (blush > 0.01) {
      ctx.fillStyle = `rgba(220,70,80,${0.22 * blush})`;
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.42, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + r * 0.42, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const ink = isDark() ? [244, 244, 242] : [18, 18, 17];
    const sclera = isDark() ? [40, 40, 44] : [250, 248, 244];
    for (const side of [-1, 1]) {
      const ax = cx + side * r * GAZE.socketAx;
      const ay = cy + r * GAZE.socketAy;
      const ox = look.x * r * GAZE.travelX;
      const oy = look.y * r * GAZE.travelY;
      const ew = r * GAZE.socketW * GAZE.eyeScale * 2;
      const eh = r * GAZE.socketH * GAZE.eyeScale * 2 * scaleY;
      if (eh < 0.6) {
        ctx.strokeStyle = `rgba(${ink.join(",")},${GAZE.inkBlend})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ax + ox - ew * 0.6, ay + oy);
        ctx.lineTo(ax + ox + ew * 0.6, ay + oy);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = `rgb(${sclera.join(",")})`;
      ctx.beginPath();
      ctx.ellipse(ax + ox, ay + oy, ew / 2, eh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${ink.join(",")},${GAZE.inkBlend})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      const px = ax + ox + look.x * r * GAZE.pupil;
      const py = ay + oy + look.y * r * GAZE.pupil;
      const pr = Math.min(ew, eh) * 0.34;
      ctx.fillStyle = `rgba(${ink.join(",")},0.88)`;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * scaleY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${GAZE.glintBlend + 0.35})`;
      ctx.beginPath();
      ctx.ellipse(px - pr * 0.35, py - pr * 0.4 * scaleY, pr * 0.28, pr * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // mouth
    let mx = cx + (look.x * r * GAZE.mouthLimX);
    let my = cy + r * GAZE.mouthY + look.y * r * GAZE.mouthLimY;
    if (look.y > 0.15) my += (look.y - 0.15) * r * 0.08; // mouthDrop clearance
    ctx.strokeStyle = `rgba(${ink.join(",")},0.7)`;
    ctx.fillStyle = `rgba(${ink.join(",")},0.55)`;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    drawMouth(ctx, mx, my, r, expr, look);
    ctx.stroke();
  }

  function drawMouth(ctx, x, y, r, expr) {
    const w = r * 0.22;
    switch (expr) {
      case "smile":
      case "softSmile":
        ctx.arc(x, y - r * 0.02, w, 0.15, Math.PI - 0.15);
        break;
      case "brightSmile":
        ctx.arc(x, y - r * 0.04, w * 1.15, 0.05, Math.PI - 0.05);
        break;
      case "surprise":
        ctx.ellipse(x, y, w * 0.28, w * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "sleepy":
        ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + w * 0.2, x + w, y);
        break;
      case "sideEye":
        ctx.moveTo(x - w * 0.7, y); ctx.lineTo(x + w * 0.7, y);
        break;
      case "pout":
        ctx.ellipse(x, y, w * 0.42, w * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "kiss":
        ctx.ellipse(x, y, w * 0.22, w * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "confused":
        ctx.moveTo(x - w, y + 1); ctx.quadraticCurveTo(x, y - w * 0.25, x + w, y + 2);
        break;
      case "dizzy":
        ctx.moveTo(x - w * 0.5, y); ctx.lineTo(x + w * 0.5, y);
        ctx.moveTo(x, y - w * 0.25); ctx.lineTo(x, y + w * 0.25);
        break;
      case "wink":
      case "blink":
        ctx.arc(x, y - r * 0.02, w * 0.85, 0.2, Math.PI - 0.2);
        break;
      default:
        ctx.moveTo(x - w * 0.7, y); ctx.quadraticCurveTo(x, y + w * 0.15, x + w * 0.7, y);
    }
  }

  const AVATAR_SHAPES = [
    ["circle", "圆"], ["squircle", "方圆"], ["capsule", "胶囊"], ["triangle", "饭团"],
    ["diamond", "菱"], ["blob", "团"], ["hexagon", "六边"], ["teardrop", "水滴"],
    ["bean", "豆"], ["pentagon", "五边"], ["star", "星"], ["twin", "双耳"],
  ];
  const AVATAR_EXPR = ["idle", "smile", "idle", "surprise", "sleepy", "idle", "idle", "sideEye", "wink", "smile", "idle", "idle"];
  const TINT_KEYS = ["ink", "porcelain", "vermilion", "jade", "lapis", "amethyst"];
  const EXPRESSIONS = [
    ["idle", "静"], ["smile", "笑"], ["wink", "眨"], ["surprise", "惊"], ["sleepy", "困"],
    ["sideEye", "斜视"], ["blink", "闭"], ["pout", "嘟"], ["kiss", "吻"], ["confused", "惑"],
    ["dizzy", "晕"], ["softSmile", "浅笑"], ["brightSmile", "大笑"],
  ];
  const BUDDY_SHAPES = [
    ["circle", "圆"], ["squircle", "方圆"], ["teardrop", "水滴"], ["rice", "饭团"], ["bean", "豆"], ["capsule", "胶囊"],
  ];

  function mountAvatarGrid(container, kind) {
    container.innerHTML = "";
    const list = kind === "expr" ? EXPRESSIONS.map((e, i) => ({
      shape: "circle", tint: TINT_KEYS[i % 6], expr: e[0], label: e[1], key: e[0],
    })) : kind === "buddy" ? BUDDY_SHAPES.map((s, i) => ({
      shape: s[0], tint: TINT_KEYS[i % 6], expr: "smile", label: s[1], key: s[0],
    })) : AVATAR_SHAPES.map((s, i) => ({
      shape: s[0], tint: TINT_KEYS[i % 6], expr: AVATAR_EXPR[i], label: s[1], key: s[0],
    }));
    const canvases = [];
    list.forEach((item) => {
      const cell = document.createElement("div");
      cell.className = kind === "expr" ? "expr-cell" : "avatar-cell";
      const c = document.createElement("canvas");
      c.width = 128; c.height = 128;
      c.style.width = "64px"; c.style.height = "64px";
      const cap = document.createElement("div");
      cap.className = "t-caption";
      cap.textContent = item.label;
      cell.append(c, cap);
      container.appendChild(cell);
      canvases.push({ canvas: c, item });
    });
    function drawAll(look) {
      const finish = document.documentElement.getAttribute("data-finish") || "gloss";
      canvases.forEach(({ canvas, item }) => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 128, 128);
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        const pose = { look: look || { x: 0, y: 0 }, expression: item.expr, blink: item.expr === "blink" ? 1 : (item.expr === "wink" ? 0 : 0) };
        if (item.expr === "wink") pose.wink = 1;
        drawFace(ctx, 32, 32, 22, item.shape, item.tint, pose, finish);
      });
    }
    drawAll();
    return { redraw: () => drawAll(), drawAll };
  }

  function winkPose(base, side, wink) {
    return base;
  }

  /* custom drawFace wink: close one eye. Patch after first pass? I'll handle in draw by pose.wink */
  const _drawFace = drawFace;
  function drawFaceW(ctx, cx, cy, r, shape, tint, pose, finish) {
    if (pose.expression === "wink") {
      _drawFace(ctx, cx, cy, r, shape, tint, Object.assign({}, pose, { blink: 0, expression: "smile" }), finish);
      // overlay left eye closed — skip, keep simple smile+note
      return;
    }
    _drawFace(ctx, cx, cy, r, shape, tint, pose, finish);
  }

  function mountGazeField(canvas) {
    requireCanvas(canvas, "gaze");
    const pitch = 96;
    const cols = 3, rows = 2;
    const cssH = pitch * rows + 16;
    measureCanvas(canvas, cssH, pitch * 3);
    let pointer = null, raf = 0, t0 = performance.now();

    function draw() {
      const m = measureCanvas(canvas, cssH, pitch * 3);
      const W = m.cssW, H = m.cssH;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = W * dpr; canvas.height = H * dpr;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const r = pitch * 0.42;
      const finish = document.documentElement.getAttribute("data-finish") || "gloss";
      const rm = reduceMotion();
      const time = (performance.now() - t0) / 1000;
      for (let i = 0; i < 6; i++) {
        const cx = ((i % cols) + 0.5) * (W / cols);
        const cy = (Math.floor(i / cols) + 0.5) * (H / rows);
        let look = { x: 0, y: 0 };
        if (!rm && pointer) look = lookToward(pointer.x, pointer.y, cx, cy, r);
        else if (!rm) {
          const seed = i * 1.7;
          look = { x: Math.sin(time * 0.4 + seed) * 0.12, y: Math.cos(time * 0.33 + seed) * 0.08 };
        }
        const blink = (!rm && Math.sin(time * 2 + i) > 0.985) ? 1 : 0;
        drawFace(ctx, cx, cy, r, BUDDY_SHAPES[i][0], TINT_KEYS[i % 6], { look, expression: "softSmile", blink }, finish);
      }
      if (pointer) {
        ctx.fillStyle = "rgba(18,18,17,0.35)";
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    let tracking = false;
    function loop() {
      raf = 0;
      draw();
      if (tracking && !reduceMotion()) raf = requestAnimationFrame(loop);
    }
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener("pointerdown", (e) => { pointer = pos(e); tracking = true; canvas.setPointerCapture(e.pointerId); if (!raf) raf = requestAnimationFrame(loop); });
    canvas.addEventListener("pointermove", (e) => {
      pointer = pos(e);
      if (!tracking) { tracking = true; }
      if (!raf) raf = requestAnimationFrame(loop);
    });
    canvas.addEventListener("pointerleave", () => { pointer = null; tracking = false; draw(); });
    canvas.addEventListener("pointerup", () => { pointer = null; tracking = false; draw(); });
    draw();
    return { redraw: () => { clearBodyCache(); draw(); } };
  }

  /* ----- Kiss / merge pair ----- */
  function mountKissPair(canvas) {
    requireCanvas(canvas, "kiss");
    const cssH = 240;
    measureCanvas(canvas, cssH, 320);
    const st = {
      a: { x: 120, y: 120, r: 44, look: { x: 0.2, y: 0 } },
      b: { x: 260, y: 120, r: 44, look: { x: -0.2, y: 0 } },
      placed: false,
      drag: null,
      merged: false,
      neck: 0,
      broken: false,
      retract: 0,
    };
    let raf = 0, dirty = true;

    function gap() {
      return Math.hypot(st.b.x - st.a.x, st.b.y - st.a.y) - st.a.r - st.b.r;
    }

    function field(px, py) {
      const da = shapeSDF(px - st.a.x, py - st.a.y, "circle", st.a.r);
      const db = shapeSDF(px - st.b.x, py - st.b.y, "circle", st.b.r);
      const g = gap();
      if (st.merged) return smin(da, db, 28);
      if (st.broken && st.retract < 0.98) {
        const midX = mix(st.a.x, st.b.x, 0.5);
        const midY = mix(st.a.y, st.b.y, 0.5);
        const stub = 10 * (1 - st.retract);
        const ta = sdTaper(px, py, st.a.x, st.a.y, mix(st.a.x, midX, 0.35 + 0.2 * (1 - st.retract)), mix(st.a.y, midY, 0.35 + 0.2 * (1 - st.retract)), st.a.r * 0.35, stub * 0.3);
        const tb = sdTaper(px, py, st.b.x, st.b.y, mix(st.b.x, midX, 0.35 + 0.2 * (1 - st.retract)), mix(st.b.y, midY, 0.35 + 0.2 * (1 - st.retract)), st.b.r * 0.35, stub * 0.3);
        return smin(smin(da, db, 6), smin(ta, tb, 8), 10);
      }
      if (g < 36 && g > -8 && !st.broken) {
        const k = mix(8, 26, clamp(1 - g / 36, 0, 1));
        let d = smin(da, db, k);
        // thick root thin neck
        const dx = st.b.x - st.a.x, dy = st.b.y - st.a.y;
        const len = Math.max(Math.hypot(dx, dy), 1);
        const nx = dx / len, ny = dy / len;
        const aX = st.a.x + nx * st.a.r * 0.72, aY = st.a.y + ny * st.a.r * 0.72;
        const bX = st.b.x - nx * st.b.r * 0.72, bY = st.b.y - ny * st.b.r * 0.72;
        const root = mix(16, 10, clamp(g / 30, 0, 1));
        const mid = mix(12, 3.2, clamp(g / 28, 0, 1));
        const neck = sdTaper(px, py, aX, aY, bX, bY, root, root);
        // pinch mid
        const mx = (aX + bX) / 2, my = (aY + bY) / 2;
        const pinched = sdTaper(px, py, aX, aY, mx, my, root, mid);
        const pinched2 = sdTaper(px, py, mx, my, bX, bY, mid, root);
        d = smin(d, smin(pinched, pinched2, 10), 14);
        return d;
      }
      return smin(da, db, 8);
    }

    function facesOverlay(cssW, cssH) {
      const ctx = canvas.getContext("2d");
      // raster already filled body; draw faces on top at CSS scale
      const dprish = canvas.width / cssW;
      ctx.save();
      ctx.setTransform(canvas.width / cssW, 0, 0, canvas.height / cssH, 0, 0);
      const finish = document.documentElement.getAttribute("data-finish") || "gloss";
      const g = gap();
      const kiss = g < 8 && !st.broken;
      const lookA = pointerLook(st.a, st.b);
      const lookB = pointerLook(st.b, st.a);
      // Don't redraw full SDF faces (would hide goo). Draw only features.
      drawFeatures(ctx, st.a.x, st.a.y, st.a.r, lookA, kiss ? "kiss" : "softSmile", kiss ? 0.7 : 0);
      drawFeatures(ctx, st.b.x, st.b.y, st.b.r, lookB, kiss ? "kiss" : "softSmile", kiss ? 0.7 : 0);
      ctx.restore();
    }

    function pointerLook(self, other) {
      return lookToward(other.x, other.y, self.x, self.y, self.r, 0.52);
    }

    function drawFeatures(ctx, cx, cy, r, look, expr, blush) {
      const ink = isDark() ? [244, 244, 242] : [18, 18, 17];
      const sclera = isDark() ? [40, 40, 44] : [250, 248, 244];
      if (blush > 0) {
        ctx.fillStyle = `rgba(220,70,80,${0.2 * blush})`;
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.42, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + r * 0.42, cy + r * 0.18, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const side of [-1, 1]) {
        const ax = cx + side * r * GAZE.socketAx + look.x * r * GAZE.travelX;
        const ay = cy + r * GAZE.socketAy + look.y * r * GAZE.travelY;
        const ew = r * GAZE.socketW * GAZE.eyeScale * 2;
        const eh = r * GAZE.socketH * GAZE.eyeScale * 2;
        ctx.fillStyle = `rgb(${sclera.join(",")})`;
        ctx.beginPath(); ctx.ellipse(ax, ay, ew / 2, eh / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${ink.join(",")},${GAZE.inkBlend})`; ctx.lineWidth = 1; ctx.stroke();
        const px = ax + look.x * r * GAZE.pupil, py = ay + look.y * r * GAZE.pupil;
        ctx.fillStyle = `rgba(${ink.join(",")},0.88)`;
        ctx.beginPath(); ctx.arc(px, py, Math.min(ew, eh) * 0.34, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = `rgba(${ink.join(",")},0.7)`;
      ctx.lineWidth = 1.5; ctx.beginPath();
      drawMouth(ctx, cx + look.x * r * GAZE.mouthLimX, cy + r * GAZE.mouthY + look.y * r * GAZE.mouthLimY, r, expr);
      ctx.stroke();
    }

    function draw() {
      const m = measureCanvas(canvas, cssH, 320);
      if (!st.userMoved) {
        st.a.x = m.cssW * 0.32; st.a.y = m.cssH * 0.5;
        st.b.x = m.cssW * 0.68; st.b.y = m.cssH * 0.5;
        st.placed = true;
      }
      const g = gap();
      if (g < -10 && !st.broken) st.merged = true;
      if (g > 52 && st.neck > 0.3 && !st.merged && !st.broken) { st.broken = true; st.retract = 0; }
      if (g < 40 && st.broken === false) st.neck = clamp(1 - g / 40, 0, 1);
      const dark = isDark();
      const base = dark ? [0.85, 0.82, 0.76] : [0.93, 0.90, 0.85];
      const info = rasterSDF(canvas, field, { base, bevel: 10, height: cssH, cssW: m.cssW });
      facesOverlay(info.cssW, cssH);
      dirty = false;
    }

    function tick() {
      raf = 0;
      if (st.broken && st.retract < 1) {
        st.retract = Math.min(1, st.retract + (reduceMotion() ? 1 : 0.06));
        if (st.retract >= 1) { st.broken = false; st.neck = 0; }
        dirty = true;
      }
      if (dirty) draw();
      if (st.drag || dirty || (st.broken && st.retract < 1)) raf = requestAnimationFrame(tick);
    }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener("pointerdown", (e) => {
      const p = pos(e);
      const da = Math.hypot(p.x - st.a.x, p.y - st.a.y);
      const db = Math.hypot(p.x - st.b.x, p.y - st.b.y);
      st.drag = da < db ? "a" : "b";
      st.userMoved = true;
      st.merged = false; st.broken = false; st.retract = 0;
      canvas.setPointerCapture(e.pointerId);
      if (!raf) raf = requestAnimationFrame(tick);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!st.drag) return;
      const p = pos(e);
      st[st.drag].x = p.x; st[st.drag].y = p.y;
      dirty = true;
    });
    canvas.addEventListener("pointerup", () => { st.drag = null; dirty = true; });
    draw();
    return { redraw: () => { dirty = true; if (!raf) raf = requestAnimationFrame(tick); } };
  }

  global.StoneFX = {
    TINTS, STATES, AVATAR_SHAPES, EXPRESSIONS, BUDDY_SHAPES, GAZE, TINT_KEYS,
    smin, sdTaper, sdRoundBox, pigment, reduceMotion, requireCanvas, measureCanvas,
    mountGooField, mountGooMorph, mountGooToggle, mountLacquerButton,
    mountAvatarGrid, mountGazeField, mountKissPair, hexToRgb,
    clearBodyCache, redrawAll() {
      try { this.clearBodyCache(); } catch (err) { console.error("StoneFX.clearBodyCache", err); }
      (this._hooks || []).forEach((h) => {
        try { if (h && h.redraw) h.redraw(); }
        catch (err) { console.error("StoneFX.redraw", err); }
      });
    },
    _hooks: [],
    register(h) { this._hooks.push(h); return h; },
  };
})(window);
