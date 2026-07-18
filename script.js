/* =================================================================
   ALAN CAI — PORTFOLIO · script.js
   Lenis · Scrambler · Typewriter · Reveals · Nav · Boot
   ================================================================= */
"use strict";

/* ---------------------------------------------------------------- */
/*  Globals                                                          */
/* ---------------------------------------------------------------- */
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
window.portfolioHeroTitleDecoded = false;

/* ================================================================= */
/*  SCRAMBLER — sequential left-to-right glyph decode                */
/* ================================================================= */
const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>=?*+";

class Scrambler {
  constructor(el, opts = {}) {
    this.el = el;
    this.final = (opts.text != null ? opts.text : el.textContent).trim();
    this.seq = opts.seq !== false;          // sequential L->R
    this.speed = opts.speed || 28;          // ms per frame
    this.settle = opts.settle || 2;         // frames each char scrambles before locking
    this.dim = !!opts.dim;                   // wrap gibberish in a greyed span
    this._raf = null;
    this._frame = 0;
  }

  rand() {
    return SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
  }

  esc(c) {
    return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c;
  }

  run(done) {
    this.el.textContent = this.final;
    if (done) done();
  }

  set(text) { this.el.textContent = text; }
}

/* ================================================================= */
/*  HERO TITLE — split into words + portal gap, then decode          */
/* ================================================================= */
function initHeroTitle() {
  const title = document.getElementById("heroTitle");
  if (!title) return;

  const left = title.querySelector(".title-word-left");
  const right = title.querySelector(".title-word-right");
  if (!left || !right) { window.portfolioHeroTitleDecoded = true; boot(title); return; }

  left.textContent = "ALAN";
  right.textContent = "CAI";
  window.portfolioHeroTitleDecoded = true;
  boot(title);
}

/* boot() hook called once title decoded — wire hero scroll + dragon preload */
function boot(titleEl) {
  if (typeof window.initHeroScroll === "function") {
    window.initHeroScroll(titleEl);
  }
  /* ~2MB glb downloads while the user reads the hero; never blocks scroll */
  if (!REDUCED && window.portfolioDragon && typeof window.portfolioDragon.preload === "function") {
    window.portfolioDragon.preload().then(function () {
      if (window.portfolioDragonOnReady) window.portfolioDragonOnReady();
    });
  }
  if (window.portfolioAboutTimelineRefresh) {
    requestAnimationFrame(() => window.portfolioAboutTimelineRefresh());
  }
}

/* ================================================================= */
/*  TYPEWRITER — "I build [phrase]"                                  */
/* ================================================================= */
function initTypewriter() {
  const out = document.getElementById("tagPhrase");
  if (!out) return;

  const phrases = [
    "secure systems.",
    "ML models.",
    "computer vision tools.",
    "web applications.",
    "things people use.",
  ];

  if (REDUCED) { out.textContent = phrases[0]; return; }

  let p = 0, i = 0, deleting = false;

  const tick = () => {
    const word = phrases[p];
    if (!deleting) {
      i++;
      out.textContent = word.slice(0, i);
      if (i === word.length) {
        deleting = true;
        return setTimeout(tick, 1500);
      }
      return setTimeout(tick, 60 + Math.random() * 40);
    } else {
      i--;
      out.textContent = word.slice(0, i);
      if (i === 0) {
        deleting = false;
        p = (p + 1) % phrases.length;
        return setTimeout(tick, 280);
      }
      return setTimeout(tick, 32);
    }
  };
  setTimeout(tick, 700);
}

/* ================================================================= */
/*  REVEALS + HEADING SCRAMBLE — scroll-position driven               */
/* ================================================================= */
const REVEAL_SEL = "#about .reveal, #projects .reveal, #skills .reveal, #contact .reveal";
const HEADING_DECODE_SEL = ".heading-decode[data-decode]";

function scrambleHeading(el, decoded) {
  if (decoded.has(el)) return;
  decoded.add(el);
  const text = el.getAttribute("data-decode");
  if (!text) return;
  el.textContent = text;
}

function canRevealInAbout(el) {
  if (!el.closest("#about")) return true;
  const about = document.getElementById("about");
  return !!(about && about.classList.contains("about-visible"));
}

