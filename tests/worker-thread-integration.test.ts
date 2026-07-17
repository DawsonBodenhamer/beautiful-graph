import test from "node:test";
import assert from "node:assert/strict";
import {copyFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {Worker} from "node:worker_threads";
import {WORKER_PROTOCOL_VERSION,type GraphWorkerResponse} from "../src/worker-protocol.ts";

test("production graph-worker launches as a named Node worker thread and selects Wasm",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"beautiful-graph-worker-")),workerPath=join(directory,"graph-worker.cjs"),source=fileURLToPath(new URL("../graph-worker.js",import.meta.url)),wasmPath=fileURLToPath(new URL("../graph-sim.wasm",import.meta.url));
  await copyFile(source,workerPath);
  const worker=new Worker(workerPath,{name:"beautiful-graph-physics",workerData:{wasmPath}});
  try{
    const messages:GraphWorkerResponse[]=[];
    const complete=new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error("Production worker thread did not initialize.")),5_000);worker.on("error",reject);worker.on("message",(message:GraphWorkerResponse)=>{messages.push(message);if(messages.some(item=>item.type==="ready")&&messages.some(item=>item.type==="coordinates")){clearTimeout(timeout);resolve()}})});
    worker.postMessage({type:"init",version:WORKER_PROTOCOL_VERSION,revision:1,nodes:[{id:"a",preserve:false,x:0,y:0,degree:1,radius:60},{id:"b",preserve:false,x:100,y:0,degree:1,radius:60}],edges:[{source:"a",target:"b",forward:true,reverse:false,relationship:"cross"}],forces:{center:.5187132489703118,repel:10,link:1,distance:250},heat:1});
    await complete;
    const ready=messages.find(message=>message.type==="ready"),coordinates=messages.find(message=>message.type==="coordinates");
    assert.equal(ready?.type,"ready");if(ready?.type==="ready")assert.equal(ready.engine,"wasm");
    assert.equal(coordinates?.type,"coordinates");if(coordinates?.type==="coordinates")assert.deepEqual({nodes:coordinates.metrics.nodes,links:coordinates.metrics.links},{nodes:2,links:1});
    worker.postMessage({type:"dispose",version:WORKER_PROTOCOL_VERSION});
  }finally{await worker.terminate();await rm(directory,{recursive:true,force:true})}
});
