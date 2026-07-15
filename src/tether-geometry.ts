export interface ScreenPoint { x:number; y:number }
export interface TetherGeometry {
  node:ScreenPoint;
  label:ScreenPoint;
  nodeRadius:number;
  pillHalfWidth:number;
  pillHalfHeight:number;
  pillRadius:number;
  overlap?:number;
}

export interface TetherEndpoints { start:ScreenPoint; end:ScreenPoint }

export function roundedRectRayDistance(direction:ScreenPoint,halfWidth:number,halfHeight:number,radius:number):number {
  const length=Math.hypot(direction.x,direction.y)||1,x=Math.abs(direction.x/length),y=Math.abs(direction.y/length),w=Math.max(0,halfWidth),h=Math.max(0,halfHeight),r=Math.max(0,Math.min(radius,w,h));
  if(x>0){const vertical=w/x;if(y*vertical<=h-r+1e-9)return vertical}
  if(y>0){const horizontal=h/y;if(x*horizontal<=w-r+1e-9)return horizontal}
  if(r===0)return Math.min(x>0?w/x:Infinity,y>0?h/y:Infinity);
  const cx=w-r,cy=h-r,dot=x*cx+y*cy,constant=cx*cx+cy*cy-r*r,discriminant=Math.max(0,dot*dot-constant);
  return dot+Math.sqrt(discriminant);
}

export function tetherEndpoints(input:TetherGeometry):TetherEndpoints {
  const dx=input.label.x-input.node.x,dy=input.label.y-input.node.y,distance=Math.hypot(dx,dy)||1,nx=dx/distance,ny=dy/distance,overlap=0;
  const startDistance=Math.max(0,input.nodeRadius-overlap),pillDistance=roundedRectRayDistance({x:nx,y:ny},input.pillHalfWidth,input.pillHalfHeight,input.pillRadius),endDistance=Math.max(0,pillDistance-overlap);
  return{
    start:{x:input.node.x+nx*startDistance,y:input.node.y+ny*startDistance},
    end:{x:input.label.x-nx*endDistance,y:input.label.y-ny*endDistance},
  };
}
