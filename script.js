/* ================================================================
   D. H. Chen Foundation — script.js
   ================================================================ */
'use strict';

/* Always (re)load at the top of the page — stop the browser from restoring
   the previous scroll position on refresh / back-forward navigation. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ----------------------------------------------------------------
   0a. Page zoom — measured, not read.
   Above 768px `body` carries `zoom: var(--zoom)` — a width ladder from 0.9
   to 1 near the 1920 design, times a further step down on a short window — and anything
   that converts a measured rect back into a value to be *written* on a
   zoomed element (a translate, a width) has to divide that zoom out again.

   Nothing here needs to know the ladder: the function measures whatever the
   engine ended up applying, so adding or retuning a step in the CSS moves
   every consumer of it without a line changing on this side.

   It is measured rather than taken from `getComputedStyle(body).zoom`
   because that string is not something every engine agrees on: Safari
   reported no usable zoom there while still rendering at 0.9, so the
   opening's seal was parked with the correction missing — it travelled
   90% of the way to the motto and the block came down where the mark
   should have been, half a seal below it. Chrome, reporting `0.9`, was
   fine, which is exactly the shape of the bug that only showed up there.

   `offsetWidth` is layout px and `getBoundingClientRect()` is rendered px,
   so their ratio *is* whatever zoom the engine is actually applying — no
   engine has to agree with any other for this to come out right.
   ---------------------------------------------------------------- */
window.__pageZoom = function () {
  const b = document.body;
  if (!b || !b.offsetWidth) return 1;
  const z = b.getBoundingClientRect().width / b.offsetWidth;
  return (isFinite(z) && z > 0) ? z : 1;
};

/* ----------------------------------------------------------------
   0b. Placeholder links — route only destinations that actually exist.

   The static prototype contains planned pages, social profiles and files as
   href="#". Leaving those live makes a click jump to the top and look broken.
   Known routes are repaired here; genuinely unpublished destinations stay out
   of the rendered navigation until the CMS supplies a real URL. Listing filter
   options are controls rather than destinations and are deliberately excluded.
   ---------------------------------------------------------------- */
(function () {
  const tc = document.documentElement.lang === 'zh-Hant';
  const unavailable = tc ? '此頁尚未提供。' : 'This page is not available yet.';
  const englishFallback = tc ? '（英文頁面）' : '';

  function key(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  const routes = {
    '中文': 'index_tc.html',
    '我們的工作': 'Approach.html',
    '工作方式': 'Approach.html',
    '夥伴同行': 'Partnership.html',
    '學習與洞察': 'Learning.html',
    '我們的故事': 'Listing_tc.html',
    '最新消息': 'News.html',
    '關於我們': 'Ethos.html',
    '基金會源起': 'Story.html',
    '我們的使命': 'Ethos.html',
    '核心價值': 'Ethos.html',
    '旗下機構': 'Institutes.html',
    '聯繫我們': 'Connect.html',
    '私隱政策': 'Privacy.html',
    '免責聲明': 'Disclaimer.html',
    '網站地圖': 'Sitemap.html',
    '無障礙瀏覽': 'Accessibility.html'
  };

  function route(a, href, external) {
    a.setAttribute('href', href);
    if (external) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else if (tc && !/(_tc\.html|index_tc\.html)(?:[?#]|$)/.test(href)) {
      a.setAttribute('hreflang', 'en');
      a.dataset.languageFallback = 'en';
      if (!a.getAttribute('title')) a.setAttribute('title', englishFallback.replace(/[（）]/g, ''));
    }
  }

  function disable(a) {
    a.removeAttribute('href');
    a.classList.add('link-unavailable');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('aria-hidden', 'true');
    a.setAttribute('tabindex', '-1');
    a.hidden = true;
    /* Avoid empty list items being counted by assistive technology. */
    if (a.parentElement && a.parentElement.tagName === 'LI' &&
        a.parentElement.children.length === 1) {
      a.parentElement.hidden = true;
    }
    if (!a.getAttribute('title')) a.setAttribute('title', unavailable);
    a.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }

  /* The Scholarship destination is already named in the adjacent copy. */
  document.querySelectorAll('.ventures__col').forEach(function (col) {
    const heading = key((col.querySelector('.ventures__title') || {}).textContent);
    const cta = col.querySelector('a.btn-pill[href="#"]');
    if (cta && (heading === 'scholarship' || heading === '獎學金')) {
      route(cta, 'https://www.dhcfscholarship.com/', true);
    }
  });

  const searches = {
    '獎學金': 'Search.html?q=Scholarship',
    '創新項目資助': 'Search.html?q=Funding+for+innovative',
    '加入我們': 'Search.html?q=Join+us',
    '活動': 'Search.html?q=Events'
  };

  document.querySelectorAll('a[href="#"]').forEach(function (a) {
    if (a.closest('.listing__filter-menu')) return;
    const label = key(a.textContent);
    let href = routes[label];
    if (!href && a.closest('.search-overlay__hot')) href = searches[label];
    if (href) route(a, href, false);
    else disable(a);
  });
})();

/* ----------------------------------------------------------------
   0. Lenis smooth scrolling — inertia-smoothed wheel/touch scroll.
   Native scroll events still fire, so the nav, wave and hero-scene
   listeners all keep working unchanged.
   ---------------------------------------------------------------- */
(function () {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new Lenis({
    duration: 1.1,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2
  });
  window.__lenis = lenis;

  (function raf(time) {
    lenis.raf(time);
    window.requestAnimationFrame(raf);
  })(0);

  /* Lenis manages its own easing — native smooth-behavior must be off */
  document.documentElement.classList.add('lenis-on');
})();

/* ----------------------------------------------------------------
   1. Nav — add scrolled class for background
   ---------------------------------------------------------------- */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;
  /* Home V3 lets the whole bar scroll away with the page first (it's
     `position: absolute` until it sticks), so the swap to the sticky pill
     only fires once the bar has cleared — otherwise the menu would blink
     out while it was still on screen. Other pages keep the old 20px. */
  const isV3 = nav.classList.contains('nav--v3');
  let trigger = 20;
  function measure() {
    /* the bar's own height (measured while it's unstuck, so before the
       first tick) + a small beat, so the pill only appears once the bar
       has actually left the frame */
    if (isV3) trigger = Math.round(nav.getBoundingClientRect().height) + 12;
  }
  function tick() {
    nav.classList.toggle('nav--scrolled', window.scrollY > trigger);
  }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', function () {
    if (!nav.classList.contains('nav--scrolled')) measure();
    tick();
  });
  measure();
  tick();
})();


/* ----------------------------------------------------------------
   2. Mobile hamburger
   ---------------------------------------------------------------- */
(function () {
  const btn   = document.querySelector('.nav__hamburger');
  const menu  = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  const close = menu.querySelector('.nav__mobile-close');

  function focusableElements(root) {
    return Array.prototype.slice.call(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.hidden && !el.closest('[hidden]') &&
             window.getComputedStyle(el).visibility !== 'hidden' &&
             el.getClientRects().length;
    });
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    const focusable = focusableElements(menu);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!menu.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* full-screen overlay: lock the page scroll while it's open */
  function setOpen(open, restoreFocus) {
    const wasOpen = menu.classList.contains('nav__mobile-menu--open');
    if (restoreFocus === undefined) restoreFocus = true;
    if (open) menu.inert = false;
    if (!open && restoreFocus && wasOpen) btn.focus({ preventScroll: true });
    menu.classList.toggle('nav__mobile-menu--open', open);
    btn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    if (!open) menu.inert = true;
    document.documentElement.classList.toggle('lock-scroll', open);
    document.body.classList.toggle('menu-open', open);   /* white menu keeps the base orange cursor */
    if (window.__lenis) { open ? window.__lenis.stop() : window.__lenis.start(); }
    if (open && close) {
      requestAnimationFrame(function () { close.focus({ preventScroll: true }); });
    }
  }
  menu.inert = true;
  window.__setMobileMenuOpen = setOpen;

  /* set the circular-reveal origin to the centre of whatever opened the overlay */
  function setRevealOrigin(target, originEl) {
    const r = originEl.getBoundingClientRect();
    target.style.setProperty('--reveal-x', ((r.left + r.width / 2) / window.innerWidth * 100) + '%');
    target.style.setProperty('--reveal-y', ((r.top + r.height / 2) / window.innerHeight * 100) + '%');
  }

  btn.addEventListener('click', function () {
    /* Home V3 on a desktop pointer: the sticky pill's hamburger opens the
       right-hand mega panel instead (§13), so leave the click to it. */
    if (window.__megaOwnsBurger && window.__megaOwnsBurger()) return;
    const willOpen = !menu.classList.contains('nav__mobile-menu--open');
    if (willOpen) setRevealOrigin(menu, btn);
    setOpen(willOpen);
  });
  if (close) close.addEventListener('click', function () { setOpen(false); });

  /* 1st-level accordion: clicking a section pops its 2nd-level panel open
     (pushing the rest down); opening one collapses any other — only one open
     at a time. Sections without a panel (Connect) are left as plain links. */
  const items = Array.prototype.slice.call(menu.querySelectorAll('.nav__mobile-item'));
  items.forEach(function (item, index) {
    const link = item.querySelector('.nav__mobile-link');
    const sub  = item.querySelector('.nav__mobile-sub');
    if (!link || !sub) return;
    if (!sub.id) sub.id = 'mobile-sub-' + index;
    link.setAttribute('aria-controls', sub.id);
    sub.inert = !item.classList.contains('is-open');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const wasOpen = item.classList.contains('is-open');
      items.forEach(function (it) {
        it.classList.remove('is-open');
        const l = it.querySelector('.nav__mobile-link');
        const s = it.querySelector('.nav__mobile-sub');
        if (l) l.setAttribute('aria-expanded', 'false');
        if (s) s.inert = true;
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        link.setAttribute('aria-expanded', 'true');
        sub.inert = false;
      }
    });
  });

  /* any real navigation choice (2nd-level link, Connect, footer links, 中文)
     closes the overlay; the section toggle buttons above do not */
  menu.querySelectorAll('.nav__mobile-sub a, a.nav__mobile-link, .nav__mobile-sublink, .nav__mobile-lang')
    .forEach(function (l) { l.addEventListener('click', function () { setOpen(false, false); }); });

  document.addEventListener('keydown', function (e) {
    if (!menu.classList.contains('nav__mobile-menu--open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    trapTab(e);
  });

  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width: 1024px)').matches &&
        menu.classList.contains('nav__mobile-menu--open')) setOpen(false, false);
  });
})();


/* ----------------------------------------------------------------
   2.5 Search overlay — full-screen orange search, opened from either
   the desktop search button or the mobile menu's search button.
   Closes on the × button or Escape; locks page scroll while open.
   ---------------------------------------------------------------- */
