export const GRAPH_WORKER_PROTOCOL_VERSION = 1 as const;
export const GRAPH_WORKER_ASSET = "graph-worker.js";

export function createPhysicsWorker(assetUrl:string):Worker {
  return new Worker(assetUrl,{name:"beautiful-graph-physics"});
}