function initReveals() {
  const targets = Array.from(document.querySelectorAll(REVEAL_SEL));
  const decoders = Array.from(document.querySelectorAll(HEADING_DECODE_SEL));

  if (REDUCED) {
    targets.forEach((t) => t.classList.add("in"));
    decoders.forEach((el) => { el.textContent = el.getAttribute("data-decode"); });
    return;
  }

  const decoded = new WeakSet();

  function check() {
    const vh = window.innerHeight;
    targets.forEach((t) => {
      if (t.classList.contains("in")) return;
      if (!canRevealInAbout(t)) return;
      const r = t.getBoundingClientRect();
      if (r.top < vh * 0.88 && r.bottom > 0) {
        t.classList.add("in");
      }
    });
    decoders.forEach((el) => {
      if (decoded.has(el)) return;
      if (el.closest("#about")) return;
      if (el.closest("#projects")) return;
      if (!canRevealInAbout(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.82 && r.bottom > 0) {
        scrambleHeading(el, decoded);
      }
    });
  }

  if (window.portfolioLenis) window.portfolioLenis.on("scroll", check);
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check);
  check();
  requestAnimationFrame(check);
  setTimeout(check, 300);

  window.portfolioRevealCheck = check;
}

/* ================================================================= */
/*  NAV — mobile toggle + active link state                          */
/* ================================================================= */
function initNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMobile");
  if (toggle && menu) {
    const setMenuOpen = (open) => {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    };

    toggle.addEventListener("click", () => {
      setMenuOpen(!menu.classList.contains("open"));
    });
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        setMenuOpen(false);
      });
    });
  }
}

/* ================================================================= */
/*  LENIS + GSAP smooth scroll                                       */
/* ================================================================= */
const COARSE_POINTER = window.matchMedia("(pointer: coarse)").matches;
const TOUCH_DEVICE = COARSE_POINTER || window.matchMedia("(hover: none)").matches;

function initLenis() {
  if (REDUCED || typeof Lenis === "undefined" || TOUCH_DEVICE) {
    // native scroll on touch — smoother pin/zoom with ScrollTrigger
    initAnchors(null);
    return;
  }

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.portfolioLenis = lenis;

  // drive Lenis with GSAP ticker, sync ScrollTrigger
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) lenis.scrollTo(value, { immediate: true });
        return lenis.scroll ?? window.scrollY;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });
    ScrollTrigger.defaults({ scroller: document.documentElement });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.addEventListener("refresh", () => lenis.resize());
  } else {
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  initAnchors(lenis);

  window.addEventListener("load", () => {
    lenis.resize();
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
}

/* ================================================================= */
/*  SCROLL PROGRESS — hairline driven by Lenis / ScrollTrigger      */
/* ================================================================= */
function initScrollProgress() {
  let bar = document.querySelector(".scroll-progress");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (REDUCED) {
    bar.style.transform = "scaleX(1)";
    return;
  }

  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = (window.portfolioLenis && typeof window.portfolioLenis.scroll === "number")
      ? window.portfolioLenis.scroll
      : (window.scrollY || document.documentElement.scrollTop || 0);
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    bar.style.transform = "scaleX(" + p + ")";
  }

  /* Hook the existing ST update path (Lenis → ScrollTrigger.update on scroll;
     native scroll also trips ST) — no new window scroll listener. */
  if (typeof ScrollTrigger !== "undefined") {
    const prevUpdate = ScrollTrigger.update;
    ScrollTrigger.update = function () {
      prevUpdate.apply(ScrollTrigger, arguments);
      update();
    };
    ScrollTrigger.addEventListener("refresh", update);
  } else if (window.portfolioLenis) {
    window.portfolioLenis.on("scroll", update);
  }

  update();
}

/* ================================================================= */
/*  EXPERIENCE — scroll-driven rail meter + active card              */
/* ================================================================= */
window.portfolioAboutTimelineRefresh = function () {};

function initExpMeter() {
  const about = document.getElementById("about");
  const fill = document.querySelector(".exp-rail-fill");
  const list = document.querySelector(".exp-list");
  const cards = Array.from(document.querySelectorAll(".exp-card"));
  if (!about || !fill || !list || !cards.length) return;

  const REF = 0.42;
  const n = cards.length;
  let lastActive = cards[0] || null;
  let lastIndex = 0;

  function update() {
    const vh = window.innerHeight || 1;
    const refY = vh * REF;

    let active = null;
    let activeIndex = lastIndex;
    for (let i = 0; i < n; i++) {
      const r = cards[i].getBoundingClientRect();
      if (r.top <= refY && r.bottom >= refY) {
        active = cards[i];
        activeIndex = i;
        break;
      }
    }
    if (!active) {
      let best = lastActive;
      let bestDist = Infinity;
      let bestI = lastIndex;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        const dist = Math.abs(mid - refY);
        if (dist < bestDist) {
          bestDist = dist;
          best = card;
          bestI = i;
        }
      });
      active = best;
      activeIndex = bestI;
    }

    /* Chunked fill: one equal step per card (1/n, 2/n, … 1) */
    const p = about.classList.contains("about-visible")
      ? (activeIndex + 1) / n
      : 0;
    fill.style.height = (p * 100) + "%";

    if (active && (active !== lastActive || !active.classList.contains("is-active"))) {
      cards.forEach((c) => c.classList.toggle("is-active", c === active));
      lastActive = active;
      lastIndex = activeIndex;
    }
  }

  if (window.portfolioLenis) window.portfolioLenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
  requestAnimationFrame(update);
  setTimeout(update, 300);
}

