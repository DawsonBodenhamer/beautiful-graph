import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createGraphWorkerRuntime} from "../src/worker-runtime.ts";
import {ALPHA_MIN,AUTOMATIC_WAKE_ALPHA,DRAG_ALPHA_TARGET,WORKER_PROTOCOL_VERSION,WORKER_TICK_INTERVAL_MS,type GraphWorkerResponse} from "../src/worker-protocol.ts";

const forces={center:1,repel:1,link:.04,distance:50};
const nodes=[{id:"a",preserve:false,x:0,y:0,degree:1,radius:4},{id:"b",preserve:false,x:100,y:0,degree:1,radius:4}];
const edges=[{source:"a",target:"b",forward:true,reverse:false,relationship:"cross" as const}];

function harness(shared=false){
  const messages:GraphWorkerResponse[]=[],timers=new Map<number,{callback:()=>void;delay:number}>();let nextId=0;
  const runtime=createGraphWorkerRuntime({post:message=>messages.push(message),setTimer:(callback,delay)=>{const id=++nextId;timers.set(id,{callback,delay});return id},clearTimer:id=>timers.delete(id as number),supportsSharedMemory:()=>shared});
  const runNext=()=>{const entry=timers.entries().next().value as [number,{callback:()=>void;delay:number}]|undefined;if(!entry)return false;timers.delete(entry[0]);entry[1].callback();return true};
  return{runtime,messages,timers,runNext};
}

function init(worker:ReturnType<typeof harness>,revision=1){worker.runtime.onMessage({type:"init",version:WORKER_PROTOCOL_VERSION,revision,nodes,edges,forces,heat:1})}

test("named worker factory never creates a Blob compatibility worker",()=>{
  const source=readFileSync(new URL("../src/physics-worker.ts",import.meta.url),"utf8");
  assert.match(source,/new Worker\(assetUrl,\{name:"beautiful-graph-physics"\}\)/);
  assert.doesNotMatch(source,/Blob|createObjectURL|createPhysicsWorkerSource/);
});

test("initialization queues exactly one audited-cadence timer",()=>{
  const worker=harness();init(worker);
  const ready=worker.messages.find(message=>message.type==="ready");assert.equal(ready?.type,"ready");if(ready?.type==="ready")assert.equal(ready.engine,"javascript");
  assert.equal(worker.timers.size,1);assert.equal([...worker.timers.values()][0]!.delay,WORKER_TICK_INTERVAL_MS);
  worker.runNext();assert.equal(worker.timers.size,1);assert.equal(worker.messages.filter(message=>message.type==="coordinates").length,2);
});

test("wake requests raise alpha and never cool a hotter simulation",()=>{
  const worker=harness();init(worker);const before=worker.runtime.inspect().alpha;
  worker.runtime.onMessage({type:"forces",version:WORKER_PROTOCOL_VERSION,forces,heat:AUTOMATIC_WAKE_ALPHA});
  assert.equal(worker.runtime.inspect().alpha,before);assert.equal(worker.timers.size,1);
});

test("scheduler sleeps below the audited threshold and restarts on change",()=>{
  const worker=harness();init(worker);let turns=0;while(worker.runNext()&&turns++<400){}
  assert.ok(turns>=300);assert.equal(worker.timers.size,0);assert.ok(worker.runtime.inspect().alpha<ALPHA_MIN);assert.equal(worker.messages.at(-1)?.type,"sleep");
  worker.runtime.onMessage({type:"forces",version:WORKER_PROTOCOL_VERSION,forces,heat:AUTOMATIC_WAKE_ALPHA});
  assert.equal(worker.runtime.inspect().alpha,AUTOMATIC_WAKE_ALPHA);assert.equal(worker.timers.size,1);
});

test("topology reconciliation preserves surviving state and uses one persistent runtime",()=>{
  const worker=harness();init(worker);worker.runNext();const before=worker.messages.at(-1);assert.equal(before?.type,"coordinates");
  worker.runtime.onMessage({type:"topology",version:WORKER_PROTOCOL_VERSION,revision:2,nodes:[{id:"a",preserve:true,degree:1,radius:4},{id:"c",preserve:false,x:20,y:30,degree:0,radius:4}],edges:[],heat:AUTOMATIC_WAKE_ALPHA});
  assert.deepEqual(worker.runtime.inspect().nodeIds,["a","c"]);assert.equal(worker.runtime.inspect().revision,2);assert.equal(worker.timers.size,1);
  worker.runNext();const after=worker.messages.at(-1);assert.equal(after?.type,"coordinates");if(after?.type==="coordinates"&&after.transport==="transfer")assert.notEqual(after.coords[0],999);
});

test("drag owns the audited alpha target until release",()=>{
  const worker=harness();init(worker);worker.runtime.onMessage({type:"dragStart",version:WORKER_PROTOCOL_VERSION,id:"a",x:25,y:30});
  assert.equal(worker.runtime.inspect().alphaTarget,DRAG_ALPHA_TARGET);worker.runtime.onMessage({type:"dragEnd",version:WORKER_PROTOCOL_VERSION,id:"a"});assert.equal(worker.runtime.inspect().alphaTarget,0);
});

test("invalid messages fail explicitly and dispose cancels all work",()=>{
  const worker=harness();worker.runtime.onMessage({type:"init",version:999});assert.equal(worker.messages.at(-1)?.type,"failure");
  init(worker);worker.runtime.dispose();assert.equal(worker.timers.size,0);assert.equal(worker.runtime.inspect().scheduled,false);
});

test("separate graph views have independent worker ownership",()=>{
  const first=harness(),second=harness();init(first,1);init(second,1);first.runtime.dispose();
  assert.equal(first.timers.size,0);assert.equal(second.timers.size,1);assert.deepEqual(second.runtime.inspect().nodeIds,["a","b"]);
});
