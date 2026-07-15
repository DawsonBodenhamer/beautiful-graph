export interface ForcePoint { x:number; y:number }

export function linkSpringFactor(distance:number,restLength:number,strength:number,multiplier:number,alpha:number):number {
  if(multiplier<=0||strength<=0||alpha<=0)return 0;
  return(distance-restLength)*.00115*strength*multiplier*alpha;
}

export function robustEnvelopeRadius(points:ForcePoint[],center:ForcePoint,minimum:number):number {
  if(!points.length)return Math.max(1,minimum);
  const radial=points.map(point=>Math.hypot(point.x-center.x,point.y-center.y)).sort((a,b)=>a-b);
  const core=radial[Math.max(0,Math.ceil(radial.length*.9)-1)]??0;
  return Math.max(1,minimum,core*1.45);
}