(function () {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  const openers  = document.querySelectorAll('.nav__search-btn, .nav__mobile-search');
  const closeBtn = overlay.querySelector('.search-overlay__close');
  const input    = overlay.querySelector('.search-overlay__input');
  const mobile   = document.getElementById('mobile-menu');
  const burger   = document.querySelector('.nav__hamburger');
  let returnTarget = null;
  let focusTimer = null;

  function focusableElements() {
    return Array.prototype.slice.call(overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.hidden && !el.closest('[hidden]') &&
             window.getComputedStyle(el).visibility !== 'hidden' &&
             el.getClientRects().length;
    });
  }

  /* Open the circular wipe from a given control.

     The clip-path is written inline, in full, rather than left to the
     stylesheet's `circle(… at var(--reveal-x) …)`. Changing a custom
     property and adding the open class in the same frame gets coalesced
     into one style recalc, so the transition's *from* value is still the
     previous origin — the very first open therefore grew from the default
     right-hand corner and slid left on the way, and only the second one
     (with the var already in place) started from the button. Pinning the
     closed circle at the new origin, flushing it by reading the property
     back, and only then setting the open value removes the guesswork. */
  function revealFrom(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    /* the overlay lives inside the zoomed body (using the responsive width
       and short-window zoom ladders),
       so its own coordinate space is 1/zoom of what the rect reports */
    const z = window.__pageZoom();
    const x = ((r.left + r.width / 2) / z).toFixed(1) + 'px';
    const y = ((r.top + r.height / 2) / z).toFixed(1) + 'px';
    overlay.style.setProperty('--reveal-x', x);
    overlay.style.setProperty('--reveal-y', y);
    overlay.__revealTo = 'circle(150% at ' + x + ' ' + y + ')';
  }

  /* Keep the closed circle parked on the search button at all times —
     on load, on resize, and whenever the pointer arrives at the button.
     This is what actually fixes the first open: the transition captures
     its starting value from whatever the closed state currently is, and
     doing the arithmetic only at click time left that starting value on
     the stylesheet's default (the right-hand corner) for the very first
     run. Now it is already correct before the click happens. */
  function park() {
    /* whichever one is currently on screen — the bar carries two copies of
       the search button (the stacked one under the menu, and the one in the
       actions row that the sticky pill is built from), and only one of them
       is ever showing */
    const b = Array.prototype.find.call(
      document.querySelectorAll('.nav__search-btn'),
      function (el) { return el.getClientRects().length; }
    );
    /* getClientRects, not offsetParent: the sticky nav is `position: fixed`,
       and a fixed ancestor makes offsetParent null in some browsers */
    if (!b || !b.getClientRects().length) return;
    if (overlay.classList.contains('search-overlay--open')) return;
    /* park it with the transition off, or the closed circle spends 0.8s
       easing its own origin across — harmless to look at (radius 0) but it
       means a click inside that window would still start from part-way */
    const prev = overlay.style.transition;
    overlay.style.transition = 'none';
    revealFrom(b);
    void window.getComputedStyle(overlay).clipPath;
    overlay.style.transition = prev;
  }
  park();
  window.addEventListener('resize', park);
  window.addEventListener('scroll', park, { passive: true });
  openers.forEach(function (b) { b.addEventListener('mouseenter', function () { revealFrom(b); }); });

  function setOpen(open, opener) {
    if (open) {
      returnTarget = opener || document.activeElement;
      overlay.inert = false;
    } else {
      window.clearTimeout(focusTimer);
      if (returnTarget && returnTarget.isConnected) returnTarget.focus({ preventScroll: true });
    }
    overlay.classList.toggle('search-overlay--open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    document.documentElement.classList.toggle('lock-scroll', open);
    document.body.classList.toggle('search-open', open);   /* orange overlay → white cursor */
    if (window.__lenis) { open ? window.__lenis.stop() : window.__lenis.start(); }
    if (open) {
      /* now that it is visible, grow to the pinned origin */
      overlay.style.clipPath = overlay.__revealTo || '';
      focusTimer = window.setTimeout(function () { if (input) input.focus(); }, 80);
    } else {
      /* back to the stylesheet's closed circle, which still reads the
         vars — so it shrinks into the same spot it came from */
      overlay.style.clipPath = '';
      overlay.inert = true;
    }
  }
  overlay.inert = true;

  openers.forEach(function (b) {
    b.addEventListener('click', function () {
      /* if the search lives inside the open mobile menu, close that first */
      const opener = mobile && mobile.contains(b) ? burger : b;
      if (mobile && mobile.classList.contains('nav__mobile-menu--open')) {
        if (window.__setMobileMenuOpen) window.__setMobileMenuOpen(false, false);
      }
      /* circular wipe radiating from whichever search control was clicked */
      revealFrom(b);
      setOpen(true, opener);
    });
  });
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('search-overlay--open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = focusableElements();
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!overlay.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();


/* ----------------------------------------------------------------
   3. News slider — the active card is centred in the viewport, the
   cards either side tilt ±3° (.is-prev / .is-next), and the slider
   auto-advances every 3 seconds. Dragging pauses the timer.
   ---------------------------------------------------------------- */
(function () {
  const wrap     = document.getElementById('news-carousel-wrap');
  const carousel = document.getElementById('news-carousel');
  if (!wrap || !carousel) return;

  const AUTO_MS  = 5000;   /* auto-advance interval */
  const SLIDE_MS = 1100;   /* slide animation duration */
  const TILT_DEG = 3;      /* tilt of the cards one slot from centre */

  /* Clone the full set on both sides so the slider loops seamlessly —
     it always moves forward and there are always cards on both sides.
     When the scroll position drifts into a cloned set, we silently
     jump back one set-width (identical layout, invisible to the user). */
  const realCards = Array.prototype.slice.call(carousel.querySelectorAll('.news-card'));
  const before = document.createDocumentFragment();
  const after  = document.createDocumentFragment();
  realCards.forEach(function (c) {
    const a = c.cloneNode(true);
    const b = c.cloneNode(true);
    [a, b].forEach(function (cl) {
      cl.setAttribute('aria-hidden', 'true');
      cl.dataset.clone = '1';
    });
    before.appendChild(a);
    after.appendChild(b);
  });
  carousel.insertBefore(before, carousel.firstChild);
  carousel.appendChild(after);

  const cards = Array.prototype.slice.call(carousel.querySelectorAll('.news-card'));
  let currentIdx = 0;          /* index within the visible (clones included) list */

  /* ---- make wrap scrollable ---- */
  wrap.style.overflowX = 'auto';
  wrap.style.webkitOverflowScrolling = 'touch';

  /* hide scrollbar */
  const s = document.createElement('style');
  s.textContent = '#news-carousel-wrap::-webkit-scrollbar{display:none}#news-carousel-wrap{-ms-overflow-style:none;scrollbar-width:none}';
  document.head.appendChild(s);

  function visibleCards() {
    return cards.filter(function (c) { return c.style.display !== 'none'; });
  }

  /* ---- slow eased scroll animation ---- */
  let animId = null;
  function cancelSlide() {
    if (animId) { window.cancelAnimationFrame(animId); animId = null; }
  }
  function animateScrollTo(left, duration, easing, onDone) {
    cancelSlide();
    const from  = wrap.scrollLeft;
    const delta = left - from;
    const t0    = performance.now();
    const ease  = easing === 'in'  ? function (t) { return t * t; }
                : easing === 'out' ? function (t) { return 1 - Math.pow(1 - t, 3); }
                : function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
    function step(now) {
      const t = Math.min(1, (now - t0) / duration);
      wrap.scrollLeft = from + delta * ease(t);
      if (t < 1) {
        animId = window.requestAnimationFrame(step);
      } else {
        animId = null;
        if (onDone) {
          onDone();
        } else {
          normalize();        /* jump back into the middle set if needed */
          updateWheel();
        }
      }
    }
    animId = window.requestAnimationFrame(step);
  }

  /* keep the viewport centred within the middle (real) set; returns the
     applied scroll delta so a drag in progress can compensate */
  function normalize() {
    const vis = visibleCards();
    if (vis.length < 3 || vis.length % 3 !== 0) return 0;
    const m = vis.length / 3;
    const W = vis[m].offsetLeft - vis[0].offsetLeft;   /* one set-width */
    if (!W) return 0;
    const pitch  = vis[1].offsetLeft - vis[0].offsetLeft;
    const centre = wrap.scrollLeft + wrap.clientWidth / 2;
    const lower  = vis[m].offsetLeft + vis[m].offsetWidth / 2 - pitch / 2;
    const upper  = lower + W;
    if (centre < lower)  { wrap.scrollLeft += W; return  W; }
    if (centre >= upper) { wrap.scrollLeft -= W; return -W; }
    return 0;
  }

  /* mobile uses native smooth scrolling so it cooperates with CSS
     scroll-snap (the JS rAF animation fought the snap → jumpy auto-rotate) */
  const canNativeSmooth = 'scrollBehavior' in document.documentElement.style;
  function nativeSmooth() {
    return canNativeSmooth && window.matchMedia('(max-width: 767px)').matches;
  }
  let snapSettle = null;
  function centreCard(card, smooth) {
    const left = card.offsetLeft - (wrap.clientWidth - card.offsetWidth) / 2;
    if (!smooth) { wrap.scrollLeft = left; return; }
    if (nativeSmooth()) {
      cancelSlide();
      wrap.scrollTo({ left: left, behavior: 'smooth' });
      if (snapSettle) window.clearTimeout(snapSettle);
      snapSettle = window.setTimeout(function () { normalize(); updateWheel(); }, 650);
    } else {
      animateScrollTo(left, SLIDE_MS);
    }
  }

  /* ---- wheel effect ----
     Cards sit on the rim of a huge circle whose top is the viewport
     centre: the centred card is level, neighbours drop and tilt as if
     the whole strip rotates about the circle's centre.              */
  function updateWheel() {
    const vis = visibleCards();
    if (!vis.length) return;
    const centre = wrap.scrollLeft + wrap.clientWidth / 2;
    const mobile = window.innerWidth <= 767;
    const pitch  = vis.length > 1
      ? vis[1].offsetLeft - vis[0].offsetLeft
      : vis[0].offsetWidth;
    const R = pitch / Math.sin(TILT_DEG * Math.PI / 180);   /* one slot = TILT_DEG° */
    let active = 0, best = Infinity;
    vis.forEach(function (c, i) {
      const dx = c.offsetLeft + c.offsetWidth / 2 - centre;
      if (Math.abs(dx) < best) { best = Math.abs(dx); active = i; }
      if (mobile) { c.style.transform = ''; return; }
      const theta = Math.asin(Math.max(-1, Math.min(1, dx / R)));
      const drop  = R * (1 - Math.cos(theta));
      c.style.transform =
        'translateY(' + drop.toFixed(1) + 'px) rotate(' + (theta * 180 / Math.PI).toFixed(2) + 'deg)';
    });
    currentIdx = active;
  }

  wrap.addEventListener('scroll', function () {
    window.requestAnimationFrame(updateWheel);
  }, { passive: true });
  window.addEventListener('resize', function () {
    window.requestAnimationFrame(updateWheel);
  });

  /* ---- auto-advance: always slides forward; clones make it endless ---- */
  let timer = null;
  function next() {
    const vis = visibleCards();
    if (vis.length < 2) return;
    centreCard(vis[Math.min(currentIdx + 1, vis.length - 1)], true);
  }
  function prev() {
    const vis = visibleCards();
    if (vis.length < 2) return;
    centreCard(vis[Math.max(currentIdx - 1, 0)], true);
  }

  /* small API for the custom cursor's edge-click navigation */
  window.newsSlider = {
    next: function () { next(); startTimer(); },
    prev: function () { prev(); startTimer(); }
  };
  function startTimer() { stopTimer(); timer = window.setInterval(next, AUTO_MS); }
  function stopTimer()  { if (timer) { window.clearInterval(timer); timer = null; } }

  /* ---- initial position: card 2 of the middle (real) set ---- */
  function middleStart(vis) {
    const m = vis.length % 3 === 0 ? vis.length / 3 : 0;
    return Math.min(m + 1, vis.length - 1);
  }
  function init() {
    const vis = visibleCards();
    if (vis.length) centreCard(vis[middleStart(vis)], false);
    updateWheel();
    startTimer();
  }
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  /* tab switch — one continuous "slot machine" spin, ~6 cards total:
     accelerate through 3 cards, swap the set at full speed (the card
     grid is phase-aligned at the swap frame, so nothing jumps), then
     spin through 3 more cards while decelerating onto the target.
     The strip scrolls normally throughout — cards are never cut off.  */
  const SPIN_OUT_MS = 700;    /* accelerating, ends at full speed */
  const SPIN_IN_MS  = 1050;   /* starts at full speed, eases to a stop */
  let switchTimer = null;
  document.querySelectorAll('.news__filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      stopTimer();
      cancelSlide();
      if (switchTimer) window.clearTimeout(switchTimer);
      normalize();                       /* make sure we're in the middle set */

      const vis = visibleCards();
      if (!vis.length) return;
      const pitch  = vis.length > 1
        ? vis[1].offsetLeft - vis[0].offsetLeft
        : wrap.clientWidth;
      const active = vis[Math.min(currentIdx, vis.length - 1)];
      const aLeft  = active.offsetLeft - (wrap.clientWidth - active.offsetWidth) / 2;
      const ahead  = Math.max(1, Math.min(3, vis.length - 1 - currentIdx));

      /* spin out — end exactly card-centred so the swap frame aligns */
      animateScrollTo(aLeft + ahead * pitch, SPIN_OUT_MS, 'in', function () {});

      /* the filter module swaps the set at 700ms; we take over right after */
      switchTimer = window.setTimeout(function () {
        cancelSlide();
        const nv = visibleCards();
        if (!nv.length) return;
        const ti     = middleStart(nv);
        const target = nv[ti];
        const left   = target.offsetLeft - (wrap.clientWidth - target.offsetWidth) / 2;
        const back   = Math.max(1, Math.min(3, ti));
        wrap.scrollLeft = left - back * pitch;   /* same card-grid phase, new content */
        updateWheel();
        animateScrollTo(left, SPIN_IN_MS, 'out');
        startTimer();
      }, SPIN_OUT_MS + 1);
    });
  });

  /* ---- mouse drag (pauses the auto-advance) ----
     Touch is handled by native horizontal scrolling instead — iOS cancels
     captured pointers the moment it suspects a scroll, which left the slider
     stuck. We gate the pointer-drag to the mouse and manage the timer for
     touch separately below. */
  let dragging = false, startX = 0, scrollAtStart = 0;

  wrap.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;   /* let touch scroll natively */
    dragging      = true;
    startX        = e.clientX;
    scrollAtStart = wrap.scrollLeft;
    delete wrap.dataset.dragged;
    wrap.setPointerCapture(e.pointerId);
    stopTimer();
    cancelSlide();
  });

  wrap.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    e.preventDefault();
    if (Math.abs(e.clientX - startX) > 5) wrap.dataset.dragged = '1';
    wrap.scrollLeft = scrollAtStart - (e.clientX - startX) * 1.1;
    /* if we wrapped to the other set mid-drag, shift the drag origin too */
    const d = normalize();
    if (d) scrollAtStart += d;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    /* settle on the nearest card, then resume the timer */
    const vis = visibleCards();
    if (vis[currentIdx]) centreCard(vis[currentIdx], true);
    startTimer();
  }
  wrap.addEventListener('pointerup',     endDrag);
  wrap.addEventListener('pointercancel', endDrag);

  /* ---- touch: native scroll drives the slider; just manage the timer ----
     pause auto-advance while the finger is down (and through momentum), then
     normalise back into the middle set and settle on the nearest card. */
  let touchSettle = null;
  wrap.addEventListener('touchstart', function () {
    stopTimer();
    cancelSlide();
    if (touchSettle) { window.clearTimeout(touchSettle); touchSettle = null; }
    delete wrap.dataset.dragged;
  }, { passive: true });
  wrap.addEventListener('touchmove', function () {
    wrap.dataset.dragged = '1';
  }, { passive: true });
  wrap.addEventListener('touchend', function () {
    /* CSS scroll-snap centres the card natively; we only wait out the
       momentum, keep the loop in the middle set, then resume auto-advance.
       No JS centreCard here — that was the post-release "catch". */
    if (touchSettle) window.clearTimeout(touchSettle);
    touchSettle = window.setTimeout(function () {
      normalize();
      updateWheel();
      startTimer();
    }, 600);
  }, { passive: true });

  /* ---- click: navigate / page ----
     Runs on every device (desktop + touch). A drag/swipe sets data-dragged,
     which suppresses the click. On fine pointers the slider edges page
     prev/next (matching the arrow cursor); anywhere else a card click opens
     the article. On touch there are no edge zones — any tap opens the article. */
  const CLICK_EDGE = 0.22;
  wrap.addEventListener('click', function (e) {
    if (wrap.dataset.dragged) { delete wrap.dataset.dragged; return; }
    /* The drag uses setPointerCapture, which retargets the click to the wrap —
       so e.target is unreliable here. Hit-test by coordinates instead. */
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    /* tags are inert (plain cursor, like the listing) */
    if (hit && hit.closest('.news-card__tag')) return;
    /* edges (fine pointers only) → page prev/next, matching the arrow cursor */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x < CLICK_EDGE)     { if (window.newsSlider) window.newsSlider.prev(); return; }
      if (x > 1 - CLICK_EDGE) { if (window.newsSlider) window.newsSlider.next(); return; }
    }
    /* middle → open the article (language-aware: TC pages stay in TC) */
    if (hit && hit.closest('.news-card')) {
      window.location.href = document.documentElement.lang === 'zh-Hant' ? 'Articles_tc.html' : 'Articles.html';
    }
  });
})();


/* ----------------------------------------------------------------
   4. News filter tabs
   ---------------------------------------------------------------- */
(function () {
  const filters = document.querySelectorAll('.news__filter');
  const cards   = document.querySelectorAll('.news-card');
  if (!filters.length) return;

  var swapTimer = null;

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (f) {
        f.classList.remove('news__filter--active');
        f.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('news__filter--active');
      btn.setAttribute('aria-selected', 'true');

      var filter = btn.dataset.filter;
      /* swap mid-gap: the slider strip has flown offscreen by 550ms and
         the new strip doesn't enter until 1050ms */
      if (swapTimer) window.clearTimeout(swapTimer);
      swapTimer = window.setTimeout(function () {
        cards.forEach(function (card) {
          var show = filter === 'all' || card.dataset.category === filter;
          card.style.display = show ? '' : 'none';
        });
      }, 700);
    });
  });
})();


/* ----------------------------------------------------------------
   4b. Home V3 news tabs — filter the one-row card rail.
   ---------------------------------------------------------------- */
