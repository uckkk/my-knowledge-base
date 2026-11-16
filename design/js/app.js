/* Stone 预览页：令牌、组件交互、覆盖清单。不依赖 CDN。 */
(function () {
  "use strict";

  const ACCENTS = [
    { id: "ember", name: "Ember", light: "#F2551D", dark: "#FF6B35" },
    { id: "cobalt", name: "Cobalt", light: "#2F5BEA", dark: "#6B8CFF" },
    { id: "jade", name: "Jade", light: "#0E9F7A", dark: "#2FCB9C" },
    { id: "amber", name: "Amber", light: "#E09B00", dark: "#FFC233" },
    { id: "iris", name: "Iris", light: "#6A55D6", dark: "#9583F5" },
    { id: "coral", name: "Coral", light: "#E5484D", dark: "#FF6E73" },
    { id: "lagoon", name: "Lagoon", light: "#0A8CA0", dark: "#2DBFD3" },
    { id: "graphite", name: "Graphite", light: "#121211", dark: "#F4F4F2" },
  ];

  const root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("stone-preview-theme", theme);
    document.querySelectorAll("[data-theme-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme-btn") === theme ? "true" : "false");
    });
    if (window.StoneFX) StoneFX.redrawAll();
  }
  function setAccent(id) {
    root.setAttribute("data-accent", id);
    localStorage.setItem("stone-preview-accent", id);
    document.querySelectorAll("[data-accent-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-accent-btn") === id ? "true" : "false");
    });
    if (window.StoneFX) StoneFX.redrawAll();
  }
  function setReduce(on) {
    root.classList.toggle("reduce-motion", on);
    localStorage.setItem("stone-preview-reduce", on ? "1" : "0");
    const chip = document.getElementById("reduce-toggle");
    if (chip) chip.setAttribute("aria-pressed", on ? "true" : "false");
    if (window.StoneFX) StoneFX.redrawAll();
  }
  function setFinish(finish) {
    root.setAttribute("data-finish", finish);
    document.querySelectorAll("[data-finish-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-finish-btn") === finish ? "true" : "false");
    });
    if (window.StoneFX) StoneFX.redrawAll();
  }

  function initTheme() {
    const saved = localStorage.getItem("stone-preview-theme");
    const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(saved || (preferDark ? "dark" : "light"));
    setAccent(localStorage.getItem("stone-preview-accent") || "ember");
    const reduceSaved = localStorage.getItem("stone-preview-reduce");
    const preferReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(reduceSaved === "1" || (reduceSaved !== "0" && preferReduce));
    setFinish("gloss");
  }

  function hairline() {
    const dpr = window.devicePixelRatio || 1;
    root.style.setProperty("--hairline", (1 / dpr) + "px");
  }

  /* Press scale with spring */
  function attachPress(el, scale) {
    scale = scale == null ? 0.97 : scale;
    let x = 1, v = 0, target = 1, raf = 0;
    function tick() {
      raf = 0;
      const rm = root.classList.contains("reduce-motion");
      if (rm) {
        el.style.transform = "none";
        el.style.opacity = target < 1 ? "0.8" : "";
        el.style.filter = target < 1 ? "brightness(0.96)" : "";
        el.classList.toggle("is-pressed", target < 1);
        if (target < 1) raf = requestAnimationFrame(tick);
        return;
      }
      const omega = (2 * Math.PI) / 0.2;
      const acc = -2 * 0.9 * omega * v - omega * omega * (x - target);
      v += acc / 60;
      x += v / 60;
      el.style.transform = "scale(" + x.toFixed(4) + ")";
      el.style.filter = target < 1 || x < 0.995 ? "brightness(0.96)" : "";
      el.classList.toggle("is-pressed", target < 1);
      if (Math.abs(x - target) > 0.001 || Math.abs(v) > 0.001) raf = requestAnimationFrame(tick);
      else { x = target; el.style.transform = target === 1 ? "" : "scale(" + scale + ")"; }
    }
    function down() { target = scale; if (!raf) raf = requestAnimationFrame(tick); }
    function up() { target = 1; if (!raf) raf = requestAnimationFrame(tick); }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  }

  function initNav() {
    const nav = document.getElementById("nav");
    const backdrop = document.getElementById("nav-backdrop");
    const btn = document.getElementById("menu-btn");
    function close() { nav.classList.remove("open"); backdrop.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    function open() { nav.classList.add("open"); backdrop.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    btn.addEventListener("click", () => (nav.classList.contains("open") ? close() : open()));
    backdrop.addEventListener("click", close);
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));

    const links = [...nav.querySelectorAll("a[href^='#']")];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!vis) return;
      links.forEach((l) => l.setAttribute("aria-current", l.getAttribute("href") === "#" + vis.target.id ? "true" : "false"));
    }, { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.2, 0.6] });
    sections.forEach((s) => io.observe(s));
  }

  function initToggles() {
    document.querySelectorAll(".stone-toggle").forEach((btn) => {
      btn.addEventListener("pointerdown", () => { if (btn.getAttribute("aria-disabled") !== "true") btn.classList.add("is-pressed"); });
      const clear = () => btn.classList.remove("is-pressed");
      btn.addEventListener("pointerup", clear);
      btn.addEventListener("pointerleave", clear);
      btn.addEventListener("click", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        const on = btn.getAttribute("aria-checked") !== "true";
        btn.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
  }

  function initSlider(el) {
    const min = +el.dataset.min || 0, max = +el.dataset.max || 100, step = +el.dataset.step || 1;
    let value = +el.dataset.value || 42;
    const fill = el.querySelector(".fill");
    const thumb = el.querySelector(".thumb");
    const out = el.querySelector(".s-val");
    function render() {
      const t = (value - min) / (max - min);
      fill.style.width = (t * 100) + "%";
      thumb.style.left = (t * 100) + "%";
      if (out) out.textContent = String(value);
    }
    function at(clientX) {
      const r = el.querySelector(".track-hit").getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      let v = min + t * (max - min);
      v = Math.round(v / step) * step;
      value = Math.max(min, Math.min(max, v));
      render();
    }
    const hit = el.querySelector(".track-hit");
    hit.addEventListener("pointerdown", (e) => {
      el.classList.add("is-dragging");
      hit.setPointerCapture(e.pointerId);
      at(e.clientX);
    });
    hit.addEventListener("pointermove", (e) => { if (el.classList.contains("is-dragging")) at(e.clientX); });
    hit.addEventListener("pointerup", () => el.classList.remove("is-dragging"));
    hit.addEventListener("pointercancel", () => el.classList.remove("is-dragging"));
    render();
  }

  function initSeg(el) {
    const buttons = [...el.querySelectorAll("button")];
    const thumb = el.querySelector(".seg-thumb");
    function layout() {
      const cur = el.querySelector('button[aria-pressed="true"]') || buttons[0];
      const r = el.getBoundingClientRect();
      const b = cur.getBoundingClientRect();
      thumb.style.width = b.width + "px";
      thumb.style.left = (b.left - r.left) + "px";
    }
    buttons.forEach((b) => b.addEventListener("click", () => {
      buttons.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      layout();
    }));
    layout();
    window.addEventListener("resize", layout);
  }

  function initField(el) {
    const input = el.querySelector("input");
    const clear = el.querySelector(".clear");
    const err = el.querySelector(".err");
    function sync() {
      if (clear) clear.hidden = !input.value;
      if (input.value === "0") {
        el.classList.add("is-error");
        if (err) { err.hidden = false; err.textContent = "不能为 0"; }
        el.classList.remove("is-shaking");
        void el.offsetWidth;
        el.classList.add("is-shaking");
      } else {
        el.classList.remove("is-error", "is-shaking");
        if (err) err.hidden = true;
      }
    }
    input.addEventListener("focus", () => el.classList.add("is-focused"));
    input.addEventListener("blur", () => el.classList.remove("is-focused"));
    input.addEventListener("input", sync);
    if (clear) clear.addEventListener("click", () => { input.value = ""; input.focus(); sync(); });
    sync();
  }

  function initSheet() {
    const scrim = document.getElementById("sheet-scrim");
    const sheet = document.getElementById("sheet");
    document.querySelectorAll("[data-sheet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const size = btn.getAttribute("data-sheet");
        sheet.className = "sheet size-" + size;
        scrim.classList.add("open");
      });
    });
    function close() { scrim.classList.remove("open"); }
    scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
    document.getElementById("sheet-close").addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function initResult() {
    const card = document.getElementById("result-card");
    const btn = document.getElementById("calc-btn");
    const copy = document.getElementById("copy-btn");
    let shown = false;
    btn.addEventListener("click", () => {
      shown = !shown;
      card.hidden = !shown;
      card.classList.toggle("is-reveal", shown);
      btn.textContent = shown ? "隐藏结果" : "计算";
    });
    copy.addEventListener("click", () => {
      const text = document.getElementById("result-value").textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      copy.textContent = "已复制";
      setTimeout(() => { copy.textContent = "复制"; }, 1400);
    });
  }

  function initPaywall() {
    document.querySelectorAll(".pay-plan").forEach((b) => {
      attachPress(b, 0.98);
      b.addEventListener("click", () => {
        document.querySelectorAll(".pay-plan").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      });
    });
  }

  function initButtons() {
    document.querySelectorAll("[data-press]").forEach((b) => attachPress(b, 0.97));
    const loadBtn = document.getElementById("btn-loading-demo");
    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        if (loadBtn.classList.contains("is-loading")) return;
        const label = loadBtn.querySelector(".btn-label");
        loadBtn.classList.add("is-loading");
        loadBtn.setAttribute("aria-busy", "true");
        if (label) label.style.opacity = "0";
        const spin = document.createElement("span");
        spin.className = "spin";
        loadBtn.appendChild(spin);
        setTimeout(() => {
          loadBtn.classList.remove("is-loading");
          loadBtn.removeAttribute("aria-busy");
          if (label) label.style.opacity = "";
          spin.remove();
        }, 1600);
      });
    }
  }

  function initRipple() {
    const box = document.getElementById("ripple-box");
    if (!box) return;
    box.addEventListener("click", (e) => {
      const r = box.getBoundingClientRect();
      const wave = box.querySelector(".wave");
      wave.style.left = (e.clientX - r.left) + "px";
      wave.style.top = (e.clientY - r.top) + "px";
      box.classList.remove("is-rippling");
      void box.offsetWidth;
      box.classList.add("is-rippling");
    });
  }

  function initTilt() {
    const card = document.getElementById("tilt-card");
    if (!card) return;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
  }

  function initExport() {
    const stage = document.getElementById("export-stage");
    const btn = document.getElementById("export-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      stage.classList.remove("is-go");
      void stage.offsetWidth;
      stage.classList.add("is-go");
    });
  }

  function initMotionDemo() {
    document.querySelectorAll("[data-spring]").forEach((btn) => {
      const kind = btn.getAttribute("data-spring");
      const map = { press: [0.2, 0.9], snap: [0.32, 0.82], glide: [0.45, 1], reward: [0.55, 0.7] };
      const [resp, damp] = map[kind];
      let x = 0, v = 0, raf = 0, going = false;
      const ball = btn.querySelector("i");
      function tick() {
        raf = 0;
        const target = going ? 1 : 0;
        if (root.classList.contains("reduce-motion")) {
          const dur = { press: 0.1, snap: 0.15, glide: 0.2, reward: 0.25 }[kind];
          ball.style.transition = "opacity " + dur + "s ease";
          ball.style.opacity = target ? "1" : "0.35";
          ball.style.transform = "translateX(" + (target * 64) + "px)";
          return;
        }
        const omega = (2 * Math.PI) / resp;
        const acc = -2 * damp * omega * v - omega * omega * (x - target);
        v += acc / 60; x += v / 60;
        ball.style.transform = "translateX(" + (x * 64) + "px)";
        if (Math.abs(x - target) > 0.002 || Math.abs(v) > 0.002) raf = requestAnimationFrame(tick);
      }
      btn.addEventListener("click", () => {
        going = !going;
        if (!raf) raf = requestAnimationFrame(tick);
      });
    });
  }

  function initCoverage() {
    const host = document.getElementById("coverage-body");
    const stats = document.getElementById("coverage-stats");
    try {
      const doc = window.STONE_COVERAGE;
      if (!doc || !doc.items) throw new Error("缺少内嵌 STONE_COVERAGE");
      const counts = doc.meta.counts;
      stats.innerHTML = [
        ["全部", counts.total],
        ["Web 等价", counts.web],
        ["原生参考", counts["native-ref"]],
        ["不可模拟", counts.cannot],
      ].map(([k, v]) => `<span class="stat"><b>${v}</b> ${k}</span>`).join("");
      let filter = "all";
      const rows = doc.items;
      function kindLabel(k) {
        return k === "web" ? "Web 等价" : k === "native-ref" ? "原生参考" : "不可模拟";
      }
      function kindClass(k) {
        return k === "web" ? "badge-web" : k === "native-ref" ? "badge-ref" : "badge-cannot";
      }
      function render() {
        host.innerHTML = rows.filter((r) => filter === "all" || r.kind === filter).map((r) => `
          <tr data-kind="${r.kind}">
            <td><a href="${r.preview}">${r.title}</a></td>
            <td><span class="badge ${kindClass(r.kind)}">${kindLabel(r.kind)}</span></td>
            <td class="t-footnote">${r.source}</td>
            <td class="t-footnote">${r.note}</td>
          </tr>`).join("");
      }
      document.querySelectorAll("[data-cov-filter]").forEach((b) => {
        b.addEventListener("click", () => {
          filter = b.getAttribute("data-cov-filter");
          document.querySelectorAll("[data-cov-filter]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
          render();
        });
      });
      render();
    } catch (err) {
      stats.textContent = "覆盖清单未能加载（应使用内嵌 js/coverage-data.js）。";
    }
  }

  function initAccentDots() {
    const host = document.getElementById("accent-dots");
    if (!host) return;
    ACCENTS.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-accent-btn", a.id);
      b.title = a.name;
      b.setAttribute("aria-label", a.name);
      b.style.setProperty("--dot", `light-dark(${a.light}, ${a.dark})`);
      // fallback without light-dark
      const apply = () => {
        const dark = root.getAttribute("data-theme") === "dark";
        b.style.setProperty("--dot", dark ? a.dark : a.light);
      };
      apply();
      new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
      b.addEventListener("click", () => setAccent(a.id));
      host.appendChild(b);
    });
  }

  function requireEl(id, tag) {
    const el = document.getElementById(id);
    if (!el) throw new Error("缺少 #" + id);
    if (tag && el.tagName.toLowerCase() !== tag.toLowerCase()) {
      throw new Error("#" + id + " 应为 " + tag + "，实际是 " + el.tagName);
    }
    return el;
  }

  function safe(name, fn) {
    try { return fn(); }
    catch (err) { console.error("Stone 预览：" + name, err); return null; }
  }

  function mountEffects() {
    const FX = window.StoneFX;
    if (!FX) {
      console.error("Stone 预览：effects.js 未加载");
      return;
    }
    const hooks = [];
    function add(name, fn) {
      const h = safe(name, fn);
      if (h) hooks.push(h);
    }
    add("goo-field", () => FX.mountGooField(requireEl("fx-goo-field", "canvas")));
    add("goo-morph", () => FX.mountGooMorph(requireEl("fx-goo-morph", "canvas")));
    add("goo-toggle", () => FX.mountGooToggle(requireEl("fx-goo-toggle", "canvas"), requireEl("goo-toggle-input", "input")));
    document.querySelectorAll("canvas[data-lacquer]").forEach((c, i) => {
      add("lacquer-" + (c.id || i), () => {
        if (typeof c.getContext !== "function") throw new Error("data-lacquer 目标不是 canvas");
        const o = {
          title: c.dataset.title || "锁定",
          style: c.dataset.style || "filled",
          tint: c.dataset.tint || "ink",
          state: c.dataset.state || "idle",
          finish: root.getAttribute("data-finish") || "gloss",
        };
        const h = FX.mountLacquerButton(c, o);
        c._lacquer = h;
        return h;
      });
    });
    add("avatars", () => FX.mountAvatarGrid(requireEl("avatar-grid", "div"), "avatar"));
    add("expressions", () => FX.mountAvatarGrid(requireEl("expr-grid", "div"), "expr"));
    add("buddies", () => FX.mountAvatarGrid(requireEl("buddy-grid", "div"), "buddy"));
    add("gaze", () => FX.mountGazeField(requireEl("fx-gaze-canvas", "canvas")));
    add("kiss", () => FX.mountKissPair(requireEl("fx-kiss-canvas", "canvas")));
    FX._hooks = hooks;

    document.querySelectorAll("[data-finish-btn]").forEach((b) => {
      b.addEventListener("click", () => {
        setFinish(b.getAttribute("data-finish-btn"));
        document.querySelectorAll("canvas[data-lacquer]").forEach((c) => {
          try { if (c._lacquer) c._lacquer.set({ finish: root.getAttribute("data-finish") }); }
          catch (err) { console.error("lacquer finish", err); }
        });
      });
    });

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        hairline();
        FX.redrawAll();
      }, 120);
    };
    window.addEventListener("resize", onResize);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(onResize);
      document.querySelectorAll(".fx-stage, .lacquer-slot, .avatar-grid, .expr-grid, .buddy-grid").forEach((el) => ro.observe(el));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    function boot(name, fn) {
      try { fn(); }
      catch (err) { console.error("Stone 预览：" + name, err); }
    }
    boot("hairline", hairline);
    boot("theme", () => {
      initTheme();
      initAccentDots();
      setAccent(root.getAttribute("data-accent") || "ember");
      document.querySelectorAll("[data-theme-btn]").forEach((b) => b.addEventListener("click", () => setTheme(b.getAttribute("data-theme-btn"))));
      document.getElementById("reduce-toggle").addEventListener("click", () => {
        setReduce(!root.classList.contains("reduce-motion"));
      });
    });
    boot("nav", initNav);
    boot("toggles", initToggles);
    boot("sliders", () => document.querySelectorAll(".stone-slider").forEach(initSlider));
    boot("segments", () => document.querySelectorAll(".seg").forEach(initSeg));
    boot("fields", () => document.querySelectorAll(".field").forEach(initField));
    boot("sheet", initSheet);
    boot("result", initResult);
    boot("paywall", initPaywall);
    boot("buttons", initButtons);
    boot("ripple", initRipple);
    boot("tilt", initTilt);
    boot("export", initExport);
    boot("motion", initMotionDemo);
    boot("coverage", initCoverage);
    boot("effects", mountEffects);
  });
})();
