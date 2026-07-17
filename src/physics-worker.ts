import {WORKER_PROTOCOL_VERSION} from "./worker-protocol";

export const GRAPH_WORKER_PROTOCOL_VERSION = WORKER_PROTOCOL_VERSION;
export const GRAPH_WORKER_ASSET = "graph-worker.js";

export function createPhysicsWorker(assetUrl:string):Worker {
  return new Worker(assetUrl,{name:"beautiful-graph-physics"});
}