(function () {
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.news-v3__filter'));
  const grid = document.querySelector('.news-v3__grid');
  if (!tabs.length || !grid) return;
  const cards = Array.prototype.slice.call(grid.querySelectorAll('.card-v3'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;

  const live = document.createElement('span');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  grid.insertAdjacentElement('afterend', live);

  function select(tab) {
    const filter = tab.dataset.filter || 'all';
    tabs.forEach(function (t) {
      const on = t === tab;
      t.classList.toggle('news-v3__filter--active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });

    if (timer) window.clearTimeout(timer);
    grid.classList.add('is-filtering');
    grid.setAttribute('aria-busy', 'true');
    timer = window.setTimeout(function () {
      let shown = 0;
      cards.forEach(function (card) {
        const on = filter === 'all' || card.dataset.category === filter;
        card.hidden = !on;
        if (on) shown++;
      });
      grid.scrollLeft = 0;
      grid.classList.remove('is-filtering');
      grid.setAttribute('aria-busy', 'false');
      live.textContent = document.documentElement.lang === 'zh-Hant'
        ? '顯示 ' + shown + ' 項內容'
        : shown + (shown === 1 ? ' item shown' : ' items shown');
    }, reduce ? 0 : 180);
  }

  tabs.forEach(function (tab, index) {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      let next = null;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      tabs[next].focus();
      select(tabs[next]);
    });
  });
})();


/* ----------------------------------------------------------------
   4.5 Hero 3D photo field — the landing photos fly from deep space
   toward the viewer (ported from the 3am portfolio scene). Planes
   recycle once they pass the camera; opacity eases in at the far
   plane and out near the camera. The static photo set remains as a
   no-JS / reduced-motion fallback.
   ---------------------------------------------------------------- */
(function () {
  const hero  = document.getElementById('hero');
  const scene = document.getElementById('hero-scene');
  if (!hero || !scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  hero.classList.add('hero--scene');

  /* the 24 landing photos — shuffled so the planes pick them up in a
     random order on every load instead of a fixed 1..n sequence */
  const SRCS = [119, 120, 121, 123, 124, 125, 126, 162, 163, 164, 165, 166,
                167, 169, 171, 172, 174, 175, 178, 179, 180, 181, 182, 183]
    .map(function (n) { return 'assets/images/Rectangle%20' + n + '.png'; });
  for (let i = SRCS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = SRCS[i]; SRCS[i] = SRCS[j]; SRCS[j] = t;
  }
  /* counts bumped ~30% on full desktop for a denser field; smaller
     screens and mobile scale back so the hero doesn't get cluttered */
  const VW = window.innerWidth;
  const COUNT = VW <= 767 ? 12 : VW <= 1280 ? 18 : 21;   /* photo planes */
  const DOTS  = VW <= 767 ? 10 : VW <= 1280 ? 15 : 17;   /* orange dots  */
  const TOTAL   = COUNT + DOTS;
  /* the polar spread is tuned for a wide desktop; the same radii on a
     narrow viewport fling every plane off the sides (perspective also
     magnifies them ~3× near the camera), so scale the spread down with
     the viewport width to keep planes crossing the visible area */
  const RSCALE  = Math.min(1, Math.max(0.34, VW / 1440));
  const MOBILE  = VW <= 767;
  /* mobile: nudge the inner radius out so the flight path leaves a clearer
     column down the middle for the headline, and fade planes in over a
     much longer distance so any that pass behind the text are still faint
     there — they only reach full colour as they fan out past the letters */
  const R_INNER = MOBILE ? 1.35 : 1;
  const FADE_IN = MOBILE ? 1500 : 450;
  const Z_START = -4200;
  const Z_END   = 700;

  const particles = [];

  function reset(p, scatter) {
    /* each plane is pinned to a side (p.side: +1 right, -1 left) that's
       handed out alternately at creation, so the left/right counts stay
       balanced instead of randomly leaning one way. The angle is random
       within that half; y is squashed — the hero is wide.            */
    let angle;
    do {
      angle = p.side > 0
        ? (Math.random() - 0.5) * Math.PI          /* right half: cos > 0 */
        : Math.PI / 2 + Math.random() * Math.PI;    /* left half:  cos < 0 */
      /* photos skip the straight-down sector (≈90°±32°) so they don't
         drift through the logo/description at the hero's bottom centre */
    } while (!p.dot && Math.abs(angle - Math.PI / 2) < 0.55);
    const radius = (1100 * R_INNER + Math.random() * 1600) * RSCALE;
    p.x = Math.cos(angle) * radius;
    p.y = Math.sin(angle) * radius * 0.62;
    p.z = scatter ? Z_START + Math.random() * (Z_END - Z_START) : Z_START;
    /* dots run a touch larger so they read even when far away */
    p.s = p.dot ? 0.7 + Math.random() * 0.6
                : 0.55 + Math.random() * 0.6;
    p.v = 3 + Math.random() * 4;
  }

  let nPhoto = 0, nDot = 0;
  for (let i = 0; i < TOTAL; i++) {
    const isDot = i >= COUNT;
    let el;
    if (isDot) {
      el = document.createElement('div');
      el.className = 'hero__plane hero__plane--dot';
    } else {
      el = document.createElement('img');
      el.src = SRCS[i % SRCS.length];
      el.alt = '';
      el.className = 'hero__plane';
    }
    /* alternate sides within each group so left/right stay even */
    const side = (isDot ? nDot++ : nPhoto++) % 2 === 0 ? 1 : -1;
    const p = { el: el, i: i, dot: isDot, side: side };
    reset(p, true);
    particles.push(p);
    scene.appendChild(el);
  }

  let running = true;
  window.addEventListener('scroll', function () {
    /* pause the loop once the hero is off screen */
    running = window.scrollY < hero.offsetHeight;
  }, { passive: true });

  /* group fade multipliers — the landing sequence brings dots in first,
     photos a beat later (targets settable from outside via heroScene).
     Current values start at 0 so nothing flashes before its cue; if the
     landing module is skipped the targets stay 1 and they just fade in. */
  const fade  = { dots: 0, photos: 0 };
  const fadeT = { dots: 1, photos: 1 };
  window.heroScene = fadeT;

  /* when a group gets its cue, queue its planes BEHIND the far plane —
     each one only becomes visible as it crosses the fade-in boundary,
     so they genuinely stream in one by one from nothing */
  const armed = { dots: false, photos: false };
  function arm(kind) {
    armed[kind] = true;
    particles.forEach(function (p) {
      if ((kind === 'dots') === !!p.dot) {
        reset(p, false);
        p.z = Z_START - Math.random() * (p.dot ? 1400 : 2600);
      }
    });
  }

  (function tick() {
    if (running) {
      if (!armed.dots   && fadeT.dots   > 0) arm('dots');
      if (!armed.photos && fadeT.photos > 0) arm('photos');
      fade.dots   += (fadeT.dots   - fade.dots)   * 0.03;
      fade.photos += (fadeT.photos - fade.photos) * 0.03;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.z += p.v;
        if (p.z > Z_END) reset(p, false);

        let o = 1;
        if (p.z < Z_START + FADE_IN)  o = Math.max(0, (p.z - Z_START) / FADE_IN);  /* fade in over distance; clamped for queued planes */
        else if (p.z > Z_END - 300)   o = Math.max(0, (Z_END - p.z) / 300);

        p.el.style.opacity = (o * (p.dot ? fade.dots : fade.photos)).toFixed(3);
        p.el.style.transform =
          'translate(-50%,-50%) translate3d(' + p.x.toFixed(1) + 'px,' +
          p.y.toFixed(1) + 'px,' + p.z.toFixed(1) + 'px) scale(' + p.s + ')';
      }
    }
    window.requestAnimationFrame(tick);
  })();
})();


/* ----------------------------------------------------------------
   5. Wave line — pin the decorative line so it always starts at the
   end of the Pillars section and ends 109px (245px on mobile) above
   the page bottom, whatever the viewport. The SVG stretches
   (preserveAspectRatio="none"), which also keeps the path geometry
   stable for the future scroll-draw animation.
   ---------------------------------------------------------------- */
(function () {
  const wave    = document.querySelector('.footer__wave');
  const pillars = document.getElementById('pillars');
  const footer  = document.getElementById('footer');
  if (!wave || !pillars || !footer) return;

  function placeWave() {
    /* lift the start point above the pillars boundary so the first curve
       weaves through the approach cards, like the design */
    const lead = window.innerWidth <= 767 ? 60 : 350;
    const top = pillars.getBoundingClientRect().bottom
              - footer.getBoundingClientRect().top
              - lead;
    wave.style.top    = Math.round(top) + 'px';
    wave.style.height = 'auto';          /* stretch between top & bottom */
  }

  window.addEventListener('load', placeWave);
  window.addEventListener('resize', placeWave);
  placeWave();
})();


/* ----------------------------------------------------------------
   5.5 Scroll-drawn lines — the arc (pillars) and the wave (footer)
   draw themselves in as you scroll, the stroke tip leading the way
   down the page. Reduced-motion users get the full lines statically.
   ---------------------------------------------------------------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = [
    { path: document.getElementById('arc-path'),  dot: document.getElementById('arc-dot') },
    { path: document.getElementById('wave-path'), dot: null }
  ].filter(function (it) { return it.path; });
  if (!items.length) return;

  items.forEach(function (it) {
    it.svg = it.path.closest('svg');
    it.len = it.path.getTotalLength();
    it.path.style.strokeDasharray  = it.len + ' ' + it.len;
    it.path.style.strokeDashoffset = it.len;
  });

  let queued = false;
  function update() {
    queued = false;
    const vh = window.innerHeight;
    /* the wave's tail sits below the last scrollable position — over the
       final 600px of scroll, ramp any unfinished line to 100% so it
       completes itself as the footer comes into view */
    const maxScroll = document.documentElement.scrollHeight - vh;
    const fromEnd   = maxScroll - window.scrollY;
    const endBoost  = 1 - Math.min(1, Math.max(0, fromEnd / 600));

    items.forEach(function (it) {
      const r = it.svg.getBoundingClientRect();
      /* 0 → tip appears as the line enters the lower viewport,
         1 → fully drawn just before its end scrolls past         */
      let p = (vh * 0.9 - r.top) / (r.height + vh * 0.35);
      p = Math.max(0, Math.min(1, Math.max(p, endBoost)));
      it.path.style.strokeDashoffset = (it.len * (1 - p)).toFixed(1);
      if (it.dot) it.dot.style.opacity = p > 0.005 ? '1' : '0';
    });
  }
  function request() {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();


/* The listing background line is a static decorative sweep behind the cards
   (no scroll-draw) — see .listing__line in style.css. */


/* ----------------------------------------------------------------
   6. Custom cursor — orange dot with a lerped follow.
   Morphs over links/buttons, and over the news slider it becomes a
   big "DISCOVER" circle; near the slider's edges it turns into an
   arrow circle and a click there navigates prev/next.
   Only enabled for fine pointers (mouse/trackpad), never touch.
   ---------------------------------------------------------------- */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  document.body.classList.add('has-custom-cursor');

  /* the page is zoomed by the responsive width/height ladders — pointer coordinates are in
     real viewport px while the fixed cursor lives in the zoomed canvas,
     so divide everything by the effective zoom */
  let zoom = 1;
  function readZoom() {
    zoom = window.__pageZoom();
  }
  readZoom();
  window.addEventListener('resize', readZoom);

  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  let cx = tx, cy = ty;
  let magnet = null;           /* element the cursor is snapped onto */

  /* hidden until the pointer first moves — otherwise on (re)load it would
     appear at screen-centre and visibly fly to the mouse */
  let primed = false;
  cursor.classList.add('cursor--hidden');

  document.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!primed) {
      /* snap straight to the pointer the first time, so it never flies in */
      primed = true;
      cx = tx / zoom; cy = ty / zoom;
    }
    cursor.classList.remove('cursor--hidden');
  });
  document.documentElement.addEventListener('mouseleave', function () {
    cursor.classList.add('cursor--hidden');
  });

  (function follow() {
    let gx = tx / zoom, gy = ty / zoom;
    if (magnet) {
      /* stick to the centre of the hovered control */
      const r = magnet.getBoundingClientRect();
      gx = (r.left + r.width / 2) / zoom;
      gy = (r.top + r.height / 2) / zoom;
    }
    /* The free dot rides the pointer exactly — a lerp here is a lag, and at
       0.2 per frame it read as the dot sliding to catch up rather than as
       the pointer itself. The easing is kept only for the magnet, where it
       is doing real work: the glide onto (and off) the centre of a control
       is the snap, and without it the ring would teleport. */
    if (magnet) {
      cx += (gx - cx) * 0.3;
      cy += (gy - cy) * 0.3;
    } else {
      cx = gx;
      cy = gy;
    }
    cursor.style.transform =
      'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
    window.requestAnimationFrame(follow);
  })();

  /* magnetic wrap on buttons + menu links */
  function engage(el) {
    magnet = el;
    const r = el.getBoundingClientRect();
    const w = r.width / zoom, h = r.height / zoom;
    cursor.classList.add('cursor--magnet');
    /* hug the target tightly — ~2px gap (the ring is border-box with a 2.5px
       border, so +9 on each dimension leaves about 2px of clearance).
       Plain-text links/tabs have no padded box of their own, so give them a
       roomier wrap instead of hugging the glyphs — the sticky nav links and
       the legacy `.news__filter` tabs. (The R2 home tabs, `.news-v3__filter`,
       are excluded from the magnet entirely and keep the plain dot.) */
    const roomy = el.matches && el.matches('.nav__link, .nav__lang, .news__filter');
    /* the nav search button gets a 20% bigger ring on hover — but not in the
       shrunk sticky state */
    const navEl = document.getElementById('nav');
    const boost = (el.matches && el.matches('.nav__search-btn') &&
                   !(navEl && navEl.classList.contains('nav--scrolled'))) ? 1.2 : 1;
    if (!roomy && Math.abs(w - h) < 12) {
      /* near-square targets (e.g. the search icon) get a perfect circle */
      const s = Math.round((Math.max(w, h) + 9) * boost);
      cursor.style.width  = s + 'px';
      cursor.style.height = s + 'px';
    } else {
      cursor.style.width  = Math.round((w + (roomy ? 24 : 9)) * boost) + 'px';
      cursor.style.height = Math.round((h + (roomy ? 16 : 9)) * boost) + 'px';
    }
  }
  function release() {
    magnet = null;
    cursor.classList.remove('cursor--magnet', 'cursor--absorb');
    cursor.style.width  = '';
    cursor.style.height = '';
  }

  /* Search is the only control that swallows the cursor: the dot collapses
     into it and the button's own orange disc is left doing the work — one
     clean circle, no ring around it. Except in the V3 sticky pill, where the
     glyph just goes orange and no disc opens: absorbing the dot there would
     leave nothing at all under the pointer, so it keeps the plain dot. */
  const navV3 = document.getElementById('nav');
  function pillSearch(b) {
    return b.matches('.nav__search-btn') && navV3 &&
           navV3.classList.contains('nav--v3') &&
           navV3.classList.contains('nav--scrolled');
  }
  document.querySelectorAll('.nav__search-btn, .search-overlay__close').forEach(function (b) {
    b.addEventListener('mouseenter', function () {
      if (pillSearch(b)) return;
      cursor.classList.add('cursor--absorb');
    });
    b.addEventListener('mouseleave', release);
  });
  /* Menu links and 中文 are not wrapped by the cursor — the ring would have
     to hug the glyphs, which is what the roomy wrap was fighting. They get
     the ring state instead: the solid dot opens into an outline with a small
     dot at its centre, on the spot, and travels with the pointer as usual. */
  document.querySelectorAll('.nav__link, .nav__lang').forEach(function (el) {
    el.addEventListener('mouseenter', function () { cursor.classList.add('cursor--ring'); });
    el.addEventListener('mouseleave', function () { cursor.classList.remove('cursor--ring'); });
  });

  /* The orange pills do get the wrap:
     the ring *is* the outline the button gains on hover. */
  document.querySelectorAll('.btn-circle, button').forEach(function (el) {
    /* The hamburger and the search button keep the plain dot: the
       hamburger's own rules go orange, and the search button draws its own
       orange disc — a cursor ring on top of that would just be a second
       circle around the first. */
    if (el.matches('.nav__hamburger, .nav__search-btn')) return;
    /* listing filters / breadcrumb and the R2 news tabs use a plain colour
       hover — no magnet wrap, just the travelling dot; the mobile menu +
       search overlay use an underline-draw hover instead of the cursor frame */
    if (el.closest('.listing__filters') || el.closest('.listing__crumb') ||
        el.closest('.news-v3__filters') ||
        el.closest('.nav__mobile-menu') ||
        /* the article carousel's two arrows: their hover is the glyph going
           orange, and a ring drawn around a bare arrow read as a second,
           unrelated shape rather than as the button's own outline */
        el.closest('.article__carousel-nav') ||
        el.closest('.search-overlay')) return;
    el.addEventListener('mouseenter', function () {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      engage(el);
    });
    el.addEventListener('mouseleave', release);
  });

  /* Anything with an orange ground — the Bettering panel, the search
     button's hover disc, the legacy article highlight and approach cards.
     An orange dot on orange is invisible, so it knocks out white. */
  document.querySelectorAll(
    '.article__highlight, .approach-card--orange, .panel--bettering'
  ).forEach(function (el) {
    el.addEventListener('mouseenter', function () { cursor.classList.add('cursor--on-dark'); });
    el.addEventListener('mouseleave', function () { cursor.classList.remove('cursor--on-dark'); });
  });

  /* the sub-links get the ring too: they are menu links, and the ring is
     what this cursor does over a menu link */
  document.querySelectorAll('.nav__mega-links a').forEach(function (el) {
    el.addEventListener('mouseenter', function () { cursor.classList.add('cursor--ring'); });
    el.addEventListener('mouseleave', function () { cursor.classList.remove('cursor--ring'); });
  });

  /* listing story cards: big "DISCOVER" circle over the card body, but a
     plain (clickable) cursor over the individual tags */
  document.querySelectorAll('.story-card').forEach(function (card) {
    card.addEventListener('mouseenter', function () { cursor.classList.add('cursor--discover'); });
    card.addEventListener('mouseleave', function () { cursor.classList.remove('cursor--discover'); });
    card.querySelectorAll('.story-card__tag').forEach(function (tag) {
      tag.addEventListener('mouseenter', function () { cursor.classList.remove('cursor--discover'); });
      tag.addEventListener('mouseleave', function () { cursor.classList.add('cursor--discover'); });
    });
  });

  /* news slider: DISCOVER in the middle, arrows at the edges */
  const wrap = document.getElementById('news-carousel-wrap');
  if (wrap) {
    const EDGE = 0.22;   /* fraction of the wrap width that counts as an edge */

    function zone(e) {
      const r = wrap.getBoundingClientRect();
      return (e.clientX - r.left) / r.width;
    }
    function setMode(e) {
      cursor.classList.remove('cursor--discover', 'cursor--prev', 'cursor--next');
      /* over a tag → plain cursor (tags are their own thing, like the listing) */
      if (e.target.closest('.news-card__tag')) return;
      /* edges → prev/next arrows, middle → DISCOVER */
      const x = zone(e);
      if      (x < EDGE)     cursor.classList.add('cursor--prev');
      else if (x > 1 - EDGE) cursor.classList.add('cursor--next');
      else                   cursor.classList.add('cursor--discover');
    }
    wrap.addEventListener('mousemove', setMode);
    wrap.addEventListener('mouseenter', setMode);
    wrap.addEventListener('mouseleave', function () {
      cursor.classList.remove('cursor--discover', 'cursor--prev', 'cursor--next');
    });

    /* click handling (edge paging + card navigation) lives in the carousel
       module so it also works on touch; here we only drive the cursor visual */
  }
})();


/* ----------------------------------------------------------------
   0a. Release the pre-paint hold — §13 normally takes it over in the
   same tick, but if the landing intro never runs (another page, or it
   bailed early) nothing must stay hidden.
   ---------------------------------------------------------------- */
(function () {
  const root = document.documentElement;
  if (!root.classList.contains('lp-boot')) return;
  window.setTimeout(function () { root.classList.remove('lp-boot'); }, 0);
})();


/* ----------------------------------------------------------------
   0b. Scrollbar width — measured while the bar is on screen and handed
   to CSS as `--sbw`. `html.lock-scroll` pads by it, so locking the page
   (intro, mobile menu, search overlay) doesn't shift the layout
   sideways when the scrollbar disappears and comes back.
   Must run before anything that locks scrolling.
   ---------------------------------------------------------------- */
(function () {
  const root = document.documentElement;
  function measure() {
    /* only meaningful while the bar is actually present */
    if (root.classList.contains('lock-scroll')) return;
    root.style.setProperty('--sbw', (window.innerWidth - root.clientWidth) + 'px');
  }
  measure();
  window.addEventListener('resize', measure);
})();


/* ----------------------------------------------------------------
   7. Landing sequence —
   logo splash (centre) → fade → headline + orange dots →
   photos + bottom text → menu drops in from the top.
   Skipped entirely for reduced-motion / no-JS.
   ---------------------------------------------------------------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* homepage only — inner pages (no hero) don't get the logo splash */
  if (!document.getElementById('hero')) return;
  /* Home V3 runs its own three-act intro (§13) instead of this splash */
  if (document.body.classList.contains('home-v3')) return;

  /* splash built by script so no-JS visitors never get blocked */
  const pre = document.createElement('div');
  pre.className = 'preloader';
  pre.innerHTML = '<img src="assets/icons/logo-nav.png" alt="D. H. Chen Foundation" />';
  document.body.appendChild(pre);

  document.documentElement.classList.add('lock-scroll');
  if (window.__lenis) window.__lenis.stop();
  document.body.classList.add('lp-nav', 'lp-h1', 'lp-h2');
  if (window.heroScene) { window.heroScene.dots = 0; window.heroScene.photos = 0; }
  window.scrollTo(0, 0);

  window.setTimeout(function () { pre.classList.add('logo-out'); }, 1100);

  window.setTimeout(function () {
    pre.classList.add('out');
    document.documentElement.classList.remove('lock-scroll');
    if (window.__lenis) window.__lenis.start();
  }, 1600);

  /* headline in */
  window.setTimeout(function () {
    document.body.classList.remove('lp-h1');
  }, 1700);

  /* while the headline is still settling, the logomark flows in and
     the description + scroll cue cascade off it (CSS delays) */
  window.setTimeout(function () {
    document.body.classList.remove('lp-h2');
  }, 2150);

  /* orange dots stream in a beat after the headline has landed, so the
     text reads first and the dots don't feel rushed on top of it */
  window.setTimeout(function () {
    if (window.heroScene) window.heroScene.dots = 1;
  }, 2250);

  /* photos + menu join as the text tail finishes — overlapping beats */
  window.setTimeout(function () { document.body.classList.remove('lp-nav'); }, 2650);
  window.setTimeout(function () {
    if (window.heroScene) window.heroScene.photos = 1;
  }, 2700);

  window.setTimeout(function () { pre.remove(); }, 2400);
})();


