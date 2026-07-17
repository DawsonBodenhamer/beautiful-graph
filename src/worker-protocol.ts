import type {GraphEdge,GraphForces} from "./types.ts";

export const WORKER_PROTOCOL_VERSION=2 as const;
export const ALPHA_INITIAL=1;
export const ALPHA_TARGET_REST=0;
export const ALPHA_MIN=.001;
export const ALPHA_DECAY=1-Math.pow(ALPHA_MIN,1/300);
export const STARTUP_ALPHA_DECAY=1-Math.pow(ALPHA_MIN,1/600);
export const AUTOMATIC_WAKE_ALPHA=.3;
export const DRAG_ALPHA_TARGET=.3;
export const WORKER_TICK_INTERVAL_MS=1000/60;
export const VELOCITY_RETENTION=.6;

export type WorkerNode={id:string;preserve:boolean;x?:number;y?:number;degree:number;radius:number;vx?:number;vy?:number;fx?:number|null;fy?:number|null};
export type WorkerInitMessage={type:"init";version:typeof WORKER_PROTOCOL_VERSION;revision:number;nodes:WorkerNode[];edges:GraphEdge[];forces:GraphForces;heat?:number;startupCooling?:boolean};
export type WorkerTopologyMessage={type:"topology";version:typeof WORKER_PROTOCOL_VERSION;revision:number;nodes:WorkerNode[];edges:GraphEdge[];heat?:number};
export type WorkerForcesMessage={type:"forces";version:typeof WORKER_PROTOCOL_VERSION;forces:GraphForces;heat?:number};
export type WorkerWeightMessage={type:"weights";version:typeof WORKER_PROTOCOL_VERSION;weights:Array<{id:string;degree:number;radius:number}>;heat?:number};
export type WorkerDragMessage={type:"dragStart"|"dragMove";version:typeof WORKER_PROTOCOL_VERSION;id:string;x:number;y:number};
export type WorkerDragEndMessage={type:"dragEnd";version:typeof WORKER_PROTOCOL_VERSION;id:string};
export type WorkerDisposeMessage={type:"dispose";version:typeof WORKER_PROTOCOL_VERSION};
export type GraphWorkerRequest=WorkerInitMessage|WorkerTopologyMessage|WorkerForcesMessage|WorkerWeightMessage|WorkerDragMessage|WorkerDragEndMessage|WorkerDisposeMessage;

export type WorkerCoordinateKind="coordinates"|"sleep";
export type WorkerRuntimeMetrics={tickMs:number;nodes:number;links:number;heapBytes:number};
export type WorkerSharedCoordinatesMessage<Kind extends WorkerCoordinateKind=WorkerCoordinateKind>={type:Kind;version:typeof WORKER_PROTOCOL_VERSION;revision:number;transport:"shared";publication:number;count:number;ids?:string[];buffer?:SharedArrayBuffer;alpha:number;metrics:WorkerRuntimeMetrics};
export type WorkerTransferCoordinatesMessage<Kind extends WorkerCoordinateKind=WorkerCoordinateKind>={type:Kind;version:typeof WORKER_PROTOCOL_VERSION;revision:number;transport:"transfer";ids:string[];coords:Float32Array;alpha:number;metrics:WorkerRuntimeMetrics};
export type WorkerCoordinateMessage=WorkerSharedCoordinatesMessage|WorkerTransferCoordinatesMessage;
export type WorkerCoordinatesMessage=WorkerSharedCoordinatesMessage<"coordinates">|WorkerTransferCoordinatesMessage<"coordinates">;
export type WorkerSleepMessage=WorkerSharedCoordinatesMessage<"sleep">|WorkerTransferCoordinatesMessage<"sleep">;
export type WorkerReadyMessage={type:"ready";version:typeof WORKER_PROTOCOL_VERSION;revision:number;engine:"wasm"|"javascript"};
export type WorkerFailureMessage={type:"failure";version:typeof WORKER_PROTOCOL_VERSION;message:string};
export type GraphWorkerResponse=WorkerCoordinatesMessage|WorkerSleepMessage|WorkerReadyMessage|WorkerFailureMessage;

export function isGraphWorkerRequest(value:unknown):value is GraphWorkerRequest{
  return !!value&&typeof value==="object"&&(value as {version?:unknown}).version===WORKER_PROTOCOL_VERSION&&typeof (value as {type?:unknown}).type==="string";
}
