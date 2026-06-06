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
/*  REVEALS — scroll-position driven (IntersectionObserver is         */
/*  unreliable inside the preview iframe, so we check rects on scroll) */
/* ================================================================= */
function initReveals() {
  const targets = Array.from(
    document.querySelectorAll("#projects .reveal, #skills .reveal, #contact .reveal")
  );
  const decoders = Array.from(
    document.querySelectorAll("#projects [data-decode], #skills [data-decode], #contact [data-decode]")
  );

  if (REDUCED) {
    targets.forEach((t) => t.classList.add("in"));
    decoders.forEach((el) => { el.textContent = el.getAttribute("data-decode"); });
    return;
  }

  const decoded = new WeakSet();

  function check() {
    const vh = window.innerHeight;
    // reveal when element's top crosses 88% of viewport
    targets.forEach((t) => {
      if (t.classList.contains("in")) return;
      const r = t.getBoundingClientRect();
      if (r.top < vh * 0.88 && r.bottom > 0) t.classList.add("in");
    });
    // decode section titles when ~halfway up the viewport
    decoders.forEach((el) => {
      if (decoded.has(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.78 && r.bottom > 0) {
        decoded.add(el);
        new Scrambler(el, { text: el.getAttribute("data-decode"), seq: true, speed: 26, settle: 2 }).run();
      }
    });
  }

  // drive via Lenis scroll if present, else native scroll, plus rAF safety
  if (window.portfolioLenis) window.portfolioLenis.on("scroll", check);
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check);
  // initial + a few settles for first paint
  check();
  requestAnimationFrame(check);
  setTimeout(check, 300);

  // expose so Lenis (initialised after reveals) can attach if needed
  window.portfolioRevealCheck = check;
}

/* ================================================================= */
/*  PROJECT CARD HOVER — scramble title                              */
/* ================================================================= */
function initCardHover() {
  if (REDUCED) return;
  document.querySelectorAll(".proj-card").forEach((card) => {
    const title = card.querySelector(".proj-title[data-decode]");
    if (!title) return;
    const final = title.getAttribute("data-decode");
    let busy = false;
    card.addEventListener("mouseenter", () => {
      if (busy) return;
      busy = true;
      new Scrambler(title, { text: final, seq: true, speed: 20, settle: 1 }).run(() => { busy = false; });
    });
  });
}

/* ================================================================= */
/*  NAV — mobile toggle + active link state                          */
/* ================================================================= */
function initNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMobile");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }
}

/* ================================================================= */
/*  LENIS + GSAP smooth scroll                                       */
/* ================================================================= */
function initLenis() {
  if (REDUCED || typeof Lenis === "undefined") {
    // plain anchor scrolling fallback
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
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  initAnchors(lenis);
}

function initAnchors(lenis) {
  const navH = 64;
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
        else lenis.scrollTo(target, { offset: -navH - 8 });
      } else {
        const y = top === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - navH - 8;
        window.scrollTo({ top: y, behavior: "smooth" });
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
  const titleEl = () => document.querySelector("#about [data-decode]");

  return {
    seed() {
      if (seeded || REDUCED) return;
      seeded = true;
      const el = titleEl();
      if (el) el.textContent = "";
    },
    decode() {
      if (decoded) return;
      decoded = true;
      const about = document.getElementById("about");
      if (about) about.classList.add("about-visible");
      const el = titleEl();
      if (el && !REDUCED) {
        new Scrambler(el, { text: el.getAttribute("data-decode"), seq: true, speed: 26, settle: 2 }).run();
      } else if (el) {
        el.textContent = el.getAttribute("data-decode");
      }
      // stagger the about reveals
      document.querySelectorAll("#about .reveal").forEach((r) => r.classList.add("in"));
    },
    reset() {
      decoded = false;
      seeded = false;
      const about = document.getElementById("about");
      if (about) about.classList.remove("about-visible");
      document.querySelectorAll("#about .reveal").forEach((r) => r.classList.remove("in"));
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

  const HOT = "a, button, [data-link], .proj-card, .social, input, textarea";
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
  initNav();
  initLenis();
  initTypewriter();
  initReveals();
  initCardHover();
  initReducedFallback();
  initCursor();
  initHeroTitle();   // last — triggers scroll lock + hero-scroll wiring
});
