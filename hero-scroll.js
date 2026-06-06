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

  /* tuning ------------------------------------------------------- */
  const SCROLL_VH = 68;            // length of pinned runway (vh)
  const SCRUB = 0.5;               // scrub smoothing
  const FADE_OUT_END = 0.30;       // tagline/actions gone by 30%
  const FADE_IN_START = 0.80;      // About begins fading in (over black)
  const MAX_PROGRESS_STEP = 0.05;  // cap per-frame jump (anti-flick)
  const MAX_SCALE_CAP = 90;        // base reference cap

  /* where on the N we dive — fraction across / down its bounding box.
     The N's RIGHT LEG (right vertical stroke) sits near the right edge of
     the glyph; ~0.92 across centres us in that stem, and ~0.72 down puts
     us at the BOTTOM BASE of the leg (a section of its lower stroke, with
     just enough ink below to keep flooding). There is NO drawn anchor —
     the zoom origin sits inside the leg's own ink, and that ink scales up
     to flood the viewport black. */
  const N_X = 0.77;
  const N_Y = 0.76;
  const INK_HALF = 4;              // px half-extent of leg ink at origin
                                   // (drives how far we must scale to flood)

  let trigger = null;
  let lastProgress = 0;

  /* ------------------------------------------------------------- */
  /*  Reduced motion: skip sequence, show About immediately        */
  /* ------------------------------------------------------------- */
  function reducedSetup() {
    const about = document.getElementById("about");
    if (about) {
      about.classList.add("about-visible");
      about.style.marginTop = "0px";
    }
    window.portfolioAboutReveal && window.portfolioAboutReveal.decode();
  }

  /* ------------------------------------------------------------- */
  /*  Wrap the last letter of "ALAN" (the N) once, so we can measure */
  /*  it precisely as the zoom target.                              */
  /* ------------------------------------------------------------- */
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

  /* Create / position the (invisible) origin reference on the leg.   */
  function ensureAnchor(zoom) {
    let a = zoom.querySelector(".portal-anchor");
    if (!a) {
      a = document.createElement("span");
      a.className = "portal-anchor";
      a.setAttribute("aria-hidden", "true");
      zoom.appendChild(a);
    }
    return a;
  }

  function positionAnchor(anchor, nEl, zoom) {
    const nr = nEl.getBoundingClientRect();
    const zr = zoom.getBoundingClientRect();
    const left = nr.left - zr.left + nr.width * N_X;
    const top = nr.top - zr.top + nr.height * N_Y;
    anchor.style.left = left + "px";
    anchor.style.top = top + "px";
  }

  /* ------------------------------------------------------------- */
  /*  Scale needed so the leg ink at the origin covers the viewport. */
  /*  We zoom until the small ink patch around the origin (INK_HALF)  */
  /*  fills past the farthest viewport corner -> solid black.         */
  /* ------------------------------------------------------------- */
  function computeMaxScale(anchor) {
    const r = anchor.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let maxDist = 0;
    [[0, 0], [window.innerWidth, 0], [0, window.innerHeight],
     [window.innerWidth, window.innerHeight]].forEach(([x, y]) => {
      const d = Math.hypot(x - cx, y - cy);
      if (d > maxDist) maxDist = d;
    });
    return Math.min((maxDist / INK_HALF) * 1.3, MAX_SCALE_CAP * 14);
  }

  /* ------------------------------------------------------------- */
  /*  Main init — called from script.js after title decode         */
  /* ------------------------------------------------------------- */
  function initHeroScroll() {
    if (REDUCED || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      reducedSetup();
      return;
    }
    if (trigger) return; // already wired

    gsap.registerPlugin(ScrollTrigger);

    const heroSection = document.getElementById("hero");
    const pin = document.getElementById("heroPin");
    const zoom = document.getElementById("heroTitleZoom");
    const content = document.getElementById("heroContent");
    const meta = document.getElementById("heroMeta");
    const tagline = document.getElementById("heroTagline");
    const actions = document.getElementById("heroActions");
    const hint = document.getElementById("heroHint");
    const about = document.getElementById("about");

    if (!pin || !content) { reducedSetup(); return; }

    const nEl = ensureNTarget(heroSection);
    const anchor = ensureAnchor(content);
    if (!nEl) { reducedSetup(); return; }

    window.portfolioAboutReveal && window.portfolioAboutReveal.seed();

    positionAnchor(anchor, nEl, content);

    /* zoom expands AROUND the bottom base of the right leg: the
       transform-origin sits inside the leg's ink, and scaling in place
       (no pan) makes that ink flood the viewport to solid black. */
    function originStr() {
      const ox = parseFloat(anchor.style.left) || 0;
      const oy = parseFloat(anchor.style.top) || 0;
      return ox + "px " + oy + "px";
    }

    let maxScale = computeMaxScale(anchor);
    let origin = originStr();

    const recompute = () => {
      gsap.set(content, { clearProps: "transform" });
      positionAnchor(anchor, nEl, content);
      maxScale = computeMaxScale(anchor);
      origin = originStr();
      apply(lastProgress);
    };

    /* apply visual state for a given 0..1 progress -------------- */
    function apply(p) {
      lastProgress = p;

      // accelerate the dive (portal rush)
      const zp = Math.pow(p, 1.7);
      const scale = 1 + zp * (maxScale - 1);

      // NON-promoted 2D transform scaled in place around the N: no
      // force3D / no will-change, so the browser repaints the vector
      // glyphs crisply at every scale. The WHOLE hero-content group is
      // scaled together, so the tagline / social / CTA naturally ride
      // the zoom outward and leave the viewport instead of fading.
      gsap.set(content, {
        transformOrigin: origin,
        x: 0,
        y: 0,
        scale: scale,
        force3D: false,
      });

      // peripheral hero elements are NOT faded — they scale away with the
      // group. Only the scroll hint (which lives outside the zoom layer)
      // fades, and pointer interaction is dropped once the dive starts.
      // The scroll hint now lives INSIDE the scaled group, so it rides the
      // zoom outward and leaves the viewport on its own — no fade.
      if (actions) actions.style.pointerEvents = p > 0.04 ? "none" : "";

      // About emerges from the black
      if (p >= FADE_IN_START) {
        const ap = (p - FADE_IN_START) / (1 - FADE_IN_START);
        if (about) {
          about.classList.add("about-visible");
          if (ap >= 0.99) {
            about.style.opacity = "";
          } else {
            about.style.opacity = String(Math.min(1, ap * 1.25));
          }
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

    /* ScrollTrigger ------------------------------------------- */
    trigger = ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: () => "+=" + (window.innerHeight * SCROLL_VH / 100),
      pin: pin,
      pinSpacing: true,
      scrub: SCRUB,
      anticipatePin: 1,
      onUpdate: (self) => {
        let p = self.progress;
        const diff = p - lastProgress;
        if (Math.abs(diff) > MAX_PROGRESS_STEP) {
          p = lastProgress + Math.sign(diff) * MAX_PROGRESS_STEP;
        }
        apply(p);
      },
      onLeave: () => apply(1),
      onEnterBack: () => {},
    });

    apply(0);

    window.addEventListener("resize", debounce(recompute, 160));

    window.portfolioHeroReset = function () {
      lastProgress = 0;
      window.portfolioScrollLock && window.portfolioScrollLock.unlock();
      apply(0);
      window.portfolioAboutReveal && window.portfolioAboutReveal.reset();
    };
  }

  /* utils -------------------------------------------------------- */
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
