import type { GraphPoint } from "./types";

export interface PositionedPath { path:string; x:number; y:number }
export interface RankedPositionedPath extends PositionedPath { degree:number }

export function positionSnapshot(nodes:Iterable<PositionedPath>):Record<string,GraphPoint> {
  const snapshot:Record<string,GraphPoint>={};
  for(const node of nodes)if(Number.isFinite(node.x)&&Number.isFinite(node.y))snapshot[node.path]={x:node.x,y:node.y};
  return snapshot;
}

export function rankedPositionSnapshot(nodes:Iterable<RankedPositionedPath>,limit:number):Record<string,GraphPoint> {
  const count=Math.max(0,Math.floor(Number.isFinite(limit)?limit:0));
  return positionSnapshot([...nodes]
    .filter(node=>Number.isFinite(node.x)&&Number.isFinite(node.y))
    .sort((a,b)=>b.degree-a.degree||a.path.localeCompare(b.path))
    .slice(0,count));
}

export function prunePositionSnapshot(positions:Record<string,GraphPoint>,paths:Iterable<string>):Record<string,GraphPoint> {
  const snapshot:Record<string,GraphPoint>={};
  for(const path of paths){const point=positions[path];if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))snapshot[path]={x:point.x,y:point.y}}
  return snapshot;
}
