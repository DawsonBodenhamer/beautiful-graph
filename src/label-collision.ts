export interface CollisionLabel {
  x:number;
  y:number;
  homeX:number;
  homeY:number;
  w:number;
  h:number;
  weight:number;
}

export interface CollisionLayoutOptions {
  maxOffsetX:number;
  maxOffsetY:number;
  attractionPasses?:number;
  cleanupPasses?:number;
  gapX?:number;
  gapY?:number;
}

function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value))}

export function relaxLabelCollisions<T extends CollisionLabel>(labels:T[],options:CollisionLayoutOptions):number {
  const attractionPasses=options.attractionPasses??8,cleanupPasses=options.cleanupPasses??64,gapX=options.gapX??4,gapY=options.gapY??3;
  let residual=0;
  for(let pass=0;pass<attractionPasses+cleanupPasses;pass++){
    if(pass<attractionPasses)for(const item of labels){item.x+=(item.homeX-item.x)*.1;item.y+=(item.homeY-item.y)*.1}
    residual=0;
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j];if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y,ox=(a.w+b.w)/2+gapX-Math.abs(dx),oy=(a.h+b.h)/2+gapY-Math.abs(dy);
      if(ox<=0||oy<=0)continue;
      residual=Math.max(residual,Math.min(ox,oy));
      const aw=a.weight,bw=b.weight;
      if(ox<oy){const direction=Math.sign(dx||((j-i)&1?1:-1)),push=direction*ox;a.x-=push*aw;b.x+=push*bw}
      else{const direction=Math.sign(dy||((j-i)&1?1:-1)),push=direction*oy;a.y-=push*aw;b.y+=push*bw}
    }
    for(const item of labels){item.x=clamp(item.x,item.homeX-options.maxOffsetX,item.homeX+options.maxOffsetX);item.y=clamp(item.y,item.homeY-options.maxOffsetY,item.homeY+options.maxOffsetY)}
    if(pass>=attractionPasses&&residual<.25)break;
  }
  return residual;
}
