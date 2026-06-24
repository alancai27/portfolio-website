/* =================================================================
   ALAN CAI — PORTFOLIO · hero-scroll.js
   GSAP ScrollTrigger pinned hero zoom INTO the bottom of the N.
   The portal target is a near-black anchor sitting on the N's stroke,
   so at full zoom the viewport fills with black, then About emerges.
   Text is scaled with a NON-promoted 2D transform so the browser
   re-rasterises the vector glyphs every frame — the letters stay sharp.
   ================================================================= */
"use strict";

(function () {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOBILE = window.matchMedia("(max-width: 720px)").matches;
  const TOUCH = window.matchMedia("(pointer: coarse)").matches;
  const IS_TOUCH = TOUCH || MOBILE;

  const SCROLL_VH = IS_TOUCH ? 56 : 68;
  const SCRUB = IS_TOUCH ? 0.22 : 0.5;
  const FADE_IN_START = 0.80;
  const MAX_PROGRESS_STEP = IS_TOUCH ? 0 : 0.05;
  const MAX_SCALE_CAP = 90;

  const N_X = 0.77;
  const N_Y = 0.76;
  const INK_HALF = IS_TOUCH ? 5 : 4;

  let trigger = null;
  let lastProgress = 0;

  function viewportHeight() {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  }

  function reducedSetup() {
    const about = document.getElementById("about");
    if (about) {
      about.classList.add("about-visible");
      about.style.marginTop = "0px";
    }
    window.portfolioAboutReveal && window.portfolioAboutReveal.decode();
  }

  function ensureNTarget(heroSection) {
    const left = heroSection.querySelector(".title-word-left");
    if (!left) return null;
    let nEl = left.querySelector(".title-n");
    if (!nEl) {
      const txt = left.textContent;
      const head = txt.slice(0, -1);
      const last = txt.slice(-1);
      left.textContent = head;
      nEl = document.createElement("span");
      nEl.className = "title-n";
      nEl.textContent = last;
      left.appendChild(nEl);
    }
    return nEl;
  }

  function ensureAnchor(container) {
    let a = container.querySelector(".portal-anchor");
    if (!a) {
      a = document.createElement("span");
      a.className = "portal-anchor";
      a.setAttribute("aria-hidden", "true");
      container.appendChild(a);
    }
    return a;
  }

  function positionAnchor(anchor, nEl, container) {
    const nr = nEl.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    anchor.style.left = (nr.left - cr.left + nr.width * N_X) + "px";
    anchor.style.top = (nr.top - cr.top + nr.height * N_Y) + "px";
  }

  function computeMaxScale(anchor) {
    const r = anchor.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const w = window.innerWidth;
    const h = viewportHeight();
    let maxDist = 0;
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => {
      const d = Math.hypot(x - cx, y - cy);
      if (d > maxDist) maxDist = d;
    });
    return Math.min((maxDist / INK_HALF) * 1.3, MAX_SCALE_CAP * 14);
  }

  function initHeroScroll() {
    if (REDUCED || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      reducedSetup();
      return;
    }
    if (trigger) return;

    gsap.registerPlugin(ScrollTrigger);
    if (IS_TOUCH && ScrollTrigger.normalizeScroll) ScrollTrigger.normalizeScroll(true);

    const heroSection = document.getElementById("hero");
    const pin = document.getElementById("heroPin");
    const content = document.getElementById("heroContent");
    const actions = document.getElementById("heroActions");
    const about = document.getElementById("about");

    if (!pin || !content) {
      reducedSetup();
      return;
    }

    const nEl = ensureNTarget(heroSection);
    const anchor = ensureAnchor(content);
    if (!nEl) {
      reducedSetup();
      return;
    }

    window.portfolioAboutReveal && window.portfolioAboutReveal.seed();
    positionAnchor(anchor, nEl, content);

    function originStr() {
      const ox = parseFloat(anchor.style.left) || 0;
      const oy = parseFloat(anchor.style.top) || 0;
      return ox + "px " + oy + "px";
    }

    let maxScale = computeMaxScale(anchor);
    let origin = originStr();

    const recompute = () => {
      const saved = lastProgress;
      gsap.set(content, { clearProps: "transform" });
      positionAnchor(anchor, nEl, content);
      maxScale = computeMaxScale(anchor);
      origin = originStr();
      apply(saved);
    };

    function aboutAtProgress(p) {
      if (p >= FADE_IN_START) {
        const ap = (p - FADE_IN_START) / (1 - FADE_IN_START);
        if (about) {
          about.classList.add("about-visible");
          if (ap >= 0.99) about.style.opacity = "";
          else about.style.opacity = String(Math.min(1, ap * 1.25));
        }
        window.portfolioAboutReveal && window.portfolioAboutReveal.decode();
      } else {
        if (about) {
          about.style.opacity = "0";
          about.classList.remove("about-visible");
        }
        window.portfolioAboutReveal && window.portfolioAboutReveal.reset();
      }
    }

    function apply(p) {
      lastProgress = p;

      const zp = Math.pow(p, IS_TOUCH ? 1.55 : 1.7);
      const scale = 1 + zp * (maxScale - 1);

      gsap.set(content, {
        transformOrigin: origin,
        x: 0,
        y: 0,
        scale: scale,
        force3D: false,
      });

      if (actions) actions.style.pointerEvents = p > 0.04 ? "none" : "";

      aboutAtProgress(p);
    }

    trigger = ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: () => "+=" + (viewportHeight() * SCROLL_VH / 100),
      pin: pin,
      pinSpacing: true,
      pinType: IS_TOUCH ? "fixed" : "transform",
      scrub: SCRUB,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      fastScrollEnd: IS_TOUCH,
      onUpdate: (self) => {
        let p = self.progress;
        if (MAX_PROGRESS_STEP > 0) {
          const diff = p - lastProgress;
          if (Math.abs(diff) > MAX_PROGRESS_STEP) {
            p = lastProgress + Math.sign(diff) * MAX_PROGRESS_STEP;
          }
        }
        apply(p);
      },
      onLeave: () => apply(1),
      onEnterBack: () => {},
    });

    apply(0);

    window.addEventListener("resize", debounce(recompute, 160));
    window.addEventListener("orientationchange", debounce(() => {
      recompute();
      ScrollTrigger.refresh();
    }, 300));

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", debounce(recompute, 120));
    }

    window.portfolioHeroReset = function () {
      lastProgress = 0;
      window.portfolioScrollLock && window.portfolioScrollLock.unlock();
      gsap.set(content, { clearProps: "transform" });
      apply(0);
      window.portfolioAboutReveal && window.portfolioAboutReveal.reset();
    };
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  window.initHeroScroll = initHeroScroll;

  if (REDUCED) {
    document.addEventListener("DOMContentLoaded", reducedSetup);
  }
})();
