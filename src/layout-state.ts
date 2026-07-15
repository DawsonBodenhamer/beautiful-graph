export const CURRENT_LAYOUT_REVISION=1;

export function persistedLayoutRevision(value:unknown):number {
  return typeof value==="number"&&Number.isInteger(value)&&value>=0?value:0;
}

export function layoutNeedsConvergence(value:unknown):boolean {
  return persistedLayoutRevision(value)<CURRENT_LAYOUT_REVISION;
}

export function completedLayoutRevision(previous:unknown,accepted:boolean):number {
  return accepted?CURRENT_LAYOUT_REVISION:persistedLayoutRevision(previous);
}
