/*!
 * Topic scenes: a small flat 2D stage injected after an article's title and
 * first paragraph. Each article picks a scene that acts out its idea.
 *
 * Every scene is a set of flat shapes with a "before" and an "after"
 * arrangement. Scrolling the stage through the viewport morphs one into the
 * other, and the mouse adds a gentle parallax drift: shapes further "back"
 * move less, so the layers separate without any 3D.
 *
 *   digest     six floating tabs fold into one brief
 *   architect  scattered pixels snap into an ordered grid
 *   system     UI components flatten into lines of written rules
 *   agents     a screen built for eyes rearranges into the read-decide-act-check loop
 *
 *   TopicScene.mount(element, "digest") -> { destroy() }
 */
(function () {
  "use strict";

  var INK = "#ece8de", RED = "#e0301e", DIM = "#5b5953";

  /* Small seeded random so every visit looks the same. */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  /* Shapes live in a 14 x 7 unit world centred on 0,0.
     Each entry: { p:[x,y], s:[w,h], r:rotation, d:depth 0-1 (parallax), c:colour } for before (a) and after (b). */
  var STORIES = {
    agents: function () {
      var a = [], b = [];
      // before: a screen for a person (header, hero, text, two buttons, avatar)
      var ui = [[0, -2.0, 5.6, 0.45], [-1.1, -0.55, 3.4, 2.0], [2.05, -1.2, 1.5, 0.14], [2.05, -0.85, 1.5, 0.14],
                [2.05, -0.5, 1.1, 0.14], [1.6, 0.35, 1.3, 0.5], [2.75, 0.35, 0.9, 0.5], [-2.4, 1.55, 0.6, 0.6]];
      // after: four boxes in a 2x2 square, joined clockwise by thin bars
      var loop = [[-1.55, -0.95, 2.3, 1.1], [1.55, -0.95, 2.3, 1.1], [1.55, 1.05, 2.3, 1.1], [-1.55, 1.05, 2.3, 1.1],
                  [0, -0.95, 0.8, 0.04], [1.55, 0.05, 0.04, 0.9], [0, 1.05, 0.8, 0.04], [-1.55, 0.05, 0.04, 0.9]];
      ui.forEach(function (u, i) {
        a.push({ p: [u[0], u[1]], s: [u[2], u[3]], r: 0, d: 0.2 + (i % 4) * 0.2, c: i === 1 ? DIM : INK });
        var l = loop[i];
        b.push({ p: [l[0], l[1]], s: [l[2], l[3]], r: 0, d: 0.5, c: i < 4 ? INK : DIM });
      });
      return { a: a, b: b };
    },

    digest: function () {
      var r = rng(7), a = [], b = [], i;
      // six tabs fanned out -> stacked into one card, the last one red on top
      for (i = 0; i < 6; i++) {
        var t = i - 2.5;
        a.push({ p: [t * 2.15, Math.sin(i * 1.7) * 0.9], s: [1.9, 1.3], r: t * 0.1, d: 0.3 + (i % 3) * 0.25, c: i === 5 ? RED : INK });
        b.push({ p: [i * 0.05 - 0.12, -i * 0.05 + 0.12], s: [3.8, 2.6], r: -0.02, d: 0.5, c: i === 5 ? RED : INK });
      }
      // scattered notifications -> neat lines of text on the brief
      for (i = 0; i < 14; i++) {
        a.push({ p: [(r() - 0.5) * 12.5, (r() - 0.5) * 5.6], s: [0.3, 0.3], r: r() * 3, d: r(), c: r() < 0.25 ? RED : INK });
        var row = i % 7, col = (i / 7) | 0;
        b.push({ p: [-0.85 + col * 1.75, -0.95 + row * 0.3], s: [row === 0 ? 1.4 : 1.5 - (i % 3) * 0.3, 0.1], r: -0.02, d: 0.5, c: row === 0 ? INK : DIM });
      }
      return { a: a, b: b };
    },

    architect: function () {
      var r = rng(11), a = [], b = [];
      // 64 pixels: a loose scatter -> an 8 x 8 grid with one red diagonal
      for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
        var red = x === y;
        a.push({ p: [(r() - 0.5) * 13, (r() - 0.5) * 6.2], s: [0.36, 0.36], r: r() * 3, d: r(), c: red ? RED : INK });
        b.push({ p: [(x - 3.5) * 0.52, (y - 3.5) * 0.52], s: [0.44, 0.44], r: 0, d: 0.5, c: red ? RED : INK });
      }
      return { a: a, b: b };
    },

    system: function () {
      var a = [], b = [];
      // a small UI (header, card, inputs, buttons, avatars) -> a stack of text lines
      var ui = [
        [0, -1.9, 5.2, 0.5], [-1.35, -0.55, 2.5, 1.9], [1.45, -1.05, 2.3, 0.45], [1.45, -0.4, 2.3, 0.45],
        [1.45, 0.25, 2.3, 0.45], [0.9, 0.95, 1.2, 0.5], [2.15, 0.95, 1.0, 0.5], [-2.2, 1.0, 0.6, 0.6],
        [-1.5, 1.0, 0.6, 0.6], [-0.8, 1.0, 0.6, 0.6], [0, 1.85, 5.2, 0.35], [-1.35, -0.55, 1.8, 0.12],
      ];
      var widths = [2.6, 4.6, 4.1, 4.4, 3.2, 4.5, 3.8, 2.4, 4.2, 3.6, 4.4, 2.0];
      ui.forEach(function (u, i) {
        a.push({ p: [u[0], u[1]], s: [u[2], u[3]], r: 0, d: 0.2 + (i % 4) * 0.2, c: i === 5 ? RED : INK });
        b.push({ p: [-2.4 + widths[i] / 2, -2.0 + i * 0.36 + (i > 0 ? 0.25 : 0)], s: [widths[i], i === 0 ? 0.2 : 0.12], r: 0, d: 0.5, c: i === 0 ? RED : INK });
      });
      return { a: a, b: b };
    },
  };

  function mount(host, kind) {
    var story = STORIES[kind] && STORIES[kind]();
    var stage = host.querySelector(".ts-stage");
    if (!story || !stage) { host.remove(); return { destroy: function () {} }; }
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    stage.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, unit = 1;
    var n = story.a.length;

    function lerp(x, y, t) { return x + (y - x) * t; }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    var progress = reduce ? 1 : 0, shown = progress, mouse = { x: 0, y: 0 }, drift = { x: 0, y: 0 };
    var labelA = host.querySelector(".ts-a"), labelB = host.querySelector(".ts-b");

    function draw(time) {
      var k = ease(shown);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.translate(W / 2, H / 2);
      for (var i = 0; i < n; i++) {
        var A = story.a[i], B = story.b[i];
        var depth = lerp(A.d, B.d, k);
        var bob = reduce ? 0 : Math.sin(time * 0.0012 + i * 0.9) * 0.06 * (1 - k * 0.8);
        // parallax: nearer shapes (higher depth) follow the mouse further
        var px = (lerp(A.p[0], B.p[0], k) + drift.x * (0.2 + depth)) * unit;
        var py = (lerp(A.p[1], B.p[1], k) + bob + drift.y * (0.2 + depth)) * unit;
        var w = lerp(A.s[0], B.s[0], k) * unit, h = lerp(A.s[1], B.s[1], k) * unit;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(lerp(A.r, B.r, k));
        ctx.fillStyle = k < 0.5 ? A.c : B.c;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.12);
        ctx.fill();
        ctx.restore();
      }
      if (labelA) { labelA.style.opacity = (1 - k * 0.7).toFixed(2); labelB.style.opacity = (0.3 + k * 0.7).toFixed(2); }
    }

    function resize() {
      W = stage.clientWidth; H = stage.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      unit = Math.min(W / 14.5, H / 7.2);
      draw(0);
    }
    // scroll progress: 0 as the stage enters from the bottom, 1 once it reaches the upper third
    function readScroll() {
      var r = host.getBoundingClientRect(), vh = window.innerHeight;
      progress = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75 + r.height * 0.3) - 0.15));
    }
    function onMove(ev) {
      mouse.x = ev.clientX / window.innerWidth - 0.5;
      mouse.y = ev.clientY / window.innerHeight - 0.5;
    }

    var visible = false, raf = 0;
    function frame(time) {
      raf = 0;
      if (!visible || document.hidden) return;
      readScroll();
      shown += (progress - shown) * 0.08;
      drift.x += (mouse.x * 0.9 - drift.x) * 0.06;
      drift.y += (mouse.y * 0.5 - drift.y) * 0.06;
      draw(time);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

    var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); });
    io.observe(host);
    var ro = new ResizeObserver(resize);
    ro.observe(stage);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", start);
    resize();

    return {
      destroy: function () {
        cancelAnimationFrame(raf); raf = 0; visible = false;
        io.disconnect(); ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("visibilitychange", start);
      },
    };
  }

  window.TopicScene = { mount: mount };
})();
