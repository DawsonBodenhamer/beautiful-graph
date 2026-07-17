import type {GraphEdge,GraphForces} from "./types.ts";
import type {WorkerNode} from "./worker-protocol.ts";

export const WASM_ABI_VERSION=1;
export const COLLISION_RADIUS_FLOOR=60;
export const COLLISION_STRENGTH=.5;
export const REPULSION_MIN_DISTANCE=30;
export const BARNES_HUT_THETA=.9;

export type EngineKind="wasm"|"javascript";
export type SimulationForces={center:number;charge:number;link:number;distance:number};
export type SimulationNode={id:string;x:number;y:number;degree:number;radius:number;vx:number;vy:number;fx:number|null;fy:number|null};

export interface SimulationEngine {
  readonly kind:EngineKind;
  reconcile(nodes:WorkerNode[],edges:GraphEdge[]):void;
  updateForces(forces:GraphForces):void;
  updateWeights(weights:Array<{id:string;degree:number;radius:number}>):void;
  setPin(id:string,x:number|null,y:number|null):void;
  tick(alpha:number):void;
  snapshot():readonly SimulationNode[];
  dispose():void;
}

export function curvedForce(value:number,floor=.01):number{
  const slider=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
  return(Math.pow(floor,1-slider)-floor)/(1-floor);
}

export function toSimulationForces(forces:GraphForces):SimulationForces{
  if(![forces.center,forces.repel,forces.link,forces.distance].every(Number.isFinite))throw new Error("Simulation forces must be finite.");
  const repel=Math.max(0,forces.repel);
  return{
    center:curvedForce(forces.center),
    charge:-Math.max(1,repel*repel*repel),
    link:curvedForce(forces.link),
    distance:Math.max(30,Math.min(500,Number.isFinite(forces.distance)?forces.distance:250)),
  };
}

export function effectiveCollisionRadius(renderedRadius:number):number{
  return Math.max(COLLISION_RADIUS_FLOOR,Number.isFinite(renderedRadius)?renderedRadius:COLLISION_RADIUS_FLOOR);
}