/* ----------------------------------------------------------------
   8. Scroll reveal — content floats up from below as it scrolls into
   view, with a slight stagger inside each group (e.g. the three
   Challenge circles land one after another).
   ---------------------------------------------------------------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  /* [selector, delay-ms] — delays create the in-group sequencing */
  const ITEMS = [
    ['.intro__label', 0], ['.intro__foundation-headline', 100],
    ['.intro__bullets', 200], ['.intro__video', 250],

    ['.challenge__label', 0], ['.challenge__headline', 100],
    ['.challenge__body', 200], ['.challenge__btn', 300],
    ['.challenge__circle--1', 100], ['.challenge__circle--2', 280],
    ['.challenge__circle--3', 460],

    ['.pillars__heading', 0],
    ['.pillar-card--issues', 0], ['.pillar-card--sector', 150],

    ['.approach > .label', 0],
    ['.approach-card--1', 0], ['.approach-card--2', 130],
    ['.approach-card--3', 260], ['.approach-card--4', 330],
    ['.approach-card--5', 460],
    ['.approach__cta', 0],

    ['.news__heading', 0], ['.news__filters', 130],
    ['.news__carousel-wrap', 220], ['.news__cta', 0],

    ['.footer__logo', 0], ['.footer__col', 120], ['.footer__legal-nav', 240],

    /* the line under the banner rises in like the card copy below it */
    ['.intro-v3', 0],

    /* home V3 (index.html) — news grid, ventures, footer.
       The four B panels are NOT here: §8.8 runs each card as one timeline
       (copy top-to-bottom, then its graphic), triggered by the card itself
       rather than by each block scrolling into view on its own. */

    ['.news-v3__heading', 0], ['.news-v3__filters', 130],
    /* left to right, one card after the other */
    ['.card-v3:nth-child(1)', 0], ['.card-v3:nth-child(2)', 170],
    ['.card-v3:nth-child(3)', 340], ['.card-v3:nth-child(4)', 510],
    ['.news-v3__cta', 0],

    ['.ventures__col', 0], ['.funding', 120],
    ['.footer-v3__logo', 0], ['.footer-v3__col', 120], ['.footer-v3__legal', 240],

    /* inner pages — Listing.html / Articles.html.
       Both used to arrive almost fully formed: the listing revealed only
       its title and filter bar, and the article nothing at all below the
       nav, so the pages read as static next to the home page's sections.
       Everything down the page now rises in the same way.
       The story cards take no delay here — theirs is worked out per grid
       column when they land, see `columnOf`. */
    ['.listing__crumb', 0], ['.listing__title', 100],
    ['.listing__filters', 200], ['.story-card', 0], ['.listing__pager', 0],

    /* no `.article__crumb` — the article's breadcrumb *is* a `.listing__crumb`
       (it carries both classes) and is already covered above */
    ['.article__title', 100],
    ['.article__subtitle', 200], ['.article__tags', 300],
    /* every block of the article in turn — copy, figures, the pull quote,
       the video, the highlight panel, the testimonial. Taking the children
       rather than naming each class means anything added to the article
       later joins in without a code change. */
    ['.article__main > *', 0],
    /* the related rail is a single column, so each item simply rises as it
       reaches the viewport — no in-group stagger to express */
    ['.article__related-title', 0], ['.article__related-item', 0],

    /* Story.html — the same components in the other arrangement. The
       head, the lead image and the rail arrive first; the copy column
       is taken as a whole the way `.article__main > *` is, so anything
       added to it later joins in with no code change here. */
    /* the head is the shared `.article__title` / `.article__subtitle`
       and is already covered above; the lead image is the first child
       of the copy column and comes in with the rest of it */
    ['.story__meta-inner', 0],
    ['.story__main > *', 0],
    ['.story__related-title', 0], ['.story__related-item', 0],

    /* Connect.html — the two body columns arrive together (they are one
       row, not a sequence), then the funding panel under them. The
       details rows and the form fields are deliberately NOT listed: the
       column is one block and lifting eleven labelled rows one at a time
       reads as a list loading, not as a page arriving. */
    ['.connect__col--info', 0], ['.connect__col--aside', 120],
    ['.connect__funding', 0],

    /* Approach.html — the opening line, then each section's own blocks.
       `.longform__section > *` catches the eyebrow, heading, copy,
       figure and the two lists the same way `.article__main > *` does on
       Articles.html, so anything added to a section later joins in with
       no code change. The five value plates and the five strategy rows
       are named separately so each set ripples in order. */
    ['.longform__lede', 0],
    /* the two lists are skipped here — their rows are named below and
       reveal one at a time, so fading the container over them as well
       would put two fades on the same pixels */
    ['.longform__section > :not(.ethos__values):not(.strategy-list)', 0],
    ['.ethos__value:nth-child(1)', 0], ['.ethos__value:nth-child(2)', 110],
    ['.ethos__value:nth-child(3)', 220], ['.ethos__value:nth-child(4)', 330],
    ['.ethos__value:nth-child(5)', 440],
    ['.strategy:nth-child(1)', 0], ['.strategy:nth-child(2)', 90],
    ['.strategy:nth-child(3)', 180], ['.strategy:nth-child(4)', 270],
    ['.strategy:nth-child(5)', 360],
    ['.longform__cta', 0],

    /* Institutes.html and Institute.html — the opening
       copy, then the cards. The cards are `.story-card`s, already
       covered above, and take their stagger from `columnOf` like every
       other card grid on the site. */
    ['.institutes__lede', 0],
    ['.institute-card', 0], ['.institutes__foot', 0],
    ['.institute__lede', 0], ['.institute__text', 100]
  ];

  /* When a block is considered "in view".

     The home page waits: `threshold: 0.2` with a 22% bottom inset holds a
     section back until a fifth of it is a fair way up the window, which
     suits a page built out of full-height sections.

     It is the wrong rule for the inner pages. Their blocks are small and
     numerous — a paragraph, a figure, a card — and some are taller than
     the inset leaves room for, so demanding 20% of the element *and* the
     top 78% of the window means a block only lifts once it is halfway up
     the screen. It reads as arriving late.
     `threshold: 0` starts a block the moment its top edge crosses the
     line, and a 12% inset puts that line just above the fold. */
  const OBS_OPTS = document.body.classList.contains('inner-v3')
    ? { threshold: 0,   rootMargin: '0px 0px -12% 0px' }
    : { threshold: 0.2, rootMargin: '0px 0px -22% 0px' };

  const targets = [];
  ITEMS.forEach(function (item) {
    document.querySelectorAll(item[0]).forEach(function (el) {
      /* Hide it WITHOUT animating the hiding.
         `.reveal` carries both `opacity: 0` and a 1.2s transition on
         opacity — so adding the class does not just set the start state,
         it starts a 1.2s fade *out* from the element's natural opacity 1.
         The observer then adds `is-in` a few milliseconds later for
         anything already on screen, which reverses that fade from ~1 back
         to 1: the element never dips, so it never rises either, and the
         top of the page arrives fully formed. Lower down the same fade-out
         has to play through before the element can come back, which is
         what made the rest look late.
         `transitionProperty` (the longhand) is what gets suppressed here,
         not the `transition` shorthand — the shorthand would also reset
         the per-item delay set just below. */
      el.style.transitionProperty = 'none';
      el.classList.add('reveal');
      if (item[1]) el.style.transitionDelay = item[1] + 'ms';
      targets.push(el);
    });
  });
  /* Settle `opacity: 0` as the resolved style while transitions are still
     off, then hand them back — now every reveal has a start value to
     animate from, and no fade-out ever ran. */
  void document.body.offsetHeight;
  targets.forEach(function (el) { el.style.transitionProperty = ''; });
  void document.body.offsetHeight;

  /* Which column a card sits in, so each row ripples left to right.

     It cannot be written as `:nth-child`: the story grid runs four columns
     wide and re-flows to three, two and one, so "third in the row" is a
     different card at every width. It also cannot be measured when this
     file runs — the thumbnails carry no intrinsic size, so the grid has
     not settled yet and every card still reads as its own row. So it is
     worked out at the moment the card lands, when the images are in.

     Columns, not rows, and `offsetLeft`, not `getBoundingClientRect()`:
     an unlanded `.reveal` is translated down the page, so measuring tops finds
     cards in the same row at different heights and splits the row in two.
     Horizontal position has no such problem, and `offsetLeft` ignores
     transforms outright. The distinct left edges are the columns — which
     also gives a single-column phone the right answer, one column and
     therefore no stagger at all. */
  function columnOf(el) {
    const lefts = [];
    Array.prototype.forEach.call(el.parentElement.children, function (sib) {
      const l = Math.round(sib.offsetLeft);
      if (lefts.indexOf(l) === -1) lefts.push(l);
    });
    lefts.sort(function (a, b) { return a - b; });
    return lefts.indexOf(Math.round(el.offsetLeft));
  }

  /* card to card across a row, and row to row — the second only applies to
     the opening batch below, where two rows arrive at once */
  const COL_STEP = 130;
  const ROW_STEP = 240;

  function land(el) {
    /* set before the class, so the transition starts with the delay already
       on it — both land in the same style recalculation */
    if (el.classList.contains('story-card')) {
      const row = +(el.dataset.openRow || 0);
      el.style.transitionDelay = (row * ROW_STEP + columnOf(el) * COL_STEP) + 'ms';
    }
    el.classList.add('is-in');
    obs.unobserve(el);
    /* Clear the stagger delay once landed so later hovers stay snappy —
       but only once the reveal itself is over. The longest is a fourth
       column card on the inner pages: 3 × 170ms of stagger on top of a
       1.5s rise, which overran the old 2000 and had its delay pulled out
       from under it mid-transition. */
    window.setTimeout(function () { el.style.transitionDelay = ''; }, 2600);
  }

  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      land(el);
      /* reveal the "Read more" CTA together with the news cards — it sits below
         the tall carousel, so on its own it would only trigger after scrolling
         well past the cards (user couldn't see it while viewing the news) */
      if (el.classList.contains('news__carousel-wrap')) {
        const cta = document.querySelector('.news__cta');
        if (cta && !cta.classList.contains('is-in')) land(cta);
      }
    });
  }, OBS_OPTS);

  targets.forEach(function (el) { obs.observe(el); });

  /* The opening, on the listing.
     Left to the observer, only what is actually on screen comes in, which
     at most window heights is the first row of cards and nothing else — so
     the band under that row sat visibly empty while the header was still
     arriving, and the page looked half-loaded. The first two rows are
     brought in with the header instead, as one cascade that reads across
     and then down; everything from the third row on stays with the
     observer and lifts as it is scrolled to.
     Rows come from `offsetTop`, which is layout and so is not disturbed by
     the reveal's own translate, and which has settled by the time the
     opening runs. `land()` unobserves each card, so nothing fires twice. */
  const cards = Array.prototype.slice.call(document.querySelectorAll('.story-card'));
  if (cards.length) {
    const rows = [];
    cards.forEach(function (c) {
      const top = Math.round(c.offsetTop);
      if (rows.indexOf(top) === -1) rows.push(top);
    });
    rows.sort(function (a, b) { return a - b; });
    cards.forEach(function (c) {
      const row = rows.indexOf(Math.round(c.offsetTop));
      if (row < 2) {
        c.dataset.openRow = row;
        land(c);
      }
    });
  }

  /* Safety net: the observer holds a bottom inset (22% on the home page, 12%
     on the inner pages), so elements that settle inside it at the page end —
     the footer columns — would never trigger and stay hidden. Reveal any
     stragglers near the end. */
  function flushAtBottom() {
    const atEnd = window.scrollY + window.innerHeight >=
                  document.documentElement.scrollHeight - 120;
    if (!atEnd) return;
    targets.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      el.classList.add('is-in');
      obs.unobserve(el);
      window.setTimeout(function () { el.style.transitionDelay = ''; }, 2000);
    });
  }
  window.addEventListener('scroll', flushAtBottom, { passive: true });
  window.addEventListener('resize', flushAtBottom);
  flushAtBottom();
})();


/* ----------------------------------------------------------------
   8.7 點 · 線 · 面 — the three panel graphics on the V3 home tell one
   continuous story, each panel playing its own stage as it scrolls in:

     Being      點  scattered dots drift, then collapse into a single dot
     Becoming   線  that dot spreads left and right into a line
     Belonging  面  the line spreads up and down into a plane

   The dots for panels 2 and 3 are repetitive, so they're built here
   rather than written out in the markup; panel 1's are in the HTML
   because each one carries a hand-placed position from the design.
   Adding .is-on starts a stage — the transitions themselves live in CSS.
   ---------------------------------------------------------------- */
(function () {
  const stages = Array.prototype.slice.call(document.querySelectorAll('[data-motion]'));
  if (!stages.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Slow-then-fast spread. Rings double as they go out — 1, then 2, then
     4, then 8 — so the delay grows with log2 of the distance from the
     middle: the first few land one at a time, the rest rush out. */
  function ringDelay(distance, beat) {
    return Math.round(Math.log2(distance + 1) * beat) + 'ms';
  }

  /* 線 — odd count so the line starts from a single centre dot. They pop
     on in place (nothing travels); the delay does the spreading. */
  const ROW_DOTS = 39;
  const ROW_MID  = (ROW_DOTS - 1) / 2;
  /* Nothing moves once the row is written — it settles as a straight line
     and stays one. The only motion is the writing itself, and it takes its
     time: the beat is what makes the dots arrive one at a time rather than
     all at once. */
  document.querySelectorAll('.dotrow').forEach(function (row) {
    for (let i = 0; i < ROW_DOTS; i++) {
      const dot = document.createElement('span');
      dot.className = 'dotrow__dot';
      dot.style.setProperty('--x', (i * 100 / ROW_DOTS) + '%');
      dot.style.setProperty('--dl', ringDelay(Math.abs(i - ROW_MID), 520));
      row.appendChild(dot);
    }
  });

  /* 面 — 25 rules at the design's 18px pitch: twice the depth of the
     Figma block, and an odd count so it opens on one centre rule */
  const RULES     = 25;
  const RULES_MID = (RULES - 1) / 2;
  document.querySelectorAll('.lines').forEach(function (box) {
    for (let i = 0; i < RULES; i++) {
      const line = document.createElement('span');
      line.className = 'lines__line';
      line.style.setProperty('--y', (i * 100 / RULES) + '%');
      line.style.setProperty('--dl', ringDelay(Math.abs(i - RULES_MID), 420));
      box.appendChild(line);
    }
  });

  /* (the colour bar needs no per-child setup — CSS wipes the whole
     container with one clip-path) */

  /* How long the opening state holds before the stage plays. The copy's
     own scroll-reveal takes ~1.2s, so every stage waits it out — the
     graphic should never finish before the heading has even landed. The
     dots wait longest: they fade in first and drift for a beat before
     they're gathered, so the panel is alive rather than parked. */
  const HOLD = { dots: 2520, dotrow: 1500, lines: 1500, bar: 200 };
  window.__motionHold = HOLD;

  /* No motion available? Hold each panel on the frame the design shows:
     panel 1 stays scattered (its opening frame), 2 and 3 sit complete. */
  if (reduce || !('IntersectionObserver' in window)) {
    stages.forEach(function (el) {
      el.classList.add(el.dataset.motion === 'dots' ? 'is-lit' : 'is-on');
    });
    return;
  }

  function watch(options) {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);
        /* beat one: the dots fade in where they belong and start drifting */
        el.classList.add('is-lit');
        /* beat two: the stage itself plays */
        window.setTimeout(function () {
          el.classList.add('is-on');
        }, HOLD[el.dataset.motion] || 300);
      });
    }, options);
    return obs;
  }

  /* The panel graphics wait until they're properly in frame. The colour
     bar can't: it's 3px tall, so a 45% threshold inside a shrunk root
     never resolves — it draws as soon as it shows up. */
  const panels = watch({ threshold: 0.45, rootMargin: '0px 0px -12% 0px' });
  const thin   = watch({ threshold: 0,    rootMargin: '0px 0px -6% 0px' });

  stages.forEach(function (el) {
    /* `data-play="manual"` = somebody else owns this stage's timing.
       The banner's colour bar sits exactly on the bottom edge of the first
       screen, so the observers' negative rootMargin would never see it —
       it would only draw once you scrolled. The landing intro (§13) plays
       it instead, right after the banner copy has landed. */
    if (el.dataset.play === 'manual') {
      el.classList.add('is-lit');
      return;
    }
    /* graphics inside a B panel are played by that panel's timeline (§8.8)
       so they run on from the copy instead of triggering separately */
    if (el.closest('.panel')) return;
    (el.dataset.motion === 'bar' ? thin : panels).observe(el);
  });
})();


/* ----------------------------------------------------------------
   8.8 The B panels play as one card, not as loose blocks.

   Each panel is a single timeline, started by the *card* coming into
   view — so the copy near the bottom of a tall card is already on its
   way in by the time you reach it, instead of waiting to be scrolled to
   individually. The lines cascade top to bottom, and the panel's graphic
   (點 · 線 · 面, or Bettering's photo) starts half a second before the
   last line has finished landing, so the two read as one move rather
   than two separate events.

   §8.7 still builds the dot rows and rules; it just no longer stages the
   ones that live inside a panel.
   ---------------------------------------------------------------- */
