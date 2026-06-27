/**
 * Host viewport insets for in-app browsers (Telegram, etc.).
 * env(safe-area-inset-*) is often 0 in Telegram WebView — see Telegram iOS #1377.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var probe;

  function isTelegramHost() {
    return !!(
      window.TelegramWebviewProxy ||
      window.TelegramWebviewProxyProto ||
      window.TelegramWebview ||
      /Telegram/i.test(navigator.userAgent || "")
    );
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

  function ensureProbe() {
    if (probe && probe.isConnected) return probe;
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;visibility:hidden;z-index:-1;";
    root.appendChild(probe);
    return probe;
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

  function measureChromeTop() {
    var chrome = 0;
    var vv = window.visualViewport;

    if (vv) {
      chrome = Math.max(chrome, Math.round(vv.offsetTop || 0));
      var band = Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0));
      if (band > 0 && band < 160) chrome = Math.max(chrome, band);
    }

    chrome = Math.max(chrome, Math.round(ensureProbe().getBoundingClientRect().top));

    var layoutTop = Math.round(-root.getBoundingClientRect().top);
    if (layoutTop > 0 && layoutTop < 160) chrome = Math.max(chrome, layoutTop);

    var bar = document.querySelector(".topbar");
    if (bar) chrome = Math.max(chrome, Math.round(bar.getBoundingClientRect().top));

    return chrome;
  }

  function iosTelegramFallback(chrome) {
    if (chrome >= 12) return chrome;
    if (!isTelegramHost() || isMiniApp()) return chrome;
    if (!/iPhone|iPad|iPod/i.test(navigator.userAgent || "")) return chrome;
    if (!window.TelegramWebviewProxy && !window.TelegramWebviewProxyProto) return chrome;
  /* TG in-app header band when env()/visualViewport report 0 */
    return Math.max(chrome, 44);
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
      chromeTop = iosTelegramFallback(measureChromeTop());
      if (top < chromeTop) top = chromeTop;
    }

    root.style.setProperty("--host-inset-top", top + "px");
    root.style.setProperty("--host-inset-bottom", bottom + "px");
    root.style.setProperty("--tg-chrome-top", chromeTop + "px");
  }

  applyInsets();
  document.addEventListener("DOMContentLoaded", applyInsets, { once: true });
  window.addEventListener("load", applyInsets, { once: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyInsets, { passive: true });
    window.visualViewport.addEventListener("scroll", applyInsets, { passive: true });
  }
  window.addEventListener("resize", applyInsets, { passive: true });
  window.addEventListener("orientationchange", applyInsets, { passive: true });
  document.addEventListener("visibilitychange", applyInsets, { passive: true });
})();
