export interface CameraViewport { width:number; height:number; insetTop?:number; insetRight?:number; insetBottom?:number; insetLeft?:number }
export interface CameraTransform { scale:number; x:number; y:number }
export interface GraphBounds { minX:number; maxX:number; minY:number; maxY:number }

export function radiusAwareBounds(nodes:ReadonlyArray<{x:number;y:number;radius:number}>):GraphBounds|undefined{
  const finite=nodes.filter(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)&&Number.isFinite(node.radius));if(!finite.length)return;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const node of finite){const radius=Math.max(0,node.radius);minX=Math.min(minX,node.x-radius);maxX=Math.max(maxX,node.x+radius);minY=Math.min(minY,node.y-radius);maxY=Math.max(maxY,node.y+radius)}
  return{minX,maxX,minY,maxY};
}
export interface ResponsiveCameraState { centerX:number; centerY:number; zoomRatio:number }

export function viewportCenter(viewport:CameraViewport):{x:number;y:number;width:number;height:number} {
  const left=Math.max(0,viewport.insetLeft??0),right=Math.max(0,viewport.insetRight??0),top=Math.max(0,viewport.insetTop??0),bottom=Math.max(0,viewport.insetBottom??0);
  const width=Math.max(1,viewport.width-left-right),height=Math.max(1,viewport.height-top-bottom);
  return{x:left+width/2,y:top+height/2,width,height};
}

export function fitCamera(bounds:GraphBounds,viewport:CameraViewport,padding=.06,multiplier=1):CameraTransform {
  const usable=viewportCenter(viewport);
  const width=Math.max(100,bounds.maxX-bounds.minX),height=Math.max(100,bounds.maxY-bounds.minY);
  const availableWidth=Math.max(1,usable.width*(1-padding*2)),availableHeight=Math.max(1,usable.height*(1-padding*2));
  const fittedScale=Math.min(1.25,availableWidth/width,availableHeight/height),scale=Math.max(.06,Math.min(5,fittedScale*Math.max(.01,multiplier)));
  return{scale,x:usable.x-(bounds.minX+bounds.maxX)/2*scale,y:usable.y-(bounds.minY+bounds.maxY)/2*scale};
}

export function captureResponsiveCamera(camera:CameraTransform,viewport:CameraViewport,bounds:GraphBounds):ResponsiveCameraState {
  const fitted=fitCamera(bounds,viewport),usable=viewportCenter(viewport);
  return{centerX:(usable.x-camera.x)/camera.scale,centerY:(usable.y-camera.y)/camera.scale,zoomRatio:camera.scale/Math.max(.0001,fitted.scale)};
}

export function restoreResponsiveCamera(state:ResponsiveCameraState,viewport:CameraViewport,bounds:GraphBounds):CameraTransform {
  const scale=Math.max(.06,Math.min(5,fitCamera(bounds,viewport).scale*state.zoomRatio)),usable=viewportCenter(viewport);
  return{scale,x:usable.x-state.centerX*scale,y:usable.y-state.centerY*scale};
}