(function () {
  const panels = document.querySelectorAll('.panel');
  if (!panels.length) return;

  /* top-to-bottom, in markup order — `:scope >` keeps list items grouped
     under their own parent rather than jumping the order around */
  const STEP_SEL = '.panel__eyebrow, .panel__crumbs, .panel__title, .panel__lede,' +
                   '.panel__copy, .panel__label, .panel__list li, .panel__note,' +
                   '.panel__question, .panel__bullets li';

  const STEP = 110;    /* between one line and the next            */
  const FADE = 1200;   /* .reveal's own transition, from style.css */
  /* The graphic overlaps the tail of the copy: it starts while the last
     line is still settling, so the panel never goes quiet in between. */
  const LEAD = 900;    /* how far into the last line's fade it begins */
  const ZOOM_IN = 500; /* beat before Bettering's photo starts drifting in */

  /* Inside a panel the opening beat is far shorter than a standalone
     graphic's — the copy has already done the waiting. 線 and 面 have no
     separate lit state at all, so they play the moment they're cued. */
  const PANEL_HOLD = { dots: 1400, dotrow: 0, lines: 0 };

  /* The three motifs loop independently after their first pass. Each cycle
     holds on the completed artwork, fades the whole graphic out, resets its
     child transitions while invisible, then fades the new pass in. Keeping
     the reset behind container opacity avoids the reverse-animation flash
     that removing `is-on` on its own would cause. */
  const LOOP_FADE = 700;
  const LOOP_REST = 1300;
  const LOOP_RUN  = { dots: 3800, dotrow: 3500, lines: 3200 };

  function startMotionLoop(graphic) {
    if (!graphic || graphic.dataset.looping) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const kind = graphic.dataset.motion;
    if (!LOOP_RUN[kind]) return;
    graphic.dataset.looping = '1';
    const timers = new Set();
    let inRange = true;
    let paused = false;

    function later(fn, delay) {
      const id = window.setTimeout(function () {
        timers.delete(id);
        if (!paused) fn();
      }, delay);
      timers.add(id);
      return id;
    }

    function clearScheduled() {
      timers.forEach(window.clearTimeout);
      timers.clear();
    }

    function fadeOut() {
      graphic.classList.add('is-loop-fading');
      later(resetAndReplay, LOOP_FADE);
    }

    function scheduleNext(runDelay) {
      later(fadeOut, runDelay + LOOP_RUN[kind] + LOOP_REST);
    }

    function resetAndReplay() {
      /* Freeze the children for one layout frame while their start positions
         are restored. They remain hidden behind `is-loop-fading`. */
      graphic.classList.add('is-loop-reset');
      graphic.classList.remove('is-lit', 'is-on');
      void graphic.offsetWidth;
      graphic.classList.remove('is-loop-reset');

      graphic.classList.add('is-lit');
      if (kind === 'dots') {
        /* Let the scattered constellation finish fading in and drift for a
           beat before it gathers again. */
        const gatherAt = LOOP_FADE + PANEL_HOLD.dots;
        later(function () { graphic.classList.add('is-on'); }, gatherAt);
        scheduleNext(gatherAt);
      } else {
        /* 線 and 面 have no separate opening frame: their drawing motion is
           the thing that fades back in. */
        graphic.classList.add('is-on');
        scheduleNext(0);
      }

      /* Removing this last starts the shared 700ms fade-in. */
      graphic.classList.remove('is-loop-fading');
    }

    /* Freeze on the legible completed frame while the motif is offscreen or
       the page is hidden. Re-entry deliberately begins with a fade, so the
       reset can never flash or resume halfway through a transition. */
    function pause() {
      if (paused) return;
      paused = true;
      clearScheduled();
      graphic.classList.remove('is-loop-fading', 'is-loop-reset');
      graphic.classList.add('is-lit', 'is-on');
    }

    function resume() {
      if (!paused) return;
      paused = false;
      graphic.classList.add('is-loop-fading');
      later(resetAndReplay, LOOP_FADE);
    }

    function syncLifecycle() {
      if (document.hidden || !inRange) pause();
      else resume();
    }

    /* First pass keeps the existing panel timing exactly. */
    graphic.classList.add('is-lit');
    const firstAt = PANEL_HOLD[kind] || 0;
    if (firstAt) {
      later(function () { graphic.classList.add('is-on'); }, firstAt);
    } else {
      graphic.classList.add('is-on');
    }
    scheduleNext(firstAt);

    if ('IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target !== graphic) return;
          inRange = entry.isIntersecting;
          syncLifecycle();
        });
      }, { threshold: 0, rootMargin: '300px 0px 300px 0px' });
      visibilityObserver.observe(graphic);
    }
    document.addEventListener('visibilitychange', syncLifecycle);
    syncLifecycle();
  }

  /* --- the Bettering photo, as four frames ------------------------
     Each frame pushes in for SLIDE ms and is then cross-faded out under
     the next one (the fade itself is 1.4s, in the stylesheet). The zoom
     runs 9s against a 7s turn, so the picture is still travelling when it
     hands over — what you see is one continuous drift rather than four
     separate moves that each stop.

     Only ever one timer, and it is started by the same intersection cue
     that plays the rest of the panel, so nothing is running while the
     section is off screen. Reduced motion opts out entirely: the CSS
     already holds every frame still, and without the interval the first
     one simply stays. */
  const SLIDE = 5000;
  function startSlideshow(photo) {
    if (!photo.hasAttribute('data-slideshow')) return;
    if (photo.dataset.playing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frames = photo.querySelectorAll('.panel__photo-img');
    if (frames.length < 2) return;
    photo.dataset.playing = '1';
    /* `is-live` hands the first frame over to the same rules as the rest,
       and lighting it here — not in the markup — is what makes its push in
       start now, as the panel is reached, rather than back when the page
       was parsed. */
    photo.classList.add('is-live');
    let i = 0;
    let timer = 0;
    let inRange = true;
    frames[0].classList.add('is-on');

    function advance() {
      frames[i].classList.remove('is-on');
      i = (i + 1) % frames.length;
      frames[i].classList.add('is-on');
    }
    function startTimer() {
      if (timer || document.hidden || !inRange) return;
      timer = window.setInterval(advance, SLIDE);
    }
    function stopTimer() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    }
    function syncLifecycle() {
      if (document.hidden || !inRange) stopTimer();
      else startTimer();
    }

    if ('IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target !== photo) return;
          inRange = entry.isIntersecting;
          syncLifecycle();
        });
      }, { threshold: 0, rootMargin: '300px 0px 300px 0px' });
      visibilityObserver.observe(photo);
    }
    document.addEventListener('visibilitychange', syncLifecycle);
    startTimer();
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  panels.forEach(function (panel) {
    const steps   = Array.prototype.slice.call(panel.querySelectorAll(STEP_SEL));
    const graphic = panel.querySelector('[data-motion], .panel__photo');
    if (!steps.length) return;

    /* no motion — show everything as designed */
    if (reduce || !('IntersectionObserver' in window)) {
      if (graphic) {
        graphic.classList.add(graphic.dataset.motion === 'dots' ? 'is-lit' : 'is-on');
      }
      return;
    }

    steps.forEach(function (el) { el.classList.add('reveal'); });
    /* Bettering's photo is deliberately NOT a reveal target — it belongs to
       the orange card and arrives with it, rather than fading in on its own
       afterwards. All it does is drift slowly larger once it is there. */

    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        play();
      });
      /* Fires once the card's top has climbed past 60% of the viewport,
         i.e. the card is the thing you are actually looking at. A plain
         low threshold triggered the next card the moment it peeked over
         the fold, so cards 2 and 3 had already played by the time you
         got to them. */
    }, { threshold: 0, rootMargin: '0px 0px -40% 0px' });
    obs.observe(panel);

    function play() {
      steps.forEach(function (el, i) {
        window.setTimeout(function () { el.classList.add('is-in'); }, i * STEP);
      });

      if (!graphic) return;
      /* The last line starts at (n-1)·STEP and takes FADE to settle; the
         graphic comes in under the tail of that, LEAD ms before it's done. */
      const at = Math.max(0, (steps.length - 1) * STEP + FADE - LEAD);

      if (!graphic.dataset.motion) {
        /* Bettering's photo — already on screen with the orange; just start
           the slow push in, a beat after the card has settled */
        return void window.setTimeout(function () {
          graphic.classList.add('is-zoom');
          startSlideshow(graphic);
        }, ZOOM_IN);
      }
      window.setTimeout(function () {
        startMotionLoop(graphic);
      }, at);
    }
  });
})();


/* ----------------------------------------------------------------
   8.6 Draw-on-scroll — the pillar illustrations and the Challenge circle
   rings draw themselves in as they scroll into view, all with the same
   hand-drawn stroke effect:
     · hands (stroke art) + circle rings → stroke-dashoffset draw
     · flower (filled art) → fetched + inlined, each shape's outline traces
       on, then the colour fills in
   Reduced-motion / no-IO users get the final static state.
   ---------------------------------------------------------------- */
(function () {
  if (!('IntersectionObserver' in window)) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* inject an SVG ring into every challenge circle (replaces the CSS border) */
  const rings = [];
  document.querySelectorAll('.challenge__circle').forEach(function (c) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'challenge__circle-ring');
    svg.setAttribute('viewBox', '0 0 100 100');
    /* keep the aspect ratio so the ring stays a true circle (not an oval) */
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    const ring = document.createElementNS(SVGNS, 'circle');
    ring.setAttribute('cx', '50');
    ring.setAttribute('cy', '50');
    ring.setAttribute('r', '49.5');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#ff6900');
    /* plain scaling stroke draws reliably as a full circle (non-scaling-stroke
       broke the dash → partial arcs). Width is set per-circle below so it
       renders a constant ~1px at every circle size. */
    svg.appendChild(ring);
    c.insertBefore(svg, c.firstChild);
    c.classList.add('has-ring');
    rings.push(ring);
  });

  /* keep the ring line ~1px regardless of the circle's rendered size:
     stroke-width (in the 100-unit viewBox) = 100 / circle-width-in-px */
  function sizeRings() {
    rings.forEach(function (r) {
      const w = r.ownerSVGElement && r.ownerSVGElement.parentNode.offsetWidth;
      if (w) r.style.strokeWidth = (100 / w).toFixed(3);
    });
  }
  sizeRings();
  window.addEventListener('load', sizeRings);
  window.addEventListener('resize', sizeRings);

  if (reduce) return;   /* leave everything in its final drawn state */

  /* prime stroke paths: full-length dash, fully offset (hidden) */
  function prime(el) {
    try {
      const len = el.getTotalLength();
      el.style.strokeDasharray  = len;
      el.style.strokeDashoffset = len;
    } catch (e) {}
  }
  document.querySelectorAll('[data-draw="stroke"] path').forEach(prime);
  rings.forEach(prime);

  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.draw === 'stroke' || el.dataset.draw === 'sketch') {
        /* stagger the strokes so they draw one after another */
        const sketch = el.dataset.draw === 'sketch';
        const step = sketch ? 12 : 180;
        Array.prototype.slice.call(el.querySelectorAll('path')).forEach(function (p, i) {
          p.style.transitionDelay = sketch
            ? (i * step) + 'ms, ' + (i * step + 1300) + 'ms, ' + (i * step + 2100) + 'ms'  /* draw, fill, then drop the tracing stroke */
            : (i * step) + 'ms';
          p.style.strokeDashoffset = '0';
          if (sketch) { p.style.fillOpacity = '1'; p.style.strokeOpacity = '0'; }
        });
      } else if (el.classList.contains('challenge__circle')) {
        const ring = el.querySelector('.challenge__circle-ring circle');
        if (ring) ring.style.strokeDashoffset = '0';
      }
      obs.unobserve(el);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -18% 0px' });   /* start drawing later */

  document.querySelectorAll('[data-draw="stroke"], .challenge__circle')
    .forEach(function (el) { obs.observe(el); });

  /* Flower: it's filled line-art, so fetch + inline it, trace each shape's
     outline (stroke = its own fill colour), then fade the fill in. */
  const flowerImg = document.querySelector('[data-draw="flower"]');
  if (flowerImg) {
    fetch(flowerImg.getAttribute('src'))
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        const tmp = document.createElement('div');
        tmp.innerHTML = txt.trim();
        const svg = tmp.querySelector('svg');
        if (!svg) return;
        svg.setAttribute('data-draw', 'sketch');
        svg.setAttribute('aria-hidden', 'true');
        flowerImg.replaceWith(svg);
        Array.prototype.slice.call(svg.querySelectorAll('path')).forEach(function (p) {
          p.style.stroke = p.getAttribute('fill') || 'currentColor';
          p.style.fillOpacity = '0';
          prime(p);
        });
        obs.observe(svg);
      })
      .catch(function () { /* fetch blocked (e.g. file://) → static image stays */ });
  }
})();


/* ----------------------------------------------------------------
   8.5 Layout grid overlay — press "G" to toggle the live design grid.
   CSS decides whether the page is using 12, 6 or 4 columns; twelve nodes
   are built once and the unused columns are hidden at each breakpoint.
   Ignored while typing in a field.
   ---------------------------------------------------------------- */
(function () {
  let grid = null;
  function build() {
    grid = document.createElement('div');
    grid.id = 'layout-grid';
    grid.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div');
    inner.className = 'layout-grid__inner';
    for (let i = 0; i < 12; i++) {
      const col = document.createElement('div');
      col.className = 'layout-grid__col';
      inner.appendChild(col);
    }
    grid.appendChild(inner);
    document.body.appendChild(grid);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
    if (!grid) build();
    grid.classList.toggle('layout-grid--on');
  });
})();


/* ----------------------------------------------------------------
   8.8 Approach bubbles/dots — subtle cursor parallax on top of the CSS
   idle float. Each element drifts toward the cursor by its own amount and
   direction (set from a stable per-index pseudo-random), so the motion
   reads as natural rather than uniform. Desktop pointers only.
   ---------------------------------------------------------------- */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nodes = document.querySelectorAll('.approach__bubbles .pillar-bubble, .approach__bubbles .approach-dot');
  if (!nodes.length) return;

  const items = [];
  nodes.forEach(function (el, i) {
    /* stable 0..1 pseudo-random per element */
    const s = Math.sin((i + 1) * 53.17) * 1000;
    const r = s - Math.floor(s);
    const isDot = el.classList.contains('approach-dot');
    const base  = isDot ? 13 : 8;            /* dots drift a touch more */
    items.push({
      el: el,
      fx: (base + r * 11) * (r > 0.5 ? 1 : -1),       /* magnitude + direction */
      fy: (base + (1 - r) * 9) * (i % 2 ? -1 : 1),
      cx: 0, cy: 0
    });
  });

  let tx = 0, ty = 0;   /* cursor, normalised −1..1 from viewport centre */
  window.addEventListener('mousemove', function (e) {
    tx = (e.clientX / window.innerWidth  - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  (function loop() {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.cx += (tx * it.fx - it.cx) * 0.05;   /* eased follow */
      it.cy += (ty * it.fy - it.cy) * 0.05;
      it.el.style.transform = 'translate3d(' + it.cx.toFixed(2) + 'px,' + it.cy.toFixed(2) + 'px,0)';
    }
    window.requestAnimationFrame(loop);
  })();
})();


/* ----------------------------------------------------------------
   9. Broken image fallback — show a tinted placeholder
   ---------------------------------------------------------------- */
(function () {
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () {
      img.style.opacity = '0';
      var parent = img.parentElement;
      if (parent && !parent.dataset.ph) {
        parent.dataset.ph = '1';
        parent.style.background = 'rgba(0,0,0,.06)';
      }
    });
  });
})();


/* ----------------------------------------------------------------
   10. Dropdowns — generic toggle for [data-dropdown] (listing filters
   + breadcrumb). Click toggles; clicking another closes the rest;
   click-outside / Escape closes all. (No-op on pages without any.)
   ---------------------------------------------------------------- */
(function () {
  const drops = Array.prototype.slice.call(document.querySelectorAll('[data-dropdown]'));
  if (!drops.length) return;

  function closeAll(except) {
    drops.forEach(function (d) {
      if (d === except) return;
      d.classList.remove('is-open');
      const t = d.querySelector('button[aria-expanded]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  drops.forEach(function (d) {
    const toggle = d.querySelector('button');
    if (!toggle) return;
    /* the toggle's editable label (filters wrap it in a <span>; the breadcrumb
       has a bare text node before the chevron) */
    const labelSpan = toggle.querySelector('span');
    if (labelSpan && !d.dataset.dropdownLabel) d.dataset.dropdownLabel = labelSpan.textContent.trim();
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = d.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      closeAll(open ? d : null);
    });
    /* picking an option writes it back onto the toggle, then closes */
    d.querySelectorAll('[role="menuitem"]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const text = item.textContent.trim();
        if (labelSpan) labelSpan.textContent = text;
        else if (toggle.firstChild) toggle.firstChild.nodeValue = text + ' ';
        d.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        d.dispatchEvent(new CustomEvent('dropdownchange', {
          bubbles: true,
          detail: { item: item, value: text }
        }));
      });
    });
  });

  document.addEventListener('click', function () { closeAll(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
})();


/* ----------------------------------------------------------------
   10b. Story grids — real filters, clear state and four-card pagination.

   Category and tag data are read from the card DOM. No year is inferred:
   when cards carry no data-year, that control is visibly disabled instead of
   returning a made-up result. The same pager also covers Institute pages that
   have a story grid but no filter bar.
   ---------------------------------------------------------------- */
(function () {
  const grids = Array.prototype.slice.call(document.querySelectorAll('.listing__grid'));
  if (!grids.length) return;
  const isTC = document.documentElement.lang === 'zh-Hant';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAGE_SIZE = 4;

  function value(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[’']/g, '')
      .replace(/[-–—]/g, ' ')
      .replace(/\binstitute\b/g, ' ')
      .replace(/[^a-z0-9\u3400-\u9fff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scrollToGrid(grid) {
    const top = Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 110);
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  }

  grids.forEach(function (grid) {
    const scope = grid.parentElement;
    const pager = scope && scope.querySelector('.listing__pager:not(.search__pager)');
    const cards = Array.prototype.slice.call(grid.querySelectorAll('.story-card'));
    if (!pager || !cards.length) return;

    const prev = pager.querySelector('.pager__arrow--prev');
    const next = pager.querySelector('.pager__arrow--next');
    const num = pager.querySelector('.pager__num');
    const total = pager.querySelector('.pager__total');
    const filters = scope.querySelector('.listing__filters');
    const clear = filters && filters.querySelector('.listing__clear');
    const drops = filters
      ? Array.prototype.slice.call(filters.querySelectorAll('[data-dropdown]'))
      : [];
    const kinds = ['focus', 'pillar', 'institute', 'year'];
    const selected = {};
    let page = 1;

    const empty = document.createElement('p');
    empty.className = 'listing__empty';
    empty.hidden = true;
    empty.textContent = isTC
      ? '暫時沒有符合所選條件的內容，請調整篩選或清除全部。'
      : 'No stories match those filters. Adjust a selection or clear all.';
    grid.insertAdjacentElement('afterend', empty);

    const live = document.createElement('span');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    pager.insertAdjacentElement('afterend', live);

    function category(card) {
      const el = card.querySelector('.story-card__category');
      return value((el && el.textContent) + ' ' + (el && el.dataset.cat));
    }

    function tags(card) {
      return Array.prototype.map.call(card.querySelectorAll('.story-card__tag'), function (tag) {
        return value(tag.textContent);
      });
    }

    function matches(card) {
      const cat = category(card);
      const cardTags = tags(card);
      if (selected.focus && cat.indexOf(value(selected.focus)) === -1) return false;
      if (selected.institute && cat.indexOf(value(selected.institute)) === -1) return false;
      if (selected.pillar && cardTags.indexOf(value(selected.pillar)) === -1) return false;
      if (selected.year && value(card.dataset.year) !== value(selected.year)) return false;
      return true;
    }

    function render() {
      const filtered = cards.filter(matches);
      const pages = Math.ceil(filtered.length / PAGE_SIZE);
      page = pages ? Math.min(page, pages) : 1;
      const first = (page - 1) * PAGE_SIZE;
      const pageCards = filtered.slice(first, first + PAGE_SIZE);

      cards.forEach(function (card) {
        const on = pageCards.indexOf(card) !== -1;
        card.hidden = !on;
        if (on) card.classList.add('is-in');
      });

      empty.hidden = filtered.length !== 0;
      pager.hidden = pages <= 1;
      if (num) num.textContent = String(page);
      if (total) total.textContent = isTC ? '／ 共 ' + Math.max(pages, 1) + ' 頁' : 'of ' + Math.max(pages, 1);
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= pages;
      if (clear) clear.disabled = Object.keys(selected).length === 0;

      live.textContent = isTC
        ? '共 ' + filtered.length + ' 項結果，第 ' + page + ' 頁，共 ' + Math.max(pages, 1) + ' 頁'
        : filtered.length + (filtered.length === 1 ? ' result, page ' : ' results, page ') +
          page + ' of ' + Math.max(pages, 1);
    }

    drops.forEach(function (drop, index) {
      const kind = kinds[index] || 'filter-' + index;
      const toggle = drop.querySelector('.listing__filter-toggle');
      const label = toggle && toggle.querySelector('span');
      const original = drop.dataset.dropdownLabel || (label && label.textContent.trim()) || '';
      drop.dataset.filterKind = kind;

      if (kind === 'year' && !cards.some(function (card) { return !!card.dataset.year; })) {
        drop.classList.add('is-disabled');
        drop.setAttribute('aria-disabled', 'true');
        drop.setAttribute('title', isTC ? '尚未提供年份資料' : 'Year data is not available yet');
        if (toggle) toggle.disabled = true;
        drop.querySelectorAll('[role="menuitem"]').forEach(function (item) {
          item.setAttribute('aria-disabled', 'true');
          item.tabIndex = -1;
        });
        return;
      }

      drop.addEventListener('dropdownchange', function (e) {
        const choice = e.detail.value;
        const same = selected[kind] === choice;
        drop.querySelectorAll('[role="menuitem"]').forEach(function (item) {
          const on = !same && item === e.detail.item;
          item.setAttribute('aria-current', String(on));
        });
        if (same) {
          delete selected[kind];
          if (label) label.textContent = original;
        } else {
          selected[kind] = choice;
        }
        page = 1;
        render();
      });
    });

    if (clear) {
      clear.addEventListener('click', function () {
        Object.keys(selected).forEach(function (kind) { delete selected[kind]; });
        drops.forEach(function (drop) {
          const toggle = drop.querySelector('.listing__filter-toggle');
          const label = toggle && toggle.querySelector('span');
          if (label && drop.dataset.dropdownLabel) label.textContent = drop.dataset.dropdownLabel;
          drop.querySelectorAll('[role="menuitem"]').forEach(function (item) {
            item.setAttribute('aria-current', 'false');
          });
        });
        page = 1;
        render();
      });
    }

    if (prev) prev.addEventListener('click', function () {
      if (page <= 1) return;
      page--;
      render();
      scrollToGrid(grid);
    });
    if (next) next.addEventListener('click', function () {
      page++;
      render();
      scrollToGrid(grid);
    });

    render();
  });
})();


/* ----------------------------------------------------------------
   11. Share — OS-native share sheet via the Web Share API, with a
   clipboard fallback for browsers without navigator.share (most
   desktops). (No-op on pages without a [data-send-title] button.)
   ---------------------------------------------------------------- */
(function () {
  const buttons = Array.prototype.slice.call(document.querySelectorAll('.article__send'));
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const data = {
        title: btn.dataset.sendTitle || document.title,
        text:  btn.dataset.sendText  || '',
        url:   window.location.href
      };
      try {
        if (navigator.share) {
          await navigator.share(data);          /* iOS / Android / Safari / Edge: OS sheet */
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(data.url);   /* desktop fallback */
          btn.classList.add('article__send--copied');
          setTimeout(function () { btn.classList.remove('article__send--copied'); }, 1600);
        }
      } catch (err) {
        /* user dismissed the share sheet — ignore */
      }
    });
  });
})();


