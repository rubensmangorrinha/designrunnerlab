/*!
 * Meadow: a row of blooming roses along the bottom of the page that sway in
 * the wind. Moving the cursor through them pushes a gust; each stem is a
 * damped spring, so it overshoots a little and settles back.
 *
 *   Meadow.mount(element, { src: "assets/rose-bloom.svg", ratio: 361 / 1500 })
 */
(function () {
  "use strict";

  function mount(host, opts) {
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ratio = opts.ratio || 0.24;
    var stems = [];
    var W = 0, H = 0;

    function build() {
      W = host.clientWidth; H = host.clientHeight;
      host.querySelectorAll(".mw-stem").forEach(function (el) { el.remove(); });
      stems = [];
      var count = Math.max(7, Math.round(W / 46));
      for (var i = 0; i < count; i++) {
        var h = H * (0.55 + Math.random() * 0.45);           // varied heights
        var x = (i + 0.5) / count * W + (Math.random() - 0.5) * 30;
        var el = document.createElement("div");
        el.className = "mw-stem";
        el.style.cssText = "left:" + (x - h * ratio / 2).toFixed(0) + "px;height:" + h.toFixed(0) + "px;width:" + (h * ratio).toFixed(0) + "px";
        var img = new Image();
        img.alt = ""; img.decoding = "async";
        img.style.opacity = "0"; img.style.transition = "opacity .8s";
        img.onload = function () { this.style.opacity = "1"; };
        // a unique URL per stem gives each rose its own bloom timeline,
        // and a staggered start keeps them from blooming in unison
        (function (img, i) { setTimeout(function () { img.src = opts.src + "?r=" + i; }, reduce ? 0 : Math.random() * 5000); })(img, i);
        if (Math.random() < 0.5) img.style.transform = "scaleX(-1)";
        el.appendChild(img);
        host.appendChild(el);
        stems.push({ el: el, x: x, h: h, a: 0, v: 0, lean: (Math.random() - 0.5) * 8, phase: Math.random() * 6.28 });
      }
    }

    /* Cursor gusts: horizontal speed near a stem pushes it. */
    var ptr = { x: -1e4, vx: 0, near: false };
    window.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      var x = e.clientX - r.left;
      ptr.near = e.clientY > r.top - 140 && e.clientY < r.bottom;
      ptr.vx = ptr.x > -1e3 ? x - ptr.x : 0;
      ptr.x = x;
    }, { passive: true });

    var visible = false, raf = 0;
    function frame(t) {
      raf = 0;
      if (!visible || document.hidden) return;
      // a slow breeze that rolls across the row, plus the cursor's gust
      for (var i = 0; i < stems.length; i++) {
        var s = stems[i];
        var breeze = Math.sin(t * 0.0009 + s.x * 0.006 + s.phase) * 4 + Math.sin(t * 0.0023 + s.phase) * 1.5;
        if (ptr.near) {
          var d = Math.abs(s.x - ptr.x);
          if (d < 160) s.v += ptr.vx * 0.06 * (1 - d / 160);
        }
        // damped spring toward lean + breeze
        s.v += ((s.lean + breeze) - s.a) * 0.03;
        s.v *= 0.9;
        s.a = Math.max(-38, Math.min(38, s.a + s.v));
        s.el.style.transform = "rotate(" + s.a.toFixed(2) + "deg)";
      }
      ptr.vx *= 0.7;
      raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !reduce && !raf) raf = requestAnimationFrame(frame); }).observe(host);
    document.addEventListener("visibilitychange", function () { if (visible && !reduce && !raf) raf = requestAnimationFrame(frame); });

    var lastW = 0;
    new ResizeObserver(function () {
      if (Math.abs(host.clientWidth - lastW) < 40) return;
      lastW = host.clientWidth; build();
      if (reduce) stems.forEach(function (s) { s.el.style.transform = "rotate(" + s.lean.toFixed(1) + "deg)"; });
    }).observe(host);
  }

  window.Meadow = { mount: mount };
})();
