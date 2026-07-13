import type { PanelState } from "./types";

export function migrateRevision10Panels(panels:Record<string,PanelState>,fromVersion:number):void {
  if(fromVersion>=8)return;
  const groups=panels.groups;
  if(groups?.width===245&&groups.height===638)groups.height=520;
  const display=panels.display;
  const obsoleteTopRight=display?.width===247&&display.height===474&&display.z===undefined&&display.x!==undefined&&display.x>=300&&display.y!==undefined&&display.y<=100;
  if(obsoleteTopRight){delete display.x;delete display.y}
}
