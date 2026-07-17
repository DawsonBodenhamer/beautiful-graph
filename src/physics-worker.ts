import {readFileSync} from "node:fs";
import type {GraphWorkerRequest,GraphWorkerResponse} from "./worker-protocol.ts";
import {WORKER_PROTOCOL_VERSION} from "./worker-protocol.ts";
import {GRAPH_WORKER_BOOTSTRAP} from "./worker-bootstrap.ts";

export {GRAPH_WORKER_BOOTSTRAP} from "./worker-bootstrap.ts";

export const GRAPH_WORKER_PROTOCOL_VERSION = WORKER_PROTOCOL_VERSION;
export const GRAPH_WORKER_ASSET = "graph-worker.js";
export const GRAPH_WASM_ASSET = "graph-sim.wasm";
type MessageListener=(event:{data:GraphWorkerResponse})=>void;
type ErrorListener=(event:{message:string})=>void;

export interface PhysicsWorker {
  onmessage:MessageListener|null;
  onerror:ErrorListener|null;
  onmessageerror:ErrorListener|null;
  postMessage(message:GraphWorkerRequest,transfer?:Transferable[]):void;
  terminate():void;
  addEventListener(type:"message",listener:MessageListener):void;
  removeEventListener(type:"message",listener:MessageListener):void;
}

type WorkerConstructor=new(scriptURL:string|URL,options?:WorkerOptions)=>Worker;

export function createWorkerDataUrl(source:string):string {
  return `data:text/javascript;base64,${Buffer.from(source,"utf8").toString("base64")}`;
}

export function createPhysicsWorker(workerPath:string,wasmPath:string,WorkerClass:WorkerConstructor=Worker):PhysicsWorker {
  const source=readFileSync(workerPath,"utf8"),wasm=Uint8Array.from(readFileSync(wasmPath)),worker=new WorkerClass(createWorkerDataUrl(source),{name:"beautiful-graph-physics"});
  worker.postMessage({type:GRAPH_WORKER_BOOTSTRAP,wasm:wasm.buffer},[wasm.buffer]);
  return worker as PhysicsWorker;
}