/* ================================================================= */
/*  IMPACT COUNTER                                                    */
/* ================================================================= */
function initImpactCounter() {
  document.querySelectorAll(".about-impact").forEach((block) => {
    const el = block.querySelector(".impact-num[data-count]");
    if (!el) return;

    const revealEl = block.closest(".reveal") || block;
    let started = false;

    function run() {
      if (started) return;
      started = true;
      const target = parseInt(el.getAttribute("data-count"), 10);
      if (!Number.isFinite(target)) return;

      if (REDUCED) {
        el.textContent = target.toLocaleString() + "+";
        return;
      }

      const duration = target > 100 ? 1800 : 1200;
      const t0 = performance.now();

      function frame(now) {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + "+";
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function tryRun() {
      if (revealEl.classList.contains("in")) run();
    }

    tryRun();
    const obs = new MutationObserver(tryRun);
    obs.observe(revealEl, { attributes: true, attributeFilter: ["class"] });
  });
}

/* ================================================================= */
/*  PORTRAIT HOVER — zoom + hover counter                            */
/* ================================================================= */
function initPortraitHover() {
  const card = document.querySelector(".ascii-portrait-card");
  const countEl = document.getElementById("portraitHoverCount");
  if (!card || !countEl) return;

  const KEY = "portfolioPortraitHovers";
  let count = 0;
  try {
    count = parseInt(localStorage.getItem(KEY) || "0", 10) || 0;
  } catch (e) {
    count = 0;
  }
  countEl.textContent = String(count);

  const coarse = window.matchMedia("(pointer: coarse)").matches;

  function bump() {
    count += 1;
    countEl.textContent = String(count);
    try {
      localStorage.setItem(KEY, String(count));
    } catch (e) { /* ignore quota / private mode */ }
  }

  if (coarse) {
    card.addEventListener("click", () => {
      const open = card.classList.toggle("is-hovered");
      if (open) bump();
    });
    document.addEventListener("click", (e) => {
      if (!card.contains(e.target)) card.classList.remove("is-hovered");
    });
    return;
  }

  card.addEventListener("mouseenter", bump);
}

/* ================================================================= */
/*  ASCII PORTRAIT — fit-to-width + line-by-line reveal              */
/* ================================================================= */
function initAsciiPortrait() {
  const card = document.querySelector(".ascii-portrait-card");
  const pre = document.querySelector("pre.ascii-portrait");
  if (!card || !pre) return;

  const COLS = 69;
  const LINE_MS = 30;
  let started = false;
  let timers = [];

  /* wrap each line once */
  const raw = pre.textContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let parts = raw.split("\n");
  if (parts.length && parts[parts.length - 1] === "") parts = parts.slice(0, -1);
  pre.textContent = "";
  const lines = parts.map((text) => {
    const span = document.createElement("span");
    span.className = "ascii-line";
    span.textContent = text + "\n";
    pre.appendChild(span);
    return span;
  });

  function fit() {
    const style = getComputedStyle(card);
    const padX =
      (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const available = Math.max(0, card.clientWidth - padX);
    if (available <= 0) return;

    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;white-space:pre;" +
      "font-family:var(--mono);font-size:100px;letter-spacing:0;line-height:1;";
    probe.textContent = "M";
    document.body.appendChild(probe);
    const unit = probe.getBoundingClientRect().width / 100;
    document.body.removeChild(probe);
    if (!(unit > 0)) return;

    const size = available / (COLS * unit);
    pre.style.fontSize = size + "px";
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function resetLines() {
    clearTimers();
    lines.forEach((span) => { span.style.opacity = "0"; });
    started = false;
  }

  function reveal() {
    if (started) return;
    started = true;
    clearTimers();

    if (REDUCED) {
      lines.forEach((span) => { span.style.opacity = "1"; });
      return;
    }

    lines.forEach((span, i) => {
      span.style.opacity = "0";
      const id = setTimeout(() => { span.style.opacity = "1"; }, i * LINE_MS);
      timers.push(id);
    });
  }

  function onClass() {
    if (card.classList.contains("in")) reveal();
    else resetLines();
  }

  fit();
  window.addEventListener("resize", fit);
  onClass();
  const obs = new MutationObserver(onClass);
  obs.observe(card, { attributes: true, attributeFilter: ["class"] });
}

function initAnchors(lenis) {
  const navEl = document.getElementById("nav");
  const navOffset = () => (navEl ? navEl.offsetHeight : 64) + 8;
  document.querySelectorAll("[data-link]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      // hero link goes to very top
      const top = href === "#hero" ? 0 : null;

      if (lenis) {
        if (top === 0) lenis.scrollTo(0, { offset: 0 });
        else lenis.scrollTo(target, { offset: -navOffset() });
      } else {
        const y = top === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - navOffset();
        window.scrollTo({ top: y, behavior: "smooth" });
      }

      const menu = document.getElementById("navMobile");
      const toggle = document.getElementById("navToggle");
      if (menu && menu.classList.contains("open")) {
        menu.classList.remove("open");
        document.body.style.overflow = "";
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Open menu");
        }
      }
    });
  });
}

