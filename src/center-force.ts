export interface ForcePoint { x:number; y:number }

export function centerAcceleration(node:ForcePoint,familyCenter:ForcePoint,graphCenter:ForcePoint,envelopeRadius:number,strength:number):ForcePoint {
  const macroX=(graphCenter.x-familyCenter.x)*.001*strength,macroY=(graphCenter.y-familyCenter.y)*.001*strength,dx=node.x-graphCenter.x,dy=node.y-graphCenter.y,distance=Math.hypot(dx,dy)||1,excess=Math.max(0,distance-Math.max(1,envelopeRadius)),envelope=.0018*strength*excess;
  return{x:macroX-dx/distance*envelope,y:macroY-dy/distance*envelope};
}

export function repelFactor(distanceSquared:number,count:number,strength:number,alpha:number):number {
  return alpha*strength*14*count/Math.max(36,distanceSquared);
}
