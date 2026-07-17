import type { GraphPoint } from "./types";

export const V2_DATA_VERSION=22;
export const CURRENT_LAYOUT_REVISION=3;

export function persistedLayoutRevision(value:unknown):number {
  return typeof value==="number"&&Number.isInteger(value)&&value>=0?value:0;
}

export function loadV2Positions(fromVersion:number,layoutRevision:unknown,positions:Record<string,GraphPoint>|undefined):Record<string,GraphPoint>{
  if(fromVersion<V2_DATA_VERSION||persistedLayoutRevision(layoutRevision)!==CURRENT_LAYOUT_REVISION)return{};
  return positions??{};
}
