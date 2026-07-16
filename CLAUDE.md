# Alan Cai Portfolio — Project Instructions

A static, single-page portfolio with a cinematic hero-scroll intro and **ENIGMA** cipher-minimal aesthetic. Preserve the existing design language unless explicitly asked to change it.

## Owner
Alan Cai — CS student, rising senior at NCSSM Durham (class of '27). Interests: computer vision, ML, cybersecurity, web dev. Motivation: real-world / local-level impact. 3+ projects shipped, 500+ users on tools built.

## Tech Stack (no build step)
- HTML5 (semantic sections), CSS3 (custom properties, no framework), vanilla JS (IIFE modules, `"use strict"`)
- Smooth scroll: **Lenis 1.1.18** (CDN)
- Scroll animation: **GSAP 3.12.5 + ScrollTrigger** (CDN)
- 3D dragon interstitial: **Three.js r128** + **GLTFLoader** (CDN — no build, no Draco/Meshopt wasm)
- Fonts: **JetBrains Mono** (body), **Share Tech Mono** (hero title), **Ma Shan Zheng** (nav wordmark 蔡卓成)
- No React, Tailwind, bundler, or TypeScript. Keep changes minimal, plain HTML/CSS/JS.
- Local dev: `python3 -m http.server 8080`. Deploy: static (GitHub Pages / Netlify).

## Design System — ENIGMA (cipher-minimal, monochrome monospace)
Color tokens (`:root`):
```
--bg: #efefef        /* page background — light gray */
--dark: #1c1c1c      /* nav, buttons, hover states */
--text: #1a1a1a      /* primary text */
--white: #ffffff     /* cards, section titles */
--secondary: #8a8a8a /* labels, indices */
--border: #cccccc    /* borders, dividers */
--muted: #6b6b6b     /* body copy, descriptions */
--nav-h: 64px
--maxw: 1200px
--pad: clamp(20px, 5vw, 64px)
--mono: "JetBrains Mono", ui-monospace, monospace
```
Typography:
- Body: JetBrains Mono, 15px, letter-spacing 0.01em
- Section titles: uppercase, 800, letter-spacing 0.14em, white box w/ border
- Nav links: 12px, uppercase, letter-spacing 0.18em
- Hero title: Share Tech Mono, clamp(64px, 18vw, 220px), tight line-height
- Nav wordmark: Ma Shan Zheng cursive — 蔡卓成 (NOT "AC"/"ALAN")
- Section indices: 01–04 in muted gray

Visual motifs: 1px borders (var(--border)) everywhere; white cards on gray; soft radial-gradient shadows under nav and section headers (blur ~8px); hover inverts dark↔white on project cards & social circles; selection = dark bg/white text; strictly monochrome — NO color accents.

**Rejected themes (do NOT reintroduce):** full Chinese calligraphy / rice-paper retheme; ink-brush / sumi-e backgrounds; bilingual nav overhaul or Noto Serif body; nav wordmark hover flicker/scramble; Scrambler/decode on interstitial text; timed or fire-once interstitial motion; random runtime glyph scatter on the dial.

## File Structure
```
index.html              # all markup — single page
styles.css              # full design system + responsive
script.js               # Lenis, Scrambler, typewriter, nav, reveals, boot
hero-scroll.js          # GSAP ScrollTrigger hero zoom + dragon stage drive
dragon-interstitial.js  # Three.js dragon flight engine (window.portfolioDragon)
scripts/prep-dragon.mjs # strips anim/textures from raw Sketchfab export → assets/dragon.glb
assets/ favicon.svg, photo.png, dragon.glb
```
Script load order: GSAP → ScrollTrigger → Lenis → three.min.js (r128) → GLTFLoader → dragon-interstitial.js → hero-scroll.js → script.js

## Signature interaction — Hero scroll zoom (hero-scroll.js)
Pins `.hero-pin` for 340vh scroll desktop / 250vh touch (`SCROLL_VH`), scrubbed 0.5 (desktop) / 0.22 (touch). Dragon flight speed = `(DRAGON_OUT − DRAGON_IN) × SCROLL_VH` (design target ≈ 230vh desktop) — tune that runway here, never inside `dragon-interstitial.js`.

Phase map (scrub progress `p` ∈ [0,1]):
```
ZOOM_END      = 0.26          /* zoom completes; ≈68vh desktop — same absolute feel as before */
DRAGON_IN/OUT = 0.24 / 0.92   /* dragon local-q window ≈177vh desktop; backdrop fades 0.24–0.27 in, 0.92–0.95 out */
FADE_IN_START = 0.90          /* About fades in */
```

1. Load → title scrambles/decrypts L→R (script.js); scroll locked until done. On decode finish, `boot()` starts `portfolioDragon.preload()` so the ~2MB glb downloads while the user reads the hero (never blocks scroll).
2. After decode, the final **N** of "ALAN" is wrapped in `.title-n` and a near-black `.portal-anchor` (#111) is placed mid-height on the N's **right leg** (right vertical stroke; `N_X=0.93, N_Y=0.50`) — invisible at rest.
3. Scroll → hero pins, `.hero-title-zoom` scales up around the anchor's local point (`transform-origin` = anchor position, **no pan**). Zoom is remapped via `clamp(p / ZOOM_END)` so it completes at `ZOOM_END`; the dive floods the viewport to solid black (scale ~178 at end).
4. Letters stay **crisp**: the zoom layer is a NON-promoted 2D transform (`force3D:false`, no `will-change`), so the browser re-rasterises the vector glyphs at every scale instead of stretching a bitmap. Letters stay fully opaque — never fade. **This no-promotion/no-3D rule applies ONLY to `.hero-title-zoom`** — the dragon canvas is its own composited layer.
5. Tagline + social + CTA + meta + hint fade out early in the zoom.
6. **Dragon interstitial (black phase)** holds between zoom-end and About (see below).
7. About emerges from the black from `FADE_IN_START` (0.90); About title decodes via Scrambler; `.reveal` els get `.in`.
- Scroll capped (`MAX_PROGRESS_STEP = 0.05`) to damp fast-flick blow-through.
- Scroll back up: `portfolioHeroReset()` (also clears dragon stage + `setActive(false)`). Reduced motion: skip sequence, About shows via `.about-visible`; dragon stage never created, glb never fetched.

### Dragon interstitial (black phase)
Injected by JS as `div.dragon-stage` appended to `#heroPin` (same pattern as `.portal-anchor`) — **never** in `index.html`, **never** under reduced motion. Absolute inset 0, `z-index` above the title zoom and below the nav, `pointer-events: none`. Background and Three.js fog are `var(--text)` `#1a1a1a` so the stage seams with the flooded glyph ink (letter ink = `--text`, not `#111`). Backdrop opacity = `ramp(p, 0.24, 0.27) * (1 - ramp(p, 0.92, 0.95))` — a **scene transition**, not a creature fade.

Engine: `dragon-interstitial.js` → `window.portfolioDragon { preload, attach, render(q), setActive, ready, failed }`. Model: `assets/dragon.glb` (~1.5–2.5MB), prepared by `scripts/prep-dragon.mjs` (strips baked animation + textures; keeps skeleton / skin weights / IBMs). **Never re-add animations or textures** — the site renders untextured wireframe. Wireframe material `MeshBasicMaterial({ color: 0xbfbfbf, wireframe: true })`; entry fade only via `ramp(q, 0, 0.10)` (toggle `transparent` only while fading). Dragon-only black phase — no seal / interstitial 蔡卓成. If `failed()` (no WebGL / glb error), the stage still shows solid black.

While `p ∈ [0.22, 0.96]` and `ready()`, hero-scroll calls `setActive(true)` and `render(q)` with `q = ramp(p, DRAGON_IN, DRAGON_OUT)`; otherwise `setActive(false)` (zero GPU cost off-screen).

**Frozen by design review — do not tune without explicit request:**
```
SIZE = 3.30, WAVE = 0.0, PORPOISE = 1.70, TWIST = 1.70, TEMPO = 3.30
travel easing = Math.pow(q, 1.35)   /* was q² — too hot in the back half */
path = WIDE SWEEP (PATH_WIDE in dragon-interstitial.js)
wire color = 0xbfbfbf
```

**Hard rules:**
- Every dragon value is a pure function of interstitial local progress `q`. No clocks, no timers. Stop scrolling = dragon freezes; scroll up = it swims backward. The site-wide pure-function-of-progress rule holds with no exceptions.
- Bind pose comes from **inverted `inverseBindMatrices`**, NOT the node-tree rest pose (this asset's node rest pose is curled; the straight spine lives in the IBMs). Skinned meshes are re-bound with **identity bind matrices**. Do not "simplify" either.
- The dragon **never fades on exit** — it physically overshoots the path end by one body length (`headU = 0.02 + pow(q, 1.35) * (0.98 + bodyU + 0.06)`). Backdrop fade ≠ creature fade.
Hero title split on load:
```html
<h1 class="hero-title" data-text="ALAN CAI">
  <span class="title-word title-word-left">ALAN</span>
  <span class="portal-gap" aria-hidden="true"></span>
  <span class="title-word title-word-right">CAI</span>
</h1>
```
`.title-word` letter-spacing -0.05em. The `.portal-gap` is a legacy spacer between the words; the actual zoom target is the **right leg of the N** (via `.title-n` + `.portal-anchor`), NOT the gap. The dive goes down the N's right stroke and ends on full black.

## Animation systems (script.js)
- **Scrambler**: random glyphs `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>=?*+`, sequential L→R (`seq:true`). Used for hero title, `[data-decode]` section titles, project card hover.
- **Typewriter**: prefix "I build ", cycles phrases (secure systems, ML models, web applications…), blinking `|`.
- **Reveal**: `.reveal` starts opacity 0 / translateY(28px); `.in` triggers CSS transition; `data-delay="1|2|3"` staggers. About & Projects reveals are scroll-driven.
- **Projects reveal**: hidden until "View Work" click or scroll into view; GSAP fade + title decode; `portfolioProjectsReset()` on return.
- **Lenis+GSAP sync**: `ScrollTrigger.scrollerProxy` on documentElement; `gsap.ticker` drives Lenis raf; anchors use `lenis.scrollTo` with nav offset.

## Global window API
`portfolioLenis`, `portfolioHeroTitleDecoded`, `portfolioScrollLock {lock,unlock}`, `portfolioAboutReveal {seed,decode,reset}`, `portfolioHeroReset`, `portfolioProjectsReset`, `initHeroScroll(titleEl)`, `portfolioDragon {preload,attach,render,setActive,ready,failed}`.

## Layout
nav (fixed, dark, z100: wordmark 蔡卓成 → hero, links About|Projects|Skills|Contact, mobile hamburger + slide-down menu) → main (z3): #hero.hero-scroll (.hero-pin > .hero-stage > .hero-content: title-zoom, tagline, actions[social + CTA]) → #about (2-col about-grid: bio+stats / experience timeline + impact 500+) → #projects (3-col proj-card grid) → #skills (role-tag pills) → #contact (contact-block). All sections use `.container` (max 1200px, --pad).

Section header pattern:
```html
<header class="section-head reveal">
  <span class="section-index">01</span>
  <h2 class="section-title" data-decode="ABOUT ME">ABOUT ME</h2>
</header>
```
Project card: `.proj-num` (P / 01), `.proj-title`, `.proj-desc`, `.proj-arrow` (GITHUB →).
About grid: left = bio + stat boxes; right = experience timeline + impact number (500+).

## Responsive
- ≤1000px: Projects 2-col; About single column.
- ≤720px: nav links hidden + hamburger; Projects 1-col; smaller hero title.

## Accessibility
aria-label on wordmark/social/title; aria-live="polite" on tagline; aria-expanded on toggle; semantic HTML. `prefers-reduced-motion: reduce` disables typewriter blink, reveals, hero scroll, Lenis, and the dragon (no stage, no glb fetch).

## Conventions
Vanilla JS IIFEs `"use strict"`; no frameworks/CSS-in-JS; BEM-ish naming (`.hero-title-zoom`, `.about-timeline-item`); CSS organized by section w/ comment headers; minimal diffs, no refactors; no build tools/npm unless asked.

## When making changes
Read surrounding code first; test hero scroll + dragon interstitial + About fade after hero/layout changes; verify reduced-motion (no dragon stage / no glb fetch); keep ENIGMA monochrome intact; the zoom dives down the **right leg of the N** (via `.portal-anchor`) and ends on solid black at `ZOOM_END`; letters stay visible AND crisp during zoom (non-promoted 2D transform — never add `will-change`/`force3D` to `.hero-title-zoom`; this constraint does NOT apply to the dragon canvas); only tagline/actions fade on entry; every dragon value stays a pure function of `q`; do not retune frozen dragon constants without explicit request.

## Verification note (preview iframe quirks)
The offscreen preview iframe **freezes CSS transitions** at their start value, so `.reveal` elements read as `opacity:0` and screenshots look blank even though they reveal fine for a real user. To inspect content layout, inject `*{transition:none!important;animation:none!important}` and force-add `.in`. **IntersectionObserver also doesn't fire** in this iframe — that's why reveals are driven by a scroll-position check, not IO. Lenis intercepts `window.scrollTo`; destroy it (`portfolioLenis.destroy()`) before synthetic-scroll testing. **The WebGL canvas renders nothing in the offscreen preview iframe** — dragon phases must be eyeballed in a real browser. The glb preload starts at title-decode, so hard-refresh testing of the black phase should wait for network idle. `MAX_PROGRESS_STEP` makes instant scroll jumps lag through the phases (zoom → dragon → About), so progress trails the target in synthetic tests.
