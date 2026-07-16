export interface LabelOffset { x:number; y:number; side:1|-1 }

export function labelScreenPosition(node:{x:number;y:number},nodeRadius:number,pillHeight:number,offset:LabelOffset):{x:number;y:number} {
  return{x:node.x+offset.x,y:node.y+offset.side*(nodeRadius+(pillHeight+6)/2+12)+offset.y};
}

export function interpolateLabelOffset(current:LabelOffset,target:LabelOffset,baseline:number,deltaMS:number,timeConstant=64):LabelOffset {
  const blend=1-Math.exp(-Math.max(0,deltaMS)/Math.max(1,timeConstant)),currentY=current.side*baseline+current.y,targetY=target.side*baseline+target.y,y=currentY+(targetY-currentY)*blend,side=y===0?target.side:y<0?-1:1;
  return{x:current.x+(target.x-current.x)*blend,y:y-side*baseline,side};
}
