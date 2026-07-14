import type { PanelState } from "./types";

export function migrateRevision10Panels(panels:Record<string,PanelState>,fromVersion:number):void {
  if(fromVersion>=8)return;
  const groups=panels.groups;
  if(groups?.width===245&&groups.height===638)groups.height=520;
  const display=panels.display;
  const obsoleteTopRight=display?.width===247&&display.height===474&&display.z===undefined&&display.x!==undefined&&display.x>=300&&display.y!==undefined&&display.y<=100;
  if(obsoleteTopRight){delete display.x;delete display.y}
}

export function migrateResponsivePanels(panels:Record<string,PanelState>,fromVersion:number):void {
  if(fromVersion>=9)return;
  for(const state of Object.values(panels)){
    const legacy:PanelState["legacyPixels"]={};
    for(const key of ["x","y","width","height"] as const){
      const value=state[key];
      if(value!==undefined&&value>1){legacy[key]=value;delete state[key]}
    }
    if(Object.keys(legacy).length)state.legacyPixels=legacy;
  }
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
