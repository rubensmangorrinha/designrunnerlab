/*!
 * Gallery: an infinite, drag-to-pan wall of cards.
 *
 *   - Drag anywhere to pan. Let go and the wall drifts to a stop (inertia).
 *   - The wall tiles forever in every direction: cards wrap around the edges.
 *   - Horizontal trackpad swipes pan too; vertical scrolling stays with the page.
 *   - Tab onto a card and the wall glides to centre it. Enter opens it.
 *   - Click a card: it scales up into a detail overlay (FLIP transition).
 *   - Zoom out to see more of the wall: pinch on a trackpad, Ctrl/Cmd + wheel,
 *     the - and + keys, or the zoom buttons. Zooming adds cards to fill the view.
 *
 *   Gallery.mount(stage, {
 *     items:  [...],                 // clickable entries
 *     decor:  ["<html>", ...],       // art tiles mixed in between, not clickable
 *     cardHTML(item, index) -> html, // inner markup of a card
 *     detailHTML(item) -> html,      // overlay content
 *     cell: { w: 300, h: 390, gap: 22 },
 *   })
 */
(function () {
  "use strict";

  function mount(stage, opts) {
    var cellW = opts.cell.w, cellH = opts.cell.h, gap = opts.cell.gap;
    var pitchX = cellW + gap, pitchY = cellH + gap;
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    var world = document.createElement("div");
    world.className = "gal-world";
    stage.appendChild(world);

    /* ---------------------------------------------------------------- *
     *  Slots: enough cells to cover the stage plus a ring of spares.    *
     *  Each slot keeps its card; panning only moves and wraps slots.    *
     * ---------------------------------------------------------------- */
    var slots = [], cols = 0, rows = 0, W = 0, H = 0;
    var zoom = 1, Wv = 0, Hv = 0;   // Wv/Hv: the area the wall covers before scaling
    var ZMIN = 0.4, ZMAX = 1.25;
    function build() {
      W = stage.clientWidth; H = stage.clientHeight;
      Wv = W / zoom; Hv = H / zoom;
      // the world is laid out at full size, then scaled around the stage centre
      world.style.width = Wv + "px"; world.style.height = Hv + "px";
      world.style.left = (W - Wv) / 2 + "px"; world.style.top = (H - Hv) / 2 + "px";
      world.style.transform = "scale(" + zoom + ")";
      var c = Math.ceil(Wv / pitchX) + 2, r = Math.ceil(Hv / pitchY) + 2;
      if (c === cols && r === rows) return;
      cols = c; rows = r;
      world.innerHTML = ""; slots = [];
      var n = opts.items.length, d = (opts.decor || []).length;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          // every third slot (offset per row) is an art tile, the rest cycle the items
          var isDecor = d && (x + y * 2) % 3 === 2;
          var el;
          if (isDecor) {
            el = document.createElement("div");
            el.className = "gal-card gal-decor";
            el.setAttribute("aria-hidden", "true");
            el.innerHTML = opts.decor[(x * 7 + y * 3) % d];
          } else {
            var idx = (x * 2 + y * 3) % n;
            el = document.createElement("button");
            el.type = "button";
            el.className = "gal-card";
            el.dataset.idx = idx;
            el.innerHTML = opts.cardHTML(opts.items[idx], idx);
            // only the first copy of each item joins the tab order
            el.tabIndex = slots.some(function (s) { return s.idx === idx; }) ? -1 : 0;
            if (el.tabIndex === -1) el.setAttribute("aria-hidden", "true");
          }
          el.style.width = cellW + "px"; el.style.height = cellH + "px";
          // stagger every other column for a looser, gallery-like rhythm
          slots.push({ el: el, bx: x * pitchX, by: y * pitchY + (x % 2 ? pitchY * 0.42 : 0), idx: isDecor ? -1 : idx });
          world.appendChild(el);
        }
      }
    }

    /* ---------------------------------------------------------------- *
     *  Pan with inertia                                                 *
     * ---------------------------------------------------------------- */
    var pan = { x: -pitchX * 0.35, y: -pitchY * 0.2 }, vel = { x: 0, y: 0 }, target = null;
    var raf = 0;
    function wrap(v, size) { return ((v % size) + size) % size; }
    function place() {
      var TW = cols * pitchX, TH = rows * pitchY;
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        var x = wrap(s.bx + pan.x, TW) - pitchX;
        var y = wrap(s.by + pan.y, TH) - pitchY;
        s.x = x; s.y = y;
        s.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      }
      // the dotted floor moves with the wall
      stage.style.backgroundPosition = (pan.x % 24).toFixed(1) + "px " + (pan.y % 24).toFixed(1) + "px";
    }
    function loop() {
      raf = 0;
      if (target) {
        pan.x += (target.x - pan.x) * 0.14; pan.y += (target.y - pan.y) * 0.14;
        if (Math.abs(target.x - pan.x) < 0.5 && Math.abs(target.y - pan.y) < 0.5) target = null;
      } else if (!dragging) {
        pan.x += vel.x; pan.y += vel.y;
        vel.x *= 0.94; vel.y *= 0.94;
        if (Math.abs(vel.x) < 0.05 && Math.abs(vel.y) < 0.05) { vel.x = vel.y = 0; }
      }
      place();
      if (dragging || target || vel.x || vel.y) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    var dragging = false, moved = 0, last = null, downCard = null;
    stage.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true; moved = 0; target = null;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      vel.x = vel.y = 0;
      downCard = e.target.closest(".gal-card:not(.gal-decor)");
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("is-dragging");
      kick();
    });
    stage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - last.x, dy = e.clientY - last.y, now = performance.now();
      var dt = Math.max(1, now - last.t);
      pan.x += dx / zoom; pan.y += dy / zoom;
      moved += Math.abs(dx) + Math.abs(dy);
      // velocity in px per frame, smoothed
      vel.x = vel.x * 0.6 + (dx / zoom / dt) * 16 * 0.4;
      vel.y = vel.y * 0.6 + (dy / zoom / dt) * 16 * 0.4;
      last = { x: e.clientX, y: e.clientY, t: now };
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      if (reduce) vel.x = vel.y = 0;
      if (moved < 6 && downCard) open(downCard);
      downCard = null;
      kick();
    }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    /* Zoom around the stage centre; the wall refills to cover the new view. */
    var zoomLabel = null;
    function setZoom(z) {
      z = Math.max(ZMIN, Math.min(ZMAX, z));
      if (Math.abs(z - zoom) < 0.001) return;
      zoom = z;
      build(); place();
      if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + "%";
    }
    // Pinch on a trackpad (and Ctrl/Cmd + wheel) zooms; horizontal swipes pan; vertical wheel stays with the page.
    stage.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom * Math.exp(-e.deltaY * 0.01)); return; }
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      target = null; pan.x -= e.deltaX / zoom; vel.x = -e.deltaX * 0.3 / zoom; kick();
    }, { passive: false });
    // Keyboard: focusing a card glides it to the centre; Enter or Space opens it.
    stage.addEventListener("focusin", function (e) {
      var s = slots.find(function (q) { return q.el === e.target; });
      if (!s) return;
      target = { x: pan.x + (Wv / 2 - cellW / 2 - s.x), y: pan.y + (Hv / 2 - cellH / 2 - s.y) };
      if (reduce) { pan = target; target = null; place(); } else kick();
    });
    stage.addEventListener("keydown", function (e) {
      var step = { ArrowLeft: [pitchX, 0], ArrowRight: [-pitchX, 0], ArrowUp: [0, pitchY], ArrowDown: [0, -pitchY] }[e.key];
      if (step && e.target === stage) { e.preventDefault(); target = { x: pan.x + step[0], y: pan.y + step[1] }; kick(); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(zoom / 1.2); }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(zoom * 1.2); }
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("gal-card")) { e.preventDefault(); open(e.target); }
    });

    /* ---------------------------------------------------------------- *
     *  Detail overlay with a FLIP scale from the card                   *
     * ---------------------------------------------------------------- */
    var overlay = document.createElement("div");
    overlay.className = "gal-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="gal-scrim"></div><div class="gal-panel" role="dialog" aria-modal="true" tabindex="-1"></div>';
    document.body.appendChild(overlay);
    var panel = overlay.querySelector(".gal-panel"), from = null;

    function flip(el, inverse) {
      var a = el.getBoundingClientRect(), b = panel.getBoundingClientRect();
      var sx = a.width / b.width, sy = a.height / b.height;
      var tx = a.left - b.left, ty = a.top - b.top;
      return "translate(" + tx + "px," + ty + "px) scale(" + sx + "," + sy + ")";
    }
    function open(cardEl) {
      var item = opts.items[+cardEl.dataset.idx];
      from = cardEl;
      panel.innerHTML = opts.detailHTML(item) + '<button type="button" class="gal-close" aria-label="Close">×</button>';
      overlay.hidden = false;
      document.documentElement.style.overflow = "hidden";
      if (!reduce) {
        panel.style.transition = "none";
        panel.style.transformOrigin = "0 0";
        panel.style.transform = flip(cardEl);
        panel.style.opacity = "0.6";
        panel.getBoundingClientRect();
        panel.style.transition = "transform .5s cubic-bezier(.2,.8,.2,1), opacity .3s";
        panel.style.transform = "none"; panel.style.opacity = "1";
      }
      overlay.classList.add("is-open");
      panel.focus();
    }
    function close() {
      if (overlay.hidden) return;
      overlay.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      var done = function () { overlay.hidden = true; panel.style.transform = ""; if (from) from.focus({ preventScroll: true }); };
      if (reduce || !from || !document.body.contains(from)) return done();
      panel.style.transition = "transform .4s cubic-bezier(.4,0,.2,1), opacity .4s";
      panel.style.transform = flip(from); panel.style.opacity = "0";
      setTimeout(done, 380);
    }
    overlay.addEventListener("click", function (e) {
      if (e.target.closest(".gal-close") || e.target.classList.contains("gal-scrim")) close();
      if (e.target.closest("a[href^='#']")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    // zoom buttons, glass, bottom right
    var zc = document.createElement("div");
    zc.className = "gal-zoom";
    zc.innerHTML = '<button type="button" aria-label="Zoom out">−</button><span aria-live="polite">100%</span><button type="button" aria-label="Zoom in">+</button>';
    zc.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    zc.children[0].onclick = function () { setZoom(zoom / 1.25); };
    zc.children[2].onclick = function () { setZoom(zoom * 1.25); };
    zoomLabel = zc.children[1];
    stage.appendChild(zc);

    new ResizeObserver(function () { build(); place(); }).observe(stage);
    build(); place();
    return { close: close, destroy: function () { close(); overlay.remove(); } };
  }

  window.Gallery = { mount: mount };
})();
