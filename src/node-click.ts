export interface NodeClickState { id:string; at:number }

export function registerNodeClick(previous:NodeClickState|undefined,id:string,at:number,moved:boolean,maxDelay=400):{doubleClick:boolean;next:NodeClickState|undefined}{
  if(moved)return{doubleClick:false,next:undefined};
  const doubleClick=previous?.id===id&&at-previous.at>=0&&at-previous.at<=maxDelay;
  return{doubleClick,next:doubleClick?undefined:{id,at}};
}
