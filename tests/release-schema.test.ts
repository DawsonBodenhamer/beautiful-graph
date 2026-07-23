import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const text=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
const json=(path:string)=>JSON.parse(text(path));

test("release metadata is consistently versioned and desktop-only",()=>{
  const manifest=json("../manifest.json"),pkg=json("../package.json"),lock=json("../package-lock.json"),versions=json("../versions.json");
  assert.equal(manifest.version,"2.0.2");
  assert.equal(pkg.version,manifest.version);
  assert.equal(lock.version,manifest.version);
  assert.equal(lock.packages[""].version,manifest.version);
  assert.equal(versions[manifest.version],manifest.minAppVersion);
  assert.equal(manifest.isDesktopOnly,true);
});

test("production build emits and verifies the Community three-file contract",()=>{
  const pkg=json("../package.json"),build=text("../esbuild.config.mjs"),embedded=text("../tools/build-embedded-assets.mjs"),verify=text("../tools/verify-artifacts.mjs"),contract=json("../config/v2_artifacts.json");
  assert.match(pkg.scripts.build,/verify-artifacts\.mjs/);
  assert.match(pkg.scripts["build:assets"],/build-embedded-assets\.mjs/);
  assert.doesNotMatch(build,/outfile:"graph-worker\.js"/);
  assert.match(embedded,/src\/graph-worker\.ts/);
  assert.match(embedded,/EMBEDDED_WORKER_SOURCE/);
  assert.match(embedded,/EMBEDDED_WASM_BASE64/);
  assert.deepEqual(contract.artifacts.map((artifact:{path:string})=>artifact.path),["main.js","manifest.json","styles.css"]);
  assert.match(verify,/Required production artifact is missing or empty/);
  assert.match(verify,/Unexpected or stale bundle/);
  assert.match(verify,/embedded runtime payload/);
  assert.match(verify,/dynamic JavaScript execution/);
});

test("release stylesheet avoids forced cascade overrides and unsupported scrollbar styling",()=>{
  const styles=text("../styles.css");
  assert.doesNotMatch(styles,/!important/);
  assert.doesNotMatch(styles,/scrollbar-(?:color|width)/);
});

test("Phase 8 verification fails closed on runtime evidence and installed hashes",()=>{
  const pkg=json("../package.json"),verify=text("../tools/verify-phase8.mjs"),harness=text("../tools/benchmark-harness.js");
  assert.match(pkg.scripts["verify:phase8"],/verify-phase8\.mjs/);
  for(const report of ["baseline.json","rapid-drag.json","manual-open.json","live-baseline.json","idle-audit.json"])assert.match(verify,new RegExp(report.replace(".","\\.")));
  assert.match(verify,/installed .* hash does not match the production build/);
  assert.match(verify,/16\.667 ms worker-tick p95 budget/);
  assert.match(verify,/representativeNodeTolerance=\.05/);
  assert.match(harness,/artifactHashes/);
  assert.match(harness,/getRuntimeDiagnostics/);
  assert.match(harness,/function obsidianVersion\(\)/);
  assert.match(harness,/initialOccupancyRange:\[\.84,\.9\]/);
  assert.match(harness,/startupLongTaskPolicy:"record-only-user-approved"/);
  assert.match(harness,/strictPassed=lifecyclePassed&&longTasks\.every/);
  assert.match(verify,/approved record-only long-task policy/);
  assert.match(harness,/progressivePaint=metrics\.finalNodeCount===startupNodes\.length/);
  assert.match(harness,/\["physicsWake","camera","gui"\]/);
  assert.doesNotMatch(harness,/finalOccupancy>=\.84/);
  assert.match(verify,/Rapid-drag run .* exceeded the 50 ms main-thread task limit/);
});

test("production source has no dormant V1 force or Tune paths",()=>{
  const sources=["../src/defaults.ts","../src/types.ts","../src/main.ts","../src/graph-view.ts","../src/worker-protocol.ts","../tools/benchmark-harness.js"].map(text).join("\n");
  for(const legacy of ["siblingLinkForce","rootLinkForce","runTuneBurst","burstComplete","createPhysicsWorkerSource"])assert.doesNotMatch(sources,new RegExp(legacy,"i"));
  assert.doesNotMatch(sources,/new\s+Blob|createObjectURL/);
});

test("public runtime avoids network access and hardcoded configuration directories",()=>{
  const main=text("../src/main.ts"),wasm=text("../src/wasm-simulation-engine.ts"),readme=text("../README.md");
  assert.doesNotMatch(`${main}\n${wasm}`,/fetch\(|requestUrl|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(main,/\.obsidian\/plugins/);
  assert.match(main,/vault\.configDir/);
  assert.match(main,/name:"Open graph"/);
  assert.match(main,/id:"open-graph"/);
  assert.doesNotMatch(main,/open-beautiful-graph/);
  assert.match(main,/onunload\(\):void/);
  assert.doesNotMatch(main,/detachLeavesOfType/);
  assert.match(readme,/never edits note contents/);
  assert.match(readme,/enumerates Markdown files and link metadata/);
  assert.match(readme,/in-memory search index/);
  assert.match(readme,/never edits note contents or sends vault paths, metadata, or note text over the network/);
  assert.match(readme,/local troubleshooting log stay in the plugin's Obsidian data directory/);
});

test("worker and Wasm are embedded while diagnostics expose engine selection",()=>{
  const view=text("../src/graph-view.ts"),worker=text("../src/graph-worker.ts"),factory=text("../src/physics-worker.ts"),build=text("../esbuild.config.mjs");
  assert.doesNotMatch(view,/FileSystemAdapter|GRAPH_WORKER_ASSET|GRAPH_WASM_ASSET/);
  assert.match(factory,/EMBEDDED_WORKER_SOURCE/);
  assert.match(factory,/EMBEDDED_WASM_BASE64/);
  assert.match(factory,/data:text\/javascript;base64/);
  assert.doesNotMatch(factory,/Blob|createObjectURL|worker_threads/);
  assert.match(text("../tools/build-embedded-assets.mjs"),/platform:"browser"/);
  assert.match(view,/physics-engine-fallback/);
  assert.match(view,/physics-engine-selected/);
  assert.match(view,/physics-worker-failure/);
  assert.match(worker,/GRAPH_WORKER_BOOTSTRAP/);
  assert.match(worker,/createPreferredSimulationEngine\(wasm\)/);
});