/* ----------------------------------------------------------------
   12. Listing story cards — clicking a card opens the article
   (tags are inert). No carousel here, so e.target is reliable.
   No-op on pages without any story cards.
   ---------------------------------------------------------------- */
(function () {
  const cards = Array.prototype.slice.call(document.querySelectorAll('.story-card'));
  if (!cards.length) return;
  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.story-card__tag')) return;   /* tags inert */
      window.location.href = document.documentElement.lang === 'zh-Hant' ? 'Articles_tc.html' : 'Articles.html';
    });
  });
})();


/* ----------------------------------------------------------------
   13. Desktop mega-menu — pointer hover and keyboard focus both open
   Work / Impact / About. Arrow Down enters the active panel, Escape
   closes it and restores focus to the control that opened it.
   ---------------------------------------------------------------- */
(function () {
  const nav  = document.getElementById('nav');
  const mega = document.getElementById('nav-mega');
  if (!nav || !mega) return;
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Two sets of section links drive the same panels: the bar's own stacked
     menu, and the copy inside the card that only shows once the bar has
     collapsed to the pill (R2 12058-8 / 12058-319). */
  const links   = Array.prototype.slice.call(
    nav.querySelectorAll('.nav__menu .nav__link, .nav__mega-menu .nav__link'));
  const panels  = Array.prototype.slice.call(mega.querySelectorAll('.nav__mega-panel'));
  let closeTimer = null;
  let lastTrigger = null;

  mega.inert = true;
  panels.forEach(function (panel) {
    const key = panel.dataset.megaPanel;
    if (!panel.id && key) panel.id = 'nav-mega-panel-' + key;
  });
  links.forEach(function (link) {
    const key = link.dataset.mega;
    const panel = key && mega.querySelector('[data-mega-panel="' + key + '"]');
    if (!panel) return;
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');
    link.setAttribute('aria-controls', panel.id);
  });

  /* Home V3 corner panel (R2 "02_Menu"): once the bar has collapsed to the
     white pill there is nothing left to hover, so the pill's hamburger
     becomes the opener — and §2 has to keep its hands off it. Only where
     the panel is actually laid out (style.css hides it under 1024px). */
  const v3     = nav.classList.contains('nav--v3');
  const burger = nav.querySelector('.nav__hamburger');
  function burgerOpens() {
    return v3 && !!burger && window.matchMedia('(min-width: 1024px)').matches;
  }
  function syncBurgerSemantics() {
    if (!burger) return;
    burger.setAttribute('aria-controls', burgerOpens() ? 'nav-mega' : 'mobile-menu');
    if (burgerOpens()) burger.setAttribute('aria-haspopup', 'true');
    else burger.removeAttribute('aria-haspopup');
  }
  syncBurgerSemantics();
  window.__megaOwnsBurger = burgerOpens;

  /* ---- draw-in illustrations -------------------------------------------
     Inline each panel's SVG so its strokes can be animated, then redraw it
     every time the panel opens (same hand-drawn effect as the pillars):
       · stroke art  → just draw the stroke (dashoffset len → 0)
       · filled art  → trace each shape's outline, then fade the fill in    */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drawables = {};   /* panel-key → svg (once inlined) */

  /* Assets are authored in separate SVG files and several reuse ids such as
     "Vector". Once inlined they share one document, so namespace every id and
     its local references before insertion. */
  function namespaceIds(svg, prefix) {
    const ids = {};
    Array.prototype.slice.call(svg.querySelectorAll('[id]')).forEach(function (el, i) {
      const old = el.id;
      const next = prefix + '-' + old + (ids[old] ? '-' + i : '');
      if (!ids[old]) ids[old] = next;
      el.id = next;
    });
    const attrs = [
      'href', 'xlink:href', 'fill', 'stroke', 'filter', 'clip-path', 'mask',
      'marker-start', 'marker-mid', 'marker-end', 'aria-labelledby', 'aria-describedby'
    ];
    Array.prototype.slice.call(svg.querySelectorAll('*')).concat([svg]).forEach(function (el) {
      attrs.forEach(function (name) {
        const raw = el.getAttribute(name);
        if (!raw) return;
        let next = raw.replace(/url\(\s*#([^)\s]+)\s*\)/g, function (all, id) {
          return ids[id] ? 'url(#' + ids[id] + ')' : all;
        });
        if (next.charAt(0) === '#' && ids[next.slice(1)]) next = '#' + ids[next.slice(1)];
        if (next !== raw) el.setAttribute(name, next);
      });
    });
    Array.prototype.slice.call(svg.querySelectorAll('style')).forEach(function (style) {
      let css = style.textContent;
      Object.keys(ids).forEach(function (old) {
        const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        css = css.replace(new RegExp('#' + escaped + '(?![\\w-])', 'g'), '#' + ids[old]);
      });
      style.textContent = css;
    });
  }

  function prime(p) {
    try { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; }
    catch (e) {}
  }
  /* getTotalLength() needs the node visible (returns 0 in a display:none
     subtree), so the dash priming is done lazily the first time a panel opens */
  function primeSvg(svg) {
    Array.prototype.slice.call(svg.querySelectorAll('path')).forEach(prime);
    svg.dataset.primed = '1';
  }
  function arm(svg) {                                  /* reset to the undrawn state */
    const filled = svg.dataset.kind === 'filled';
    Array.prototype.slice.call(svg.querySelectorAll('path')).forEach(function (p) {
      p.style.transition = 'none';
      p.style.strokeDashoffset = p.style.strokeDasharray;
      if (filled) { p.style.fillOpacity = '0'; p.style.strokeOpacity = '1'; }
    });
    void svg.getBoundingClientRect();                  /* flush, so the reset isn't animated */
    Array.prototype.slice.call(svg.querySelectorAll('path')).forEach(function (p) {
      p.style.transition = ''; p.style.transitionDelay = '';
    });
  }
  function draw(svg) {
    if (!svg) return;
    const filled = svg.dataset.kind === 'filled';
    const paths = Array.prototype.slice.call(svg.querySelectorAll('path'));
    const step = +svg.dataset.step || 150;
    paths.forEach(function (p, i) {
      const d = i * step;
      /* filled: trace the outline, ink the fill in while the line is still
         down (+1.3s), then drop the tracing stroke (+2.1s) — an overlapping
         handoff (no dead pause), same as the pillar "flower" / Issues art */
      p.style.transitionDelay = filled ? (d + 'ms, ' + (d + 1300) + 'ms, ' + (d + 2100) + 'ms') : (d + 'ms');
      p.style.strokeDashoffset = '0';
      if (filled) { p.style.fillOpacity = '1'; p.style.strokeOpacity = '0'; }
    });
  }
  /* called when a panel opens (now visible): prime the dashes the first time,
     re-arm on later opens, then kick off the draw on the next frame */
  function startDraw(svg) {
    requestAnimationFrame(function () {
      if (!svg.dataset.primed) primeSvg(svg);   /* measure + dash now that it's visible */
      arm(svg);                                  /* reset to undrawn instantly (no transition) */
      requestAnimationFrame(function () { draw(svg); });
    });
  }

  panels.forEach(function (panel) {
    const img = panel.querySelector('img.nav__mega-art');
    if (!img) return;
    fetch(img.getAttribute('src'))
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        const tmp = document.createElement('div');
        tmp.innerHTML = txt.trim();
        const svg = tmp.querySelector('svg');
        if (!svg) return;
        namespaceIds(svg, 'mega-' + panel.dataset.megaPanel);
        svg.setAttribute('class', 'nav__mega-art');
        svg.setAttribute('aria-hidden', 'true');

        /* attach to the live DOM FIRST — getTotalLength()/getComputedStyle()
           return 0/empty on a detached node, which would leave the art
           undrawn-but-visible */
        img.replaceWith(svg);
        drawables[panel.dataset.megaPanel] = svg;
        if (reduce) return;                            /* leave it fully drawn */

        /* Every panel draws like the pillar "flower" / Issues-focused art:
           each shape traces its own outline (stroke = its own fill colour),
           then the fill inks in while the trace is still down. Fill can come
           from a <style> class (Work uses .st0), so read the computed value. */
        const paths = Array.prototype.slice.call(svg.querySelectorAll('path'));
        function fillOf(p) {
          const f = getComputedStyle(p).fill;
          return (f && f !== 'none' && f !== 'rgba(0, 0, 0, 0)') ? f : '';
        }
        const filled = paths.some(fillOf);
        svg.dataset.kind = filled ? 'filled' : 'stroke';
        /* spread the stagger over a ~0.7s window so busy art (Work, 50+ shapes)
           still draws quickly; few clean paths (Impact/About) keep the 150ms beat */
        svg.dataset.step = paths.length > 12
          ? String(Math.max(8, Math.round(700 / paths.length)))
          : '150';

        if (filled) {                                  /* trace: stroke = fill colour, hide fill */
          paths.forEach(function (p) {
            const f = fillOf(p);
            if (f) { p.style.stroke = f; p.style.fillOpacity = '0'; }
            if (!p.getAttribute('stroke-width')) p.style.strokeWidth = '1';   /* fine trace line (Work) */
          });
        } else {                                       /* stroke art (Impact): thin the line */
          paths.forEach(function (p) {
            if (!p.getAttribute('stroke-width')) p.style.strokeWidth = '0.7';
          });
        }
        /* priming + first draw happen lazily on open (see startDraw) */
        if (panel.classList.contains('is-active')) startDraw(svg);
      })
      .catch(function () { /* file:// or fetch blocked → static image stays */ });
  });

  function open(key, trigger) {
    clearTimeout(closeTimer);
    if (trigger) lastTrigger = trigger;
    const wasActive = nav.classList.contains('nav--mega-open') &&
                      mega.querySelector('.nav__mega-panel.is-active[data-mega-panel="' + key + '"]');
    mega.inert = false;
    nav.classList.add('nav--mega-open');
    mega.setAttribute('aria-hidden', 'false');
    /* no section → the card is just the four links, and CSS shrinks it */
    nav.classList.toggle('nav--mega-bare', !key);
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.megaPanel === key); });
    links.forEach(function (l) {
      const active = l.dataset.mega === key;
      l.classList.toggle('nav__link--mega-active', active);
      if (l.hasAttribute('aria-expanded')) l.setAttribute('aria-expanded', String(active));
    });
    if (key && !wasActive && !reduce && drawables[key]) startDraw(drawables[key]);
  }
  function close(restoreFocus) {
    clearTimeout(closeTimer);
    if (restoreFocus && lastTrigger && lastTrigger.isConnected) {
      const target = mega.contains(lastTrigger) && burger ? burger : lastTrigger;
      target.focus({ preventScroll: true });
    }
    nav.classList.remove('nav--mega-open', 'nav--mega-bare');
    mega.setAttribute('aria-hidden', 'true');
    mega.inert = true;
    panels.forEach(function (p) { p.classList.remove('is-active'); });
    links.forEach(function (l) {
      l.classList.remove('nav__link--mega-active');
      if (l.hasAttribute('aria-expanded')) l.setAttribute('aria-expanded', 'false');
    });
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  function isOpen() { return nav.classList.contains('nav--mega-open'); }
  /* Stuck, the card is also carrying the four section links, so a sectionless
     hover (Connect) must leave it standing — it just collapses to the small
     menu-only card. Unstuck there is nothing to keep open, so it closes. */
  function leaveSection() {
    if (nav.classList.contains('nav--scrolled') && isOpen()) open('');
    else close(false);
  }

  function firstPanelLink(key) {
    const panel = mega.querySelector('[data-mega-panel="' + key + '"]');
    if (!panel) return null;
    return Array.prototype.find.call(panel.querySelectorAll('a[href]'), function (el) {
      return !el.hidden && !el.closest('[hidden]') && el.getClientRects().length;
    }) || null;
  }

  /* A section link opens its panel. Pointer hover remains unchanged; focus
     adds an equivalent keyboard route and Arrow Down enters the submenu. */
  links.forEach(function (l) {
    if (hoverCapable) l.addEventListener('mouseenter', function () {
      if (l.dataset.mega) open(l.dataset.mega, l); else leaveSection();
    });
    l.addEventListener('focus', function () {
      if (l.dataset.mega) open(l.dataset.mega, l); else leaveSection();
    });
    l.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' || !l.dataset.mega) return;
      e.preventDefault();
      open(l.dataset.mega, l);
      requestAnimationFrame(function () {
        const first = firstPanelLink(l.dataset.mega);
        if (first) first.focus({ preventScroll: true });
      });
    });
  });
  /* hovering the logo or the right-side actions closes it too — except in
     the sticky state, where the actions hold the hamburger that opened it */
  nav.querySelectorAll('.nav__logo, .nav__actions').forEach(function (el) {
    if (!hoverCapable) return;
    el.addEventListener('mouseenter', function () {
      if (nav.classList.contains('nav--scrolled')) return;
      close(false);
    });
  });

  /* sticky: the pill's hamburger toggles the card, opening on Work with its
     sub-menu already showing rather than the bare four-link state — there is
     something to read the moment it appears. */
  if (burger) {
    burger.addEventListener('click', function () {
      if (!burgerOpens()) return;              /* narrow viewport → §2's overlay */
      if (isOpen()) { close(false); return; }
      open('work', burger);
      burger.setAttribute('aria-expanded', 'true');
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      close(true);
    }
  });

  nav.addEventListener('focusout', function (e) {
    if (!nav.contains(e.relatedTarget)) close(false);
  });

  window.addEventListener('resize', function () {
    syncBurgerSemantics();
    if (!window.matchMedia('(min-width: 1024px)').matches && isOpen()) close(false);
  });

  /* Leaving the whole nav (bar + open card) closes, after a grace period so
     that crossing a gap on the way to the card doesn't drop it. The stuck
     layout has a real one — the card hangs 17px below the pill — and that is
     bridged in CSS by stretching `.nav__inner` down to meet it; this window
     just covers a fast diagonal across the corner. */
  if (hoverCapable) {
    nav.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    nav.addEventListener('mouseleave', function () {
      clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () {
        if (!nav.contains(document.activeElement)) close(false);
      }, 220);
    });
  }
})();


/* ----------------------------------------------------------------
   12. Retyping word — the News heading's last word deletes itself and
   types the next one, cycling through the four B's and back to
   "working". The word list lives in the markup (`data-words`, pipe
   separated) so copy changes never need a script edit.

   The heading is left-aligned, so the line simply grows and shrinks
   with the word — nothing else on the page moves. Reduced-motion and
   no-JS visitors keep the static first word that's in the HTML.
   ---------------------------------------------------------------- */
