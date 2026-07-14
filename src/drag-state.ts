import type { CameraTransform } from "./camera";

export interface ClientPoint { x:number; y:number }
export interface HostRect { left:number; top:number }
export interface DragState { pointerId:number; start:ClientPoint; offset:ClientPoint; moved:boolean }

export function clientToWorld(point:ClientPoint,rect:HostRect,camera:CameraTransform):ClientPoint {
  return{x:(point.x-rect.left-camera.x)/camera.scale,y:(point.y-rect.top-camera.y)/camera.scale};
}

export function beginDrag(pointerId:number,point:ClientPoint,node:ClientPoint,rect:HostRect,camera:CameraTransform):DragState {
  const world=clientToWorld(point,rect,camera);
  return{pointerId,start:point,offset:{x:node.x-world.x,y:node.y-world.y},moved:false};
}

export function moveDrag(state:DragState,point:ClientPoint,rect:HostRect,camera:CameraTransform,threshold=5):{state:DragState;position:ClientPoint} {
  const world=clientToWorld(point,rect,camera),moved=state.moved||Math.hypot(point.x-state.start.x,point.y-state.start.y)>=threshold;
  return{state:{...state,moved},position:{x:world.x+state.offset.x,y:world.y+state.offset.y}};
}
