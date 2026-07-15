export interface ForcePoint { x:number; y:number }

export function centroidAcceleration(source:ForcePoint,target:ForcePoint,strength:number,coefficient:number):ForcePoint {
  return{x:(target.x-source.x)*coefficient*strength,y:(target.y-source.y)*coefficient*strength};
}

export function repelFactor(distanceSquared:number,count:number,strength:number,alpha:number,interactionRadius=Number.POSITIVE_INFINITY):number {
  const radiusSquared=interactionRadius*interactionRadius,ratio=Number.isFinite(radiusSquared)?distanceSquared/Math.max(1,radiusSquared):0,farFieldWeight=1/(1+ratio*ratio);
  return alpha*strength*14*count/Math.max(36,distanceSquared)*farFieldWeight;
}
