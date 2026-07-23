import type { GraphAmbience } from "./types";
import { createDustParticle, dustLayerCounts, dustPosition, parallaxDustPosition, shouldRebaseDustLayer, transformedDustColor, type DustCameraTransform, type DustLayer, type DustParticle } from "./ambience";
import { renderDitheredBackdrop } from "./backdrop";

const MAX_PARTICLES=800;
const DUST_REBASE_DURATION_MS=320;
const DUST_REBASE_STAGGER=.28;
type DustRebase={from:DustCameraTransform;to:DustCameraTransform;started:number};

export class AmbientDustController {
  private backdrop:HTMLCanvasElement;
  private backdropContext:CanvasRenderingContext2D;
  private background:HTMLCanvasElement;
  private foreground:HTMLCanvasElement;
  private backgroundParticles:DustParticle[];
  private foregroundParticles:DustParticle[];
  private frame=0;
  private elapsed=0;
  private lastFrame?:number;
  private dirty=true;
  private backdropDirty=true;
  private backdropKey="";
  private reducedMotion:MediaQueryList;
  private intersection?:IntersectionObserver;
  private visible=true;
  private disposed=false;
  private textureKey="";
  private backgroundTexture?:HTMLCanvasElement;
  private foregroundTexture?:HTMLCanvasElement;
  private camera?:DustCameraTransform;
  private cameraReferences:Record<DustLayer,DustCameraTransform|undefined>={background:undefined,foreground:undefined};
  private rebases:Partial<Record<DustLayer,DustRebase>>={};

  constructor(private host:HTMLElement,canvasHost:HTMLElement,private settings:()=>GraphAmbience){
    this.backdrop=document.createElement("canvas");this.backdrop.className="beautiful-ambience-backdrop";this.backdropContext=this.backdrop.getContext("2d",{alpha:false})!;
    this.background=document.createElement("canvas");this.background.className="beautiful-dust-canvas beautiful-dust-background";
    this.foreground=document.createElement("canvas");this.foreground.className="beautiful-dust-canvas beautiful-dust-foreground";
    host.insertBefore(this.backdrop,canvasHost);host.insertBefore(this.background,canvasHost);canvasHost.after(this.foreground);
    this.backgroundParticles=Array.from({length:MAX_PARTICLES},(_,index)=>createDustParticle(index,"background"));
    this.foregroundParticles=Array.from({length:MAX_PARTICLES},(_,index)=>createDustParticle(index,"foreground"));
    this.reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");this.reducedMotion.addEventListener("change",this.handleLifecycle);
    document.addEventListener("visibilitychange",this.handleDocumentVisibility);
    if(typeof IntersectionObserver!=="undefined"){this.intersection=new IntersectionObserver(entries=>{this.visible=entries.some(entry=>entry.isIntersecting);this.handleLifecycle()}, {threshold:0});this.intersection.observe(host)}
    this.settingsChanged();
  }

  settingsChanged():void{if(this.disposed)return;this.dirty=true;const value=this.settings(),key=`${value.vignette}|${value.brightness}|${value.hue}|${value.saturation}`;if(key!==this.backdropKey){this.backdropKey=key;this.backdropDirty=true}this.ensureFrame()}
  cameraChanged(camera:DustCameraTransform):void{if(this.disposed)return;this.camera={...camera};this.cameraReferences.background??={...camera};this.cameraReferences.foreground??={...camera};this.dirty=true;this.ensureFrame()}
  viewportChanged():void{const reference=this.camera?{...this.camera}:undefined;this.cameraReferences={background:reference,foreground:reference?{...reference}:undefined};this.rebases={};this.dirty=true;this.backdropDirty=true;this.ensureFrame()}
  lifecycleChanged():void{this.handleLifecycle()}
  dispose():void{this.disposed=true;if(this.frame)window.cancelAnimationFrame(this.frame);this.frame=0;this.intersection?.disconnect();this.reducedMotion.removeEventListener("change",this.handleLifecycle);document.removeEventListener("visibilitychange",this.handleDocumentVisibility);this.backdrop.remove();this.background.remove();this.foreground.remove()}