/* ================================================================= */
/*  SCROLL LOCK (used during title decode)                           */
/* ================================================================= */
window.portfolioScrollLock = (function () {
  let locked = false;
  const prevent = (e) => { if (locked) e.preventDefault(); };
  const keyPrevent = (e) => {
    if (!locked) return;
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
    if (keys.includes(e.key)) e.preventDefault();
  };
  return {
    lock() {
      if (locked) return;
      locked = true;
      document.body.style.overflow = "hidden";
      window.addEventListener("wheel", prevent, { passive: false });
      window.addEventListener("touchmove", prevent, { passive: false });
      window.addEventListener("keydown", keyPrevent, { passive: false });
      if (window.portfolioLenis) window.portfolioLenis.stop();
    },
    unlock() {
      if (!locked) return;
      locked = false;
      document.body.style.overflow = "";
      window.removeEventListener("wheel", prevent);
      window.removeEventListener("touchmove", prevent);
      window.removeEventListener("keydown", keyPrevent);
      if (window.portfolioLenis) window.portfolioLenis.start();
    },
  };
})();

/* ================================================================= */
/*  ABOUT REVEAL API — used by hero-scroll                           */
/* ================================================================= */
window.portfolioAboutReveal = (function () {
  let decoded = false;
  let seeded = false;
  let headingTimers = [];
  let revealTimers = [];

  function decodeAboutHeadings() {
    headingTimers.forEach(clearTimeout);
    headingTimers = [];
    const headings = document.querySelectorAll("#about .heading-decode[data-decode]");
    headings.forEach((el) => {
      const text = el.getAttribute("data-decode");
      if (text) el.textContent = text;
    });
  }

  function revealAboutEls() {
    const els = document.querySelectorAll("#about .reveal");
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    if (REDUCED) {
      els.forEach((r) => r.classList.add("in"));
      return;
    }
    els.forEach((r, i) => {
      const id = setTimeout(() => r.classList.add("in"), 80 + i * 75);
      revealTimers.push(id);
    });
  }

  return {
    seed() {
      if (seeded || REDUCED) return;
      seeded = true;
      /* headings keep their real text — no scramble blank */
    },
    decode() {
      if (decoded) return;
      decoded = true;
      const about = document.getElementById("about");
      if (about) about.classList.add("about-visible");
      decodeAboutHeadings();
      revealAboutEls();
      if (window.portfolioAboutTimelineRefresh) {
        requestAnimationFrame(() => {
          window.portfolioAboutTimelineRefresh();
        });
      }
    },
    reset() {
      decoded = false;
      seeded = false;
      headingTimers.forEach(clearTimeout);
      revealTimers.forEach(clearTimeout);
      headingTimers = [];
      revealTimers = [];
      const about = document.getElementById("about");
      if (about) about.classList.remove("about-visible");
      document.querySelectorAll("#about .reveal").forEach((r) => r.classList.remove("in"));
      document.querySelectorAll("#about .heading-decode[data-decode]").forEach((el) => {
        const text = el.getAttribute("data-decode");
        if (text) el.textContent = text;
      });
    },
  };
})();

