import type { GraphPoint } from "./types";

export interface PositionedPath { path:string; x:number; y:number }

export function activeSavedPoints(positions:Record<string,GraphPoint>,paths:Iterable<string>):GraphPoint[] {
  const result:GraphPoint[]=[];
  for(const path of paths){const point=positions[path];if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))result.push(point)}
  return result;
}

export function savedLayoutStats(positions:Record<string,GraphPoint>,paths:Iterable<string>):{points:GraphPoint[];span:number;center:GraphPoint} {
  const points=activeSavedPoints(positions,paths);
  if(!points.length)return{points,span:0,center:{x:0,y:0}};
  const xs=points.map(point=>point.x),ys=points.map(point=>point.y),span=points.length>1?Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)):0;
  return{points,span,center:{x:xs.reduce((sum,value)=>sum+value,0)/points.length,y:ys.reduce((sum,value)=>sum+value,0)/points.length}};
}

export function positionSnapshot(nodes:Iterable<PositionedPath>):Record<string,GraphPoint> {
  const snapshot:Record<string,GraphPoint>={};
  for(const node of nodes)if(Number.isFinite(node.x)&&Number.isFinite(node.y))snapshot[node.path]={x:node.x,y:node.y};
  return snapshot;
}

export function prunePositionSnapshot(positions:Record<string,GraphPoint>,paths:Iterable<string>):Record<string,GraphPoint> {
  const snapshot:Record<string,GraphPoint>={};
  for(const path of paths){const point=positions[path];if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))snapshot[path]={x:point.x,y:point.y}}
  return snapshot;
}
