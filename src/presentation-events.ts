import type { GraphNode } from "./types";

export const PresentationDirty={
  None:0,
  Nodes:1<<0,
  Links:1<<1,
  Labels:1<<2,
  Lens:1<<3,
  Focus:1<<4,
  Camera:1<<5,
  Panels:1<<6,
  Coordinates:1<<7,
  All:(1<<8)-1,
} as const;

export type PresentationDirtyMask=number;
export type WorkerChange="forces"|"topology"|"weights"|null;
export type RetainedGraphEvent=
  |"force-control"
  |"active-topology"
  |"auto-group"
  |"node-size"
  |"node-presentation"
  |"link-presentation"
  |"label-presentation"
  |"folder-lens"
  |"focus"
  |"camera"
  |"panel";

export interface GraphEventContext {topologyChanged?:boolean;collisionRadiusChanged?:boolean}
export interface GraphEventContract {worker:WorkerChange;dirty:PresentationDirtyMask}

const DIRTY={
  "force-control":PresentationDirty.Panels,
  "active-topology":PresentationDirty.All,
  "auto-group":PresentationDirty.All,
  "node-size":PresentationDirty.Nodes|PresentationDirty.Links|PresentationDirty.Labels|PresentationDirty.Lens,
  "node-presentation":PresentationDirty.Nodes|PresentationDirty.Labels|PresentationDirty.Lens|PresentationDirty.Panels,
  "link-presentation":PresentationDirty.Links|PresentationDirty.Panels,
  "label-presentation":PresentationDirty.Labels|PresentationDirty.Panels,
  "folder-lens":PresentationDirty.Lens|PresentationDirty.Nodes|PresentationDirty.Links|PresentationDirty.Panels,
  "focus":PresentationDirty.Focus|PresentationDirty.Nodes|PresentationDirty.Links|PresentationDirty.Labels,
  "camera":PresentationDirty.Camera|PresentationDirty.Nodes|PresentationDirty.Links|PresentationDirty.Labels|PresentationDirty.Lens,
  "panel":PresentationDirty.Panels,
} satisfies Record<RetainedGraphEvent,PresentationDirtyMask>;

/** Canonical worker/presentation boundary for every retained interaction family. */
export function graphEventContract(event:RetainedGraphEvent,context:GraphEventContext={}):GraphEventContract{
  const worker:WorkerChange=event==="force-control"?"forces"
    :event==="active-topology"||context.topologyChanged?"topology"
    :context.collisionRadiusChanged?"weights"
    :null;
  return{worker,dirty:DIRTY[event]};
}

export class PresentationInvalidation {
  private mask:PresentationDirtyMask;
  constructor(initial:PresentationDirtyMask=PresentationDirty.None){this.mask=initial}
  mark(mask:PresentationDirtyMask):void{this.mask|=mask}
  take():PresentationDirtyMask{const mask=this.mask;this.mask=PresentationDirty.None;return mask}
}

export interface CollisionWeight {id:string;degree:number;radius:number}

export function effectiveCollisionRadius(node:Pick<GraphNode,"radius">,nodeSize:number):number{
  return Math.max(4,node.radius*nodeSize);
}

export function collisionWeightSnapshot(nodes:ReadonlyArray<Pick<GraphNode,"id"|"degree"|"radius"|"visible">>,nodeSize:number):Map<string,number>{
  return new Map(nodes.filter(node=>node.visible).map(node=>[node.id,effectiveCollisionRadius(node,nodeSize)]));
}

export function changedCollisionWeights(
  nodes:ReadonlyArray<Pick<GraphNode,"id"|"degree"|"radius"|"visible">>,
  nodeSize:number,
  previous:ReadonlyMap<string,number>,
):{snapshot:Map<string,number>;weights:CollisionWeight[]}|undefined{
  const active=nodes.filter(node=>node.visible),snapshot=collisionWeightSnapshot(active,nodeSize);
  if(snapshot.size===previous.size&&[...snapshot].every(([id,radius])=>previous.get(id)===radius))return;
  return{snapshot,weights:active.map(node=>({id:node.id,degree:node.degree,radius:effectiveCollisionRadius(node,nodeSize)}))};
}
