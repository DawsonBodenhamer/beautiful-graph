export interface MotionPoint {
  x:number;
  y:number;
  vx:number;
  vy:number;
  fx?:number|null;
  fy?:number|null;
  lastX?:number;
  lastY?:number;
}

export interface MotionAnchor { x:number; y:number; count:number }

export function freeNodeCentroid(nodes:MotionPoint[]):MotionAnchor {
  let x=0,y=0,count=0;
  for(const node of nodes)if(node.fx==null){x+=node.x;y+=node.y;count++}
  return count?{x:x/count,y:y/count,count}:{x:0,y:0,count:0};
}

/** Remove only rigid translation and rotation; relative deformation remains untouched. */
export function removeRigidVelocity(nodes:MotionPoint[]):void {
  const free=nodes.filter(node=>node.fx==null);
  if(free.length<2)return;
  let meanX=0,meanY=0,centerX=0,centerY=0;
  for(const node of free){meanX+=node.vx;meanY+=node.vy;centerX+=node.x;centerY+=node.y}
  meanX/=free.length;meanY/=free.length;centerX/=free.length;centerY/=free.length;
  for(const node of free){node.vx-=meanX;node.vy-=meanY}
  if(free.length<3)return;
  let angularMomentum=0,moment=0;
  for(const node of free){const x=node.x-centerX,y=node.y-centerY;angularMomentum+=x*node.vy-y*node.vx;moment+=x*x+y*y}
  if(moment<1e-6)return;
  const angularVelocity=angularMomentum/moment;
  for(const node of free){const x=node.x-centerX,y=node.y-centerY;node.vx+=angularVelocity*y;node.vy-=angularVelocity*x}
}

/** Correct positional projection drift without changing any free-node relative vectors. */
export function restoreFreeCentroid(nodes:MotionPoint[],anchor:MotionAnchor):void {
  if(anchor.count<1)return;
  let x=0,y=0,count=0;
  for(const node of nodes)if(node.fx==null){x+=node.x;y+=node.y;count++}
  if(count!==anchor.count||count<1)return;
  const dx=anchor.x-x/count,dy=anchor.y-y/count;
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  for(const node of nodes)if(node.fx==null){node.x+=dx;node.y+=dy;if(Number.isFinite(node.lastX))node.lastX!+=dx;if(Number.isFinite(node.lastY))node.lastY!+=dy}
}
