import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const text=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
const json=(path:string)=>JSON.parse(text(path));

test("release metadata is consistently versioned and desktop-only",()=>{
  const manifest=json("../manifest.json"),pkg=json("../package.json"),lock=json("../package-lock.json"),versions=json("../versions.json");
  assert.equal(manifest.version,"2.0.0");
  assert.equal(pkg.version,manifest.version);
  assert.equal(lock.version,manifest.version);
  assert.equal(lock.packages[""].version,manifest.version);
  assert.equal(versions[manifest.version],manifest.minAppVersion);
  assert.equal(manifest.isDesktopOnly,true);
});

test("production build emits and verifies the complete artifact contract",()=>{
  const pkg=json("../package.json"),build=text("../esbuild.config.mjs"),verify=text("../tools/verify-artifacts.mjs"),contract=json("../config/v2_artifacts.json");
  assert.match(pkg.scripts.build,/verify-artifacts\.mjs/);
  assert.match(build,/outfile:"graph-worker\.js"/);
  assert.deepEqual(contract.artifacts.map((artifact:{path:string})=>artifact.path),["main.js","graph-worker.js","graph-sim.wasm","manifest.json","styles.css"]);
  assert.match(verify,/Required production artifact is missing or empty/);
  assert.match(verify,/Unexpected or stale bundle/);
});

test("Phase 8 verification fails closed on runtime evidence and installed hashes",()=>{
  const pkg=json("../package.json"),verify=text("../tools/verify-phase8.mjs"),harness=text("../tools/benchmark-harness.js");
  assert.match(pkg.scripts["verify:phase8"],/verify-phase8\.mjs/);
  for(const report of ["baseline.json","rapid-drag.json","manual-open.json","live-baseline.json","idle-audit.json"])assert.match(verify,new RegExp(report.replace(".","\\.")));
  assert.match(verify,/installed .* hash does not match the production build/);
  assert.match(verify,/16\.667 ms worker-tick p95 budget/);
  assert.match(harness,/artifactHashes/);
  assert.match(harness,/getRuntimeDiagnostics/);
});

test("production source has no dormant V1 force or Tune paths",()=>{
  const sources=["../src/defaults.ts","../src/types.ts","../src/main.ts","../src/graph-view.ts","../src/worker-protocol.ts","../tools/benchmark-harness.js"].map(text).join("\n");
  for(const legacy of ["siblingLinkForce","rootLinkForce","runTuneBurst","burstComplete","createPhysicsWorkerSource"])assert.doesNotMatch(sources,new RegExp(legacy,"i"));
  assert.doesNotMatch(sources,/new\s+Blob|createObjectURL/);
});

test("worker assets resolve from the installed plugin directory and diagnostics expose engine selection",()=>{
  const view=text("../src/graph-view.ts"),worker=text("../src/graph-worker.ts"),factory=text("../src/physics-worker.ts"),build=text("../esbuild.config.mjs");
  assert.match(view,/manifest\.dir/);
  assert.match(view,/adapter\.getFullPath\(`\$\{directory\}\/\$\{GRAPH_WORKER_ASSET\}`\)/);
  assert.match(view,/adapter instanceof FileSystemAdapter/);
  assert.match(factory,/data:text\/javascript;base64/);
  assert.doesNotMatch(factory,/Blob|createObjectURL|worker_threads/);
  assert.match(build,/platform:"browser",format:"iife"/);
  assert.match(view,/physics-engine-fallback/);
  assert.match(view,/physics-engine-selected/);
  assert.match(worker,/GRAPH_WORKER_BOOTSTRAP/);
  assert.match(worker,/createPreferredSimulationEngine\(wasm\)/);
});
