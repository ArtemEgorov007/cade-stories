(function () {
  "use strict";

  var booted = false;
  var revealObserver = null;
  var revealItems = [];
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pageSeenKey = "cadestories_seen:" + location.pathname;

  function pageAlreadySeen() {
    try { return sessionStorage.getItem(pageSeenKey) === "1"; } catch (e) { return false; }
  }

  function markPageSeen() {
    try { sessionStorage.setItem(pageSeenKey, "1"); } catch (e) {}
  }

  function boot() {
    if (booted) return;
    booted = true;
    if (pageAlreadySeen()) {
      applyStaticMotion();
    } else {
      initHeroIntro();
      initScrollReveal();
      window.addEventListener("pagehide", markPageSeen, { once: true });
    }
    initHeader();
    initBurger();
    initFaq();
    initCookies();
    initModalEscape();
    initContactForm();
    initGlossary();
    initSmoothAnchors();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function applyStaticMotion() {
    document.documentElement.classList.add("motion-static");
    initHeroIntro(true);
    initScrollReveal(true);
    window.dispatchEvent(new CustomEvent("cadestories:static-page"));
  }

  function initHeroIntro(staticMode) {
    var hero = document.querySelector(".hero--lz");
    var center = hero && hero.querySelector(".hero__center");
    if (!hero || !center) return;

    if (!center.classList.contains("reveal-stagger")) {
      center.classList.add("reveal-stagger");
    }
    center.removeAttribute("data-hero-intro");

    if (staticMode) {
      hero.classList.add("is-scrim-in", "is-text-in");
      center.classList.add("is-in");
      return;
    }

    window.setTimeout(function () {
      hero.classList.add("is-scrim-in");
    }, 1100);

    window.setTimeout(function () {
      hero.classList.add("is-text-in");
      center.classList.add("is-in");
    }, 1850);
  }

  function setupRevealEl(el) {
    var mode = el.getAttribute("data-reveal");
    var isGroup = mode === "group";
    var isMedia = el.classList.contains("hero__media")
      || el.classList.contains("split__media")
      || el.classList.contains("split-visual")
      || el.classList.contains("article__media")
      || el.classList.contains("viz-frame");

    if (isGroup) {
      el.classList.add("reveal-stagger");
    } else if (isMedia) {
      el.classList.add("reveal", "reveal-media");
    } else {
      el.classList.add("reveal");
    }
  }

  function initScrollReveal(staticMode) {
    var items = [];

    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      setupRevealEl(el);
      items.push(el);
    });

    revealItems = items;

    if (staticMode) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    items.forEach(observeReveal);
    scheduleRevealFlush();
  }

  function scheduleRevealFlush() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        flushVisibleReveals(revealItems);
      });
    });
  }

  window.addEventListener("load", function () {
    if (pageAlreadySeen()) return;
    scheduleRevealFlush();
  });

  function revealIn(el) {
    if (el.classList.contains("is-in")) return;
    if (revealObserver) revealObserver.unobserve(el);
    window.setTimeout(function () {
      el.classList.add("is-in");
    }, 60);
  }

  function isRevealVisible(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return Math.min(rect.bottom, vh) - Math.max(rect.top, 0) > 0;
  }

  function flushVisibleReveals(items) {
    items.forEach(function (el) {
      if (el.classList.contains("is-in")) return;
      if (isRevealVisible(el)) revealIn(el);
    });
  }

  function getRevealObserver() {
    if (revealObserver) return revealObserver;
    if (!("IntersectionObserver" in window)) return null;
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealIn(entry.target);
      });
    }, { rootMargin: "0px 0px -4% 0px", threshold: 0 });
    return revealObserver;
  }

  function observeReveal(el) {
    var observer = getRevealObserver();
    if (!observer) {
      revealIn(el);
      return;
    }
    if (isRevealVisible(el)) {
      revealIn(el);
      return;
    }
    observer.observe(el);
  }

  function initHeader() {
    var bar = document.querySelector(".topbar");
    if (!bar) return;
    var ticking = false;
    var update = function () {
      bar.classList.toggle("is-scrolled", window.scrollY > 12);
      ticking = false;
    };
    update();
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
  }

  function initBurger() {
    var burger = document.getElementById("burger");
    var nav = document.getElementById("nav");
    if (!burger || !nav) return;

    var scrollY = 0;
    var navHome = nav.parentElement;
    var mobileMq = window.matchMedia("(max-width: 920px)");

    function placeNav() {
      if (mobileMq.matches) {
        if (nav.parentElement !== document.body) document.body.appendChild(nav);
        return;
      }
      setNavOpen(false);
      if (navHome && nav.parentElement !== navHome) navHome.appendChild(nav);
    }

    placeNav();
    if (mobileMq.addEventListener) mobileMq.addEventListener("change", placeNav);
    else mobileMq.addListener(placeNav);

    function lockPageScroll() {
      scrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.position = "fixed";
      document.body.style.top = "-" + scrollY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }

    function unlockPageScroll() {
      var y = scrollY;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      document.documentElement.style.removeProperty("scroll-behavior");
    }

    function setNavOpen(open) {
      if (open === nav.classList.contains("is-open")) return;
      if (open) lockPageScroll();
      nav.classList.toggle("is-open", open);
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      document.documentElement.classList.toggle("nav-open", open);
      document.body.classList.toggle("nav-open", open);
      document.body.style.touchAction = open ? "none" : "";
      if (!open) unlockPageScroll();
    }

    burger.addEventListener("click", function () {
      setNavOpen(!nav.classList.contains("is-open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setNavOpen(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setNavOpen(false);
    });
  }


  function initModalEscape() {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      ["cookie-modal", "thanks-modal"].forEach(function (id) {
        var modal = document.getElementById(id);
        if (!modal || !modal.classList.contains("is-open")) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        if (modal.hasAttribute("hidden")) modal.hidden = true;
      });
    });
  }

  function initFaq() {
    document.querySelectorAll(".faq__item").forEach(function (item) {
      var btn = item.querySelector(".faq__q");
      var answer = item.querySelector(".faq__a");
      if (!btn || !answer) return;
      btn.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        answer.style.maxHeight = open ? answer.scrollHeight + "px" : null;
      });
    });
  }

  function initCookies() {
    var banner = document.getElementById("cookie-banner");
    var modal = document.getElementById("cookie-modal");
    if (!banner) return;

    if (banner.parentElement !== document.body) document.body.appendChild(banner);
    if (modal && modal.parentElement !== document.body) document.body.appendChild(modal);

    var KEY = "cadestories_cookie_consent";
    var prefInput = document.getElementById("ck-pref");
    var statInput = document.getElementById("ck-stat");
    var marketingInput = document.getElementById("ck-marketing");

    function applyUetConsent(marketing) {
      try {
        window.uetq = window.uetq || [];
        window.uetq.push("consent", "update", { ad_storage: marketing ? "granted" : "denied" });
      } catch (e) {}
    }
    function read() {
      try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
    }
    function write(data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }
    function show() {
      banner.hidden = false;
      banner.removeAttribute("hidden");
      banner.setAttribute("aria-hidden", "false");
    }
    function hide() {
      banner.hidden = true;
      banner.setAttribute("hidden", "");
      banner.setAttribute("aria-hidden", "true");
    }
    function openModal() {
      var saved = read();
      if (saved) {
        if (prefInput) prefInput.checked = !!saved.preferences;
        if (statInput) statInput.checked = !!saved.statistics;
        if (marketingInput) marketingInput.checked = !!saved.marketing;
      }
      if (modal) {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        modal.hidden = false;
      }
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modal.hidden = true;
    }

    function accept(all) {
      var marketing = all ? true : (marketingInput ? marketingInput.checked : false);
      write({
        necessary: true,
        preferences: all ? true : (prefInput ? prefInput.checked : false),
        statistics: all ? true : (statInput ? statInput.checked : false),
        marketing: marketing,
        ts: Date.now()
      });
      applyUetConsent(marketing);
      hide();
      closeModal();
    }
    function reject() {
      write({ necessary: true, preferences: false, statistics: false, marketing: false, ts: Date.now() });
      applyUetConsent(false);
      hide();
      closeModal();
    }

    var saved = read();
    if (saved) { hide(); applyUetConsent(!!saved.marketing); }
    else { show(); }

    bind("cookie-accept", function () { accept(true); });
    bind("cookie-reject", reject);
    bind("cookie-config", openModal);
    bind("cookie-save", function () { accept(false); });
    bind("cookie-modal-close", closeModal);
    bind("cookie-modal-accept", function () { accept(true); });
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    function bind(id, fn) {
      var el = document.getElementById(id);
      if (!el) return;
      var locked = false;
      var run = function (e) {
        if (locked) return;
        locked = true;
        window.setTimeout(function () { locked = false; }, 350);
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        fn();
      };
      el.addEventListener("click", run);
      el.addEventListener("touchend", run, { passive: false });
    }
  }

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var modal = document.getElementById("thanks-modal");
    var submit = form.querySelector('[type="submit"]');
    var captchaQ = document.getElementById("captcha-q");
    var captchaInput = form.querySelector('[name="captcha"]');
    var consent = form.querySelector('[name="consent"]');
    var sum = 0;

    function newCaptcha() {
      var a = Math.floor(Math.random() * 8) + 1;
      var b = Math.floor(Math.random() * 8) + 1;
      sum = a + b;
      if (captchaQ) captchaQ.textContent = a + " + " + b + " =";
    }
    newCaptcha();

    function openThanks() {
      if (!modal) return;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      modal.hidden = false;
    }
    function closeThanks() {
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modal.hidden = true;
    }
    var closeBtn = document.getElementById("thanks-close");
    if (closeBtn) closeBtn.addEventListener("click", closeThanks);
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeThanks(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (captchaInput) {
        captchaInput.setCustomValidity(parseInt(captchaInput.value, 10) === sum ? "" : "La respuesta no es correcta.");
      }
      if (consent && !consent.checked) consent.setCustomValidity("Debes aceptar la política de privacidad.");
      else if (consent) consent.setCustomValidity("");
      if (!form.reportValidity()) return;
      if (submit) submit.disabled = true;
      form.reset();
      newCaptcha();
      openThanks();
      if (submit) submit.disabled = false;
    });
  }

  function initGlossary() {
    var bar = document.querySelector(".glossary-letters");
    var grid = document.getElementById("glossary-grid");
    if (!bar || !grid) return;
    var terms = grid.querySelectorAll(".term[data-letter]");
    var buttons = bar.querySelectorAll(".gl-letter");
    var empty = document.getElementById("glossary-empty");
    if (!terms.length || !buttons.length) return;

    function apply(letter) {
      var shown = 0;
      terms.forEach(function (t) {
        var match = letter === "all" || t.getAttribute("data-letter") === letter;
        t.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-letter") === letter;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (empty) empty.classList.toggle("is-hidden", shown !== 0);
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-letter")); });
    });
  }

  function initSmoothAnchors() {
    if (reduceMotion) return;
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      a.addEventListener("click", function (e) {
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }
})();
