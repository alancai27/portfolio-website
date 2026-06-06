# Alan Cai Portfolio — Project Instructions

A static, single-page portfolio with a cinematic hero-scroll intro and **ENIGMA** cipher-minimal aesthetic. Preserve the existing design language unless explicitly asked to change it.

## Owner
Alan Cai — CS student, rising senior at NCSSM Durham (class of '27). Interests: computer vision, ML, cybersecurity, web dev. Motivation: real-world / local-level impact. 3+ projects shipped, 500+ users on tools built.

## Tech Stack (no build step)
- HTML5 (semantic sections), CSS3 (custom properties, no framework), vanilla JS (IIFE modules, `"use strict"`)
- Smooth scroll: **Lenis 1.1.18** (CDN)
- Scroll animation: **GSAP 3.12.5 + ScrollTrigger** (CDN)
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

**Rejected themes (do NOT reintroduce):** full Chinese calligraphy / rice-paper retheme; ink-brush / sumi-e backgrounds; bilingual nav overhaul or Noto Serif body; nav wordmark hover flicker/scramble.

## File Structure
```
index.html       # all markup — single page
styles.css       # full design system + responsive
script.js        # Lenis, Scrambler, typewriter, nav, reveals, boot
hero-scroll.js   # GSAP ScrollTrigger hero zoom sequence
assets/ favicon.svg, photo.png
```
Script load order: GSAP → ScrollTrigger → Lenis → hero-scroll.js → script.js

## Signature interaction — Hero scroll zoom (hero-scroll.js)
Pins `.hero-pin` for 68vh scroll (`SCROLL_VH = 68`), scrubbed 0.5.
1. Load → title scrambles/decrypts L→R (script.js); scroll locked until done.
2. After decode, the final **N** of "ALAN" is wrapped in `.title-n` and a near-black `.portal-anchor` (#111) is placed mid-height on the N's **right leg** (right vertical stroke; `N_X=0.93, N_Y=0.50`) — invisible at rest.
3. Scroll → hero pins, `.hero-title-zoom` scales up around the anchor's local point (`transform-origin` = anchor position, **no pan**). The zoom dives straight down the right leg of the N; the anchor floods the viewport to solid black (scale ~178 at end).
4. Letters stay **crisp**: the zoom layer is a NON-promoted 2D transform (`force3D:false`, no `will-change`), so the browser re-rasterises the vector glyphs at every scale instead of stretching a bitmap. Letters stay fully opaque — never fade.
5. Tagline + social + CTA + meta + hint fade out in first ~30% of zoom.
6. About emerges from the black from 80% (`FADE_IN_START = 0.80`); About title decodes via Scrambler; `.reveal` els get `.in`.
- Scroll capped (`MAX_PROGRESS_STEP = 0.05`) to damp fast-flick blow-through.
- Scroll back up: `portfolioHeroReset()`. Reduced motion: skip sequence, About shows via `.about-visible`.

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
`portfolioLenis`, `portfolioHeroTitleDecoded`, `portfolioScrollLock {lock,unlock}`, `portfolioAboutReveal {seed,decode,reset}`, `portfolioHeroReset`, `portfolioProjectsReset`, `initHeroScroll(titleEl)`.

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
aria-label on wordmark/social/title; aria-live="polite" on tagline; aria-expanded on toggle; semantic HTML. `prefers-reduced-motion: reduce` disables typewriter blink, reveals, hero scroll, Lenis.

## Conventions
Vanilla JS IIFEs `"use strict"`; no frameworks/CSS-in-JS; BEM-ish naming (`.hero-title-zoom`, `.about-timeline-item`); CSS organized by section w/ comment headers; minimal diffs, no refactors; no build tools/npm unless asked.

## When making changes
Read surrounding code first; test hero scroll + About fade after hero/layout changes; verify reduced-motion; keep ENIGMA monochrome intact; the zoom dives down the **right leg of the N** (via `.portal-anchor` at `N_X=0.93, N_Y=0.50`) and ends on solid black; letters stay visible AND crisp during zoom (non-promoted 2D transform — never add `will-change`/`force3D` to `.hero-title-zoom`); only tagline/actions fade.

## Verification note (preview iframe quirks)
The offscreen preview iframe **freezes CSS transitions** at their start value, so `.reveal` elements read as `opacity:0` and screenshots look blank even though they reveal fine for a real user. To inspect content layout, inject `*{transition:none!important;animation:none!important}` and force-add `.in`. **IntersectionObserver also doesn't fire** in this iframe — that's why reveals are driven by a scroll-position check, not IO. Lenis intercepts `window.scrollTo`; destroy it (`portfolioLenis.destroy()`) before synthetic-scroll testing, and note the `MAX_PROGRESS_STEP` cap makes instant scroll jumps creep, so progress lags the target in tests.
