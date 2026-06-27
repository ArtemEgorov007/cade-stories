/**
 * LayerZero-style hero warp grid — canvas 2D.
 * Desktop: mouse parallax. Mobile: full-bleed grid + auto drift + touch (LZ about-like).
 */
(function () {
  "use strict";

  var BG = "#0A0A0A";
  var BG_TRANS = "rgba(10, 10, 10, 0)";
  var TAU = Math.PI * 2;
  var MOBILE_MAX = 767;

  function map(v, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((v - inMin) / (inMax - inMin));
  }

  function isMobile(w) {
    return w <= MOBILE_MAX;
  }

  function clearCanvas(ctx, w, h) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
  }

  function createVignetteDesktop(ctx, w, h) {
    var gradH = 0.25 * h;
    var top = ctx.createLinearGradient(0, 0, 0, gradH);
    top.addColorStop(0, BG);
    top.addColorStop(1, BG_TRANS);
    var bottom = ctx.createLinearGradient(0, h - gradH, 0, h);
    bottom.addColorStop(0, BG_TRANS);
    bottom.addColorStop(1, BG);
    var sideW = 0.25 * w;
    var left = ctx.createLinearGradient(0, 0, sideW, 0);
    left.addColorStop(0, BG);
    left.addColorStop(1, BG_TRANS);
    var right = ctx.createLinearGradient(w - sideW, 0, w, 0);
    right.addColorStop(0, BG_TRANS);
    right.addColorStop(1, BG);
    return { top: top, topHeight: gradH, bottom: bottom, bottomY: h - gradH, bottomHeight: gradH, left: left, right: right, sideWidth: sideW };
  }

  function paintVignetteDesktop(ctx, w, h, vignette) {
    if (!vignette) return;
    ctx.fillStyle = vignette.top;
    ctx.fillRect(0, 0, w, vignette.topHeight);
    ctx.fillStyle = vignette.bottom;
    ctx.fillRect(0, vignette.bottomY, w, vignette.bottomHeight);
    ctx.fillStyle = vignette.left;
    ctx.fillRect(0, 0, vignette.sideWidth, h);
    ctx.fillStyle = vignette.right;
    ctx.fillRect(w - vignette.sideWidth, 0, vignette.sideWidth, h);
  }

  function paintVignetteMobile(ctx, w, h) {
    var topH = h * 0.32;
    var top = ctx.createLinearGradient(0, 0, 0, topH);
    top.addColorStop(0, "rgba(10, 10, 10, 0.55)");
    top.addColorStop(0.55, "rgba(10, 10, 10, 0.12)");
    top.addColorStop(1, BG_TRANS);
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, topH);

    var bottomH = h * 0.22;
    var bottom = ctx.createLinearGradient(0, h - bottomH, 0, h);
    bottom.addColorStop(0, BG_TRANS);
    bottom.addColorStop(1, "rgba(10, 10, 10, 0.75)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h - bottomH, w, bottomH);
  }

  function strokeWarpArcs(ctx, half, h, lines, p, f, skewX, u, warpScale, lineWidth, glow) {
    var phase = p - Math.floor(p / Math.PI) * Math.PI;
    for (var t = 0; t < lines; t++) {
      var r = map(t, 0, lines, 0, Math.PI) + phase;
      if (r >= Math.PI) r -= Math.PI;
      var l = ((Math.tan(r) - f - skewX) * h) * warpScale;
      var a = Math.abs(l) / 2;
      var o = -h / 2 + l / 2;
      var d = Math.max(0, Math.min(255, map(Math.abs(l), 0, u, -20, 255))) / 255;
      if (d <= 0) continue;
      ctx.strokeStyle = "rgba(255,255,255," + Math.min(1, d + glow) + ")";
      ctx.lineWidth = lineWidth;
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
  }

  function initLzHeroCanvas() {
    var wrap = document.getElementById("lz-hero-canvas-wrap");
    var canvas = document.getElementById("lz-hero-canvas");
    if (!wrap || !canvas) return;

    var heroEl = wrap.closest(".hero--lz");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var staticPage = false;
    try {
      staticPage = sessionStorage.getItem("cadestories_seen:" + location.pathname) === "1";
    } catch (e) {}

    var mouse = { x: 0, y: 0, targetX: 0, targetY: 0, inside: false };
    var touch = { active: false, tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0 };
    var drift = { y: 0, x: 0 };
    var vignetteDesktop = null;
    var state = { width: 0, height: 0, frameCount: 0, animId: 0, running: false };
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var resizeQueued = false;
    var resizeTimer = 0;

    function resize(force) {
      var rect = wrap.getBoundingClientRect();
      var nextW = Math.max(1, Math.round(rect.width));
      var nextH = Math.max(1, Math.round(rect.height));
      if (!force && Math.abs(nextW - state.width) < 2 && Math.abs(nextH - state.height) < 2) {
        return;
      }

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var mobile = isMobile(nextW);
      state.width = nextW;
      state.height = nextH;
      canvas.width = Math.floor(nextW * dpr);
      canvas.height = Math.floor(nextH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!mobile) {
        mouse.targetX = nextW / 2;
        mouse.targetY = nextH / 2;
        mouse.x = nextW / 2;
        mouse.y = nextH / 2;
        mouse.inside = false;
      }
      if (!mobile || !state.running) {
        touch.targetTiltX = 0;
        touch.targetTiltY = 0;
        touch.tiltX = 0;
        touch.tiltY = 0;
      }
      vignetteDesktop = createVignetteDesktop(ctx, nextW, nextH);
      if (reduce || (state.running && mobile)) draw();
    }

    function scheduleResize() {
      if (isMobile(state.width || window.innerWidth)) {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
          resizeTimer = 0;
          resize(false);
        }, 220);
        return;
      }
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(function () {
        resizeQueued = false;
        resize(false);
      });
    }

    function onMouse(e) {
      var rect = wrap.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.inside = e.clientX >= rect.left && e.clientX <= rect.right
        && e.clientY >= rect.top && e.clientY <= rect.bottom;
    }

    function onMouseLeave() {
      mouse.inside = false;
      mouse.targetX = state.width / 2;
      mouse.targetY = state.height / 2;
    }

    function onTouchStart(e) {
      if (!e.touches[0]) return;
      touch.active = true;
      onTouchMove(e);
    }

    function onTouchMove(e) {
      if (!e.touches[0]) return;
      var rect = (heroEl || wrap).getBoundingClientRect();
      var nx = (e.touches[0].clientX - rect.left) / rect.width;
      var ny = (e.touches[0].clientY - rect.top) / rect.height;
      touch.targetTiltX = map(nx, 0, 1, 0.85, -0.85);
      touch.targetTiltY = map(ny, 0, 1, 1.35, -1.35);
    }

    function onTouchEnd() {
      touch.active = false;
      touch.targetTiltX = drift.x * 0.35;
      touch.targetTiltY = drift.y * 0.35;
    }

    function drawDesktop(w, h) {
      if (!reduce) {
        var ease = mouse.inside ? 0.24 : 0.18;
        mouse.y += (mouse.targetY - mouse.y) * ease;
        mouse.x += (mouse.targetX - mouse.x) * ease;
      }

      var u = 12000;
      var m = Math.max(320, Math.min(1440, w));
      var p = reduce ? 0 : state.frameCount * map(m, 320, 1440, 0.002, 0.0005);
      var parallaxX = (mouse.x - w / 2) * (mouse.inside ? 0.11 : 0.07);
      var parallaxY = (mouse.y - h / 2) * (mouse.inside ? 0.045 : 0.028);
      var tiltBoost = mouse.inside ? 1.55 : 1;
      var f = map(mouse.y, 0, h, 2.75 * tiltBoost, -2.75 * tiltBoost);
      var skewX = map(mouse.x, 0, w, 0.95, -0.95) * (mouse.inside ? 1.35 : 1);
      var glow = mouse.inside ? 0.14 : 0.06;
      var lineWidth = mouse.inside ? 1.2 : 1;

      ctx.save();
      ctx.translate(w / 2 + parallaxX, h + 40 + parallaxY);
      strokeWarpArcs(ctx, w / 2, h, 40, p, f, skewX, u, 1, lineWidth, glow);
      ctx.restore();
      paintVignetteDesktop(ctx, w, h, vignetteDesktop);
    }

    function drawMobile(w, h) {
      if (!reduce) {
        var autoY = Math.sin(state.frameCount * 0.0052) * 0.68 + Math.sin(state.frameCount * 0.0021) * 0.26;
        var autoX = Math.sin(state.frameCount * 0.0038 + 0.8) * 0.24;
        drift.y += (autoY - drift.y) * 0.024;
        drift.x += (autoX - drift.x) * 0.024;
        var touchEase = touch.active ? 0.16 : 0.05;
        touch.tiltY += (touch.targetTiltY - touch.tiltY) * touchEase;
        touch.tiltX += (touch.targetTiltX - touch.tiltX) * touchEase;
        if (!touch.active) {
          touch.tiltY += (0 - touch.tiltY) * 0.028;
          touch.tiltX += (0 - touch.tiltX) * 0.028;
        }
      }

      var horizonY = h * 0.94;
      var gridH = h * 1.05;
      var u = 4800;
      var p = reduce ? 0 : state.frameCount * 0.0012;
      var f = drift.y + touch.tiltY;
      var skewX = drift.x + touch.tiltX;
      var glow = touch.active ? 0.16 : 0.13;

      ctx.save();
      ctx.translate(w / 2, horizonY);
      strokeWarpArcs(ctx, w / 2, gridH, 44, p, f, skewX, u, 2.15, 1.35, glow);
      ctx.restore();
      paintVignetteMobile(ctx, w, h);
    }

    function draw() {
      var w = state.width;
      var h = state.height;
      if (!w || !h) return;

      clearCanvas(ctx, w, h);
      state.frameCount += 1;

      if (isMobile(w)) drawMobile(w, h);
      else drawDesktop(w, h);
    }

    function loop() {
      draw();
      state.animId = requestAnimationFrame(loop);
    }

    function start() {
      if (state.running || document.hidden) return;
      state.running = true;
      if (isMobile(state.width)) {
        var touchTarget = heroEl || wrap;
        touchTarget.addEventListener("touchstart", onTouchStart, { passive: true });
        touchTarget.addEventListener("touchmove", onTouchMove, { passive: true });
        touchTarget.addEventListener("touchend", onTouchEnd, { passive: true });
        touchTarget.addEventListener("touchcancel", onTouchEnd, { passive: true });
      } else {
        document.addEventListener("mousemove", onMouse, { passive: true });
        if (heroEl) heroEl.addEventListener("mouseleave", onMouseLeave, { passive: true });
      }
      loop();
    }

    function stop() {
      state.running = false;
      var touchTarget = heroEl || wrap;
      touchTarget.removeEventListener("touchstart", onTouchStart);
      touchTarget.removeEventListener("touchmove", onTouchMove);
      touchTarget.removeEventListener("touchend", onTouchEnd);
      touchTarget.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("mousemove", onMouse);
      if (heroEl) heroEl.removeEventListener("mouseleave", onMouseLeave);
      if (state.animId) cancelAnimationFrame(state.animId);
      state.animId = 0;
      if (isMobile(state.width)) draw();
    }

    resize(true);
    if (staticPage) {
      draw();
      window.addEventListener("cadestories:static-page", function () {
        if (!isMobile(state.width)) {
          stop();
          draw();
        }
      }, { once: true });
      if (!isMobile(state.width)) return;
    }
    start();
    window.addEventListener("resize", scheduleResize, { passive: true });
    if ("IntersectionObserver" in window && !isMobile(state.width)) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) start();
        else stop();
      }, { threshold: 0.05, rootMargin: "40px 0px" });
      io.observe(wrap);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLzHeroCanvas);
  } else {
    initLzHeroCanvas();
  }
})();
