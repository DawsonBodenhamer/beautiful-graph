import type { GraphAmbience } from "./types";
import { createDustParticle, dustLayerCounts, dustPosition, transformedDustColor, type DustLayer, type DustParticle } from "./ambience";

const MAX_PARTICLES=800;

export class AmbientDustController {
  private backdrop:HTMLDivElement;
  private background:HTMLCanvasElement;
  private foreground:HTMLCanvasElement;
  private backgroundParticles:DustParticle[];
  private foregroundParticles:DustParticle[];
  private frame=0;
  private elapsed=0;
  private lastFrame?:number;
  private dirty=true;
  private reducedMotion:MediaQueryList;
  private intersection?:IntersectionObserver;
  private visible=true;
  private disposed=false;
  private textureKey="";
  private backgroundTexture?:HTMLCanvasElement;
  private foregroundTexture?:HTMLCanvasElement;

  constructor(private host:HTMLElement,canvasHost:HTMLElement,private settings:()=>GraphAmbience){
    this.backdrop=document.createElement("div");this.backdrop.className="beautiful-ambience-backdrop";
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

  settingsChanged():void{if(this.disposed)return;this.dirty=true;this.applyBackdrop();this.ensureFrame()}
  viewportChanged():void{this.dirty=true;this.ensureFrame()}
  lifecycleChanged():void{this.handleLifecycle()}
  dispose():void{this.disposed=true;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.intersection?.disconnect();this.reducedMotion.removeEventListener("change",this.handleLifecycle);document.removeEventListener("visibilitychange",this.handleDocumentVisibility);this.backdrop.remove();this.background.remove();this.foreground.remove()}

  private handleDocumentVisibility=():void=>{this.lastFrame=undefined;if(document.visibilityState==="visible")this.ensureFrame()}
  private handleLifecycle=():void=>{this.lastFrame=undefined;if(this.shouldDraw())this.ensureFrame();else if(this.frame){cancelAnimationFrame(this.frame);this.frame=0}}
  private isLeafVisible():boolean{return this.visible&&this.host.isConnected&&this.host.clientWidth>0&&this.host.clientHeight>0&&this.host.getClientRects().length>0}
  private shouldAnimate():boolean{const value=this.settings();return this.isLeafVisible()&&!this.reducedMotion.matches&&value.count>0&&value.dustFade>0&&value.speed>0}
  private shouldDraw():boolean{const value=this.settings();return this.isLeafVisible()&&(this.dirty||value.count>0&&value.dustFade>0)}
  private ensureFrame():void{if(!this.frame&&this.shouldDraw())this.frame=requestAnimationFrame(this.draw)}
  private draw=(now:number):void=>{this.frame=0;if(this.disposed||!this.isLeafVisible())return;const ambience=this.settings();if(this.lastFrame!==undefined&&!this.reducedMotion.matches)this.elapsed+=(now-this.lastFrame)/1000*ambience.speed;this.lastFrame=now;this.resizeCanvas(this.background);this.resizeCanvas(this.foreground);this.prepareTextures(ambience);const counts=dustLayerCounts(ambience.count);this.drawLayer(this.background,this.backgroundParticles,counts.background,"background",ambience);this.drawLayer(this.foreground,this.foregroundParticles,counts.foreground,"foreground",ambience);this.dirty=false;if(this.shouldAnimate())this.frame=requestAnimationFrame(this.draw);else this.lastFrame=undefined}
  private resizeCanvas(canvas:HTMLCanvasElement):void{const dpr=Math.max(1,window.devicePixelRatio||1),width=Math.max(1,Math.round(this.host.clientWidth*dpr)),height=Math.max(1,Math.round(this.host.clientHeight*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;canvas.style.width=`${this.host.clientWidth}px`;canvas.style.height=`${this.host.clientHeight}px`}}
  private prepareTextures(ambience:GraphAmbience):void{const color=transformedDustColor(ambience),key=color;if(key===this.textureKey)return;this.textureKey=key;this.backgroundTexture=this.createTexture(color,false);this.foregroundTexture=this.createTexture(color,true)}
  private createTexture(color:string,foreground:boolean):HTMLCanvasElement{const canvas=document.createElement("canvas"),size=64;canvas.width=canvas.height=size;const context=canvas.getContext("2d")!,gradient=context.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);gradient.addColorStop(0,color);gradient.addColorStop(foreground?.16:.08,color);gradient.addColorStop(foreground?.37:.55,"transparent");context.fillStyle=gradient;context.fillRect(0,0,size,size);return canvas}
  private drawLayer(canvas:HTMLCanvasElement,particles:DustParticle[],count:number,layer:DustLayer,ambience:GraphAmbience):void{const context=canvas.getContext("2d"),texture=layer==="background"?this.backgroundTexture:this.foregroundTexture;if(!context||!texture)return;const dpr=Math.max(1,window.devicePixelRatio||1),width=canvas.width/dpr,height=canvas.height/dpr;context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);context.globalCompositeOperation="screen";for(let index=0;index<count;index++){const particle=particles[index]!,position=dustPosition(particle,layer,this.elapsed,ambience.irregularity,width,height),base=layer==="background"?1.25:1.5,size=base*particle.size*ambience.particleSize;context.globalAlpha=ambience.dustFade*particle.alpha*(layer==="background"?.34:.12);context.drawImage(texture,position.x-size,position.y-size,size*2,size*2)}context.globalAlpha=1;context.globalCompositeOperation="source-over"}
  private applyBackdrop():void{const value=this.settings();this.backdrop.style.background=`radial-gradient(circle at 55% 45%, transparent 0%, rgba(0,0,0,${value.vignette}) 100%), radial-gradient(circle at 55% 45%, #10202a 0%, #071018 48%, #071018 100%)`;this.backdrop.style.filter=`brightness(${value.brightness}) saturate(${value.saturation}) hue-rotate(${value.hue}deg)`}
}
