import type {GraphWorkerRequest,GraphWorkerResponse} from "./worker-protocol.ts";
import {WORKER_PROTOCOL_VERSION} from "./worker-protocol.ts";
import {GRAPH_WORKER_BOOTSTRAP} from "./worker-bootstrap.ts";
import {EMBEDDED_WASM_BASE64,EMBEDDED_WORKER_SOURCE} from "../.generated/embedded-assets.ts";

export {GRAPH_WORKER_BOOTSTRAP} from "./worker-bootstrap.ts";

export const GRAPH_WORKER_PROTOCOL_VERSION = WORKER_PROTOCOL_VERSION;
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

export type EmbeddedPhysicsAssets={workerSource:string;wasmBase64:string};

export function decodeBase64Bytes(value:string):Uint8Array {
  const binary=atob(value),bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
}

export function createPhysicsWorker(WorkerClass:WorkerConstructor=Worker,assets:EmbeddedPhysicsAssets={workerSource:EMBEDDED_WORKER_SOURCE,wasmBase64:EMBEDDED_WASM_BASE64}):PhysicsWorker {
  const wasm=decodeBase64Bytes(assets.wasmBase64),worker=new WorkerClass(createWorkerDataUrl(assets.workerSource),{name:"beautiful-graph-physics"});
  worker.postMessage({type:GRAPH_WORKER_BOOTSTRAP,wasm:wasm.buffer},[wasm.buffer]);
  return worker as PhysicsWorker;
}