  private handleDocumentVisibility=():void=>{this.lastFrame=undefined;if(document.visibilityState==="visible")this.ensureFrame()}
  private handleLifecycle=():void=>{this.lastFrame=undefined;if(this.shouldDraw())this.ensureFrame();else if(this.frame){window.cancelAnimationFrame(this.frame);this.frame=0}}
  private isLeafVisible():boolean{return this.visible&&this.host.isConnected&&this.host.clientWidth>0&&this.host.clientHeight>0&&this.host.getClientRects().length>0}
  private shouldAnimate():boolean{const value=this.settings();return this.isLeafVisible()&&!this.reducedMotion.matches&&value.count>0&&value.dustFade>0&&(value.speed>0||this.hasActiveRebase())}
  private shouldDraw():boolean{const value=this.settings();return this.isLeafVisible()&&(this.dirty||this.backdropDirty||value.count>0&&value.dustFade>0)}
  private ensureFrame():void{if(!this.frame&&this.shouldDraw())this.frame=window.requestAnimationFrame(this.draw)}
  private draw=(now:number):void=>{this.frame=0;if(this.disposed||!this.isLeafVisible())return;const ambience=this.settings();if(this.lastFrame!==undefined&&!this.reducedMotion.matches)this.elapsed+=(now-this.lastFrame)/1000*ambience.speed;this.lastFrame=now;if(this.resizeCanvas(this.backdrop))this.backdropDirty=true;this.resizeCanvas(this.background);this.resizeCanvas(this.foreground);if(this.backdropDirty){renderDitheredBackdrop(this.backdropContext,this.backdrop.width,this.backdrop.height,ambience);this.backdropDirty=false}this.prepareTextures(ambience);const counts=dustLayerCounts(ambience.count);this.prepareRebase("background",now);this.prepareRebase("foreground",now);this.drawLayer(this.background,this.backgroundParticles,counts.background,"background",ambience,now);this.drawLayer(this.foreground,this.foregroundParticles,counts.foreground,"foreground",ambience,now);this.dirty=false;if(this.shouldAnimate())this.frame=window.requestAnimationFrame(this.draw);else this.lastFrame=undefined}
  private resizeCanvas(canvas:HTMLCanvasElement):boolean{const dpr=Math.max(1,window.devicePixelRatio||1),width=Math.max(1,Math.round(this.host.clientWidth*dpr)),height=Math.max(1,Math.round(this.host.clientHeight*dpr)),changed=canvas.width!==width||canvas.height!==height;if(changed){canvas.width=width;canvas.height=height;canvas.style.width=`${this.host.clientWidth}px`;canvas.style.height=`${this.host.clientHeight}px`}return changed}
  private prepareTextures(ambience:GraphAmbience):void{const color=transformedDustColor(ambience),key=color;if(key===this.textureKey)return;this.textureKey=key;this.backgroundTexture=this.createTexture(color,false);this.foregroundTexture=this.createTexture(color,true)}
  private createTexture(color:string,foreground:boolean):HTMLCanvasElement{const canvas=document.createElement("canvas"),size=64;canvas.width=canvas.height=size;const context=canvas.getContext("2d")!,gradient=context.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);gradient.addColorStop(0,color);gradient.addColorStop(foreground?.16:.08,color);gradient.addColorStop(foreground?1:.55,"transparent");context.fillStyle=gradient;context.fillRect(0,0,size,size);return canvas}
  private hasActiveRebase():boolean{return Boolean(this.rebases.background||this.rebases.foreground)}
  private prepareRebase(layer:DustLayer,now:number):void{const active=this.rebases[layer];if(active&&now-active.started>=DUST_REBASE_DURATION_MS){this.cameraReferences[layer]=active.to;delete this.rebases[layer]}const camera=this.camera,reference=this.cameraReferences[layer];if(!this.rebases[layer]&&camera&&reference&&shouldRebaseDustLayer(layer,camera,reference)){if(this.reducedMotion.matches)this.cameraReferences[layer]={...camera};else this.rebases[layer]={from:reference,to:{...camera},started:now}}}
  private rebaseMix(index:number,rebase:DustRebase,now:number):number{const progress=Math.max(0,Math.min(1,(now-rebase.started)/DUST_REBASE_DURATION_MS)),delay=(index*.61803398875%1)*DUST_REBASE_STAGGER;return Math.max(0,Math.min(1,(progress-delay)/(1-DUST_REBASE_STAGGER)))}
  private drawLayer(canvas:HTMLCanvasElement,particles:DustParticle[],count:number,layer:DustLayer,ambience:GraphAmbience,now:number):void{const context=canvas.getContext("2d"),texture=layer==="background"?this.backgroundTexture:this.foregroundTexture;if(!context||!texture)return;const dpr=Math.max(1,window.devicePixelRatio||1),width=canvas.width/dpr,height=canvas.height/dpr;context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);context.globalCompositeOperation="screen";const camera=this.camera,reference=this.cameraReferences[layer],rebase=this.rebases[layer],opacity=ambience.dustFade*(layer==="background"?.34:.0765);for(let index=0;index<count;index++){const particle=particles[index]!,basePosition=dustPosition(particle,layer,this.elapsed,ambience.irregularity,width,height),base=layer==="background"?1.25:4.32,size=base*particle.size*ambience.particleSize,alpha=opacity*particle.alpha;if(camera&&rebase){const mix=this.rebaseMix(index,rebase,now),from=parallaxDustPosition(basePosition,layer,camera,rebase.from,width,height),to=parallaxDustPosition(basePosition,layer,camera,rebase.to,width,height);if(mix<1){context.globalAlpha=alpha*(1-mix);this.drawWrapped(context,texture,from.x,from.y,size,width,height)}if(mix>0){context.globalAlpha=alpha*mix;this.drawWrapped(context,texture,to.x,to.y,size,width,height)}}else{const position=camera&&reference?parallaxDustPosition(basePosition,layer,camera,reference,width,height):basePosition;context.globalAlpha=alpha;this.drawWrapped(context,texture,position.x,position.y,size,width,height)}}context.globalAlpha=1;context.globalCompositeOperation="source-over"}
  private drawWrapped(context:CanvasRenderingContext2D,texture:HTMLCanvasElement,x:number,y:number,size:number,width:number,height:number):void{const xs=[x],ys=[y];if(x>=-size&&x<size)xs.push(x+width);if(x>width-size&&x<=width+size)xs.push(x-width);if(y>=-size&&y<size)ys.push(y+height);if(y>height-size&&y<=height+size)ys.push(y-height);for(const drawX of xs)for(const drawY of ys)context.drawImage(texture,drawX-size,drawY-size,size*2,size*2)}
}
