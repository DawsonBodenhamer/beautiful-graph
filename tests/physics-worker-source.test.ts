import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createPhysicsWorkerSource } from "../src/physics-worker.ts";

const opts={center:1.2,repel:1,link:.04,distance:360,curvature:0,siblingLinkForce:1,rootLinkForce:1};
function harness(source=createPhysicsWorkerSource()){
  const messages:Array<{type:string;coords:Float32Array;substeps?:number;converged?:boolean}>=[];let callback:(()=>void)|undefined,starts=0,clears=0;
  const factory=new Function("postMessage","setInterval","clearInterval",`${source}; return onmessage;`) as (post:(message:{type:string;coords:Float32Array;substeps?:number})=>void,setIntervalFn:(next:()=>void)=>number,clearIntervalFn:()=>void)=>((event:{data:unknown})=>void);
  const handler=factory(message=>messages.push(message),next=>{callback=next;starts++;return starts},()=>{callback=undefined;clears++});
  return{messages,handler,get callback(){return callback},get starts(){return starts},get clears(){return clears}};
}

function drain(worker:ReturnType<typeof harness>,limit=240):number {let frames=0;while(worker.callback&&frames<limit){worker.callback();frames++}return frames}

test("generated worker source initializes and publishes cold coordinates",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:7,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"b",x:10,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true}],edges:[{source:"a",target:"b",relationship:"cross"}],opts,nodeScale:1,heat:0}});
  const result=worker.messages.at(-1)!;assert.equal(result.type,"settled");assert.deepEqual([...result.coords],[0,0,10,0]);
});

test("tune burst runs repeated 96-substep phases until convergence or its bounded cap",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});
  const frames=drain(worker);assert.equal(worker.callback,undefined);const terminal=worker.messages.at(-1)!;assert.equal(terminal.type,"burstComplete");assert.equal(terminal.substeps,frames*8);assert.ok((terminal.substeps??0)>=192);assert.ok((terminal.substeps??0)<=1920);
});

test("repeated tune request reheats and restarts the bounded budget",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});for(let frame=0;frame<10;frame++)worker.callback!();worker.handler({data:{type:"tuneBurst",opts}});drain(worker);
  assert.equal(worker.starts,2);assert.ok(worker.clears>=2);assert.equal(worker.messages.filter(message=>message.type==="burstComplete").length,1);
});

test("one tune burst moves a remote singleton inward while keeping coordinates finite",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"b",x:100,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"orphan",x:5000,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[{source:"a",target:"b",relationship:"cross"}],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});drain(worker);const coords=[...worker.messages.at(-1)!.coords];assert.ok(coords.every(Number.isFinite));assert.ok(coords[4]!<1500,`remote singleton only reached ${coords[4]}`);
});

test("root link force only scales springs incident to root index",()=>{
  const run=(rootLinkForce:number)=>{const worker=harness();const force={center:0,repel:0,link:.1,distance:10,curvature:0,siblingLinkForce:1,rootLinkForce};worker.handler({data:{type:"init",generation:1,nodes:[{id:"index.md",x:0,y:0,folder:"",family:"root",degree:1,radius:4,visible:true,isRootIndex:true},{id:"a",x:100,y:0,folder:"",family:"root",degree:1,radius:4,visible:true,isRootIndex:false}],edges:[{source:"index.md",target:"a",relationship:"cross"}],opts:force,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts:force}});worker.callback!();return [...worker.messages.at(-1)!.coords]};
  assert.deepEqual(run(0),[0,0,100,0]);assert.notDeepEqual(run(1),[0,0,100,0]);
});

test("minified production worker source reaches burstComplete without free identifiers",()=>{
  const output=buildSync({stdin:{contents:'export { createPhysicsWorkerSource } from "./src/physics-worker.ts";',resolveDir:process.cwd(),loader:"ts"},bundle:true,format:"cjs",platform:"node",target:"es2022",minify:true,write:false}).outputFiles[0]!.text,module={exports:{}} as {exports:{createPhysicsWorkerSource:()=>string}};new Function("module","exports",output)(module,module.exports);
  const worker=harness(module.exports.createPhysicsWorkerSource());worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});drain(worker);assert.equal(worker.messages.at(-1)?.type,"burstComplete");
});
