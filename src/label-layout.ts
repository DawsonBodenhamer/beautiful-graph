export interface LabelOffset { x:number; y:number; side:1|-1 }

export function labelScreenPosition(node:{x:number;y:number},nodeRadius:number,pillHeight:number,offset:LabelOffset):{x:number;y:number} {
  return{x:node.x+offset.x,y:node.y+offset.side*(nodeRadius+(pillHeight+6)/2+12)+offset.y};
}
