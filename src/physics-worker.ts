import {Worker as ThreadWorker} from "node:worker_threads";
import type {GraphWorkerRequest,GraphWorkerResponse} from "./worker-protocol";
import {WORKER_PROTOCOL_VERSION} from "./worker-protocol";

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

export function createPhysicsWorker(workerPath:string,wasmPath:string):PhysicsWorker {
  const thread=new ThreadWorker(workerPath,{name:"beautiful-graph-physics",workerData:{wasmPath}}),listeners=new Set<MessageListener>();
  const worker:PhysicsWorker={
    onmessage:null,
    onerror:null,
    onmessageerror:null,
    postMessage:(message,transfer=[])=>thread.postMessage(message,transfer as never[]),
    terminate:()=>{void thread.terminate()},
    addEventListener:(type,listener)=>{if(type==="message")listeners.add(listener)},
    removeEventListener:(type,listener)=>{if(type==="message")listeners.delete(listener)},
  };
  thread.on("message",(data:GraphWorkerResponse)=>{const event={data};worker.onmessage?.(event);for(const listener of listeners)listener(event)});
  thread.on("error",error=>worker.onerror?.({message:error.message}));
  thread.on("messageerror",error=>worker.onmessageerror?.({message:error.message}));
  return worker;
}
