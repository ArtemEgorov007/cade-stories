/**
 * LayerZero-style hero warp grid — canvas 2D, mouse parallax.
 * Ported from layerzero.network hero draw logic (vanilla JS).
 */
(function () {
  "use strict";

  var BG = "#0A0A0A";
  var BG_TRANS = "rgba(10, 10, 10, 0)";
  var TAU = Math.PI * 2;

  function map(v, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((v - inMin) / (inMax - inMin));
  }

  function createVignette(ctx, w, h) {
    var mobile = w < 768;
    var gradH = 0.25 * h * (mobile ? 2 : 1);
    var top = ctx.createLinearGradient(0, 0, 0, gradH);
    top.addColorStop(0, BG);
    top.addColorStop(1, BG_TRANS);
    var bottom = ctx.createLinearGradient(0, h - gradH, 0, h);
    bottom.addColorStop(0, BG_TRANS);
    bottom.addColorStop(1, BG);
    var sideW = 0;
    var left = null;
    var right = null;
    if (!mobile) {
      sideW = 0.25 * w;
      left = ctx.createLinearGradient(0, 0, sideW, 0);
      left.addColorStop(0, BG);
      left.addColorStop(1, BG_TRANS);
      right = ctx.createLinearGradient(w - sideW, 0, w, 0);
      right.addColorStop(0, BG_TRANS);
      right.addColorStop(1, BG);
    }
    return {
      top: top,
      topHeight: gradH,
      bottom: bottom,
      bottomY: h - gradH,
      bottomHeight: gradH,
      left: left,
      right: right,
      sideWidth: sideW
    };
  }

  function clearCanvas(ctx, w, h) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
  }

  function initLzHeroCanvas() {
    var wrap = document.getElementById("lz-hero-canvas-wrap");
    var canvas = document.getElementById("lz-hero-canvas");
    if (!wrap || !canvas) return;

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mouse = { y: 0, targetY: 0 };
    var vignette = null;
    var state = { width: 0, height: 0, frameCount: 0, animId: 0, running: false };
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var resizeQueued = false;

    function resize() {
      var rect = wrap.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = rect.width;
      state.height = rect.height;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mouse.targetY = rect.height / 2;
      mouse.y = rect.height / 2;
      vignette = createVignette(ctx, rect.width, rect.height);
      if (reduce) draw();
    }

    function scheduleResize() {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(function () {
        resizeQueued = false;
        resize();
      });
    }

    function onMouse(e) {
      var rect = wrap.getBoundingClientRect();
      mouse.targetY = e.clientY - rect.top;
    }

    function draw() {
      var w = state.width;
      var h = state.height;
      if (!w || !h) return;

      if (!reduce) mouse.y += (mouse.targetY - mouse.y) * 0.1;
      clearCanvas(ctx, w, h);
      state.frameCount += 1;

      var mobile = w < 768;
      var u = mobile ? 3800 : 11000;
      ctx.save();
      ctx.translate(w / 2, h + (mobile ? 60 : 40));
      var f = map(mouse.y, 0, h, 1.2, -1.2);
      var m = Math.max(320, Math.min(1440, w));
      var p = reduce ? 0 : state.frameCount * map(m, 320, 1440, 0.002, 0.0005);
      var half = w / 2;
      var lines = mobile ? 22 : 40;

      for (var t = 0; t < lines; t++) {
        var r = map(t, 0, lines, 0, Math.PI) + p;
        r = r % Math.PI;
        var l = (Math.tan(r) - f) * h;
        var a = Math.abs(l) / 2;
        var o = -h / 2 + l / 2;
        var d = Math.max(0, Math.min(255, map(Math.abs(l), 0, u, -20, 255))) / 255;
        if (d <= 0) continue;
        ctx.strokeStyle = "rgba(255,255,255," + d + ")";
        ctx.lineWidth = 1;
        if (a > 499999.5) {
          ctx.beginPath();
          ctx.moveTo(-half, -h / 2);
          ctx.lineTo(half, -h / 2);
          ctx.stroke();
          continue;
        }
        var c1 = Math.acos(Math.min(1, (half + 50) / a));
        var segments = Math.max(Math.ceil(a / 120), 200);
        var pairs = [[c1, Math.PI - c1], [Math.PI + c1, TAU - c1]];
        for (var pi = 0; pi < pairs.length; pi++) {
          var start = pairs[pi][0];
          var end = pairs[pi][1];
          var span = end - start;
          var steps = Math.max(Math.ceil((span / TAU) * segments), 60);
          var step = span / steps;
          ctx.beginPath();
          for (var si = 0; si <= steps; si++) {
            var ang = start + step * si;
            var x = Math.cos(ang) * a;
            var y = o + Math.sin(ang) * a;
            if (si === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();

      if (vignette) {
        ctx.fillStyle = vignette.top;
        ctx.fillRect(0, 0, w, vignette.topHeight);
        ctx.fillStyle = vignette.bottom;
        ctx.fillRect(0, vignette.bottomY, w, vignette.bottomHeight);
        if (vignette.left) {
          ctx.fillStyle = vignette.left;
          ctx.fillRect(0, 0, vignette.sideWidth, h);
        }
        if (vignette.right) {
          ctx.fillStyle = vignette.right;
          ctx.fillRect(w - vignette.sideWidth, 0, vignette.sideWidth, h);
        }
      }
    }

    function loop() {
      draw();
      state.animId = requestAnimationFrame(loop);
    }

    function start() {
      if (state.running || document.hidden) return;
      state.running = true;
      document.addEventListener("mousemove", onMouse, { passive: true });
      loop();
    }

    function stop() {
      state.running = false;
      document.removeEventListener("mousemove", onMouse);
      if (state.animId) cancelAnimationFrame(state.animId);
      state.animId = 0;
    }

    resize();
    start();
    window.addEventListener("resize", scheduleResize, { passive: true });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) start();
        else stop();
      }, { threshold: 0 });
      io.observe(wrap);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    window.addEventListener("cadestories:motion-reset", function () {
      stop();
      state.frameCount = 0;
      resize();
      start();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLzHeroCanvas);
  } else {
    initLzHeroCanvas();
  }
})();
