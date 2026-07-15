import type { GraphPoint } from "./types";

export interface PositionedPath { path:string; x:number; y:number }
export interface RankedPositionedPath extends PositionedPath { radius:number; degree:number }
export interface FamilyPath { path:string; family:string }

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

export function rankedPositionSnapshot(nodes:Iterable<RankedPositionedPath>,limit:number):Record<string,GraphPoint> {
  const count=Math.max(0,Math.floor(Number.isFinite(limit)?limit:0));
  return positionSnapshot([...nodes]
    .filter(node=>Number.isFinite(node.x)&&Number.isFinite(node.y))
    .sort((a,b)=>b.radius-a.radius||b.degree-a.degree||a.path.localeCompare(b.path))
    .slice(0,count));
}

export function savedFamilyAnchors(nodes:Iterable<FamilyPath>,positions:Record<string,GraphPoint>):Map<string,GraphPoint> {
  const totals=new Map<string,{x:number;y:number;count:number}>();for(const node of nodes){const point=positions[node.path];if(!point)continue;const total=totals.get(node.family)??{x:0,y:0,count:0};total.x+=point.x;total.y+=point.y;total.count++;totals.set(node.family,total)}
  return new Map([...totals].map(([family,total])=>[family,{x:total.x/total.count,y:total.y/total.count}]));
}

export function familySeedPosition(path:string,index:number,family:string,anchors:ReadonlyMap<string,GraphPoint>,fallback:GraphPoint,spacing=12):GraphPoint {
  const anchor=anchors.get(family)??fallback,seed=[...family].reduce((value,char)=>Math.imul(value^char.charCodeAt(0),16777619),2166136261)>>>0,baseAngle=seed/4294967296*Math.PI*2,goldenAngle=Math.PI*(3-Math.sqrt(5)),angle=baseAngle+index*goldenAngle,spread=Math.max(8,spacing)*Math.sqrt(index+1);
  return{x:anchor.x+Math.cos(angle)*spread,y:anchor.y+Math.sin(angle)*spread};
}

export function prunePositionSnapshot(positions:Record<string,GraphPoint>,paths:Iterable<string>):Record<string,GraphPoint> {
  const snapshot:Record<string,GraphPoint>={};
  for(const path of paths){const point=positions[path];if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))snapshot[path]={x:point.x,y:point.y}}
  return snapshot;
}
