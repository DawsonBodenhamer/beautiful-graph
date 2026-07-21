import {roundedRectRayDistance} from "./tether-geometry.ts";

export interface LabelOffset { x:number; y:number }

function normalized(direction:{x:number;y:number}):{x:number;y:number}{const length=Math.hypot(direction.x,direction.y);return length>.0001?{x:direction.x/length,y:direction.y/length}:{x:0,y:-1}}

export function labelAnchorOffset(direction:{x:number;y:number},nodeRadius:number,pillHalfWidth:number,pillHalfHeight:number,pillRadius:number,gap=12):LabelOffset {
  const unit=normalized(direction),distance=Math.max(0,nodeRadius)+roundedRectRayDistance(unit,pillHalfWidth,pillHalfHeight,pillRadius)+Math.max(0,gap);
  return{x:unit.x*distance,y:unit.y*distance};
}

export function labelScreenPosition(node:{x:number;y:number},nodeRadius:number,pillHalfWidth:number,pillHalfHeight:number,pillRadius:number,offset:LabelOffset):{x:number;y:number} {
  const unit=normalized(offset),minimum=labelAnchorOffset(unit,nodeRadius,pillHalfWidth,pillHalfHeight,pillRadius),distance=Math.max(Math.hypot(offset.x,offset.y),Math.hypot(minimum.x,minimum.y));
  return{x:node.x+unit.x*distance,y:node.y+unit.y*distance};
}

export function interpolateLabelOffset(current:LabelOffset,target:LabelOffset,deltaMS:number,timeConstant=64):LabelOffset {
  const blend=1-Math.exp(-Math.max(0,deltaMS)/Math.max(1,timeConstant)),from=normalized(current),to=normalized(target),fromAngle=Math.atan2(from.y,from.x),toAngle=Math.atan2(to.y,to.x),angle=fromAngle+Math.atan2(Math.sin(toAngle-fromAngle),Math.cos(toAngle-fromAngle))*blend,fromRadius=Math.hypot(current.x,current.y),toRadius=Math.hypot(target.x,target.y),radius=fromRadius+(toRadius-fromRadius)*blend;
  return{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius};
}
