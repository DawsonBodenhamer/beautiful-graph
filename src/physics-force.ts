export interface ForcePoint { x:number; y:number }
export interface LinkPoint extends ForcePoint { vx?:number; vy?:number; degree?:number }
export interface LinkImpulse { source:ForcePoint; target:ForcePoint; distance:number; magnitude:number }
export interface FamilyNode { id:string; family?:string; folder?:string }
export interface ForceEdge { source:string; target:string }

export function familyComponentIds(nodes:FamilyNode[],edges:ForceEdge[]):Map<string,number> {
  const nodeById=new Map(nodes.map(node=>[node.id,node])),adjacency=new Map(nodes.map(node=>[node.id,[] as string[]]));
  for(const edge of edges)if(adjacency.has(edge.source)&&adjacency.has(edge.target)){adjacency.get(edge.source)!.push(edge.target);adjacency.get(edge.target)!.push(edge.source)}
  const seen=new Set<string>(),result=new Map<string,number>();let component=0;
  for(const node of nodes){if(seen.has(node.id))continue;const family=node.family??`folder:${node.folder??""}`,queue=[node.id];seen.add(node.id);while(queue.length){const id=queue.shift()!,current=nodeById.get(id);if(!current)continue;result.set(id,component);for(const next of adjacency.get(id)??[]){const candidate=nodeById.get(next);if(candidate&&!seen.has(next)&&(candidate.family??`folder:${candidate.folder??""}`)===family){seen.add(next);queue.push(next)}}}component++}
  return result;
}

export function linkSpringImpulse(source:LinkPoint,target:LinkPoint,restLength:number,strength:number,multiplier:number,alpha:number):LinkImpulse {
  const dx=target.x+(target.vx??0)-source.x-(source.vx??0),dy=target.y+(target.vy??0)-source.y-(source.vy??0),distance=Math.hypot(dx,dy)||1;
  if(multiplier<=0||strength<=0||alpha<=0)return{source:{x:0,y:0},target:{x:0,y:0},distance,magnitude:0};
  const magnitude=Math.max(-8,Math.min(8,(distance-restLength)*.8*strength*multiplier*alpha)),nx=dx/distance,ny=dy/distance,sourceDegree=Math.max(1,source.degree??1),targetDegree=Math.max(1,target.degree??1),sum=sourceDegree+targetDegree,sourceWeight=targetDegree/sum,targetWeight=sourceDegree/sum;
  return{source:{x:nx*magnitude*sourceWeight,y:ny*magnitude*sourceWeight},target:{x:-nx*magnitude*targetWeight,y:-ny*magnitude*targetWeight},distance,magnitude};
}

export function normalizedForceResidual(energy:number,alpha:number):number {
  if(!Number.isFinite(energy)||energy<0)return Number.POSITIVE_INFINITY;
  return energy/Math.max(1e-6,alpha*alpha);
}

export function convergenceDecision(overlap:number,energy:number,alpha:number,thorough:boolean,cycle:number,maxCycles:number):{state:"settled"|"reheat"|"incomplete";residual:number} {
  const residual=normalizedForceResidual(energy,alpha),accepted=overlap<=.25&&(!thorough||residual<=.35);
  return{state:accepted?"settled":cycle<maxCycles?"reheat":"incomplete",residual};
}
