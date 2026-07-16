#!/usr/bin/env node
/**
 * Strip unused animation + textures from the Sketchfab Chinese dragon export
 * (scene.gltf + scene.bin) and write a lean binary GLB for the portfolio site.
 *
 * Keeps skeleton, skin weights, and inverse bind matrices — no Draco/Meshopt.
 */
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger, NodeIO } from "@gltf-transform/core";
import { prune, weld } from "@gltf-transform/functions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INPUT = resolve(ROOT, "scene.gltf");
const OUTPUT = resolve(ROOT, "assets/dragon.glb");

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function inputSizeBytes() {
  const gltf = statSync(INPUT).size;
  let bin = 0;
  try {
    bin = statSync(resolve(ROOT, "scene.bin")).size;
  } catch {
    /* external .bin may be absent if already packed */
  }
  return gltf + bin;
}

const beforeBytes = inputSizeBytes();
console.log(`Input:  ${INPUT}`);
console.log(`Before: ${formatBytes(beforeBytes)} (scene.gltf + scene.bin)`);

const io = new NodeIO();
// Texture PNG uris are unused at runtime and may be absent on disk.
io.setStrictResources(false);
io.setLogger(new Logger(Logger.Verbosity.ERROR));

const document = await io.read(INPUT);
const root = document.getRoot();

const animCount = root.listAnimations().length;
// dispose() on Animation does not cascade — channels/samplers keep
// accessors alive and prune() will not reclaim the baked clip (~16MB).
root.listAnimations().forEach((a) => {
  a.listChannels().forEach((c) => c.dispose());
  a.listSamplers().forEach((s) => s.dispose());
  a.dispose();
});
console.log(`Disposed ${animCount} animation(s)`);

for (const material of root.listMaterials()) {
  material
    .setBaseColorTexture(null)
    .setEmissiveTexture(null)
    .setNormalTexture(null)
    .setOcclusionTexture(null)
    .setMetallicRoughnessTexture(null);
}

const texCount = root.listTextures().length;
root.listTextures().forEach((t) => t.dispose());
console.log(`Disposed ${texCount} texture(s); cleared material texture slots`);
console.log(`Kept ${root.listMaterials().length} material(s)`);

await document.transform(prune(), weld());

mkdirSync(dirname(OUTPUT), { recursive: true });
await io.write(OUTPUT, document);

const afterBytes = statSync(OUTPUT).size;
const outDoc = await io.read(OUTPUT);
const outRoot = outDoc.getRoot();
const skins = outRoot.listSkins();
const jointCount = skins.reduce((n, s) => n + s.listJoints().length, 0);

console.log(`Output: ${OUTPUT}`);
console.log(`After:  ${formatBytes(afterBytes)}`);
console.log(
  `Skins: ${skins.length}; joints: ${jointCount}` +
    (skins[0] ? ` (skin[0] inverseBinds: ${skins[0].getInverseBindMatrices() ? "yes" : "NO"})` : "")
);
console.log(`Animations remaining: ${outRoot.listAnimations().length}`);
console.log(`Textures remaining: ${outRoot.listTextures().length}`);

if (afterBytes >= 3 * 1024 * 1024) {
  console.error("ERROR: assets/dragon.glb is >= 3MB");
  process.exit(1);
}
if (jointCount < 273) {
  console.error(`ERROR: expected >= 273 joints, got ${jointCount}`);
  process.exit(1);
}

console.log("OK");
