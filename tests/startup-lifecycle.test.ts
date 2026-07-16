import assert from "node:assert/strict";
import test from "node:test";
import { admitStartup } from "../src/startup-admission.ts";
import { reconcileGraphNodes } from "../src/graph-reconcile.ts";
import type { GraphNode } from "../src/types.ts";
import { readFileSync } from "node:fs";

const node=(id:string,x:number,y:number,label=id)=>({id,path:id,label,folder:"",category:"",color:"#ffffff",icon:"",degree:1,baseRadius:4,radius:4,description:"",visible:true,hub:false,alwaysLabel:false,rootIndexStyled:false,family:"root",x,y}) satisfies GraphNode;

test("restored startup waits for layout readiness and begins exactly once",()=>{let ready:(()=>void)|undefined,begins=0;admitStartup(false,next=>{ready=next},()=>begins++);assert.equal(begins,0);ready!();ready!();assert.equal(begins,1)});
test("manual open begins immediately when layout is ready",()=>{let registered=false,begins=0;admitStartup(true,()=>{registered=true},()=>begins++);assert.equal(registered,false);assert.equal(begins,1)});
test("closing before readiness cancels pending startup work",()=>{let ready:(()=>void)|undefined,begins=0;const cancel=admitStartup(false,next=>{ready=next},()=>begins++);cancel();ready!();assert.equal(begins,0)});
test("topology reconciliation preserves unchanged identity and transient coordinates",()=>{const keep=node("keep.md",10,20,"old"),remove=node("remove.md",30,40),freshKeep=node("keep.md",900,800,"new"),added=node("added.md",50,60),result=reconcileGraphNodes([keep,remove],[freshKeep,added]);assert.equal(result.nodes[0],keep);assert.deepEqual({x:keep.x,y:keep.y,label:keep.label},{x:10,y:20,label:"new"});assert.deepEqual([...result.removedIds],["remove.md"]);assert.deepEqual(result.added,[added])});
const viewSource=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");
test("prepared scene is rendered before reveal and physics starts after first paint",()=>{const prepared=viewSource.indexOf('this.setStartupPhase("prepared")'),revealed=viewSource.indexOf('this.setStartupPhase("settling")'),painted=viewSource.indexOf("this.startupMetrics.firstPaintAt=performance.now()"),worker=viewSource.indexOf("this.startActiveWorker(true,{heat:1,startup:true})",painted);assert.ok(prepared>0&&prepared<revealed);assert.ok(revealed<painted&&painted<worker);assert.match(viewSource,/renderer\.render\(this\.pixi\.stage\)/)});
test("startup has no equilibrium deadline path",()=>{const workerSource=readFileSync(new URL("../src/physics-worker.ts",import.meta.url),"utf8"),initial=viewSource.match(/private finishInitialLayout[\s\S]*?\n\s*private recordTerminalMetrics/)?.[0]??"";assert.match(workerSource,/maxSubsteps=mode==='startup'\?Infinity/);assert.match(workerSource,/expired=mode!==\'startup\'/);assert.doesNotMatch(viewSource,/equilibrium deadline/);assert.match(initial,/this\.completeStartup\(metrics\)/);assert.doesNotMatch(initial,/degradeStartup|deadline/)});
test("moving edges are emitted through style buckets",()=>{assert.match(viewSource,/edgeBuckets=new Map/);assert.match(viewSource,/bucket\.segments\.push/);assert.match(viewSource,/for\(const bucket of edgeBuckets\.values\(\)\)/)});
