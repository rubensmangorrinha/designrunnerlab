/*!
 * Topic scenes: a small Three.js stage injected after an article's title and
 * first paragraph. Each article picks a scene that acts out its idea.
 *
 * One engine, three stories. Every scene is a set of boxes with a "before"
 * and an "after" arrangement. Scrolling the scene through the viewport
 * morphs one into the other (scroll-driven, like a camera move), and a
 * key light follows the mouse so the surfaces catch moving reflections.
 *
 *   digest     six floating tabs fold into one brief
 *   architect  scattered pixels assemble into an ordered system
 *   system     UI components flatten into lines of written rules
 *
 *   TopicScene.mount(element, "digest") -> { destroy() }
 */
(function () {
  "use strict";

  var INK = 0xece8de, RED = 0xe0301e, DARK = 0x3a3a38;

  /* Small seeded random so every visit looks the same. */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  /* Each layout returns [{ p:[x,y,z], s:[w,h,d], r:[x,y,z], c:color }] for before and after. */
  var STORIES = {
    digest: function () {
      var r = rng(7), a = [], b = [], i;
      // six tabs: fanned out and tilted -> stacked into a single card
      for (i = 0; i < 6; i++) {
        var t = i - 2.5;
        a.push({ p: [t * 2.1, Math.sin(i * 1.7) * 1.1, -Math.abs(t) * 0.6], s: [1.9, 1.3, 0.05], r: [0.15, t * -0.18, t * 0.12], c: i === 5 ? RED : INK });
        b.push({ p: [0, 0, -0.5 - i * 0.07], s: [3.6, 2.4, 0.05], r: [-0.08, 0.25, 0], c: i === 5 ? RED : INK });
      }
      // notifications scattered around -> neat lines of text on the brief
      for (i = 0; i < 14; i++) {
        a.push({ p: [(r() - 0.5) * 12, (r() - 0.5) * 5, (r() - 0.2) * 2], s: [0.28, 0.28, 0.28], r: [r() * 3, r() * 3, 0], c: r() < 0.25 ? RED : INK });
        var row = i % 7, col = (i / 7) | 0;
        b.push({ p: [-1.35 + col * 1.5 + (row === 0 ? 0 : 0), 0.85 - row * 0.28, 0.06], s: [row === 0 ? 1.2 : 1.25 - (i % 3) * 0.25, 0.09, 0.03], r: [-0.08, 0.25, 0], c: row === 0 ? RED : DARK });
      }
      return { a: a, b: b, labels: ["Six tabs", "One brief"] };
    },

    architect: function () {
      var r = rng(11), a = [], b = [];
      // 4x4x4 voxels: a loose cloud of pixels -> an ordered lattice, one red path through it
      for (var x = 0; x < 4; x++) for (var y = 0; y < 4; y++) for (var z = 0; z < 4; z++) {
        var red = x === y && y === z;
        a.push({ p: [(r() - 0.5) * 13, (r() - 0.5) * 6, (r() - 0.5) * 6], s: [0.42, 0.42, 0.42], r: [r() * 6, r() * 6, r() * 6], c: red ? RED : INK });
        b.push({ p: [(x - 1.5) * 0.78, (y - 1.5) * 0.78, (z - 1.5) * 0.78], s: [0.6, 0.6, 0.6], r: [0, 0, 0], c: red ? RED : INK });
      }
      return { a: a, b: b, labels: ["Pushing pixels", "Designing the system"], spin: true };
    },

    system: function () {
      var a = [], b = [];
      // a small UI: header, card, inputs, buttons, avatars -> a stack of text lines (the rules)
      var ui = [
        [0, 1.9, 5.2, 0.5], [-1.35, 0.55, 2.5, 1.9], [1.45, 1.05, 2.3, 0.45], [1.45, 0.4, 2.3, 0.45],
        [1.45, -0.25, 2.3, 0.45], [0.9, -0.95, 1.2, 0.5], [2.15, -0.95, 1.0, 0.5], [-2.2, -1.0, 0.6, 0.6],
        [-1.5, -1.0, 0.6, 0.6], [-0.8, -1.0, 0.6, 0.6], [0, -1.85, 5.2, 0.35], [-1.35, 0.55, 1.8, 0.12],
      ];
      var widths = [2.6, 4.6, 4.1, 4.4, 3.2, 4.5, 3.8, 2.4, 4.2, 3.6, 4.4, 2.0];
      ui.forEach(function (u, i) {
        a.push({ p: [u[0], u[1], 0], s: [u[2], u[3], 0.25], r: [0.18, -0.35, 0], c: i === 5 ? RED : INK });
        b.push({ p: [-2.4 + widths[i] / 2, 2.0 - i * 0.36 - (i > 0 ? 0.25 : 0), 0], s: [widths[i], i === 0 ? 0.2 : 0.12, 0.05], r: [0, 0, 0], c: i === 0 ? RED : INK });
      });
      return { a: a, b: b, labels: ["Components", "Rules an agent can read"] };
    },
  };

  function mount(host, kind) {
    var THREE = window.THREE;
    var story = STORIES[kind] && STORIES[kind]();
    if (!THREE || !story) { host.remove(); return { destroy: function () {} }; }
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { host.remove(); return { destroy: function () {} }; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    host.querySelector(".ts-stage").appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 2, 0.1, 100);
    camera.position.set(0, 0, 11.5);

    // studio light: soft ambient, a key light that follows the mouse, a warm red rim from behind
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    var key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 4, 8);
    scene.add(key);
    var rim = new THREE.DirectionalLight(RED, 0.9);
    rim.position.set(-6, -2, -6);
    scene.add(rim);

    var n = story.a.length;
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.08 });
    var mesh = new THREE.InstancedMesh(geo, mat, n);
    var col = new THREE.Color();
    for (var i = 0; i < n; i++) mesh.setColorAt(i, col.setHex(story.b[i].c || story.a[i].c).convertSRGBToLinear());
    var group = new THREE.Group();
    group.add(mesh);
    scene.add(group);

    // cached vectors so the frame loop allocates nothing
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
    function lerp(x, y, t) { return x + (y - x) * t; }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    var progress = reduce ? 1 : 0, shown = progress, mouse = { x: 0, y: 0 }, lightT = { x: 3, y: 4 };
    var labelA = host.querySelector(".ts-a"), labelB = host.querySelector(".ts-b");

    function layout(t, time) {
      var k = ease(t);
      for (var i = 0; i < n; i++) {
        var A = story.a[i], B = story.b[i];
        var bob = reduce ? 0 : Math.sin(time * 0.0012 + i * 0.9) * 0.08 * (1 - k * 0.7);
        P.set(lerp(A.p[0], B.p[0], k), lerp(A.p[1], B.p[1], k) + bob, lerp(A.p[2], B.p[2], k));
        S.set(lerp(A.s[0], B.s[0], k), lerp(A.s[1], B.s[1], k), lerp(A.s[2], B.s[2], k));
        e.set(lerp(A.r[0], B.r[0], k), lerp(A.r[1], B.r[1], k), lerp(A.r[2], B.r[2], k));
        q.setFromEuler(e);
        m.compose(P, q, S);
        mesh.setMatrixAt(i, m);
        // colour: "before" pieces fade into their "after" colour halfway through
        col.setHex(k < 0.5 ? A.c : B.c).convertSRGBToLinear();
        mesh.setColorAt(i, col);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      if (labelA) { labelA.style.opacity = (1 - k * 0.7).toFixed(2); labelB.style.opacity = (0.3 + k * 0.7).toFixed(2); }
    }

    function resize() {
      var w = host.querySelector(".ts-stage").clientWidth, h = host.querySelector(".ts-stage").clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the composition in frame on narrow screens by stepping back
      camera.position.z = w / h < 1.4 ? 11.5 * (1.4 / (w / h)) * 0.95 : 11.5;
      camera.updateProjectionMatrix();
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
      layout(shown, time);
      // key light chases the mouse; the whole piece leans a little toward it
      lightT.x += (mouse.x * 14 - lightT.x) * 0.06;
      lightT.y += (-mouse.y * 10 - lightT.y) * 0.06;
      key.position.set(lightT.x, lightT.y, 8);
      group.rotation.y += ((story.spin ? time * 0.00015 : 0) + mouse.x * 0.35 - group.rotation.y) * 0.05;
      group.rotation.x += (mouse.y * 0.2 - group.rotation.x) * 0.05;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

    var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); });
    io.observe(host);
    var ro = new ResizeObserver(function () { resize(); if (reduce) { layout(1, 0); renderer.render(scene, camera); } });
    ro.observe(host);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", start);
    resize();
    layout(progress, 0);
    renderer.render(scene, camera);

    return {
      destroy: function () {
        cancelAnimationFrame(raf); raf = 0; visible = false;
        io.disconnect(); ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("visibilitychange", start);
        geo.dispose(); mat.dispose(); renderer.dispose();
      },
    };
  }

  window.TopicScene = { mount: mount };
})();
