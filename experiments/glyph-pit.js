/*!
 * Glyph Pit
 * A small cast of design runner lab characters living in the quiet part of
 * a page: the space under the content where nobody is reading.
 *
 * Every piece is a real DOM element (so animated SVGs keep animating) whose
 * position and rotation come from a Matter.js rigid body.
 *
 *   - The runner hops along the floor on its own, turns at the walls and
 *     leaps away when the cursor comes close.
 *   - The rose stands upright, blooms on its loop and sways.
 *   - Glyphs breathe gently, and tumble when pushed or thrown.
 *   - Cursor: a soft force field. Drag: grab and throw (mouse/trackpad).
 *   - Click empty floor: a ring, and one new glyph pops up. Click a piece: it jumps.
 *   - Scroll: the floor gets a nudge from your scroll speed.
 *   - Touch: tap for the ring; page scrolling keeps working.
 *   - Reduced motion: everything settles once and stays still.
 *
 * Needs Matter.js on window.Matter.
 *   GlyphPit.mount(element, { cast: [...], spawn: [...] })
 * piece spec:
 *   { svg: "<svg…currentColor…>", h: 80, color }   inline mark, tinted with color
 *   { src: "runner.svg", w: 150, h: 113, role: "runner" | "rose" }   animated image
 *   { text: "@", h: 70, color, font }               a typed glyph
 */
