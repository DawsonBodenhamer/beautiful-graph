export interface CollisionLabel {
  ownerId?:string;
  ownerRadius?:number;
  x:number;
  y:number;
  homeX:number;
  homeY:number;
  w:number;
  h:number;
  weight:number;
}

export interface CollisionCircle { id:string; x:number; y:number; radius:number }

export interface CollisionLayoutOptions {
  maxOffsetX:number;
  maxOffsetY:number;
  attractionPasses?:number;
  cleanupPasses?:number;
  gapX?:number;
  gapY?:number;
  nodeGap?:number;
  obstacleRatio?:number;
  attractionStrength?:number;
  obstacles?:CollisionCircle[];
}

function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value))}
function labelOverlap(a:CollisionLabel,b:CollisionLabel,gapX:number,gapY:number):{x:number;y:number}{return{x:(a.w+b.w)/2+gapX-Math.abs(b.x-a.x),y:(a.h+b.h)/2+gapY-Math.abs(b.y-a.y)}}

function separateLabels(labels:CollisionLabel[],gapX:number,gapY:number):void{
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
    const a=labels[i],b=labels[j];if(!a||!b)continue;const overlap=labelOverlap(a,b,gapX,gapY);if(overlap.x<=0||overlap.y<=0)continue;
    if(overlap.x<overlap.y){const direction=Math.sign(b.x-a.x||((j-i)&1?1:-1)),push=direction*overlap.x;a.x-=push*a.weight;b.x+=push*b.weight}
    else{const direction=Math.sign(b.y-a.y||((j-i)&1?1:-1)),push=direction*overlap.y;a.y-=push*a.weight;b.y+=push*b.weight}
  }
}

function circleOverlap(item:CollisionLabel,obstacle:CollisionCircle,nodeGap:number):{x:number;y:number;overlap:number}|undefined{
  if(item.ownerId===obstacle.id)return;const halfW=item.w/2+nodeGap,halfH=item.h/2+nodeGap,dx=obstacle.x-item.x,dy=obstacle.y-item.y,nearestX=clamp(dx,-halfW,halfW),nearestY=clamp(dy,-halfH,halfH),vx=nearestX-dx,vy=nearestY-dy,distance=Math.hypot(vx,vy);
  if(distance>=obstacle.radius)return;
  if(distance>.0001){const overlap=obstacle.radius-distance;return{x:vx/distance*overlap,y:vy/distance*overlap,overlap}}
  const overlapX=halfW+obstacle.radius-Math.abs(dx),overlapY=halfH+obstacle.radius-Math.abs(dy);return overlapX<overlapY?{x:(dx>=0?-1:1)*overlapX,y:0,overlap:overlapX}:{x:0,y:(dy>=0?-1:1)*overlapY,overlap:overlapY};
}

function separateObstacles(labels:CollisionLabel[],obstacles:Map<CollisionLabel,CollisionCircle[]>,nodeGap:number):void{for(const item of labels)for(const obstacle of obstacles.get(item)??[]){const push=circleOverlap(item,obstacle,nodeGap);if(push){item.x+=push.x;item.y+=push.y}}}

function residualOverlap(labels:CollisionLabel[],obstacles:Map<CollisionLabel,CollisionCircle[]>,gapX:number,gapY:number,nodeGap:number):number{
  let residual=0;for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];if(!a||!b)continue;const overlap=labelOverlap(a,b,gapX,gapY);if(overlap.x>0&&overlap.y>0)residual=Math.max(residual,Math.min(overlap.x,overlap.y))}for(const item of labels)for(const obstacle of obstacles.get(item)??[])residual=Math.max(residual,circleOverlap(item,obstacle,nodeGap)?.overlap??0);return residual;
}

export function relaxLabelCollisions<T extends CollisionLabel>(labels:T[],options:CollisionLayoutOptions):number {
  const attractionPasses=options.attractionPasses??12,cleanupPasses=options.cleanupPasses??64,gapX=options.gapX??4,gapY=options.gapY??3,nodeGap=options.nodeGap??5,obstacleRatio=options.obstacleRatio??.75,attractionStrength=options.attractionStrength??.18,allObstacles=options.obstacles??[],obstacles=new Map<CollisionLabel,CollisionCircle[]>(labels.map(item=>[item,allObstacles.filter(obstacle=>item.ownerId!==obstacle.id&&(item.ownerRadius===undefined||obstacle.radius>=item.ownerRadius*obstacleRatio)&&Math.abs(obstacle.x-item.homeX)<=options.maxOffsetX+item.w/2+nodeGap+obstacle.radius&&Math.abs(obstacle.y-item.homeY)<=options.maxOffsetY+item.h/2+nodeGap+obstacle.radius)]));
  let residual=0;
  for(let pass=0;pass<attractionPasses+cleanupPasses;pass++){
    if(pass<attractionPasses)for(const item of labels){item.x+=(item.homeX-item.x)*attractionStrength;item.y+=(item.homeY-item.y)*attractionStrength}
    separateLabels(labels,gapX,gapY);separateObstacles(labels,obstacles,nodeGap);separateLabels(labels,gapX,gapY);
    for(const item of labels){item.x=clamp(item.x,item.homeX-options.maxOffsetX,item.homeX+options.maxOffsetX);item.y=clamp(item.y,item.homeY-options.maxOffsetY,item.homeY+options.maxOffsetY)}
    residual=residualOverlap(labels,obstacles,gapX,gapY,nodeGap);
    if(pass>=attractionPasses&&residual<.25)break;
  }
  return residual;
}
