import test from "node:test";
import assert from "node:assert/strict";
import {createPhysicsWorker,GRAPH_WORKER_BOOTSTRAP} from "../src/physics-worker.ts";

test("embedded worker source is encoded verbatim and receives embedded Wasm bytes",()=>{
  const assets={workerSource:"self.onmessage=()=>{};",wasmBase64:Buffer.from([0,97,115,109,1,0,0,0]).toString("base64")};
  let scriptUrl="",options:WorkerOptions|undefined,bootstrap:unknown,transfer:Transferable[]|undefined;
  class FakeWorker {
    onmessage=null;onerror=null;onmessageerror=null;
    constructor(url:string|URL,value?:WorkerOptions){scriptUrl=String(url);options=value}
    postMessage(message:unknown,value?:Transferable[]){bootstrap=message;transfer=value}
    terminate(){}addEventListener(){}removeEventListener(){}
  }
  createPhysicsWorker(FakeWorker as unknown as typeof Worker,assets);
  assert.equal(options?.name,"beautiful-graph-physics");
  const prefix="data:text/javascript;base64,";assert.ok(scriptUrl.startsWith(prefix));
  assert.equal(Buffer.from(scriptUrl.slice(prefix.length),"base64").toString("utf8"),assets.workerSource);
  assert.equal((bootstrap as {type:string}).type,GRAPH_WORKER_BOOTSTRAP);
  const wasm=(bootstrap as {wasm:ArrayBuffer}).wasm;assert.deepEqual([...new Uint8Array(wasm)],[0,97,115,109,1,0,0,0]);assert.equal(transfer?.[0],wasm);
});