(function () {
  "use strict";

  var STYLE = [
    ".gp-piece{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;transition:opacity .6s}",
    ".gp-inner{width:100%;height:100%;display:block}",
    ".gp-inner svg,.gp-inner img{width:100%;height:100%;display:block}",
    ".gp-breathe{animation:gp-breathe 3.6s ease-in-out infinite}",
    ".gp-sway{transform-origin:50% 100%;animation:gp-sway 4.2s ease-in-out infinite}",
    "@keyframes gp-breathe{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.045) rotate(-2.5deg)}}",
    "@keyframes gp-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}",
    ".gp-ring{position:absolute;border:2px solid currentColor;border-radius:50%;pointer-events:none;animation:gp-ring .7s ease-out forwards}",
    "@keyframes gp-ring{from{transform:translate(-50%,-50%) scale(.1);opacity:.8}to{transform:translate(-50%,-50%) scale(1);opacity:0}}",
    "@media (prefers-reduced-motion: reduce){.gp-breathe,.gp-sway{animation:none}}",
  ].join("");

  function mount(host, opts) {
    opts = opts || {};
    var M = window.Matter;
    if (!M) { console.warn("GlyphPit: Matter.js is not loaded"); return null; }
    var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
        Mouse = M.Mouse, MouseConstraint = M.MouseConstraint, Query = M.Query, Events = M.Events;

    var ink = opts.ink || "#ece8de";
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = matchMedia("(pointer: coarse)").matches;
    var maxPieces = opts.max || 14;

    if (!document.getElementById("gp-style")) {
      var st = document.createElement("style"); st.id = "gp-style"; st.textContent = STYLE;
      document.head.appendChild(st);
    }
    host.style.color = ink;
    var W = 0, H = 0, scale = 1;

    /* ---------------------------------------------------------------- *
     *  World                                                            *
     * ---------------------------------------------------------------- */
    var engine = Engine.create();
    engine.gravity.y = 1;
    var pieces = [];   // { body, el, spec, cast }
    var walls = [];
    function buildWalls() {
      Composite.remove(engine.world, walls);
      var t = 400;
      walls = [
        Bodies.rectangle(W / 2, H + t / 2, W * 4, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, -H, t, H * 6, { isStatic: true }),
        Bodies.rectangle(W + t / 2, -H, t, H * 6, { isStatic: true }),
      ];
      Composite.add(engine.world, walls);
    }

    /* ---------------------------------------------------------------- *
     *  Pieces                                                           *
     * ---------------------------------------------------------------- */
    function makeEl(spec) {
      var el = document.createElement("div");
      el.className = "gp-piece";
      el.setAttribute("aria-hidden", "true");
      var inner = document.createElement("div");
      inner.className = "gp-inner " + (spec.role === "rose" ? "gp-sway" : spec.role === "runner" ? "" : "gp-breathe");
      inner.style.animationDelay = (-Math.random() * 4).toFixed(2) + "s";
      if (spec.svg) { inner.innerHTML = spec.svg; inner.style.color = spec.color || ink; }
      else if (spec.src) { var img = new Image(); img.src = spec.src; img.alt = ""; inner.appendChild(img); }
      else {
        inner.textContent = spec.text;
        inner.style.cssText += ";font:" + Math.round(spec.h * 1.25) + "px/" + spec.h + "px " + (spec.font || opts.font || "cursive") +
          ";color:" + (spec.color || ink) + ";white-space:nowrap;text-align:center";
      }
      el.appendChild(inner);
      host.appendChild(el);
      return el;
    }
    function aspect(spec) {
      if (spec.w) return spec.w / spec.h;
      var vb = spec.svg && spec.svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
      if (vb) return Number(vb[3]) / Number(vb[4]);
      return spec.aspect || 1;
    }
    function add(spec, x, y, vel, isCast) {
      var h = spec.h * scale, w = h * aspect(spec);
      var upright = spec.role === "runner" || spec.role === "rose";
      var body = Bodies.rectangle(x, y, w * 0.86, h * 0.86, {
        chamfer: { radius: Math.min(w, h) * 0.3 },
        restitution: upright ? 0.1 : 0.35,
        friction: upright ? 0.6 : 0.25,
        frictionAir: 0.015,
        density: upright ? 0.003 : 0.0015,
        angle: upright ? 0 : (Math.random() - 0.5) * 0.8,
      });
      if (upright) Body.setInertia(body, Infinity); // characters stay on their feet
      if (vel) Body.setVelocity(body, vel);
      Composite.add(engine.world, body);
      var el = makeEl(spec);
      el.style.width = w + "px"; el.style.height = h + "px";
      var p = { body: body, el: el, spec: spec, cast: !!isCast, w: w, h: h, dir: Math.random() < 0.5 ? -1 : 1, nextHop: 0 };
      body.piece = p;
      pieces.push(p);
      // Keep it calm: the oldest spawned (never the cast) fades out when full.
      if (pieces.length > maxPieces) {
        var old = pieces.find(function (q) { return !q.cast; });
        if (old) remove(old);
      }
      return p;
    }
    function remove(p) {
      pieces.splice(pieces.indexOf(p), 1);
      Composite.remove(engine.world, p.body);
      p.el.style.opacity = "0";
      setTimeout(function () { p.el.remove(); }, 650);
    }

    /* ---------------------------------------------------------------- *
     *  Behaviour: the runner hops, everything reacts to the cursor      *
     * ---------------------------------------------------------------- */
    var ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, inside: false };
    function local(e) { var r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    host.addEventListener("pointermove", function (e) {
      var p = local(e);
      if (ptr.inside) { ptr.vx = p.x - ptr.x; ptr.vy = p.y - ptr.y; }
      ptr.x = p.x; ptr.y = p.y; ptr.inside = true;
    });
    host.addEventListener("pointerleave", function () { ptr.inside = false; ptr.x = ptr.y = -1e4; });

    var dragging = null, tick = 0;
    Events.on(engine, "beforeUpdate", function () {
      tick++;
      var R = 170 * Math.max(0.7, scale);
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i], b = p.body;
        if (b === dragging) continue;
        var grounded = Math.abs(b.velocity.y) < 0.4 && b.position.y > H - p.h;
        // the cursor field
        if (ptr.inside) {
          var dx = b.position.x - ptr.x, dy = b.position.y - ptr.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < R && d > 1) {
            var f = 1 - d / R;
            if (p.spec.role === "runner") {
              // startled: leap away from the cursor
              if (grounded && tick > p.nextHop) { p.dir = dx > 0 ? 1 : -1; Body.setVelocity(b, { x: p.dir * 9, y: -11 }); p.nextHop = tick + 40; }
            } else {
              Body.applyForce(b, b.position, {
                x: (dx / d) * f * f * 0.004 * b.mass + ptr.vx * f * 0.0003 * b.mass,
                y: (dy / d) * f * f * 0.004 * b.mass + ptr.vy * f * 0.0003 * b.mass,
              });
            }
          }
        }
        // the runner's own life: a hop every couple of seconds, turning at the walls
        if (p.spec.role === "runner" && grounded && tick > p.nextHop && !reduce) {
          if (b.position.x < p.w) p.dir = 1;
          if (b.position.x > W - p.w) p.dir = -1;
          if (Math.random() < 0.12) p.dir *= -1;
          Body.setVelocity(b, { x: p.dir * (3 + Math.random() * 3), y: -6 - Math.random() * 5 });
          p.nextHop = tick + 70 + Math.random() * 90;
        }
      }
      ptr.vx *= 0.8; ptr.vy *= 0.8;
    });

    /* ---------------------------------------------------------------- *
     *  Grab and throw (fine pointers only, so touch scrolling survives) *
     * ---------------------------------------------------------------- */
    var mc = null;
    if (!coarse && !reduce) {
      var mouse = Mouse.create(host);
      ["mousewheel", "DOMMouseScroll", "wheel"].forEach(function (ev) { mouse.element.removeEventListener(ev, mouse.mousewheel); });
      mc = MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.18, damping: 0.1, render: { visible: false } } });
      Composite.add(engine.world, mc);
      Events.on(mc, "startdrag", function (e) { dragging = e.body; });
      Events.on(mc, "enddrag", function () { dragging = null; });
    }

    /* ---------------------------------------------------------------- *
     *  Click and tap                                                    *
     * ---------------------------------------------------------------- */
    function ring(x, y) {
      var r = document.createElement("span");
      r.className = "gp-ring";
      var size = 260 * Math.max(0.7, scale);
      r.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + size + "px;height:" + size + "px";
      host.appendChild(r);
      r.addEventListener("animationend", function () { r.remove(); });
    }
    function shove(x, y, k) {
      pieces.forEach(function (p) {
        var b = p.body, dx = b.position.x - x, dy = b.position.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d > 260) return;
        var s = (1 - d / 260) * 12 * k;
        Body.setVelocity(b, { x: b.velocity.x + (dx / d) * s, y: b.velocity.y - s * 0.8 });
      });
    }
    var down = null;
    host.addEventListener("pointerdown", function (e) { var p = local(e); down = { x: p.x, y: p.y, t: performance.now() }; });
    host.addEventListener("pointerup", function (e) {
      if (!down || reduce) { down = null; return; }
      var p = local(e), click = Math.hypot(p.x - down.x, p.y - down.y) < 6 && performance.now() - down.t < 400;
      down = null;
      if (!click) return;
      var hit = Query.point(pieces.map(function (q) { return q.body; }), p)[0];
      if (hit) { Body.setVelocity(hit, { x: (Math.random() - 0.5) * 5, y: -14 }); if (hit.inertia !== Infinity) Body.setAngularVelocity(hit, (Math.random() - 0.5) * 0.5); return; }
      ring(p.x, p.y);
      shove(p.x, p.y, coarse ? 1 : 0.7);
      var pool = opts.spawn || [];
      if (pool.length) add(pool[(Math.random() * pool.length) | 0], p.x, H - 30, { x: (Math.random() - 0.5) * 4, y: -15 });
    });

    /* ---------------------------------------------------------------- *
     *  Scroll nudges the floor                                          *
     * ---------------------------------------------------------------- */
    var visible = false, lastScroll = window.scrollY;
    window.addEventListener("scroll", function () {
      var dy = window.scrollY - lastScroll; lastScroll = window.scrollY;
      if (!visible || reduce) return;
      var k = Math.max(-1, Math.min(1, dy / 60));
      pieces.forEach(function (p) {
        Body.setVelocity(p.body, { x: p.body.velocity.x + (Math.random() - 0.5) * Math.abs(k) * 3, y: p.body.velocity.y - k * (3 + Math.random() * 4) });
      });
    }, { passive: true });

    /* ---------------------------------------------------------------- *
     *  Draw: copy each body's position onto its element                 *
     * ---------------------------------------------------------------- */
    function draw() {
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i], b = p.body;
        var flip = p.spec.role === "runner" && p.dir < 0 ? " scaleX(-1)" : "";
        p.el.style.transform = "translate(" + (b.position.x - p.w / 2).toFixed(1) + "px," + (b.position.y - p.h / 2).toFixed(1) + "px) rotate(" + b.angle.toFixed(3) + "rad)" + flip;
      }
      if (mc) {
        var over = ptr.inside && Query.point(pieces.map(function (q) { return q.body; }), ptr).length;
        host.style.cursor = dragging ? "grabbing" : over ? "grab" : "crosshair";
      }
    }
    var raf = 0;
    function frame() {
      raf = 0;
      if (!visible || document.hidden) return;
      Engine.update(engine, 1000 / 60);
      draw();
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!reduce && !raf) raf = requestAnimationFrame(frame); }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(host);
    document.addEventListener("visibilitychange", start);

    /* ---------------------------------------------------------------- *
     *  Size and boot                                                    *
     * ---------------------------------------------------------------- */
    function resize() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      scale = Math.max(0.6, Math.min(1, W / 900));
      buildWalls();
      pieces.forEach(function (p) {
        var b = p.body;
        if (b.position.x > W - 20 || b.position.y > H) Body.setPosition(b, { x: Math.min(b.position.x, W - p.w), y: Math.min(b.position.y, H - p.h) });
      });
      if (reduce) draw();
    }
    new ResizeObserver(resize).observe(host);
    resize();

    var cast = opts.cast || [];
    var fontReady = document.fonts && document.fonts.load ? document.fonts.load("60px " + (opts.font || "cursive")).catch(function () {}) : Promise.resolve();
    fontReady.then(function () {
      // drop the cast in, spread across the floor, a beat apart
      cast.forEach(function (spec, i) {
        var x = W * (0.1 + 0.8 * (i + 0.5) / cast.length) + (Math.random() - 0.5) * 40;
        add(spec, x, -60 - i * 70, null, true);
      });
      if (reduce) { for (var s = 0; s < 600; s++) Engine.update(engine, 1000 / 60); draw(); }
      else start();
    });

    return { add: function (spec) { return add(spec, W / 2, -60); } };
  }

  window.GlyphPit = { mount: mount };
})();
