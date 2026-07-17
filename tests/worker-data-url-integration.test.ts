import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {createPhysicsWorker,GRAPH_WORKER_BOOTSTRAP} from "../src/physics-worker.ts";

test("production worker bundle is encoded verbatim and receives installed Wasm bytes",()=>{
  const workerPath=fileURLToPath(new URL("../graph-worker.js",import.meta.url)),wasmPath=fileURLToPath(new URL("../graph-sim.wasm",import.meta.url));
  let scriptUrl="",options:WorkerOptions|undefined,bootstrap:unknown,transfer:Transferable[]|undefined;
  class FakeWorker {
    onmessage=null;onerror=null;onmessageerror=null;
    constructor(url:string|URL,value?:WorkerOptions){scriptUrl=String(url);options=value}
    postMessage(message:unknown,value?:Transferable[]){bootstrap=message;transfer=value}
    terminate(){}addEventListener(){}removeEventListener(){}
  }
  createPhysicsWorker(workerPath,wasmPath,FakeWorker as unknown as typeof Worker);
  assert.equal(options?.name,"beautiful-graph-physics");
  const prefix="data:text/javascript;base64,";assert.ok(scriptUrl.startsWith(prefix));
  assert.equal(Buffer.from(scriptUrl.slice(prefix.length),"base64").toString("utf8"),readFileSync(workerPath,"utf8"));
  assert.equal((bootstrap as {type:string}).type,GRAPH_WORKER_BOOTSTRAP);
  const wasm=(bootstrap as {wasm:ArrayBuffer}).wasm;assert.equal(wasm.byteLength,readFileSync(wasmPath).byteLength);assert.equal(transfer?.[0],wasm);
});
