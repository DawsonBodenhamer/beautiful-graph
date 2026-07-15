import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createPhysicsWorkerSource } from "../src/physics-worker.ts";

test("generated worker source initializes and publishes cold coordinates",()=>{
  const messages:unknown[]=[],factory=new Function("postMessage","setInterval","clearInterval",`${createPhysicsWorkerSource()}; return onmessage;`) as (post:(message:unknown)=>void,setIntervalFn:typeof setInterval,clearIntervalFn:typeof clearInterval)=>((event:{data:unknown})=>void),handler=factory(message=>messages.push(message),setInterval,clearInterval);
  handler({data:{type:"init",generation:7,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"b",x:10,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true}],edges:[{source:"a",target:"b",relationship:"cross"}],opts:{center:1,repel:1,link:.04,distance:100,curvature:0,siblingLinkForce:1},nodeScale:1,heat:0,thorough:false}});
  const result=messages.at(-1) as {type:string;generation:number;coords:Float32Array};assert.equal(result.type,"settled");assert.equal(result.generation,7);assert.deepEqual([...result.coords],[0,0,10,0]);
});

test("one thorough worker request recovers a remote singleton component",()=>{
  const messages:Array<{type:string;coords:Float32Array;metrics?:{forceResidual:number}}>=[];let intervalCallback:(()=>void)|undefined;const factory=new Function("postMessage","setInterval","clearInterval",`${createPhysicsWorkerSource()}; return onmessage;`) as (post:(message:{type:string;coords:Float32Array})=>void,setIntervalFn:(callback:()=>void)=>number,clearIntervalFn:()=>void)=>((event:{data:unknown})=>void),handler=factory(message=>messages.push(message),callback=>{intervalCallback=callback;return 1},()=>{intervalCallback=undefined});
  handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"b",x:100,y:0,folder:"f",family:"folder:f",degree:1,radius:4,visible:true},{id:"orphan",x:5000,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[{source:"a",target:"b",relationship:"cross"}],opts:{center:1.2,repel:1,link:.04,distance:360,curvature:0,siblingLinkForce:1},nodeScale:1,heat:1,thorough:true}});
  for(let index=0;intervalCallback&&index<4000;index++)intervalCallback();
  const terminal=[...messages].reverse().find(message=>message.type==="settled"||message.type==="incomplete");assert.ok(terminal,"worker did not terminate");assert.equal(terminal.type,"settled");const coords=[...terminal.coords],mainCenter=(coords[0]!+coords[2]!)/2,gap=Math.abs(coords[4]!-mainCenter);assert.ok(gap<1200,`remote component remained ${gap} units away`);
});

test("a repeated thorough request reports running without restarting progress",()=>{
  const messages:Array<{type:string}>=[];let starts=0;const factory=new Function("postMessage","setInterval","clearInterval",`${createPhysicsWorkerSource()}; return onmessage;`) as (post:(message:{type:string})=>void,setIntervalFn:(callback:()=>void)=>number,clearIntervalFn:()=>void)=>((event:{data:unknown})=>void),handler=factory(message=>messages.push(message),()=>{starts++;return starts},()=>{}),payload={generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts:{center:1,repel:1,link:.04,distance:100,curvature:0,siblingLinkForce:1},nodeScale:1,heat:1,thorough:true};
  handler({data:{type:"init",...payload}});handler({data:{type:"forces",opts:payload.opts,thorough:true}});assert.equal(starts,1);assert.equal(messages.at(-1)?.type,"analysisRunning");
});

test("minified production worker source reaches a terminal message without free identifiers",()=>{
  const output=buildSync({stdin:{contents:'export { createPhysicsWorkerSource } from "./src/physics-worker.ts";',resolveDir:process.cwd(),loader:"ts"},bundle:true,format:"cjs",platform:"node",target:"es2022",minify:true,write:false}).outputFiles[0]!.text,module={exports:{}} as {exports:{createPhysicsWorkerSource:()=>string}};
  new Function("module","exports",output)(module,module.exports);
  const source=module.exports.createPhysicsWorkerSource(),messages:Array<{type:string}>=[];let intervalCallback:(()=>void)|undefined;
  const factory=new Function("postMessage","setInterval","clearInterval",`${source}; return onmessage;`) as (post:(message:{type:string})=>void,setIntervalFn:(callback:()=>void)=>number,clearIntervalFn:()=>void)=>((event:{data:unknown})=>void),handler=factory(message=>messages.push(message),callback=>{intervalCallback=callback;return 1},()=>{intervalCallback=undefined});
  handler({data:{type:"init",generation:1,nodes:[{id:"a",x:0,y:0,folder:"f",family:"folder:f",degree:0,radius:4,visible:true}],edges:[],opts:{center:1,repel:1,link:.04,distance:100,curvature:0,siblingLinkForce:1},nodeScale:1,heat:1,thorough:true}});
  for(let index=0;intervalCallback&&index<4000;index++)intervalCallback();
  assert.ok(messages.some(message=>message.type==="settled"||message.type==="incomplete"),"minified worker never emitted a terminal message");
});
