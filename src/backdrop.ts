import type { GraphAmbience } from "./types";

export const BLUE_NOISE_SIZE=64;
const COLOR_SAMPLES=8192;
type Rgb=[number,number,number];

function hash(index:number):number{let value=Math.imul(index+1,0x9e3779b1)>>>0;value^=value>>>16;value=Math.imul(value,0x21f0aaad)>>>0;value^=value>>>15;value=Math.imul(value,0x735a2d97)>>>0;value^=value>>>15;return(value>>>0)/4294967296}

export function createBlueNoiseThresholds(size=BLUE_NOISE_SIZE):Uint8Array{
  const length=size*size,white=new Float64Array(length),highPass=new Float64Array(length);
  for(let index=0;index<length;index++)white[index]=hash(index);
  const sample=(x:number,y:number)=>white[((y+size)%size)*size+(x+size)%size]??0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const index=y*size+x,neighbors=sample(x-1,y-1)+sample(x,y-1)+sample(x+1,y-1)+sample(x-1,y)+sample(x+1,y)+sample(x-1,y+1)+sample(x,y+1)+sample(x+1,y+1);highPass[index]=(white[index]??0)-neighbors/8}
  const order=Array.from({length},(_,index)=>index).sort((a,b)=>(highPass[a]??0)-(highPass[b]??0)||a-b),thresholds=new Uint8Array(length);
  for(let rank=0;rank<length;rank++)thresholds[order[rank]??0]=Math.floor(rank*256/length);
  return thresholds;
}

export const BLUE_NOISE_THRESHOLDS=createBlueNoiseThresholds();

function clamp255(value:number):number{return Math.max(0,Math.min(255,value))}

export function backdropColorAt(radius:number,ambience:GraphAmbience):Rgb{
  const t=Math.max(0,Math.min(1,radius)),mix=Math.min(1,t/.48),shade=1-ambience.vignette*t;
  let r=(16+(7-16)*mix)*shade*ambience.brightness,g=(32+(16-32)*mix)*shade*ambience.brightness,b=(42+(24-42)*mix)*shade*ambience.brightness;
  const saturation=ambience.saturation,sr=(.213+.787*saturation)*r+(.715-.715*saturation)*g+(.072-.072*saturation)*b,sg=(.213-.213*saturation)*r+(.715+.285*saturation)*g+(.072-.072*saturation)*b,sb=(.213-.213*saturation)*r+(.715-.715*saturation)*g+(.072+.928*saturation)*b;
  const angle=ambience.hue*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  r=(.213+.787*cos-.213*sin)*sr+(.715-.715*cos-.715*sin)*sg+(.072-.072*cos+.928*sin)*sb;
  g=(.213-.213*cos+.143*sin)*sr+(.715+.285*cos+.140*sin)*sg+(.072-.072*cos-.283*sin)*sb;
  b=(.213-.213*cos-.787*sin)*sr+(.715-.715*cos+.715*sin)*sg+(.072+.928*cos+.072*sin)*sb;
  return[clamp255(r),clamp255(g),clamp255(b)];
}

export function quantizeBackdropColor(color:Rgb,threshold:number):Rgb{return[Math.floor(color[0]+threshold),Math.floor(color[1]+threshold),Math.floor(color[2]+threshold)]}

export function renderDitheredBackdrop(context:CanvasRenderingContext2D,width:number,height:number,ambience:GraphAmbience):void{
  const image=context.createImageData(width,height),pixels=image.data,lut=new Float32Array(COLOR_SAMPLES*3),cx=width*.55,cy=height*.45,radius=Math.max(Math.hypot(cx,cy),Math.hypot(width-cx,cy),Math.hypot(cx,height-cy),Math.hypot(width-cx,height-cy));
  for(let index=0;index<COLOR_SAMPLES;index++){const color=backdropColorAt(index/(COLOR_SAMPLES-1),ambience),offset=index*3;lut[offset]=color[0];lut[offset+1]=color[1];lut[offset+2]=color[2]}
  for(let y=0;y<height;y++){const dy=y+.5-cy,noiseRow=(y%BLUE_NOISE_SIZE)*BLUE_NOISE_SIZE;for(let x=0;x<width;x++){const t=Math.min(1,Math.hypot(x+.5-cx,dy)/radius),colorOffset=Math.round(t*(COLOR_SAMPLES-1))*3,pixelOffset=(y*width+x)*4,threshold=((BLUE_NOISE_THRESHOLDS[noiseRow+x%BLUE_NOISE_SIZE]??0)+.5)/256;pixels[pixelOffset]=Math.floor((lut[colorOffset]??0)+threshold);pixels[pixelOffset+1]=Math.floor((lut[colorOffset+1]??0)+threshold);pixels[pixelOffset+2]=Math.floor((lut[colorOffset+2]??0)+threshold);pixels[pixelOffset+3]=255}}
  context.putImageData(image,0,0);
}
