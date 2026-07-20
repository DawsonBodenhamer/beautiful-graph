import type { GraphAmbience } from "./types";
import { DEFAULT_AMBIENCE } from "./defaults.ts";

export type DustLayer="background"|"foreground";
export interface DustParticle { phase:number; radius:number; band:number; radialPhase:number; verticalPhase:number; noisePhase:number; speedFactor:number; size:number; alpha:number }
export interface DustCameraTransform { scale:number; x:number; y:number }

export const DUST_PARALLAX_DEPTH:Record<DustLayer,number>={background:.18,foreground:.55};

const finite=(value:unknown,fallback:number):number=>typeof value==="number"&&Number.isFinite(value)?value:fallback;
const clamp=(value:number,min:number,max:number):number=>Math.max(min,Math.min(max,value));

export function normalizeAmbience(value:Partial<GraphAmbience>|undefined):GraphAmbience{return{
  vignette:clamp(finite(value?.vignette,DEFAULT_AMBIENCE.vignette),0,1),
  brightness:clamp(finite(value?.brightness,DEFAULT_AMBIENCE.brightness),0,2),
  hue:clamp(finite(value?.hue,DEFAULT_AMBIENCE.hue),-180,180),
  saturation:clamp(finite(value?.saturation,DEFAULT_AMBIENCE.saturation),0,5),
  speed:clamp(finite(value?.speed,DEFAULT_AMBIENCE.speed),0,2),
  count:Math.round(clamp(finite(value?.count,DEFAULT_AMBIENCE.count),0,800)),
  irregularity:clamp(finite(value?.irregularity,DEFAULT_AMBIENCE.irregularity),0,3),
  particleSize:clamp(finite(value?.particleSize,DEFAULT_AMBIENCE.particleSize),.25,5),
  dustFade:clamp(finite(value?.dustFade,DEFAULT_AMBIENCE.dustFade),0,1),
  dustBoost:clamp(finite(value?.dustBoost,DEFAULT_AMBIENCE.dustBoost),0,1),
}}

export function dustLayerCounts(count:number):{background:number;foreground:number}{const total=Math.max(0,Math.min(800,Math.round(count))),background=Math.round(total*.7);return{background,foreground:total-background}}

function randomSequence(seed:number):()=>number{let state=seed>>>0;return()=>{state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296}}

export function createDustParticle(index:number,layer:DustLayer):DustParticle{const random=randomSequence((index+1)*0x9e3779b1^(layer==="background"?0x51f15e:0xa17f3d));return{phase:random()*Math.PI*2,radius:.12+random()*.48,band:.04+random()*.92,radialPhase:random()*Math.PI*2,verticalPhase:random()*Math.PI*2,noisePhase:random()*Math.PI*2,speedFactor:.72+random()*.56,size:.55+random()*.9,alpha:.28+random()*.72}}

export function dustPosition(particle:DustParticle,layer:DustLayer,time:number,irregularity:number,width:number,height:number):{x:number;y:number}{const direction=layer==="background"?1:-1,organic=irregularity*.32*Math.sin(time*.11+particle.noisePhase),angle=particle.phase+direction*(time*.16*particle.speedFactor+organic),breathing=1+irregularity*.075*Math.sin(time*.19+particle.radialPhase),radius=particle.radius*Math.min(width,height)*breathing;return{x:width*.5+Math.cos(angle)*radius,y:particle.band*height+Math.sin(angle)*height*.018+Math.sin(time*.13+particle.verticalPhase)*height*.022*irregularity}}

function wrap(value:number,span:number):number{return span>0?(value%span+span)%span:value}

export function parallaxDustPosition(position:{x:number;y:number},layer:DustLayer,camera:DustCameraTransform,reference:DustCameraTransform,width:number,height:number):{x:number;y:number}{
  const depth=DUST_PARALLAX_DEPTH[layer],ratio=Math.max(.0001,camera.scale)/Math.max(.0001,reference.scale);
  if(Math.abs(ratio-1)<1e-6)return{x:wrap(position.x+(camera.x-reference.x)*depth,width),y:wrap(position.y+(camera.y-reference.y)*depth,height)};
  const layerRatio=ratio**depth,pivotX=(camera.x-ratio*reference.x)/(1-ratio),pivotY=(camera.y-ratio*reference.y)/(1-ratio);
  return{x:wrap(pivotX+(position.x-pivotX)*layerRatio,width),y:wrap(pivotY+(position.y-pivotY)*layerRatio,height)};
}

type Rgb={r:number;g:number;b:number};
function rgbToHsl({r,g,b}:Rgb):{h:number;s:number;l:number}{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;if(d===0)return{h:0,s:0,l};const s=d/(1-Math.abs(2*l-1));let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;if(h<0)h+=6;return{h:h*60,s,l}}
function hslToRgb(h:number,s:number,l:number):Rgb{const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let values:[number,number,number]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return{r:(values[0]+m)*255,g:(values[1]+m)*255,b:(values[2]+m)*255}}
export function transformedDustColor(ambience:GraphAmbience):string{const base=rgbToHsl({r:126,g:205,b:199}),h=(base.h+ambience.hue+360)%360,s=clamp(base.s*ambience.saturation,0,1),l=clamp(base.l*ambience.brightness,0,1),rgb=hslToRgb(h,s,l),boost=ambience.dustBoost,mix=(channel:number)=>Math.round(channel+(255-channel)*boost);return`rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`}
