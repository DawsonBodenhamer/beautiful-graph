import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createPhysicsWorkerSource } from "../src/physics-worker.ts";

const opts={center:1.2,repel:1,link:.04,distance:360,curvature:0,siblingLinkForce:1};
function harness(source=createPhysicsWorkerSource()){
  const messages:Array<{type:string;coords:Float32Array;substeps?:number}>=[];let callback:(()=>void)|undefined,starts=0,clears=0;
  const factory=new Function("postMessage","setInterval","clearInterval",`${source}; return onmessage;`) as (post:(message:{type:string;coords:Float32Array;substeps?:number})=>void,setIntervalFn:(next:()=>void)=>number,clearIntervalFn:()=>void)=>((event:{data:unknown})=>void);
  const handler=factory(message=>messages.push(message),next=>{callback=next;starts++;return starts},()=>{callback=undefined;clears++});
  return{messages,handler,get callback(){return callback},get starts(){return starts},get clears(){return clears}};
}

test("generated worker source initializes and publishes cold coordinates",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:7,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"b",x:10,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true}],edges:[{source:"a",target:"b",relationship:"cross"}],opts,nodeScale:1,heat:0}});
  const result=worker.messages.at(-1)!;assert.equal(result.type,"settled");assert.deepEqual([...result.coords],[0,0,10,0]);
});

test("tune burst executes exactly 48 frames and 96 substeps",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});
  for(let frame=0;frame<48;frame++){assert.ok(worker.callback,`timer stopped at frame ${frame}`);worker.callback!()}
  assert.equal(worker.callback,undefined);assert.equal(worker.messages.filter(message=>message.type==="tick").length,48);const terminal=worker.messages.at(-1)!;assert.equal(terminal.type,"burstComplete");assert.equal(terminal.substeps,96);
});

test("repeated tune request reheats and restarts the bounded budget",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});for(let frame=0;frame<10;frame++)worker.callback!();worker.handler({data:{type:"tuneBurst",opts}});for(let frame=0;frame<48;frame++)worker.callback!();
  assert.equal(worker.starts,2);assert.ok(worker.clears>=2);assert.equal(worker.messages.filter(message=>message.type==="burstComplete").length,1);
});

test("one tune burst moves a remote singleton inward while keeping coordinates finite",()=>{
  const worker=harness();worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"b",x:100,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"orphan",x:5000,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[{source:"a",target:"b",relationship:"cross"}],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});for(let frame=0;frame<48;frame++)worker.callback!();const coords=[...worker.messages.at(-1)!.coords];assert.ok(coords.every(Number.isFinite));assert.ok(coords[4]!<4800,`remote singleton only reached ${coords[4]}`);
});

test("minified production worker source reaches burstComplete without free identifiers",()=>{
  const output=buildSync({stdin:{contents:'export { createPhysicsWorkerSource } from "./src/physics-worker.ts";',resolveDir:process.cwd(),loader:"ts"},bundle:true,format:"cjs",platform:"node",target:"es2022",minify:true,write:false}).outputFiles[0]!.text,module={exports:{}} as {exports:{createPhysicsWorkerSource:()=>string}};new Function("module","exports",output)(module,module.exports);
  const worker=harness(module.exports.createPhysicsWorkerSource());worker.handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts,nodeScale:1,heat:0}});worker.handler({data:{type:"tuneBurst",opts}});for(let frame=0;frame<48;frame++)worker.callback!();assert.equal(worker.messages.at(-1)?.type,"burstComplete");
});
