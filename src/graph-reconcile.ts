import type { GraphNode } from "./types";

export interface NodeReconciliation {
  nodes:GraphNode[];
  added:GraphNode[];
  removedIds:Set<string>;
}

export function reconcileGraphNodes(currentNodes:GraphNode[],freshNodes:GraphNode[]):NodeReconciliation{
  const current=new Map(currentNodes.map(node=>[node.id,node])),freshIds=new Set(freshNodes.map(node=>node.id)),added:GraphNode[]=[];
  const nodes=freshNodes.map(fresh=>{const existing=current.get(fresh.id);if(!existing){added.push(fresh);return fresh}const{x,y,...presentation}=fresh;Object.assign(existing,presentation);return existing});
  return{nodes,added,removedIds:new Set(currentNodes.filter(node=>!freshIds.has(node.id)).map(node=>node.id))};
}
