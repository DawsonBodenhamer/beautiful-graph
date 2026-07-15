export function collisionGridCellSize(maxRenderedRadius:number):number {return Math.max(24,maxRenderedRadius*2+12)}
export function routingGridCellSize(maxRenderedRadius:number,linkDistance:number):number {return Math.max(Math.max(24,maxRenderedRadius*2+12),Math.min(600,Math.max(24,linkDistance*.3)))}
