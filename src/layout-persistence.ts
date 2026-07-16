import type { GraphPoint } from "./types";

export interface PositionedPath { path:string; x:number; y:number }
export interface RankedPositionedPath extends PositionedPath { radius:number; degree:number }
export interface FamilyPath { path:string; family:string }
export interface SeedObstacle extends GraphPoint { radius:number }

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

export function distributedFamilyAnchors(families:Iterable<string>,saved:ReadonlyMap<string,GraphPoint>,fallback:GraphPoint,savedSpan:number):Map<string,GraphPoint> {
  const result=new Map(saved),missing=[...new Set(families)].filter(family=>!result.has(family)).sort();
  if(!missing.length)return result;
  const goldenAngle=Math.PI*(3-Math.sqrt(5)),span=Math.max(120,Math.min(1600,Math.max(savedSpan*.42,Math.sqrt(missing.length)*48))),occupied=[...result.values()];
  for(let index=0;index<missing.length;index++){
    const radius=span*(.25+.75*Math.sqrt((index+.5)/missing.length));let best:GraphPoint|undefined,bestClearance=-1;
    for(let candidate=0;candidate<24;candidate++){
      const angle=index*goldenAngle+candidate/24*Math.PI*2,point={x:fallback.x+Math.cos(angle)*radius,y:fallback.y+Math.sin(angle)*radius},clearance=occupied.length?Math.min(...occupied.map(anchor=>(point.x-anchor.x)**2+(point.y-anchor.y)**2)):radius*radius;
      if(clearance>bestClearance){best=point;bestClearance=clearance}
    }
    result.set(missing[index]!,best!);occupied.push(best!);
  }
  return result;
}

export function familySeedPosition(path:string,index:number,family:string,anchors:ReadonlyMap<string,GraphPoint>,fallback:GraphPoint,spacing=12,obstacles:ReadonlyArray<SeedObstacle>=[],radius=0):GraphPoint {
  const anchor=anchors.get(family)??fallback,seed=[...`${family}\0${path}`].reduce((value,char)=>Math.imul(value^char.charCodeAt(0),16777619),2166136261)>>>0,baseAngle=seed/4294967296*Math.PI*2,goldenAngle=Math.PI*(3-Math.sqrt(5)),stride=Math.max(8,spacing);
  let best:GraphPoint|undefined,bestClearance=-Infinity;
  for(let attempt=0;attempt<256;attempt++){
    const ordinal=index+1+attempt,angle=baseAngle+ordinal*goldenAngle,spread=stride*Math.sqrt(ordinal),point={x:anchor.x+Math.cos(angle)*spread,y:anchor.y+Math.sin(angle)*spread};
    let clearance=Infinity;
    for(const obstacle of obstacles)clearance=Math.min(clearance,Math.hypot(point.x-obstacle.x,point.y-obstacle.y)-(radius+obstacle.radius));
    if(clearance>=0)return point;
    if(clearance>bestClearance){best=point;bestClearance=clearance}
  }
  return best??anchor;
}

export function prunePositionSnapshot(positions:Record<string,GraphPoint>,paths:Iterable<string>):Record<string,GraphPoint> {
  const snapshot:Record<string,GraphPoint>={};
  for(const path of paths){const point=positions[path];if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))snapshot[path]={x:point.x,y:point.y}}
  return snapshot;
}
