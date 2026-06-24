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
    if (REDUCED) { this.el.textContent = this.final; if (done) done(); return; }
    const chars = this.final.split("");
    const total = chars.length;
    this._frame = 0;
    let last = 0;

    const tick = (now) => {
      if (now - last < this.speed) { this._raf = requestAnimationFrame(tick); return; }
      last = now;
      this._frame++;

      // how many characters are "revealed" so far
      const revealed = this.seq
        ? Math.floor(this._frame / this.settle)
        : total;

      let out = "";
      let plain = "";
      for (let i = 0; i < total; i++) {
        const c = chars[i];
        if (c === " ") { out += " "; plain += " "; continue; }
        if (i < revealed) {
          out += this.esc(c); plain += c;          // locked (final colour)
        } else if (i < revealed + 5 || !this.seq) {
          const g = this.rand();                    // active scramble
          out += this.dim
            ? '<span class="scramble-dim">' + this.esc(g) + "</span>"
            : this.esc(g);
          plain += g;
        } else {
          out += " "; plain += " ";                 // not yet reached
        }
      }
      if (this.dim) this.el.innerHTML = out;
      else this.el.textContent = plain;

      if (revealed >= total) {
        this.el.textContent = this.final;
        cancelAnimationFrame(this._raf);
        if (done) done();
        return;
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  set(text) { this.el.textContent = text; }
}

/* ================================================================= */
/*  HERO TITLE — split into words + portal gap, then decode          */
/* ================================================================= */
function initHeroTitle() {
  const title = document.getElementById("heroTitle");
  if (!title) return;

  // markup already contains the split words; scramble each word L->R together
  const left = title.querySelector(".title-word-left");
  const right = title.querySelector(".title-word-right");
  if (!left || !right) { window.portfolioHeroTitleDecoded = true; boot(title); return; }

  const leftFinal = left.textContent;
  const rightFinal = right.textContent;

  if (REDUCED) {
    left.textContent = leftFinal;
    right.textContent = rightFinal;
    window.portfolioHeroTitleDecoded = true;
    boot(title);
    return;
  }

  const sL = new Scrambler(left, { text: leftFinal, seq: true, speed: 34, settle: 6, dim: true });
  const sR = new Scrambler(right, { text: rightFinal, seq: true, speed: 34, settle: 6, dim: true });

  // lock scroll until decode finishes
  window.portfolioScrollLock && window.portfolioScrollLock.lock();

  let doneCount = 0;
  const after = () => {
    doneCount++;
    if (doneCount < 2) return;
    window.portfolioHeroTitleDecoded = true;
    window.portfolioScrollLock && window.portfolioScrollLock.unlock();
    boot(title);
  };

  // small delay so the page settles before decode
  setTimeout(() => { sL.run(after); sR.run(after); }, 380);
}

/* boot() hook called once title decoded — wire hero scroll */
function boot(titleEl) {
  if (typeof window.initHeroScroll === "function") {
    window.initHeroScroll(titleEl);
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
const REVEAL_SEL = "#about .reveal:not(.about-timeline-item), #projects .reveal, #skills .reveal, #contact .reveal";
const HEADING_DECODE_SEL = ".heading-decode[data-decode]";

function scrambleHeading(el, decoded) {
  if (decoded.has(el)) return;
  decoded.add(el);
  const text = el.getAttribute("data-decode");
  if (!text) return;
  if (REDUCED) {
    el.textContent = text;
    return;
  }
  new Scrambler(el, { text, seq: true, speed: 26, settle: 2 }).run();
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
}

/* ================================================================= */
/*  ABOUT — wheel scrolls timeline while in section (desktop)        */
/* ================================================================= */
function initAboutTimelineScroll() {
  if (REDUCED) return;

  const mq = window.matchMedia("(min-width: 1001px)");
  const about = document.getElementById("about");
  const track = document.querySelector(".about-timeline-track");
  const viewport = document.querySelector(".about-timeline-viewport");
  if (!about || !track || !viewport) return;

  const NAV = () => (document.getElementById("nav") || { offsetHeight: 64 }).offsetHeight;
  let offset = 0;
  let range = 0;
  let resizeTimer = 0;

  function revealTimelineItems() {
    const items = viewport.querySelectorAll(".about-timeline-item.reveal");
    if (!items.length) return;
    const vr = viewport.getBoundingClientRect();
    items.forEach((item) => {
      if (item.classList.contains("in")) return;
      const ir = item.getBoundingClientRect();
      if (ir.top < vr.bottom - 16 && ir.bottom > vr.top + 16) {
        item.classList.add("in");
      }
    });
  }

  function measure() {
    range = Math.max(0, track.offsetHeight - viewport.clientHeight);
    offset = Math.min(offset, range);
    apply();
  }

  function apply() {
    track.style.transform = offset > 0 ? "translateY(" + (-offset) + "px)" : "";
    revealTimelineItems();
  }

  function atAboutStart() {
    const r = about.getBoundingClientRect();
    return r.top <= NAV() + 32 && r.top >= NAV() - 12;
  }

  function onWheel(e) {
    if (!mq.matches || range <= 0) return;

    const dy = e.deltaY;
    const lenis = window.portfolioLenis;
    let consume = false;

    if (dy > 0 && atAboutStart() && offset < range - 1) {
      consume = true;
    } else if (dy < 0 && atAboutStart() && offset > 1) {
      consume = true;
    }

    if (!consume) return;

    e.preventDefault();
    e.stopPropagation();
    if (lenis) lenis.scrollTo(lenis.scroll, { immediate: true });
    offset = Math.max(0, Math.min(range, offset + dy));
    apply();
  }

  function onPageScroll() {
    const r = about.getBoundingClientRect();
    if (r.bottom < 0) {
      offset = range;
      apply();
    } else if (r.top > window.innerHeight) {
      offset = 0;
      apply();
    } else {
      revealTimelineItems();
    }
  }

  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  if (window.portfolioLenis) {
    window.portfolioLenis.on("scroll", onPageScroll);
  } else {
    window.addEventListener("scroll", onPageScroll, { passive: true });
  }

  measure();
  window.portfolioAboutTimelineRefresh = measure;
  mq.addEventListener("change", measure);
  window.addEventListener("load", measure);
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 180);
  });
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
    headings.forEach((el, i) => {
      if (REDUCED) {
        el.textContent = el.getAttribute("data-decode");
        return;
      }
      const id = setTimeout(() => {
        new Scrambler(el, { text: el.getAttribute("data-decode"), seq: true, speed: 26, settle: 2 }).run();
      }, i * 100);
      headingTimers.push(id);
    });
  }

  function revealAboutEls() {
    const els = document.querySelectorAll("#about .reveal:not(.about-timeline-item)");
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    if (REDUCED) {
      els.forEach((r) => r.classList.add("in"));
      document.querySelectorAll("#about .about-timeline-item.reveal").forEach((r) => r.classList.add("in"));
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
      document.querySelectorAll("#about .heading-decode[data-decode]").forEach((el) => {
        el.textContent = "";
      });
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
        el.textContent = "";
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
/*  PROJECT CARDS — expand / minimize descriptions                   */
/* ================================================================= */
function initProjectToggles() {
  document.querySelectorAll(".proj-card").forEach((card) => {
    const wrap = card.querySelector(".proj-desc-wrap");
    const btn = card.querySelector(".proj-toggle");
    if (!wrap || !btn) return;

    btn.addEventListener("click", () => {
      const isCollapsed = wrap.classList.toggle("is-collapsed");
      btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      btn.setAttribute("aria-label", isCollapsed ? "Expand description" : "Minimize description");
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

  const HOT = "a, button, [data-link], .proj-live, .proj-toggle, .skill-card-link, .social, input, textarea";
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
  initAboutTimelineScroll();
  initImpactCounter();
  initTypewriter();
  initReveals();
  initProjectToggles();
  initReducedFallback();
  initCursor();
  initHeroTitle();   // last — triggers scroll lock + hero-scroll wiring
});
