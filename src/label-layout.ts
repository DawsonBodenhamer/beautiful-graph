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

export function interpolateLabelOffset(current:LabelOffset,target:LabelOffset,deltaMS:number,timeConstant=180,maxPixelsPerSecond=420):LabelOffset {
  const blend=1-Math.exp(-Math.max(0,deltaMS)/Math.max(1,timeConstant)),from=normalized(current),to=normalized(target),fromAngle=Math.atan2(from.y,from.x),toAngle=Math.atan2(to.y,to.x),angle=fromAngle+Math.atan2(Math.sin(toAngle-fromAngle),Math.cos(toAngle-fromAngle))*blend,fromRadius=Math.hypot(current.x,current.y),toRadius=Math.hypot(target.x,target.y),radius=fromRadius+(toRadius-fromRadius)*blend;
  const proposed={x:Math.cos(angle)*radius,y:Math.sin(angle)*radius},distance=Math.hypot(proposed.x-current.x,proposed.y-current.y),limit=Math.max(0,maxPixelsPerSecond)*Math.max(0,deltaMS)/1000;if(distance<=limit||distance<=.0001)return proposed;const ratio=limit/distance;return{x:current.x+(proposed.x-current.x)*ratio,y:current.y+(proposed.y-current.y)*ratio};
}

export function interpolateLabelReveal(current:number,target:number,deltaMS:number,timeConstant=150):number {const clampedTarget=Math.max(0,Math.min(1,target)),blend=1-Math.exp(-Math.max(0,deltaMS)/Math.max(1,timeConstant)),next=current+(clampedTarget-current)*blend;return Math.abs(next-clampedTarget)<.002?clampedTarget:next}
