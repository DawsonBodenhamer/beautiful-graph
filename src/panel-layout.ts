export type PanelAnchor="top-left"|"top-right"|"bottom-left"|"bottom-right";

export function panelAnchor(id:string):PanelAnchor {
  return id==="groups"?"top-left":id==="ambience"?"top-right":id==="forces"?"bottom-left":"bottom-right";
}

export function resolvePanelPosition(id:string,pinned:boolean,stateX:number,stateY:number,hostWidth:number,hostHeight:number,panelWidth:number,panelHeight:number):{x:number;y:number} {
  const marginX=hostWidth*.03,marginY=hostHeight*.03,anchor=panelAnchor(id);
  if(pinned)return{
    x:anchor==="bottom-right"||anchor==="top-right"?hostWidth-panelWidth-marginX:marginX,
    y:anchor==="top-left"||anchor==="top-right"?marginY:hostHeight-panelHeight-marginY
  };
  return{
    x:Math.max(marginX,Math.min(hostWidth-panelWidth-marginX,stateX*hostWidth)),
    y:Math.max(marginY,Math.min(hostHeight-panelHeight-marginY,stateY*hostHeight))
  };
}
