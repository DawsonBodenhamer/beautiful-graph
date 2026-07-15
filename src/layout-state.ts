export const CURRENT_LAYOUT_REVISION=2;

export function persistedLayoutRevision(value:unknown):number {
  return typeof value==="number"&&Number.isInteger(value)&&value>=0?value:0;
}
