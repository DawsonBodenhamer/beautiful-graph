export interface ForcePoint { x:number; y:number }

export function centroidAcceleration(source:ForcePoint,target:ForcePoint,strength:number,coefficient:number):ForcePoint {
  return{x:(target.x-source.x)*coefficient*strength,y:(target.y-source.y)*coefficient*strength};
}

export function repelFactor(distanceSquared:number,count:number,strength:number,alpha:number):number {
  return alpha*strength*14*count/Math.max(36,distanceSquared);
}
