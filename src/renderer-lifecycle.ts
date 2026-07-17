export const MAX_NODE_VIEWS_PER_FRAME=50;
export const RENDER_IDLE_FRAME_LIMIT=60;

export interface WorldViewport {minX:number;maxX:number;minY:number;maxY:number}
export interface Positioned {id:string;x:number;y:number}

export function worldViewport(width:number,height:number,scale:number,offset:{x:number;y:number},margin=0):WorldViewport {
  const safeScale=Math.max(.0001,Math.abs(scale));
  return{minX:(-offset.x-margin)/safeScale,maxX:(width-offset.x+margin)/safeScale,minY:(-offset.y-margin)/safeScale,maxY:(height-offset.y+margin)/safeScale};
}

export function circleIntersectsViewport(x:number,y:number,radius:number,viewport:WorldViewport):boolean {
  return x+radius>=viewport.minX&&x-radius<=viewport.maxX&&y+radius>=viewport.minY&&y-radius<=viewport.maxY;
}

export function segmentIntersectsViewport(a:{x:number;y:number},b:{x:number;y:number},viewport:WorldViewport):boolean {
  if(Math.max(a.x,b.x)<viewport.minX||Math.min(a.x,b.x)>viewport.maxX||Math.max(a.y,b.y)<viewport.minY||Math.min(a.y,b.y)>viewport.maxY)return false;
  const inside=(point:{x:number;y:number})=>point.x>=viewport.minX&&point.x<=viewport.maxX&&point.y>=viewport.minY&&point.y<=viewport.maxY;
  if(inside(a)||inside(b))return true;
  const dx=b.x-a.x,dy=b.y-a.y;
  const crossesVertical=(x:number)=>{if(Math.abs(dx)<1e-9)return false;const t=(x-a.x)/dx,y=a.y+t*dy;return t>=0&&t<=1&&y>=viewport.minY&&y<=viewport.maxY};
  const crossesHorizontal=(y:number)=>{if(Math.abs(dy)<1e-9)return false;const t=(y-a.y)/dy,x=a.x+t*dx;return t>=0&&t<=1&&x>=viewport.minX&&x<=viewport.maxX};
  return crossesVertical(viewport.minX)||crossesVertical(viewport.maxX)||crossesHorizontal(viewport.minY)||crossesHorizontal(viewport.maxY);
}

export function nearestMissing<T extends Positioned>(items:readonly T[],present:ReadonlySet<string>,center:{x:number;y:number},limit=MAX_NODE_VIEWS_PER_FRAME):T[] {
  return items.filter(item=>!present.has(item.id)).sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y)||a.id.localeCompare(b.id)).slice(0,Math.max(0,limit));
}

export function reconcilePersistentObjects<T>(wanted:ReadonlySet<string>,objects:Map<string,T>,create:(id:string)=>T,destroy:(value:T)=>void):void {
  for(const [id,value] of objects)if(!wanted.has(id)){destroy(value);objects.delete(id)}
  for(const id of wanted)if(!objects.has(id))objects.set(id,create(id));
}

export class RenderIdleWindow {
  private idleFrames=RENDER_IDLE_FRAME_LIMIT+1;
  changed():void{this.idleFrames=0}
  nextFrame():boolean{return this.idleFrames++<=RENDER_IDLE_FRAME_LIMIT}
  get idle():number{return this.idleFrames}
}