(function () {
  const host = document.querySelector('[data-typer]');
  if (!host) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const words = (host.dataset.words || host.textContent)
    .split('|')
    .map(function (w) { return w.trim(); })
    .filter(Boolean);
  if (words.length < 2) return;

  /* the caret is a sibling of the text so it never gets rewritten */
  const text  = document.createElement('span');
  const caret = document.createElement('span');
  text.className  = 'typer__text';
  caret.className = 'typer__caret';
  caret.setAttribute('aria-hidden', 'true');
  text.textContent = words[0];
  host.textContent = '';
  host.append(text, caret);

  const TYPE = 78;      /* per character, adding    */
  const WIPE = 38;      /* per character, deleting  */
  const HOLD = 1900;    /* how long a finished word sits */
  const GAP  = 340;     /* empty beat between words */

  let i = 0;            /* which word  */
  let n = words[0].length;   /* how many characters are showing */
  let deleting = false;

  function tick() {
    const word = words[i];

    if (!deleting && n === word.length) {
      deleting = true;
      return window.setTimeout(tick, HOLD);
    }
    if (deleting && n === 0) {
      deleting = false;
      i = (i + 1) % words.length;
      return window.setTimeout(tick, GAP);
    }

    n += deleting ? -1 : 1;
    text.textContent = word.slice(0, n);
    window.setTimeout(tick, deleting ? WIPE : TYPE);
  }

  /* wait until the heading is actually on screen before it starts */
  if (!('IntersectionObserver' in window)) return window.setTimeout(tick, HOLD);
  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      window.setTimeout(tick, 900);
    });
  }, { threshold: 0.6 });
  obs.observe(host.closest('.news-v3__heading') || host);
})();


/* ----------------------------------------------------------------
   13a. Headline line splitter — the banner is set as two markup lines,
   but the second one wraps, so at the design width it reads as three.
   Measure where the text *actually* falls and give each rendered line
   its own overflow box, so §13 can bring them in one after another
   instead of fading the whole block at once.

   Words keep their own colour by carrying `.hero-v3__accent` through
   the rebuild, so the orange can start mid-line as it does in the
   design. Re-runs on resize, because the wrap point moves.
   ---------------------------------------------------------------- */
(function () {
  const title = document.querySelector('.hero-v3__title');
  if (!title) return;

  const source = title.cloneNode(true);   /* pristine copy to re-split from */
  const LINE_STAGGER = 130;               /* ms between one line and the next */

  /* Chinese has no spaces, so the whitespace split below hands back one
     enormous "word" per line and the browser then breaks it between any
     two glyphs — the banner came out reading 與夥伴同 / 行，. Split a CJK
     run after each clause mark instead, so the unit is the clause; §10
     keeps each unit whole with `white-space: nowrap`, which leaves the
     comma as the only place a line may turn.
     Written as a loop rather than a lookbehind regex: the punctuation has
     to stay with the clause it closes, and lookbehind is still the newest
     thing in this file's browser floor. */
  const CLAUSE_END = '，。、；：！？';
  function cjkUnits(text) {
    if (!/[一-鿿]/.test(text)) return [text];
    const out = [];
    let cur = '';
    for (let i = 0; i < text.length; i++) {
      cur += text[i];
      if (CLAUSE_END.indexOf(text[i]) !== -1) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out;
  }

  /* every word in its own span, accent words flagged, so they can be
     regrouped by rendered line without losing their colour */
  function toWords() {
    title.innerHTML = '';
    Array.prototype.forEach.call(source.childNodes, function (node) {
      const accent = node.nodeType === 1 &&
                     node.classList && node.classList.contains('hero-v3__accent');
      const holder = node.nodeType === 1 ? node : null;
      const walk = function (n, isAccent) {
        if (n.nodeType === 3) {
          /* split on *breaking* whitespace only: a non-breaking space in
             the markup is there to tie two words together (the lone "a"
             in "Building a compassionate", which must not be left hanging
             at the end of a phone line), so it has to stay inside the
             word span or this rebuild would quietly undo it. */
          n.textContent.split(/([^\S\u00a0]+)/).forEach(function (bit) {
            if (!bit) return;
            if (/^[^\S\u00a0]+$/.test(bit)) return void title.appendChild(document.createTextNode(' '));
            cjkUnits(bit).forEach(function (unit) {
              const w = document.createElement('span');
              w.className = 'hw' + (isAccent ? ' hero-v3__accent' : '');
              w.textContent = unit;
              title.appendChild(w);
            });
          });
          return;
        }
        if (n.nodeType !== 1) return;
        if (n.tagName === 'BR') return void title.appendChild(document.createElement('br'));
        const nowAccent = isAccent || (n.classList && n.classList.contains('hero-v3__accent'));
        /* .hero-v3__line is a block in the source — keep the break */
        const isBlock = n.classList && n.classList.contains('hero-v3__line');
        if (isBlock && title.childNodes.length) title.appendChild(document.createElement('br'));
        Array.prototype.forEach.call(n.childNodes, function (c) { walk(c, nowAccent); });
      };
      walk(node, accent && !!holder);
    });
  }

  /* group the words by their rendered top, then wrap each group in a
     masking box */
  function toLines() {
    const words = Array.prototype.slice.call(title.querySelectorAll('.hw'));
    if (!words.length) return;
    /* Which words the source actually had a space between. `toWords` keeps
       those spaces as text nodes, and the regroup below used to throw them
       away and put one back between every pair — right for English, where
       the words are space-delimited anyway, but wrong for Chinese, which
       has none: it opened a gap on each side of the accent (將 慈悲 化作…)
       and pushed the line over its measure. */
    words.forEach(function (w) {
      const prev = w.previousSibling;
      w.__spaced = !!(prev && prev.nodeType === 3 && /\s/.test(prev.textContent));
    });
    const lines = [];
    let top = null;
    words.forEach(function (w) {
      const t = Math.round(w.offsetTop);
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w);
    });

    const frag = document.createDocumentFragment();
    lines.forEach(function (group, i) {
      const box = document.createElement('span');
      const inner = document.createElement('span');
      box.className = 'hero-v3__ln';
      inner.className = 'hero-v3__ln-i';
      inner.style.setProperty('--ln-delay', (i * LINE_STAGGER) + 'ms');
      group.forEach(function (w, j) {
        if (j && w.__spaced) inner.appendChild(document.createTextNode(' '));
        inner.appendChild(w);
      });
      box.appendChild(inner);
      frag.appendChild(box);
    });
    title.innerHTML = '';
    title.appendChild(frag);
    title.classList.add('is-split');
  }

  function split() { toWords(); toLines(); }

  /* wait for the webfont, or the measured wrap is the fallback font's */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(split);
  else split();

  let t;
  window.addEventListener('resize', function () {
    window.clearTimeout(t);
    t = window.setTimeout(split, 180);
  });
})();


/* ----------------------------------------------------------------
   13. Landing intro (Home V3) — from Figma R2 OPT1_01_Home_00_01 /
   _00_04 / _00_05:

     1. 點 · 線 · 面 — the same three-stage graphic the Being /
        Becoming / Belonging panels play on scroll (§8.7), run once
        through at the centre of the frame: scattered dots gather into
        one, the one writes itself out into a line, the line multiplies
        into a plane, the plane fades
     2. the founder's motto lifts in behind it — line, line, the seal,
        then the attribution. It is not typed: the graphic has already
        carried the opening, and a typewriter after it read as two
        openings stacked on each other
     3. the whole plate holds, then the words fade off it — the seal is
        part of the motto now (R2 12014:361), so it is already standing
        in the right place and simply stays as the quote leaves
     4. it rises into the header — still just the seal, so nothing
        changes shape on the way up
     5. once home the seal slides left as the wordmark is uncovered,
        and the menu, banner copy and colour bar arrive with it

   The one thing this does NOT do is fly a *copy* of the lockup and
   swap it for the real one at the end: two rasters of the same artwork
   never line up perfectly, and the swap always reads as a flash. The
   real `.nav__logo` is lifted above the peach panel and does the whole
   performance itself, so at the end there is nothing to hand over —
   the CSS overrides just resolve to its natural state.

   Click, tap or any key skips straight to the end.
   ---------------------------------------------------------------- */
