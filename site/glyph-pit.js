/*!
 * Glyph Pit
 * A physics toy for the quiet parts of a page: the space under the content
 * where nobody is reading and nothing needs clicking.
 *
 * design runner lab's hand-drawn glyphs are rigid bodies in a Matter.js world.
 *   - Move the cursor through them: it is a force field that shoves them away,
 *     and your swipe speed becomes wind. Gravity tilts toward the cursor's side.
 *   - Grab and throw them (mouse and trackpad).
 *   - Click empty space: a shockwave, plus a new glyph pops out of the floor.
 *     Click a glyph: it jumps.
 *   - Scroll the page: the pit is shaken by your scroll speed.
 *   - On touch screens a tap does the shockwave, so page scrolling keeps working.
 *   - With "reduce motion" on, the pile settles once and stays still.
 *
 * Needs Matter.js on window.Matter.
 * Usage:  GlyphPit.mount(element, { glyphs: [...], ink: "#ece8de" })
 *   glyph spec: { svg: "<svg…currentColor…>", h: 48 }   or   { text: "@", h: 60, color: "#e0301e" }
 */
(function () {
  "use strict";

  function mount(host, opts) {
    opts = opts || {};
    var M = window.Matter;
    if (!M) { console.warn("GlyphPit: Matter.js is not loaded"); return null; }
    var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
        Mouse = M.Mouse, MouseConstraint = M.MouseConstraint, Query = M.Query, Events = M.Events;

    var ink = opts.ink || "#ece8de";
    var font = opts.font || '"HV Smegs 1", "Caveat Brush", cursive';
    var maxBodies = opts.max || 60;
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = matchMedia("(pointer: coarse)").matches;

    /* ---------------------------------------------------------------- *
     *  Canvas                                                           *
     * ---------------------------------------------------------------- */
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;";
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    // Matter's Mouse divides by this, so pointer coordinates come out in CSS px
    // and the physics world can stay in CSS px too.
    canvas.pixelRatio = dpr;
    var W = 0, H = 0, scale = 1;

    /* ---------------------------------------------------------------- *
     *  Physics world                                                    *
     * ---------------------------------------------------------------- */
    var engine = Engine.create();
    engine.gravity.y = 1.1;
    var bodies = [];
    var walls = [];

    function buildWalls() {
      Composite.remove(engine.world, walls);
      var t = 400; // thick walls so fast throws can't tunnel through
      walls = [
        Bodies.rectangle(W / 2, H + t / 2, W * 4, t, { isStatic: true }),              // floor
        Bodies.rectangle(-t / 2, H / 2 - H * 3, t, H * 8, { isStatic: true }),         // left
        Bodies.rectangle(W + t / 2, H / 2 - H * 3, t, H * 8, { isStatic: true }),      // right
      ];
      // No ceiling: a hard throw flies off the top and gravity brings it back.
      Composite.add(engine.world, walls);
    }

    /* ---------------------------------------------------------------- *
     *  Sprites: every glyph is pre-rendered once                        *
     * ---------------------------------------------------------------- */
    function svgSprite(spec) {
      return new Promise(function (resolve) {
        var markup = spec.svg.replace(/currentColor/g, spec.color || ink).replace(/var\(--red\)/g, opts.red || "#e0301e");
        var vb = markup.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
        var aspect = vb ? Number(vb[3]) / Number(vb[4]) : 1;
        var img = new Image();
        img.onload = function () { resolve({ img: img, w: spec.h * aspect, h: spec.h }); };
        img.onerror = function () { resolve(null); };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
      });
    }
    function textSprite(spec) {
      var size = spec.h * 1.4;
      var probe = document.createElement("canvas").getContext("2d");
      probe.font = size + "px " + font;
      var m = probe.measureText(spec.text);
      var l = m.actualBoundingBoxLeft || 0, r = m.actualBoundingBoxRight || m.width;
      var a = m.actualBoundingBoxAscent || size * 0.7, d = m.actualBoundingBoxDescent || 0;
      var k = spec.h / (a + d); // rescale so the ink is exactly spec.h tall
      var c = document.createElement("canvas");
      c.width = Math.ceil((l + r) * k * dpr) + 4;
      c.height = Math.ceil(spec.h * dpr) + 4;
      var cx = c.getContext("2d");
      cx.scale(k * dpr, k * dpr);
      cx.font = probe.font;
      cx.fillStyle = spec.color || ink;
      cx.fillText(spec.text, l + 2 / (k * dpr), a + 2 / (k * dpr));
      return Promise.resolve({ img: c, w: (l + r) * k, h: spec.h });
    }

    var sprites = [];
    function pick() { return sprites[(Math.random() * sprites.length) | 0]; }

    /* ---------------------------------------------------------------- *
     *  Bodies                                                           *
     * ---------------------------------------------------------------- */
    function spawn(x, y, sprite, vel) {
      var w = sprite.w * scale, h = sprite.h * scale;
      var b = Bodies.rectangle(x, y, w * 0.9, h * 0.82, {
        chamfer: { radius: Math.min(w, h) * 0.3 },
        restitution: 0.38,
        friction: 0.2,
        frictionAir: 0.012,
        density: 0.0015,
        angle: (Math.random() - 0.5) * 1.4,
      });
      b.sprite = sprite; b.dw = w; b.dh = h;
      if (vel) Body.setVelocity(b, vel);
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.25);
      Composite.add(engine.world, b);
      bodies.push(b);
      // Keep the world small: the oldest glyph leaves when the pit is full.
      while (bodies.length > maxBodies) Composite.remove(engine.world, bodies.shift());
      return b;
    }

    /* ---------------------------------------------------------------- *
     *  Pointer: force field, wind, gravity tilt                         *
     * ---------------------------------------------------------------- */
    var ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, inside: false };
    function local(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener("pointermove", function (e) {
      var p = local(e);
      if (ptr.inside) { ptr.vx = p.x - ptr.x; ptr.vy = p.y - ptr.y; }
      ptr.x = p.x; ptr.y = p.y; ptr.inside = true;
    });
    canvas.addEventListener("pointerleave", function () { ptr.inside = false; ptr.x = ptr.y = -1e4; });

    var dragging = null; // set by the mouse constraint below
    Events.on(engine, "beforeUpdate", function () {
      if (ptr.inside) {
        var R = 140 * Math.max(0.7, scale);
        for (var i = 0; i < bodies.length; i++) {
          var b = bodies[i];
          if (b === dragging) continue;
          var dx = b.position.x - ptr.x, dy = b.position.y - ptr.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d > R || d < 1) continue;
          var falloff = 1 - d / R;
          var push = falloff * falloff * 0.006 * b.mass;     // radial shove
          var wind = falloff * 0.00035 * b.mass;             // your swipe direction
          Body.applyForce(b, b.position, {
            x: (dx / d) * push + ptr.vx * wind,
            y: (dy / d) * push + ptr.vy * wind,
          });
        }
      }
      ptr.vx *= 0.82; ptr.vy *= 0.82;
      // Gravity leans toward whichever side the cursor is on.
      var target = ptr.inside ? (ptr.x / W - 0.5) * 0.7 : 0;
      engine.gravity.x += (target - engine.gravity.x) * 0.04;
    });

    /* ---------------------------------------------------------------- *
     *  Grab and throw (fine pointers only, so touch scrolling survives) *
     * ---------------------------------------------------------------- */
    var mc = null;
    if (!coarse && !reduce) {
      var mouse = Mouse.create(canvas);
      // Matter listens to the wheel for zooming. Never let it eat page scroll.
      ["mousewheel", "DOMMouseScroll", "wheel"].forEach(function (ev) {
        mouse.element.removeEventListener(ev, mouse.mousewheel);
      });
      mc = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.18, damping: 0.08, render: { visible: false } },
      });
      Composite.add(engine.world, mc);
      Events.on(mc, "startdrag", function (e) { dragging = e.body; });
      Events.on(mc, "enddrag", function () { dragging = null; });
    }

    /* ---------------------------------------------------------------- *
     *  Clicks and taps: jump, shockwave, spawn                          *
     * ---------------------------------------------------------------- */
    var rings = [];
    function shockwave(x, y, strength) {
      rings.push({ x: x, y: y, r: 8, life: 1 });
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var dx = b.position.x - x, dy = b.position.y - y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d > 300) continue;
        var k = (1 - d / 300) * 16 * strength;
        Body.setVelocity(b, { x: b.velocity.x + (dx / d) * k, y: b.velocity.y + (dy / d) * k - k * 0.4 });
        Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.3 * strength);
      }
    }
    var down = null;
    canvas.addEventListener("pointerdown", function (e) { var p = local(e); down = { x: p.x, y: p.y, t: performance.now() }; });
    canvas.addEventListener("pointerup", function (e) {
      if (!down || reduce) { down = null; return; }
      var p = local(e);
      var isClick = Math.hypot(p.x - down.x, p.y - down.y) < 6 && performance.now() - down.t < 400;
      down = null;
      if (!isClick || !sprites.length) return;
      var hit = Query.point(bodies, p)[0];
      if (hit) {
        Body.setVelocity(hit, { x: (Math.random() - 0.5) * 6, y: -16 });
        Body.setAngularVelocity(hit, (Math.random() - 0.5) * 0.7);
      } else {
        shockwave(p.x, p.y, coarse ? 1 : 0.7);
        spawn(p.x, H - 20, pick(), { x: (Math.random() - 0.5) * 5, y: -18 - Math.random() * 6 });
      }
    });

    /* ---------------------------------------------------------------- *
     *  Scrolling shakes the pit                                         *
     * ---------------------------------------------------------------- */
    var visible = false;
    var lastScroll = window.scrollY;
    window.addEventListener("scroll", function () {
      var dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (!visible || reduce) return;
      var k = Math.max(-1, Math.min(1, dy / 50));
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        // Scrolling down kicks the floor up; scrolling back up slams it down.
        Body.setVelocity(b, {
          x: b.velocity.x + (Math.random() - 0.5) * Math.abs(k) * 5,
          y: b.velocity.y - k * (4 + Math.random() * 5),
        });
      }
    }, { passive: true });

    /* ---------------------------------------------------------------- *
     *  Drawing                                                          *
     * ---------------------------------------------------------------- */
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.drawImage(b.sprite.img, -b.dw / 2, -b.dh / 2, b.dw, b.dh);
        ctx.restore();
      }
      // Shockwave rings, drawn in the hand-drawn spirit: thick and quick.
      for (var j = rings.length - 1; j >= 0; j--) {
        var g = rings[j];
        g.r += 9; g.life -= 0.045;
        if (g.life <= 0) { rings.splice(j, 1); continue; }
        ctx.globalAlpha = g.life * 0.6;
        ctx.strokeStyle = ink; ctx.lineWidth = 3 * g.life + 1;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Cursor hint: grab when over a glyph, crosshair over empty space.
      if (mc) {
        var over = ptr.inside && Query.point(bodies, ptr).length;
        canvas.style.cursor = dragging ? "grabbing" : over ? "grab" : "crosshair";
      }
    }

    /* ---------------------------------------------------------------- *
     *  Loop: runs only while the pit is on screen                       *
     * ---------------------------------------------------------------- */
    var raf = 0;
    function frame() {
      raf = 0;
      if (!visible || document.hidden) return;
      Engine.update(engine, 1000 / 60);
      draw();
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!reduce && !raf) raf = requestAnimationFrame(frame); }
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }).observe(host);
    document.addEventListener("visibilitychange", start);

    /* ---------------------------------------------------------------- *
     *  Size                                                             *
     * ---------------------------------------------------------------- */
    function resize() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      scale = Math.max(0.65, Math.min(1, W / 720));
      buildWalls();
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (b.position.x > W - 10 || b.position.y > H) Body.setPosition(b, { x: Math.min(b.position.x, W - 40), y: Math.min(b.position.y, H - 40) });
      }
      if (reduce) draw();
    }
    new ResizeObserver(resize).observe(host);
    resize();

    /* ---------------------------------------------------------------- *
     *  Boot: load sprites, then rain the first batch in                 *
     * ---------------------------------------------------------------- */
    var specs = opts.glyphs || [];
    var fontReady = document.fonts && document.fonts.load ? document.fonts.load("60px " + font).catch(function () {}) : Promise.resolve();
    fontReady.then(function () {
      return Promise.all(specs.map(function (s) { return s.svg ? svgSprite(s) : textSprite(s); }));
    }).then(function (list) {
      sprites = list.filter(Boolean);
      if (!sprites.length) return;
      var n = Math.round(Math.max(10, Math.min(34, (W * H) / 7500)));
      for (var i = 0; i < n; i++) {
        spawn(30 + Math.random() * (W - 60), -40 - i * (H / n) * 0.9, sprites[i % sprites.length]);
      }
      if (reduce) {
        // No animation: let the pile settle off-screen, then draw it once.
        for (var s = 0; s < 900; s++) Engine.update(engine, 1000 / 60);
        draw();
      } else start();
    });

    return { spawn: function () { if (sprites.length) spawn(W / 2, -40, pick()); }, shockwave: shockwave };
  }

  window.GlyphPit = { mount: mount };
})();
