/* =================================================================
   ALAN CAI — PORTFOLIO · dragon-interstitial.js
   Scroll-driven wireframe dragon flight for the hero black phase.
   Ported from dragon-audition-harness-v11.html (approved flight) —
   WIDE SWEEP + bind-IBM bone warp. Pure function of q.
   No HUD, no clocks, no Draco. THREE global assumed (CDN, next).
   ================================================================= */
"use strict";

(function () {
  /* ——— FROZEN BY DESIGN REVIEW ——— */
  const BODY_LEN_BASE = 3.6;
  const SIZE = 3.30;
  const WAVE = 0.0;
  const PORPOISE = 1.70;
  const TWIST = 1.70;
  const TEMPO = 3.30;
  const PATH_WIDE = [
    [-18, 5, -12], [-10, 3, -9], [-3, 1.6, -7], [4, 2.8, -6],
    [10, 0.5, -5], [11, -2.5, -4], [5, -3.6, -3.2], [-3, -3, -2.6],
    [-9, -0.5, -2.2], [-8.5, 2.4, -1.8], [-3, 3.2, -1.2], [1.8, 1.6, -0.4],
    [1.2, 0.2, 1.6], [0.8, 0.3, 4.5], [2.0, 1.1, 10], [3.4, 1.8, 17],
  ];
  /* ——— end frozen ——— */

  const EXIT_SOFT = 0.88; // NEW: u where facing begins easing into the exit direction
  const LIMB_RIDE = true;       // NEW: off-axis appendages ride their parent instead of sampling the path frame
  const LIMB_PERP_FRAC = 0.05;  // NEW: bind offset from the spine (fraction of spine length) above which a bone is an appendage
  const DEBUG_LIMB = true;      // NEW: log which bones are treated as appendages

  const FRAME_SAMPLES = 480;
  const FLIP = 1;
  const INK = 0x1a1a1a;
  const WIRE = 0xbfbfbf;
  const GLB_URL = "assets/dragon.glb";

  const TOUCH = typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  let _ready = false;
  let _failed = false;
  let _active = false;
  let _preloadPromise = null;

  let renderer = null;
  let scene = null;
  let camera = null;
  let containerEl = null;

  let flight = null;
  let quats = null;
  let curveLen = 1;
  let bankTable = null;

  let model = null;
  let mats = [];
  let bones = [];
  let bindData = null;
  let limbSet = null;
  let limbLocal = null;
  let axisIdx = 2;
  let sMin = 0;
  let sMax = 1;
  let cA = 0;
  let cB = 0;
  const updatedWorld = new Map();

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ramp = (p, a, b) => clamp01((p - a) / (b - a));
  const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  /* 1.35 = design-reviewed travel easing; 2.0 was too hot in the back half. */
  const easeIn = (t) => Math.pow(t, 1.35);

  function pixelRatioCap() {
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    return TOUCH ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
  }

  /* ---------------------------------------------- path ------------- */
  function buildPath() {
    const pts = PATH_WIDE.map((a) => new THREE.Vector3(a[0], a[1], a[2]));
    flight = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.35);
    curveLen = flight.getLength();
    const frames = flight.computeFrenetFrames(FRAME_SAMPLES, false);
    const up = new THREE.Vector3(0, 1, 0);
    const n0 = frames.normals[0];
    const b0 = frames.binormals[0];
    const useNormal = Math.abs(n0.dot(up)) >= Math.abs(b0.dot(up));
    const flipSign = (useNormal ? n0.dot(up) : b0.dot(up)) < 0 ? -1 : 1;
    quats = [];
    const m = new THREE.Matrix4();
    const x = new THREE.Vector3();
    const y = new THREE.Vector3();
    const z = new THREE.Vector3();
    for (let i = 0; i <= FRAME_SAMPLES; i++) {
      z.copy(frames.tangents[i]);
      y.copy(useNormal ? frames.normals[i] : frames.binormals[i]).multiplyScalar(flipSign);
      x.crossVectors(y, z).normalize();
      y.crossVectors(z, x).normalize();
      m.makeBasis(x, y, z);
      quats.push(new THREE.Quaternion().setFromRotationMatrix(m));
    }
    exitTangent.copy(frames.tangents[FRAME_SAMPLES]).normalize();
    exitQuat.copy(quats[FRAME_SAMPLES]);
    bankTable = new Float32Array(FRAME_SAMPLES + 1);
    for (let i = 0; i < FRAME_SAMPLES; i++) {
      const a = frames.tangents[i];
      const b = frames.tangents[i + 1];
      let dYaw = Math.atan2(b.x, b.z) - Math.atan2(a.x, a.z);
      if (dYaw > Math.PI) dYaw -= Math.PI * 2;
      if (dYaw < -Math.PI) dYaw += Math.PI * 2;
      bankTable[i] = Math.max(-0.6, Math.min(0.6, -dYaw * 30));
    }
    bankTable[FRAME_SAMPLES] = bankTable[FRAME_SAMPLES - 1];
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < FRAME_SAMPLES; i++) {
        bankTable[i] = (bankTable[i - 1] + bankTable[i] * 2 + bankTable[i + 1]) / 4;
      }
    }
  }

  function bankAt(u) {
    const f = Math.max(0, Math.min(0.99999, u)) * FRAME_SAMPLES;
    const i = Math.floor(f);
    return bankTable[i] + (bankTable[Math.min(i + 1, FRAME_SAMPLES)] - bankTable[i]) * (f - i);
  }

  const _endP0 = new THREE.Vector3();
  const _endT0 = new THREE.Vector3();
  const _endP1 = new THREE.Vector3();
  const _endT1 = new THREE.Vector3();
  const exitTangent = new THREE.Vector3();
  const exitQuat = new THREE.Quaternion();

  function pointAtExt(u, out) {
    if (u >= 0 && u <= 1) return flight.getPointAt(u, out);
    if (u < 0) {
      flight.getPointAt(0, _endP0);
      flight.getTangentAt(0, _endT0);
      return out.copy(_endP0).addScaledVector(_endT0, u * curveLen);
    }
    flight.getPointAt(1, _endP1);
    return out.copy(_endP1).addScaledVector(exitTangent, (u - 1) * curveLen);
  }

  function frameQuatAt(u, out) {
    const uc = Math.max(0, Math.min(0.99999, u));
    const f = uc * FRAME_SAMPLES;
    const i = Math.floor(f);
    out.copy(quats[i]).slerp(quats[Math.min(i + 1, FRAME_SAMPLES)], f - i);
    if (u >= EXIT_SOFT) {
      const t = smoother(clamp01((Math.min(u, 1) - EXIT_SOFT) / (1 - EXIT_SOFT)));
      out.slerp(exitQuat, t);
    }
    return out;
  }

  /* ---------------------------------------------- model ------------ */
  function installModel(gltf) {
    if (model && scene) scene.remove(model);
    model = gltf.scene || gltf.scenes[0];
    mats = [];
    const skinned = [];

    model.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      o.frustumCulled = false;
      const sk = !!o.isSkinnedMesh;
      const wire = new THREE.MeshBasicMaterial({
        color: WIRE,
        wireframe: true,
      });
      wire.skinning = sk;
      wire.morphTargets = !!(o.morphTargetInfluences && o.morphTargetInfluences.length);
      o.material = wire;
      mats.push({ mesh: o, list: [wire] });
      if (sk) skinned.push(o);
    });

    scene.add(model);
    if (!skinned.length) {
      _failed = true;
      return;
    }

    /* identity bind: vertex_world = boneWorld * inverseBind * v */
    skinned.forEach((sm) => sm.bind(sm.skeleton, new THREE.Matrix4()));

    /* bind-pose worlds from IBMs — node rest pose is curled; spine is in IBMs */
    const set = new Set();
    const bindMap = new Map();
    skinned.forEach((sm) => {
      const sk = sm.skeleton;
      sk.bones.forEach((b, i) => {
        if (set.has(b)) return;
        set.add(b);
        const m = sk.boneInverses[i].clone().invert();
        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        m.decompose(p, q, sc);
        bindMap.set(b, { p, q, sc });
      });
    });
    const depth = (b) => {
      let d = 0;
      let n = b;
      while (n.parent) {
        d++;
        n = n.parent;
      }
      return d;
    };
    bones = Array.from(set).sort((a, b) => depth(a) - depth(b));
    bindData = bindMap;

    const mn = new THREE.Vector3(1e9, 1e9, 1e9);
    const mx = new THREE.Vector3(-1e9, -1e9, -1e9);
    bones.forEach((b) => {
      mn.min(bindMap.get(b).p);
      mx.max(bindMap.get(b).p);
    });
    const ext = new THREE.Vector3().subVectors(mx, mn);
    axisIdx = ext.x >= ext.y && ext.x >= ext.z ? 0 : ext.y >= ext.z ? 1 : 2;
    sMin = mn.getComponent(axisIdx);
    sMax = mx.getComponent(axisIdx);
    const others = [0, 1, 2].filter((a) => a !== axisIdx);
    cA = (mn.getComponent(others[0]) + mx.getComponent(others[0])) / 2;
    cB = (mn.getComponent(others[1]) + mx.getComponent(others[1])) / 2;

    // --- NEW: classify off-axis appendage bones and precompute their bind-local transforms ---
    limbSet = new Set();
    limbLocal = new Map();
    if (LIMB_RIDE) {
      const othersB = [0, 1, 2].filter((a) => a !== axisIdx);
      const spineLenB = sMax - sMin;
      const composeBind = (b) => {
        const d = bindMap.get(b);
        return new THREE.Matrix4().compose(d.p, d.q, d.sc);
      };
      bones.forEach((b) => {
        const d = bindMap.get(b);
        if (!d) return;
        const parent = b.parent;
        if (!bindMap.has(parent)) return; // chain roots stay path-driven so the body still anchors to the flight
        const perp = Math.hypot(
          d.p.getComponent(othersB[0]) - cA,
          d.p.getComponent(othersB[1]) - cB
        );
        if (perp > LIMB_PERP_FRAC * spineLenB) {
          limbSet.add(b);
          limbLocal.set(
            b,
            new THREE.Matrix4().copy(composeBind(parent)).invert().multiply(composeBind(b))
          );
        }
      });
      if (DEBUG_LIMB) {
        const rows = [];
        bones.forEach((b) => {
          if (!limbSet.has(b)) return;
          const d = bindMap.get(b);
          const sN = (sMax - d.p.getComponent(axisIdx)) / (sMax - sMin);
          const perp = Math.hypot(
            d.p.getComponent([0, 1, 2].filter((a) => a !== axisIdx)[0]) - cA,
            d.p.getComponent([0, 1, 2].filter((a) => a !== axisIdx)[1]) - cB
          );
          rows.push({ name: b.name, parent: b.parent && b.parent.name, sN: +sN.toFixed(3), perp: Math.round(perp) });
        });
        console.log("[dragon] appendage bones (ride parent):", limbSet.size, "of", bones.length);
        console.table(rows);
      }
    }
  }

  /* ---------------------------------------------- update ----------- */
  const vPos = new THREE.Vector3();
  const vOff = new THREE.Vector3();
  const vX = new THREE.Vector3();
  const vY = new THREE.Vector3();
  const qFrame = new THREE.Quaternion();
  const qStation = new THREE.Quaternion();
  const qWorld = new THREE.Quaternion();
  const qRoll = new THREE.Quaternion();
  const qYaw = new THREE.Quaternion();
  const qPitch = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const vScl = new THREE.Vector3();
  const mDesired = new THREE.Matrix4();
  const mParentInv = new THREE.Matrix4();
  const mLimbWorld = new THREE.Matrix4();

  function setFade(vis) {
    const fading = vis < 0.999;
    mats.forEach((rec) => {
      rec.list.forEach((m) => {
        if (m.transparent !== fading) {
          m.transparent = fading;
          m.needsUpdate = true;
        }
        m.opacity = fading ? vis : 1;
        m.depthWrite = true;
      });
    });
  }

  function update(q) {
    const vis = ramp(q, 0.0, 0.10);

    if (model && bones.length) {
      const spineLen = sMax - sMin;
      const k = (BODY_LEN_BASE * SIZE) / spineLen;
      const bodyU = (BODY_LEN_BASE * SIZE) / curveLen;
      const headU = 0.02 + easeIn(q) * (0.98 + bodyU + 0.06);
      const amp = WAVE * 0.5;
      const porp = PORPOISE * 0.42;
      const twist = TWIST;
      const tempo = TEMPO;
      const others = [0, 1, 2].filter((a) => a !== axisIdx);

      updatedWorld.clear();
      for (let i = 0; i < bones.length; i++) {
        const bone = bones[i];
        const bd = bindData.get(bone);
        if (!bd) continue;

        if (limbSet && limbSet.has(bone)) {
          const bl = limbLocal.get(bone);
          const parent = bone.parent;
          const pw = updatedWorld.get(parent) || parent.matrixWorld;
          bone.matrix.copy(bl);
          bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
          updatedWorld.set(bone, mLimbWorld.multiplyMatrices(pw, bl).clone());
          continue;
        }

        const sRaw = bd.p.getComponent(axisIdx);
        const s = FLIP > 0 ? sRaw : sMin + sMax - sRaw;
        const behind = (sMax - s) * k;
        const sN = (sMax - s) / spineLen;
        const u = headU - behind / curveLen;

        pointAtExt(u, vPos);
        frameQuatAt(u, qFrame);

        const oA = (bd.p.getComponent(others[0]) - cA) * k;
        const oB = (bd.p.getComponent(others[1]) - cB) * k;
        const upIsA = others[0] === 1;
        vX.set(1, 0, 0).applyQuaternion(qFrame);
        vY.set(0, 1, 0).applyQuaternion(qFrame);

        const envL = Math.min(1, sN / 0.35) * amp;
        const envV = (0.35 + 0.65 * Math.min(1, sN / 0.3)) * porp;
        const ph1 = sN * 9.5 - q * 27 * tempo;
        const ph2 = sN * 5.0 - q * 17 * tempo;
        const w1 = Math.sin(ph1) * envL;
        const w2 = Math.sin(ph2) * envV;
        /* Spine centerline: wave displaces in path-frame axes */
        vPos.addScaledVector(vX, w1);
        vPos.addScaledVector(vY, w2);

        const yawA = Math.cos(ph1) * envL * 1.15;
        const pitchA = Math.cos(ph2) * envV * 0.85;
        let rollA = Math.sin(ph1 - 0.8) * envL * 0.9 + bankAt(u) * twist;
        rollA = Math.max(-1.1, Math.min(1.1, rollA));

        const headMix = Math.max(0, (0.18 - sN) / 0.18);
        const gazeYaw = Math.sin(q * 8) * 0.12 * headMix;
        const gazePitch = Math.sin(q * 11 + 1) * 0.10 * headMix;

        qRoll.setFromAxisAngle(Z, rollA);
        qYaw.setFromAxisAngle(Y, yawA + gazeYaw);
        qPitch.setFromAxisAngle(X, pitchA + gazePitch);
        /* positions and orientations MUST share this transform — splitting them
           corkscrews the limbs (fixed bug, see git history). */
        qStation.copy(qFrame).multiply(qYaw).multiply(qPitch).multiply(qRoll);

        vOff.set(upIsA ? oB : oA, upIsA ? oA : oB, 0).applyQuaternion(qStation);
        vPos.add(vOff);

        qWorld.copy(qStation).multiply(bd.q);

        vScl.copy(bd.sc).multiplyScalar(k);

        mDesired.compose(vPos, qWorld, vScl);
        const parent = bone.parent;
        const pw = updatedWorld.get(parent) || parent.matrixWorld;
        mParentInv.copy(pw).invert();
        bone.matrix.multiplyMatrices(mParentInv, mDesired);
        bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
        updatedWorld.set(bone, mDesired.clone());
      }
    }

    setFade(vis);
  }

  /* ---------------------------------------------- sizing ----------- */
  function resizeToContainer() {
    if (!renderer || !camera) return;
    const el = containerEl;
    const w = el ? el.clientWidth : window.innerWidth;
    const h = el ? el.clientHeight : window.innerHeight;
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatioCap());
    renderer.setSize(w, h, false);
  }

  function onResize() {
    if (!_active) return;
    resizeToContainer();
  }

  /* ---------------------------------------------- public API ------- */
  function preload() {
    if (_preloadPromise) return _preloadPromise;

    _preloadPromise = (async function () {
      if (typeof THREE === "undefined" || typeof THREE.GLTFLoader !== "function") {
        _failed = true;
        return;
      }

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      } catch (err) {
        _failed = true;
        return;
      }

      renderer.setPixelRatio(pixelRatioCap());
      renderer.setSize(1, 1, false);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(INK);
      scene.fog = new THREE.Fog(INK, 10, 26);

      camera = new THREE.PerspectiveCamera(50, 1, 0.06, 100);
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);

      buildPath();

      try {
        const gltf = await new Promise((resolve, reject) => {
          const loader = new THREE.GLTFLoader();
          loader.load(GLB_URL, resolve, undefined, reject);
        });
        installModel(gltf);
        if (_failed) return;
        _ready = true;
      } catch (err) {
        _failed = true;
      }
    })();

    return _preloadPromise;
  }

  function attach(container) {
    if (!renderer || !container) return;
    containerEl = container;
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    if (canvas.parentNode !== container) container.appendChild(canvas);
    resizeToContainer();
  }

  function render(q) {
    if (!_active || !_ready || !renderer || !scene || !camera) return;
    const p = clamp01(q);
    update(p);
    renderer.render(scene, camera);
  }

  function setActive(bool) {
    const next = !!bool;
    if (next === _active) return;
    _active = next;
    if (_active) {
      resizeToContainer();
      window.addEventListener("resize", onResize);
    } else {
      window.removeEventListener("resize", onResize);
    }
  }

  window.portfolioDragon = {
    preload: preload,
    attach: attach,
    render: render,
    setActive: setActive,
    ready: function () {
      return _ready;
    },
    failed: function () {
      return _failed;
    },
  };
})();
