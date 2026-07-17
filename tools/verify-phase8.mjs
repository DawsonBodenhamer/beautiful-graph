import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const perfRoot=resolve(root,"tests/fixtures/perf");
const artifacts=["main.js","graph-worker.js","graph-sim.wasm","manifest.json","styles.css"];
const reports=["baseline.json","rapid-drag.json","manual-open.json","live-baseline.json","idle-audit.json"];
const fail=message=>{throw new Error(message)};
const readJson=path=>JSON.parse(readFileSync(path,"utf8"));
const hash=path=>createHash("sha256").update(readFileSync(path)).digest("hex");
const requireMetadata=(name,report)=>{
  if(report.schema!==3)fail(`${name} must use benchmark schema 3.`);
  if(!/^[0-9a-f]{7,40}$/i.test(report.commit??""))fail(`${name} has no release-candidate commit.`);
  const head=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
  if(!head.startsWith(report.commit)&&!report.commit.startsWith(head))fail(`${name} commit ${report.commit} does not match HEAD ${head}.`);
  if(!report.topologyHash||!report.settingsHash)fail(`${name} lacks topology/settings hashes.`);
  for(const field of ["obsidian","electron","operatingSystem","hardwareConcurrency","platform","viewport"]){if(report.environment?.[field]===undefined||report.environment[field]==="unknown")fail(`${name} lacks environment.${field}.`)}
  if(!["wasm","javascript"].includes(report.runtime?.engine))fail(`${name} lacks selected-engine evidence.`);
  if(!["shared","transfer"].includes(report.runtime?.transport))fail(`${name} lacks transport evidence.`);
  for(const artifact of artifacts){const actual=hash(resolve(root,artifact));if(report.artifactHashes?.[artifact]!==actual)fail(`${name} installed ${artifact} hash does not match the production build.`)}
};

for(const report of reports)if(!existsSync(resolve(perfRoot,report)))fail(`Missing Phase 8 runtime report: ${report}`);
const data=Object.fromEntries(reports.map(name=>[name,readJson(resolve(perfRoot,name))]));
for(const [name,report] of Object.entries(data))requireMetadata(name,report);
const signatures=new Set(Object.values(data).map(report=>`${report.commit}:${report.topologyHash}:${report.settingsHash}:${JSON.stringify(report.artifactHashes)}`));
if(signatures.size!==1)fail("Phase 8 reports do not describe one release candidate, topology, settings set, and artifact set.");

const topology=readJson(resolve(perfRoot,"topology.json"));
const representativeNodeTarget=1061,representativeNodeTolerance=.05,nodeCount=topology.nodes?.length??0,minNodes=Math.floor(representativeNodeTarget*(1-representativeNodeTolerance)),maxNodes=Math.ceil(representativeNodeTarget*(1+representativeNodeTolerance));
if(nodeCount<minNodes||nodeCount>maxNodes)fail(`Representative topology must remain within 5% of 1,061 nodes (${minNodes}-${maxNodes}); found ${nodeCount}.`);
const baseline=data["baseline.json"];
if(baseline.runtime.engine!=="wasm")fail("Production benchmark did not select Wasm.");
if(!baseline.results?.length)fail("Production benchmark contains no workload results.");
for(const result of baseline.results){
  if(result.longTaskMaxMs>50)fail(`${result.workload} run ${result.run} exceeded the 50 ms main-thread task limit.`);
  if(result.frameGapP95Ms>=33)fail(`${result.workload} run ${result.run} exceeded the 33 ms frame-gap p95 limit.`);
  if(result.workerTickSamples>0&&result.workerTickP95Ms>16.667)fail(`${result.workload} run ${result.run} exceeded the 16.667 ms worker-tick p95 budget.`);
}
const rapid=data["rapid-drag.json"];
for(const result of rapid.results??[]){
  if(result.longTaskMaxMs>50)fail(`Rapid-drag run ${result.run} exceeded the 50 ms main-thread task limit.`);
  if(result.pointerToPaintP95Ms>=33)fail(`Rapid-drag run ${result.run} exceeded the 33 ms input-to-paint p95 limit.`);
}
if((rapid.results??[]).length!==3)fail("Rapid-drag report must contain three runs.");
const manual=data["manual-open.json"];
if((manual.runs??[]).length!==3||manual.runs.some(run=>!run.passed))fail("One or more clean-open startup runs failed.");
const live=data["live-baseline.json"];
if(live.timedOut!==0)fail("Live topology-event audit contains a timeout.");
const workerHeap=(live.runtimeSamples??[]).map(sample=>sample.heapBytes).filter(Number.isFinite);
if(workerHeap.length<3||workerHeap.at(-1)>Math.max(...workerHeap.slice(0,-1)))fail("Worker memory did not return to a previously observed bound after reconciliation cleanup.");
if(data["idle-audit.json"].passed!==true)fail("Independent worker/renderer idle audit failed.");

console.log(`Verified Phase 8 runtime evidence for Beautiful Graph ${readJson(resolve(root,"manifest.json")).version} at ${baseline.commit}.`);
