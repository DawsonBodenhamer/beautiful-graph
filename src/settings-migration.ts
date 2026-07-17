import type { BeautifulGraphSettings, GraphForces, PanelState } from "./types";

export const V2_SETTINGS_VERSION=22;

export function storedNodeCount(value:unknown):number{return typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(15,Math.round(value))):0}

const finite=(value:unknown,fallback:number):number=>typeof value==="number"&&Number.isFinite(value)?value:fallback;
const cleanForces=(value:Partial<GraphForces>|undefined,defaults:GraphForces):GraphForces=>({
  center:finite(value?.center,defaults.center),
  repel:finite(value?.repel,defaults.repel),
  link:finite(value?.link,defaults.link),
  distance:finite(value?.distance,defaults.distance),
});

/** V1 physics and positions are deliberately incompatible with the V2 lifecycle. */
export function migrateV2Settings(settings:BeautifulGraphSettings,fromVersion:number,defaults:GraphForces):boolean {
  const before=JSON.stringify({forces:settings.forces,forcePresets:settings.forcePresets,storedNodeCount:settings.storedNodeCount,savedNodeCount:(settings as unknown as {savedNodeCount?:unknown}).savedNodeCount});
  if(fromVersion<V2_SETTINGS_VERSION){
    settings.forces={...defaults};
    settings.forcePresets={};
    settings.storedNodeCount=0;
  }else{
    settings.forces=cleanForces(settings.forces,defaults);
    settings.forcePresets=Object.fromEntries(Object.entries(settings.forcePresets??{}).map(([name,preset])=>[name,cleanForces(preset,defaults)]));
    settings.storedNodeCount=storedNodeCount(settings.storedNodeCount);
  }
  delete (settings as unknown as {savedNodeCount?:unknown}).savedNodeCount;
  return before!==JSON.stringify({forces:settings.forces,forcePresets:settings.forcePresets,storedNodeCount:settings.storedNodeCount,savedNodeCount:undefined});
}

export function resolveLegacyPanelGeometry(state:PanelState,hostWidth:number,hostHeight:number):boolean {
  const legacy=state.legacyPixels;
  if(!legacy||hostWidth<=0||hostHeight<=0)return false;
  if(legacy.x!==undefined)state.x=Math.max(0,Math.min(1,legacy.x/hostWidth));
  if(legacy.y!==undefined)state.y=Math.max(0,Math.min(1,legacy.y/hostHeight));
  if(legacy.width!==undefined)state.width=Math.max(0,Math.min(1,legacy.width/hostWidth));
  if(legacy.height!==undefined)state.height=Math.max(0,Math.min(1,legacy.height/hostHeight));
  delete state.legacyPixels;
  return true;
}
