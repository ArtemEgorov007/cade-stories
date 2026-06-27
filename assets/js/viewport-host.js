/**
 * Host viewport insets for in-app browsers (Telegram, etc.).
 * env(safe-area-inset-*) is often 0 in Telegram WebView — see Telegram iOS #1377.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  function isTelegramHost() {
    var ua = navigator.userAgent || "";
    return /Telegram/i.test(ua) || !!(window.TelegramWebviewProxy || window.TelegramWebview);
  }

  function isMiniApp() {
    return !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
  }

  function readMiniAppInsets() {
    var wa = window.Telegram.WebApp;
    var s = wa.safeAreaInset || {};
    var c = wa.contentSafeAreaInset || {};
    return {
      top: Math.max(Number(s.top) || 0, Number(c.top) || 0),
      bottom: Math.max(Number(s.bottom) || 0, Number(c.bottom) || 0)
    };
  }

  function readVisualInsets() {
    var top = 0;
    var bottom = 0;
    var vv = window.visualViewport;
    if (!vv) return { top: top, bottom: bottom };

    top = Math.max(0, Math.round(vv.offsetTop || 0));

    if (window.innerHeight && vv.height) {
      bottom = Math.max(0, Math.round(window.innerHeight - vv.height - top));
    }
    return { top: top, bottom: bottom };
  }

  function applyInsets() {
    var top = 0;
    var bottom = 0;
    var chromeTop = 0;

    if (isMiniApp()) {
      try {
        window.Telegram.WebApp.ready();
      } catch (e) {}
      var tma = readMiniAppInsets();
      top = tma.top;
      bottom = tma.bottom;
    } else if (window.visualViewport) {
      var vv = readVisualInsets();
      top = vv.top;
      bottom = vv.bottom;
    }

    if (isTelegramHost() && !isMiniApp()) {
      root.classList.add("is-telegram-webview");
      /* Fill dead band above layout viewport (TG in-app browser). */
      if (window.visualViewport) {
        var vv = window.visualViewport;
        var band = Math.max(0, Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0)));
        if (band > 8 && band < 140) chromeTop = band;
      }
      if (top > 0) chromeTop = Math.max(chromeTop, top);
    }

    root.style.setProperty("--host-inset-top", top + "px");
    root.style.setProperty("--host-inset-bottom", bottom + "px");
    root.style.setProperty("--tg-chrome-top", chromeTop + "px");
  }

  applyInsets();

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyInsets, { passive: true });
    window.visualViewport.addEventListener("scroll", applyInsets, { passive: true });
  }
  window.addEventListener("resize", applyInsets, { passive: true });
  window.addEventListener("orientationchange", applyInsets, { passive: true });
  document.addEventListener("visibilitychange", applyInsets, { passive: true });
})();