/* ================================================================= */
/*  REDUCED-MOTION fallback: show About immediately                  */
/* ================================================================= */
function initReducedFallback() {
  if (!REDUCED) return;
  const about = document.getElementById("about");
  if (about) about.classList.add("about-visible");
  document.querySelectorAll(".reveal").forEach((r) => r.classList.add("in"));
  document.querySelectorAll("[data-decode]").forEach((el) => {
    el.textContent = el.getAttribute("data-decode");
  });
}

/* ================================================================= */
/*  PROJECT INDEX — directory rows (hover / focus / tap)             */
/* ================================================================= */
function initProjectIndex() {
  "use strict";
  const rows = Array.from(document.querySelectorAll(".proj-row"));
  if (!rows.length) return;

  const coarseMq = window.matchMedia("(pointer: coarse)");
  let openRow = null;
  let openSource = null;

  function closeRow(row) {
    if (!row) return;
    row.classList.remove("is-open");
    row.setAttribute("aria-expanded", "false");
    if (openRow === row) {
      openRow = null;
      openSource = null;
    }
  }

  function openRowEl(row, source) {
    if (openRow && openRow !== row) closeRow(openRow);
    row.classList.add("is-open");
    row.setAttribute("aria-expanded", "true");
    openRow = row;
    openSource = source;
  }

  rows.forEach((row) => {
    let wasOpenOnPointerDown = false;

    row.addEventListener("pointerdown", () => {
      wasOpenOnPointerDown = row.classList.contains("is-open");
    });

    row.addEventListener("mouseenter", () => {
      if (coarseMq.matches) return;
      openRowEl(row, "hover");
    });

    row.addEventListener("mouseleave", () => {
      if (coarseMq.matches) return;
      if (openSource !== "hover" || openRow !== row) return;
      if (row.contains(document.activeElement)) {
        openSource = "focus";
        return;
      }
      closeRow(row);
    });

    row.addEventListener("focusin", () => {
      openRowEl(row, "focus");
    });

    row.addEventListener("focusout", (e) => {
      if (row.contains(e.relatedTarget)) return;
      if (openSource === "focus" && openRow === row) closeRow(row);
    });

    row.addEventListener("click", (e) => {
      if (!coarseMq.matches) return;
      if (wasOpenOnPointerDown) return;
      e.preventDefault();
      openRowEl(row, "tap");
    });
  });
}

/* ================================================================= */
/*  BOOT                                                             */
/* ================================================================= */
/*  CUSTOM CURSOR — circle reticle                                   */
/*  Hollow circle lerps toward the pointer (slight lag); the solid   */
/*  dot tracks 1:1. Circle expands over interactive elements; the    */
/*  dot always stays.                                                */
/* ================================================================= */
function initCursor() {
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (!fine || REDUCED) return;            // touch / reduced motion -> native cursor

  const root = document.documentElement;
  const cell = document.createElement("div");
  const dot = document.createElement("div");
  cell.className = "cursor-cell";
  dot.className = "cursor-dot";
  document.body.appendChild(cell);
  document.body.appendChild(dot);
  root.classList.add("cursor-on");

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;   // mouse
  let cx = mx, cy = my;                                          // circle (lagged)
  let active = false;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = "translate(" + mx + "px," + my + "px)";
    if (!active) { cx = mx; cy = my; active = true; }
  }, { passive: true });

  window.addEventListener("mousedown", () => root.classList.add("cursor-down"));
  window.addEventListener("mouseup", () => root.classList.remove("cursor-down"));
  document.addEventListener("mouseleave", () => { cell.style.opacity = "0"; dot.style.opacity = "0"; });
  document.addEventListener("mouseenter", () => { cell.style.opacity = ""; dot.style.opacity = ""; });

  const HOT = "a, button, [data-link], .skill-card-link, .social, input, textarea";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest && e.target.closest(HOT)) root.classList.add("cursor-hot");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest && e.target.closest(HOT) &&
        !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOT))) {
      root.classList.remove("cursor-hot");
    }
  });

  (function raf() {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;
    cell.style.transform = "translate(" + cx + "px," + cy + "px)";
    requestAnimationFrame(raf);
  })();
}

/* ================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.title = "Alan Cai";
  initNav();
  initLenis();
  initScrollProgress();
  initExpMeter();
  initImpactCounter();
  initAsciiPortrait();
  initPortraitHover();
  initTypewriter();
  initReveals();
  initProjectIndex();
  initReducedFallback();
  initCursor();
  initHeroTitle();   // last — wires hero-scroll immediately
});