(function () {
  const body = document.body;
  if (!body.classList.contains('home-v3')) return;
  const hero = document.getElementById('hero');
  if (!hero) return;

  /* A reload restores the previous scroll position *before* any of this
     runs, so the first paint can show the middle of the page for a frame
     before the intro pins it back to the top. Opt out. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const bar     = document.querySelector('.colourbar--hero');
  const navLogo = document.querySelector('.nav__logo');

  /* --- the beats, in ms. Everything is here so the whole sequence can
         be re-timed without touching the logic below. ---------------- */
  /* Each value is how long its own beat lasts, so a beat has to be at
     least as long as the CSS transition it starts — the numbers in the
     comments are what the stylesheet actually spends. */
  const T = {
    /* 點 · 線 · 面 */
    pre:    180,   /* dead air before the first dot                    */
    drift: 1200,   /* the scattered dots fade in and wander            */
    gather:1150,   /* they collapse onto the centre     (1.05s + .45s) —
                      cut short on purpose: the row starts writing while
                      the last few stragglers are still coming in, so the
                      single dot is never left sitting there waiting      */
    line:  2200,   /* the survivor writes out into a row (1.05s + 1.06s)*/
    fuse:   820,   /* the row tightens into one rule            (0.95s) —
                      also cut short, so the plane starts opening before
                      the rule has quite finished reaching the ends      */
    plane: 2000,   /* that rule multiplies up and down  (1.35s + 0.70s) */
    planeH: 500,   /* the finished plane holds                         */
    /* 面 → 印. The squeeze leads and the fill follows it in, rather than
       the other way round: filling at full size meant a whole screen of
       ruled plane turning into a whole screen of flat orange, which is a
       lot of ink to appear at once and read as a different object. Coming
       in on the compression instead, the rules are already being pushed
       together when they thicken, so the solid is something the squeeze
       *does* to the plane. */
    fillIn: 170,   /* i: how far into the press the fill starts — early,
                      because both axes now move from the first frame and
                      the ink has to be closed before the vertical squeeze
                      has gone anywhere (0.45s)                          */
    press: 1150,   /* ii: the block shrinks onto the seal's slot — both
                      axes across the whole beat (1.05s), travelling for
                      1.15s                                              */
    carve: 1400,   /* iii: the ink is wiped off the mark from the top down
                      and the strokes of 陳 are drawn out (1.35s, near a
                      steady speed)                                      */
    /* the motto */
    markIn: 420,   /* the finished seal holds alone on the empty plate,
                      the way the single dot did at the end of act one  */
    hold1: 3400,   /* the finished plate sits — quote, seal and
                      attribution together. The longest pause in the
                      sequence by far: it is the one thing the visitor
                      is meant to actually read                        */
    fade:   680,   /* the words fade out — the seal stays lit          */
    hold2:  420,   /* the seal alone, before it leaves                 */
    rise:   940,   /* the seal travels to the header                   */
    hold3:  260,
    open:   780,   /* wordmark uncovers, seal slides left              */
    h1:     160,   /* banner headline, just behind the wordmark        */
    h2:     460,   /* then the description + #Compassion lockup        */
    barIn:  320    /* then the colour bar wipes                        */
  };

  /* The founder's motto, in the language of the page it is opening. Two
     lines because the quote lifts one line at a time (each is its own
     `.opening__line`), so the break is part of the choreography rather
     than something the browser decides.
     The Chinese is the wording the article pull-quote already uses
     (Articles_tc.html), not a fresh translation — the same sentence in
     two places on the site should read the same way. */
  const TC = document.documentElement.lang === 'zh-Hant';
  const QUOTE = TC
    ? ['如同照顧自己一樣，', '真誠地關懷他人。']
    : ['Care for others as well as', 'you would care for yourself.'];
  const CITE  = TC ? '陳廷驊博士' : 'Dr. Din Hwa Chen';
  const YEARS = TC ? '（1923–2012）' : '(1923–2012)';
  const SKIP  = TC ? '略過' : 'Skip';

  /* landing state: banner copy held back, menu held back, page locked.
     `lp-boot` (set inline in <head>) was covering the gap until now —
     swap in the same tick so nothing is ever painted unheld. */
  body.classList.add('lp-nav', 'lp-h1', 'lp-h2');
  document.documentElement.classList.remove('lp-boot');
  document.documentElement.classList.add('lock-scroll');
  if (window.__lenis) window.__lenis.stop();
  window.scrollTo(0, 0);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function releaseScroll() {
    document.documentElement.classList.remove('lock-scroll');
    if (window.__lenis) window.__lenis.start();
  }

  /* everything the intro was holding back, in one cascade */
  function playLanding() {
    releaseScroll();
    body.classList.remove('lp-nav');
    window.setTimeout(function () { body.classList.remove('lp-h1'); }, T.h1);
    window.setTimeout(function () { body.classList.remove('lp-h2'); }, T.h1 + T.h2);
    window.setTimeout(function () {
      if (bar) bar.classList.add('is-lit', 'is-on');
    }, T.h1 + T.h2 + T.barIn);
    /* the 'open' act is still running — the override may only be dropped
       once it has finished, or the logo would snap to its end state */
    window.setTimeout(function () { body.removeAttribute('data-intro'); }, T.open + 60);
  }

  if (reduce) return playLanding();

  /* --- the overlay (JS-side so no-JS visitors never see it) -------- */
  const intro = document.createElement('div');
  intro.className = 'opening';
  /* `aria-hidden` sits on the two decorative blocks rather than on the
     overlay, so the skip button inside it stays a real, reachable control */
  intro.innerHTML =
    '<div class="opening__stage" aria-hidden="true">' +
      '<div class="opening__dots dots"></div>' +
      '<div class="opening__dotrow dotrow"></div>' +
      '<div class="opening__lines lines"></div>' +
    '</div>' +
    '<div class="opening__motto" aria-hidden="true">' +
      '<p class="opening__quote">' +
        QUOTE.map(function (l) {
          return '<span class="opening__line"><i>' + l + '</i></span>';
        }).join('') +
        /* inside the quote, not beside it: it hangs off the end of the
           last line, so it has to follow the text when it wraps */
        '<img class="opening__qm" src="assets/icons/quote-mark.svg" alt="" />' +
      '</p>' +
      /* the seal's place in the plate. It is deliberately empty: the mark
         that lands here is the real `.nav__logo`, parked over the slot —
         see markY() below. The slot only has to hold the space open so
         the attribution sits where the design puts it. */
      '<span class="opening__markslot"></span>' +
      '<p class="opening__cite">' +
        '<span class="opening__cite-name"></span>' +
        '<span class="opening__cite-years"></span>' +
      '</p>' +
    '</div>' +
    '<button type="button" class="opening__skip">' + SKIP + '</button>';
  body.appendChild(intro);

  const motto  = intro.querySelector('.opening__motto');
  const stage  = intro.querySelector('.opening__stage');
  const dots   = intro.querySelector('.opening__dots');
  const dotrow = intro.querySelector('.opening__dotrow');
  const lines  = intro.querySelector('.opening__lines');
  const slot   = intro.querySelector('.opening__markslot');
  intro.querySelector('.opening__cite-name').textContent  = CITE;
  intro.querySelector('.opening__cite-years').textContent = YEARS;

  /* How far down the logo has to sit to land on its slot in the motto.
     Measured against the slot rather than the middle of the frame, so the
     seal is always exactly where the design draws it — under the second
     line of the quote, over the attribution — at every breakpoint.
     Above 768px the page carries responsive zoom, and a translate
     written on a zoomed element is scaled with it — so divide it back out.
     The current offset is added back in because on a resize the logo is
     already translated, i.e. the two rects differ by what is *left* to
     move, not by the whole distance. */
  function markY() {
    if (!navLogo || !slot) return 0;
    const zoom = window.__pageZoom();
    const now  = parseFloat(body.style.getPropertyValue('--mark-y')) || 0;
    const r = navLogo.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    return now + ((s.top + s.height / 2) - (r.top + r.height / 2)) / zoom;
  }

  /* Where the block of ink has to go, and how hard it has to be squeezed
     to become the seal. The stage box is 720 × 0, so its own rect *is* the
     point every graphic is centred on: the travel is slot centre minus
     that (÷ zoom, as in markY, because a translate on a zoomed element is
     scaled with it). The two scale factors are ratios of rects measured
     the same way, so the zoom cancels itself out of those.
     The block's height is the rules' own geometry — RULES × pitch, which
     overflows the masked box they live in — and its width is what a rule
     actually measures. Read at the moment the beat starts, not up front:
     the plate only settles once its type has laid out, and both it and the
     stage move with a resize. */
  function carveTo() {
    const zoom = window.__pageZoom();
    const st   = stage.getBoundingClientRect();
    const s    = slot ? slot.getBoundingClientRect() : null;
    /* the width comes off the box the rules live in, not off a rule: a
       rule's own rect is its *scaled* one, and if the tab was in the
       background for the act that draws them (transitions are throttled
       there) that is still zero — which would divide out to an infinite
       scale and blow the block up instead of pressing it down */
    const box  = lines.getBoundingClientRect();
    if (!s || !box.width) return { y: 0, x: 0.04, sy: 0.11 };
    return {
      y:  ((s.top + s.height / 2) - st.top) / zoom,
      x:  s.width / box.width,
      sy: s.height / (RULES * RULE_PITCH * zoom)
    };
  }

  /* Order matters: `--mark-y` has to be in place *before* the stage rules
     start applying. Changing a custom property that a transitioned
     property reads through var() does not reliably re-run the transition
     in Chrome — the computed value updates while the rendered one stays
     put, which left the mark stranded near the top of the frame. Setting
     it first means var() is only ever read at its final value.
     Nothing has been painted yet — this is still the same task that swapped
     `lp-boot` out — so the logo is never seen sitting in the header. */
  body.style.setProperty('--mark-y', markY().toFixed(2) + 'px');
  body.setAttribute('data-intro', 'hidden');

  /* the quote lines lift one behind the other */
  intro.querySelectorAll('.opening__line > i').forEach(function (el, n) {
    el.style.setProperty('--dl', (n * 170) + 'ms');
  });

  const timers = [];
  function at(ms, fn) { timers.push(window.setTimeout(fn, ms)); }

  /* --- act one: 點 · 線 · 面 --------------------------------------
     Built here rather than in the markup for the same reason §8.7 builds
     the panels' rows: the geometry is regular, and only the scatter is
     hand-placed (straight off being-dots.svg, so the opening and the
     Being panel are recognisably the same constellation).
     ---------------------------------------------------------------- */

  /* x%, y%, size%, opacity, delay — the delays are the panel's own,
     halved, because the opening gathers in half the time */
  const SCATTER = [
    [ 0.00, 22.58, 1.72, 1,  190], [94.42, 44.21, 1.72, 1,   60],
    [96.35,  0.00, 2.36, 1,  320], [73.18, 62.95, 1.07, 1,  120],
    [98.71, 77.60, 1.29, 0.3, 410], [67.96, 32.43, 1.29, 0.1, 30],
    [23.46, 47.83, 1.13, 0.5, 250], [40.13, 91.29, 1.07, 0.6, 350],
    [78.48, 44.20, 1.29, 0.3, 150], [ 0.65, 95.65, 3.88, 0.4, 450],
    [87.70, 23.01, 2.59, 0.1,  90], [44.17, 64.13, 2.59, 0.1, 280]
  ];
  const DRIFT = ['drift-a', 'drift-b', 'drift-c', 'drift-d'];
  SCATTER.forEach(function (d, n) {
    const dot = document.createElement('span');
    dot.className = 'dots__dot ' + DRIFT[n % 4];
    dot.style.cssText = '--x:' + d[0] + '%;--y:' + d[1] + '%;--s:' + d[2] +
                        '%;--o:' + d[3] + ';--dl:' + d[4] + 'ms';
    dots.appendChild(dot);
  });
  /* the core: the one dot the others collapse into, and the one the line
     is then written out from. Same size as a row dot (1.95% of the stage)
     so the handover between the two acts is a dot staying put, not a
     swap. */
  const core = document.createElement('span');
  core.className = 'dots__dot dots__dot--core';
  core.style.cssText = '--x:50%;--y:50%;--s:1.95%;--o:1;--dl:0ms';
  dots.appendChild(core);

  /* Slow-then-fast spread, same shape as §8.7: rings double as they go
     out, so the delay grows with log2 of the distance from the middle —
     the first few land one at a time, the rest rush out. */
  function ringDelay(distance, beat) {
    return Math.round(Math.log2(distance + 1) * beat) + 'ms';
  }

  /* 線 — odd count so the row opens on the single centre dot. Positions
     are written as calc(50% ± n·pitch) rather than i/count, so the middle
     dot sits exactly on the frame's centre line whatever the width. */
  const ROW = 33, ROW_MID = (ROW - 1) / 2, ROW_PITCH = 2.94;
  for (let i = 0; i < ROW; i++) {
    /* the centre slot is left empty on purpose — the gathered core dot is
       already sitting there and stays for the whole act, so writing a
       second dot over it would only spring-bump the one still point */
    if (i === ROW_MID) continue;
    const d = Math.abs(i - ROW_MID);
    const dot = document.createElement('span');
    dot.className = 'dotrow__dot';
    dot.style.setProperty('--x', 'calc(50% + ' +
      ((i - ROW_MID) * ROW_PITCH).toFixed(3) + '%)');
    /* `d - 1`, so the first pair either side of the core starts growing
       the instant the act does — with a plain ringDelay(d) they waited a
       whole beat, and the single dot sat there looking finished */
    dot.style.setProperty('--dl', ringDelay(d - 1, 260));
    /* --dx: when this dot is swallowed by the rule drawing along the row.
       The rule's scale runs 0 → 1 over 950ms on a hard ease-out, so its
       leading edge is already most of the way along at half time; this is
       a fit of that curve inverted, which is what keeps each dot going
       out *with* the edge instead of trailing behind it. The 90ms lead
       starts the fade just before the edge lands on it. */
    dot.style.setProperty('--dx',
      Math.max(0, Math.round(684 * Math.pow(d / ROW_MID, 1.6)) - 90) + 'ms');
    dotrow.appendChild(dot);
  }

  /* 面 — 21 rules at the panels' 18px pitch, odd again so there is a
     middle one to be the line the row fuses into. That middle rule is
     tagged: it draws on its own beat, and the other twenty open out from
     it afterwards — hence `d - 1`, so the first pair leaves the moment
     the plane act starts rather than a beat into it. */
  const RULES = 21, RULES_MID = (RULES - 1) / 2, RULE_PITCH = 18;
  for (let i = 0; i < RULES; i++) {
    const d = Math.abs(i - RULES_MID);
    const rule = document.createElement('span');
    rule.className = 'lines__line' + (d === 0 ? ' lines__line--mid' : '');
    rule.style.setProperty('--y', 'calc(50% + ' +
      ((i - RULES_MID) * RULE_PITCH) + 'px)');
    /* A power curve, not the row's log2 one. log2 spacing crowds the outer
       rules together — the first pair either side of the middle took as
       long to arrive as the last six put together, so the plane crept and
       then finished in a rush. `d^0.8` across a fixed span spreads the
       wavefront evenly to the edge instead, and each rule out draws a
       little quicker than the one before it (`--dur`), so the whole plane
       closes on the beat rather than trailing at the corners. */
    rule.style.setProperty('--dl', d === 0 ? '0ms'
      : Math.round(Math.pow(d / RULES_MID, 0.8) * 660) + 'ms');
    rule.style.setProperty('--dur', (1350 - d * 34) + 'ms');
    lines.appendChild(rule);
  }

  /* --- the clock --------------------------------------------------- */
  /* each mark is the one before it plus the beat that fills the gap */
  const tLit    = T.pre;
  const tGather = tLit + T.drift;
  const tLine   = tGather + T.gather;
  const tFuse   = tLine + T.line;
  const tPlane  = tFuse + T.fuse;
  /* 面 is inked, pressed onto the seal's slot and carved into the mark, and
     only then do the words arrive — the plane *becomes* the logo, and the
     logo introduces the quote, instead of the plane fading away and the two
     of them turning up together */
  const tPress  = tPlane + T.plane + T.planeH;
  const tInk    = tPress + T.fillIn;
  const tCarve  = tPress + T.press;
  const tMark   = tCarve + T.carve;
  const tSaid   = tMark + T.markIn;
  const tFade   = tSaid + T.hold1;
  const tRise   = tFade + T.fade + T.hold2;
  const tOpen   = tRise + T.rise + T.hold3;

  at(tLit,    function () { dots.classList.add('is-lit'); });
  at(tGather, function () { dots.classList.add('is-on'); });
  at(tLine,   function () { dotrow.classList.add('is-on'); });
  at(tFuse,   function () {
    /* one solid rule draws along the finished row and takes the dots with
       it: the dotted line tightens into a single line */
    lines.classList.add('is-fuse');
    stage.classList.add('opening__stage--fused');
  });
  at(tPlane,  function () { lines.classList.add('is-on'); });
  /* i — the press: the plane starts closing in on the seal's footprint */
  at(tPress,  function () {
    /* Re-park the mark from the same layout read the block is about to be
       aimed with. The two used to be measured eight seconds apart — the mark
       at boot, the block here — so anything that moved the motto in between
       (the serif landing, a restored scroll position, an image finishing)
       left them pointing at two different places, and the block came down
       beside the seal instead of onto it. One read, one answer. */
    body.style.setProperty('--mark-y', markY().toFixed(2) + 'px');
    const to = carveTo();
    /* a bad number here would make the whole `translate` invalid, and an
       invalid `translate` computes to `none` — which drops the -50% centring
       with it and lands the block a half-seal down and to the right */
    if (!isFinite(to.y) || !isFinite(to.x) || !isFinite(to.sy)) return;
    stage.style.setProperty('--gather-y', to.y.toFixed(2) + 'px');
    stage.style.setProperty('--carve-x',  to.x.toFixed(4));
    stage.style.setProperty('--carve-y',  to.sy.toFixed(4));
    stage.classList.add('opening__stage--carve');
  });
  /* ii — and the ink fills in on the way down, once the compression has
     already begun to close the gaps between the rules. The box is squared
     off to the block's own span at the same time: the rules sit on a pitch
     that overflows their masked box by half a pitch top and bottom, and
     the wipe in beat iii clips against this box, so the two have to
     agree — the box is centred on the stage point whatever its height, so
     resizing it mid-press moves nothing. */
  at(tInk,    function () {
    lines.style.setProperty('--pitch', RULE_PITCH + 'px');
    lines.style.height = (RULES * RULE_PITCH) + 'px';
    lines.classList.add('is-solid');
  });
  /* iii — the mark is lit underneath it (no fade: it is the same orange on
     the same rect, so nothing shows yet) and the block lifts off it,
     carving the strokes of 陳 out of the solid */
  at(tCarve,  function () {
    body.setAttribute('data-intro', 'centre');
    stage.classList.add('opening__stage--carved');
  });
  /* and the words come up around it */
  at(tSaid,   function () { intro.classList.add('opening--said'); });
  /* only the words go — the seal is not in the overlay, so it is left
     standing on the empty peach panel, already where it needs to be */
  at(tFade, function () { motto.classList.add('opening__motto--out'); });
  at(tRise, function () {
    body.setAttribute('data-intro', 'up');
    /* the peach panel clears behind the rising mark, so the banner is
       already in place by the time it arrives */
    window.setTimeout(function () { intro.classList.add('opening--out'); }, T.rise * 0.3);
  });
  at(tOpen, function () {
    body.setAttribute('data-intro', 'open');
    intro.remove();          /* already fully transparent */
    playLanding();
  });

  /* --- skip ---------------------------------------------------------
     Only the button skips — not a stray click or key, which is how the
     sequence used to be cut short by accident.

     What it does NOT do is run the rest of the beats at speed: the mark
     would fly out of the plate and across the frame to the header, which
     is the one thing a visitor who has just asked to get on with it does
     not want to sit through. Instead the frame as it stands dims out, the
     mark goes with it, and the header is assembled underneath while the
     peach clears — a cross-fade from wherever the sequence had got to
     into the finished home page.

     The order is exact: the mark has to be invisible *before* the
     attribute is dropped, because dropping it hands the logo back its own
     translate (and style.css's 0.7s transition on it, which `lp-skip`
     suppresses for the same reason). `lp-skip` is lifted a beat later so
     the header behaves normally again afterwards. */
  let skipped = false;
  function skip() {
    if (skipped) return;
    skipped = true;
    timers.forEach(window.clearTimeout);
    intro.classList.add('opening--skip');
    body.classList.add('lp-skip');
    window.setTimeout(function () {
      body.removeAttribute('data-intro');
      body.style.removeProperty('--mark-y');
      intro.classList.add('opening--out');
      playLanding();
      window.setTimeout(function () { body.classList.remove('lp-skip'); }, 120);
      window.setTimeout(function () { intro.remove(); }, 520);
    }, 300);
  }
  intro.querySelector('.opening__skip').addEventListener('click', skip);

  /* keep the parked mark centred if the window is resized mid-intro */
  window.addEventListener('resize', function () {
    if (body.getAttribute('data-intro') === 'centre' ||
        body.getAttribute('data-intro') === 'hidden') {
      body.style.setProperty('--mark-y', markY().toFixed(2) + 'px');
    }
  });

  /* …and again when the serif lands. `--mark-y` is measured off the motto,
     which is set in the serif: the quote is two lines of it, so the slot the
     mark parks on sits lower once the real face replaces the fallback. The
     measurement above happens in the same task as the first paint, i.e.
     before the webfont is in — which parked the mark off the plane the
     opening presses into it, and the two came apart on screen. Re-measure
     the moment the fonts resolve; at that point the mark is still hidden
     (`data-intro='hidden'`, opacity 0, transition none), so nothing moves
     visibly — it is simply in the right place when it is lit. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      const state = body.getAttribute('data-intro');
      if (state === 'centre' || state === 'hidden') {
        body.style.setProperty('--mark-y', markY().toFixed(2) + 'px');
      }
    });
  }
})();


/* ----------------------------------------------------------------
   14. Article image carousel
   The figure ships as a plain stack of <img>, first one visible, and
   this turns it into a slider: the arrows step through, the count in
   the caption row reads off the number of slides, and each slide's
   own `data-caption` replaces the text as it comes up.

   Everything is derived from the markup — the total is not written
   anywhere in the HTML — so adding a picture is one <img> and nothing
   else. With one slide the arrows disable themselves; with none, or
   with no script at all, the figure is just a picture.
   ---------------------------------------------------------------- */
(function () {
  const figures = Array.prototype.slice.call(
    document.querySelectorAll('[data-carousel]'));
  if (!figures.length) return;

  figures.forEach(function (fig) {
    const media  = fig.querySelector('.article__figure-media');
    const slides = media
      ? Array.prototype.slice.call(media.querySelectorAll('img'))
      : [];
    if (slides.length < 2) {
      /* one picture: leave it exactly as the markup has it and take the
         arrows out of the tab order rather than leaving them dead */
      fig.querySelectorAll('.article__carousel-arrow')
         .forEach(function (b) { b.disabled = true; });
      const only = fig.querySelector('[data-carousel-total]');
      if (only) only.textContent = String(slides.length || 1);
      return;
    }

    const caption = fig.querySelector('.article__caption');
    const cur     = fig.querySelector('[data-carousel-current]');
    const total   = fig.querySelector('[data-carousel-total]');
    const prev    = fig.querySelector('.article__carousel-arrow--prev');
    const next    = fig.querySelector('.article__carousel-arrow--next');
    let i = 0;

    /* `is-ready` hands the stacking over to the script's own rule, which
       adds the crossfade. Until this runs the CSS keeps slide one visible
       on its own, so there is no frame where the figure is empty. */
    slides[0].classList.add('is-on');
    media.classList.add('is-ready');
    if (total) total.textContent = String(slides.length);

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      if (cur) cur.textContent = String(i + 1);
      const c = slides[i].getAttribute('data-caption');
      if (caption && c !== null) caption.textContent = c;
    }

    if (prev) prev.addEventListener('click', function () { show(i - 1); });
    if (next) next.addEventListener('click', function () { show(i + 1); });

    /* left/right arrow keys once one of the buttons has focus */
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { show(i - 1); }
      if (e.key === 'ArrowRight') { show(i + 1); }
    });

    show(0);
  });
})();


/* ----------------------------------------------------------------
   16. Search results — the query, the counts, and the tabs.

   There is no back end, so the rows are in the markup and this only
   does the three things that would otherwise be hand-maintained and
   wrong within a week:

     · echoes the `?q=` term into the field and the count line, so the
       page a reader lands on says what they actually searched for;
     · counts each group off the DOM rather than off numbers typed into
       the HTML — add or delete a row and every count follows;
     · shows one group at a time when a tab is picked.

   Everything degrades to "all results, correct total" with JS off,
   because that is the state the markup is written in.
   ---------------------------------------------------------------- */
(function () {
  const wrap = document.querySelector('[data-search-results]');
  if (!wrap) return;

  const rows  = Array.prototype.slice.call(wrap.querySelectorAll('.s-result'));
  const tabs  = Array.prototype.slice.call(document.querySelectorAll('.s-tab'));
  const empty = document.querySelector('[data-search-empty]');
  const field = document.querySelector('[data-search-input]');
  const line  = document.querySelector('[data-search-count]');
  const pager = document.querySelector('.search__pager');
  const prev  = pager && pager.querySelector('.pager__arrow--prev');
  const next  = pager && pager.querySelector('.pager__arrow--next');
  const pageNum = pager && pager.querySelector('.pager__num');
  const pageTotal = pager && pager.querySelector('.pager__total');
  const PAGE_SIZE = 4;
  let activeGroup = 'all';
  let activePage = 1;

  const live = document.createElement('span');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  if (pager) pager.insertAdjacentElement('afterend', live);

  /* ── the term ───────────────────────────────────────────────────
     `URLSearchParams` gives back the decoded string, which is then put
     into the page with `textContent` — never innerHTML. A search term
     is the one piece of this page that comes from outside it, and it
     arrives straight off the URL bar. */
  const term = (new URLSearchParams(window.location.search).get('q') || '').trim();
  if (field) field.value = term;
  if (line && term) {
    const em = document.createElement('span');
    em.className = 'search__term';
    em.textContent = '\u201C' + term + '\u201D';
    line.appendChild(document.createTextNode(' for '));
    line.appendChild(em);
  }

  /* ── counts, read off the rows ─────────────────────────────────── */
  const counts = { all: rows.length };
  rows.forEach(function (r) {
    const g = r.getAttribute('data-group');
    counts[g] = (counts[g] || 0) + 1;
  });
  document.querySelectorAll('[data-count]').forEach(function (el) {
    const n = counts[el.getAttribute('data-count')] || 0;
    el.textContent = String(n);
    const tab = el.closest('.s-tab');
    /* a tab with nothing in it stays visible and stops being clickable
       (see `.s-tab[data-empty]`) — the zero is the answer */
    if (tab && n === 0) tab.setAttribute('data-empty', '');
  });

  /* ── the tabs ──────────────────────────────────────────────────── */
  function show(group, requestedPage) {
    activeGroup = group;
    const eligible = rows.filter(function (r) {
      return group === 'all' || r.getAttribute('data-group') === group;
    });
    const pages = Math.ceil(eligible.length / PAGE_SIZE);
    activePage = Math.max(1, Math.min(requestedPage || 1, Math.max(pages, 1)));
    const first = (activePage - 1) * PAGE_SIZE;
    const visible = eligible.slice(first, first + PAGE_SIZE);
    rows.forEach(function (r) { r.hidden = visible.indexOf(r) === -1; });
    tabs.forEach(function (t) {
      const on = t.getAttribute('data-tab') === group;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
    });
    if (empty) empty.hidden = eligible.length !== 0;
    if (pager) pager.hidden = pages <= 1;
    if (pageNum) pageNum.textContent = String(activePage);
    if (pageTotal) pageTotal.textContent = 'of ' + Math.max(pages, 1);
    if (prev) prev.disabled = activePage <= 1;
    if (next) next.disabled = activePage >= pages;
    live.textContent = eligible.length + (eligible.length === 1 ? ' result, page ' : ' results, page ') +
      activePage + ' of ' + Math.max(pages, 1);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.getAttribute('data-tab'), 1); });
  });
  const reset = document.querySelector('[data-tab-reset]');
  if (reset) reset.addEventListener('click', function () { show('all', 1); });
  function scrollToResults() {
    const top = Math.max(0, wrap.getBoundingClientRect().top + window.scrollY - 110);
    window.scrollTo({ top: top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  if (prev) prev.addEventListener('click', function () {
    if (activePage <= 1) return;
    show(activeGroup, activePage - 1);
    scrollToResults();
  });
  if (next) next.addEventListener('click', function () {
    show(activeGroup, activePage + 1);
    scrollToResults();
  });
  show('all', 1);
})();
