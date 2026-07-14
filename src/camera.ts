export interface CameraViewport { width:number; height:number }
export interface CameraTransform { scale:number; x:number; y:number }
export interface GraphBounds { minX:number; maxX:number; minY:number; maxY:number }
export interface ResponsiveCameraState { centerX:number; centerY:number; zoomRatio:number }

export function fitCamera(bounds:GraphBounds,viewport:CameraViewport,padding=.06):CameraTransform {
  const width=Math.max(100,bounds.maxX-bounds.minX),height=Math.max(100,bounds.maxY-bounds.minY);
  const availableWidth=Math.max(1,viewport.width*(1-padding*2)),availableHeight=Math.max(1,viewport.height*(1-padding*2));
  const scale=Math.max(.06,Math.min(1.25,availableWidth/width,availableHeight/height));
  return{scale,x:viewport.width/2-(bounds.minX+bounds.maxX)/2*scale,y:viewport.height/2-(bounds.minY+bounds.maxY)/2*scale};
}

export function captureResponsiveCamera(camera:CameraTransform,viewport:CameraViewport,bounds:GraphBounds):ResponsiveCameraState {
  const fitted=fitCamera(bounds,viewport);
  return{centerX:(viewport.width/2-camera.x)/camera.scale,centerY:(viewport.height/2-camera.y)/camera.scale,zoomRatio:camera.scale/Math.max(.0001,fitted.scale)};
}

export function restoreResponsiveCamera(state:ResponsiveCameraState,viewport:CameraViewport,bounds:GraphBounds):CameraTransform {
  const scale=Math.max(.06,Math.min(5,fitCamera(bounds,viewport).scale*state.zoomRatio));
  return{scale,x:viewport.width/2-state.centerX*scale,y:viewport.height/2-state.centerY*scale};
}
