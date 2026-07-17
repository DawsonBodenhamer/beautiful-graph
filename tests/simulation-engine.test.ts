import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JavaScriptSimulationEngine} from "../src/javascript-simulation-engine.ts";
import {WASM_ABI_VERSION,toSimulationForces} from "../src/simulation-contract.ts";
import {createPreferredSimulationEngine,createWasmSimulationEngine} from "../src/wasm-simulation-engine.ts";
import {DEFAULT_FORCES} from "../src/defaults.ts";
import type {GraphEdge} from "../src/types.ts";
import type {WorkerNode} from "../src/worker-protocol.ts";

type Fixture={tolerance:number;nodes:Array<{id:string;x:number;y:number;vx:number;vy:number;fx:number|null;fy:number|null;weight:number;collisionRadius:number}>;links:Array<{source:string;target:string}>};
const fixturePath=new URL("fixtures/conformance/scenarios.json",import.meta.url);
const fixtures=(JSON.parse(readFileSync(fixturePath,"utf8")) as {scenarios:Fixture[]}).scenarios;
const wasmBytes=readFileSync(new URL("../graph-sim.wasm",import.meta.url));
const nodes=(fixture:Fixture):WorkerNode[]=>fixture.nodes.map(node=>({...node,preserve:false,degree:node.weight,radius:node.collisionRadius}));
const edges=(fixture:Fixture):GraphEdge[]=>fixture.links.map(edge=>({...edge,forward:true,reverse:false,relationship:"cross"}));

test("audited slider defaults convert to exact worker force values",()=>{
  const converted=toSimulationForces(DEFAULT_FORCES);assert.ok(Math.abs(converted.center-.1)<Number.EPSILON);assert.deepEqual({...converted,center:.1},{center:.1,charge:-1000,link:1,distance:250});
  assert.equal(toSimulationForces({...DEFAULT_FORCES,repel:0}).charge,-1);
});

test("production Wasm artifact exposes ABI 1 and reusable linear memory",async()=>{
  const {instance}=await WebAssembly.instantiate(wasmBytes,{}),exports=instance.exports as unknown as {memory:WebAssembly.Memory;bg_abi_version:()=>number;bg_reserve_nodes:(count:number)=>number;bg_reserve_links:(count:number)=>number};
  assert.equal(exports.bg_abi_version(),WASM_ABI_VERSION);
  const nodePointer=exports.bg_reserve_nodes(4),linkPointer=exports.bg_reserve_links(3),bytesBefore=exports.memory.buffer.byteLength;
  assert.equal(exports.bg_reserve_nodes(4),nodePointer);assert.equal(exports.bg_reserve_links(3),linkPointer);assert.equal(exports.memory.buffer.byteLength,bytesBefore);
});

test("forced Wasm and JavaScript engines satisfy shared conformance fixtures",async()=>{
  for(const fixture of fixtures){
    const javascript=new JavaScriptSimulationEngine(),wasm=await createWasmSimulationEngine(wasmBytes);
    javascript.updateForces(DEFAULT_FORCES);wasm.updateForces(DEFAULT_FORCES);javascript.reconcile(nodes(fixture),edges(fixture));wasm.reconcile(nodes(fixture),edges(fixture));
    for(let tick=0;tick<3;tick++){const alpha=Math.pow(.9772372209558107,tick+1);javascript.tick(alpha);wasm.tick(alpha)}
    const left=javascript.snapshot(),right=wasm.snapshot();assert.equal(left.length,right.length);
    for(let index=0;index<left.length;index++){assert.equal(left[index]!.id,right[index]!.id);for(const key of ["x","y","vx","vy"] as const)assert.ok(Math.abs(left[index]![key]-right[index]![key])<=fixture.tolerance,`${left[index]!.id}.${key} exceeded ${fixture.tolerance}`);assert.ok(Number.isFinite(right[index]!.x)&&Number.isFinite(right[index]!.y))}
  }
});

test("Wasm initialization rejection selects the JavaScript fallback",async()=>{
  const engine=await createPreferredSimulationEngine(new URL("data:application/wasm;base64,AA=="));
  assert.equal(engine.kind,"javascript");
});

test("force changes apply without reconstructing the fallback engine",()=>{
  const fixture=fixtures[0]!,engine=new JavaScriptSimulationEngine();engine.reconcile(nodes(fixture),edges(fixture));engine.updateForces(DEFAULT_FORCES);engine.tick(1);const first=engine.snapshot()[0]!.x;engine.updateForces({...DEFAULT_FORCES,center:0});engine.tick(1);assert.notEqual(engine.snapshot()[0]!.x,first);assert.equal(engine.kind,"javascript");
});

test("topology reconciliation preserves surviving engine records, coordinates, and velocities",async()=>{
  const fixture=fixtures[0]!,engines=[new JavaScriptSimulationEngine(),await createWasmSimulationEngine(wasmBytes)];
  for(const engine of engines){engine.reconcile(nodes(fixture),edges(fixture));engine.updateForces(DEFAULT_FORCES);engine.tick(.8);const survivor=engine.snapshot()[0]!,before={x:survivor.x,y:survivor.y,vx:survivor.vx,vy:survivor.vy};engine.reconcile([{id:survivor.id,preserve:true,degree:9,radius:70},{id:"added",preserve:false,x:12,y:34,degree:0,radius:4}],[]);assert.equal(engine.snapshot()[0],survivor);assert.deepEqual({x:survivor.x,y:survivor.y,vx:survivor.vx,vy:survivor.vy},before);assert.equal(survivor.degree,9);assert.deepEqual({x:engine.snapshot()[1]?.x,y:engine.snapshot()[1]?.y},{x:12,y:34});engine.dispose()}
});
