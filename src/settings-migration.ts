import type { BeautifulGraphSettings, PanelState } from "./types";
import { fallbackColorMode, paletteFallbackColor } from "./groups.ts";

export const NEW_DEFAULT_PRESET="Make this the new defaults";
export const REVISION_19_DEFAULT_PRESET="this preset to be new defaults";

export function storedNodeCount(value:unknown):number{return typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(15,Math.round(value))):0}

export function migrateNamedDefaults(settings:BeautifulGraphSettings,fromVersion:number):{forces:boolean;display:boolean} {
  const result={forces:false,display:false};
  if(fromVersion>=13)return result;
  const forces=settings.forcePresets?.[NEW_DEFAULT_PRESET];
  if(forces){settings.forces=structuredClone(forces);delete settings.forcePresets[NEW_DEFAULT_PRESET];result.forces=true}
  const display=settings.displayPresets?.[NEW_DEFAULT_PRESET];
  if(display){settings.display=structuredClone(display);delete settings.displayPresets[NEW_DEFAULT_PRESET];result.display=true}
  return result;
}

const finite=(value:unknown,fallback:number,min:number,max:number):number=>typeof value==="number"&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function migrateRevision19Settings(settings:BeautifulGraphSettings,fromVersion:number):boolean {
  if(fromVersion>=15)return false;
  const forces=settings.forcePresets?.[REVISION_19_DEFAULT_PRESET];
  const display=settings.displayPresets?.[REVISION_19_DEFAULT_PRESET];
  if(forces)settings.forces=structuredClone(forces);
  if(display)settings.display=structuredClone(display);
  const normalizeForce=(force:BeautifulGraphSettings["forces"]|undefined):void=>{if(!force)return;const legacy=force.siblingLinkForce as unknown;force.siblingLinkForce=legacy===false?0:legacy===true?1:finite(legacy,1,0,2);force.center=finite(force.center,1.2358954399999997,0,12);force.repel=finite(force.repel,1,0,3);force.link=finite(force.link,.041472,0,.6);force.distance=finite(force.distance,362.874,10,1500);force.curvature=finite(force.curvature,0,-2,2)};
  normalizeForce(settings.forces);for(const preset of Object.values(settings.forcePresets??{}))normalizeForce(preset);
  const d=settings.display;d.textFade=finite(d.textFade,24.748992,2,80);d.nodeSize=finite(d.nodeSize,2.8660740000000002,.2,8);d.linkThickness=finite(d.linkThickness,1.2583300000000004,.1,6);d.glow=finite(d.glow,.679144,0,2);d.glowSize=finite(d.glowSize,1.3,0,4);d.lensOpacity=finite(d.lensOpacity,.26,.04,.8);d.lensRadius=finite(d.lensRadius,1.74,.5,5);
  settings.other.colorMode=settings.other.colorMode??fallbackColorMode(settings.other.color);
  if(settings.other.colorMode==="palette")settings.other.color=paletteFallbackColor(settings.groups,settings.groupPalette);
  for(const preset of Object.values(settings.groupPresets??{})){preset.other.colorMode=preset.other.colorMode??fallbackColorMode(preset.other.color);if(preset.other.colorMode==="palette")preset.other.color=paletteFallbackColor(preset.groups,preset.paletteId)}
  return true;
}

export function migrateRevision20Settings(settings:BeautifulGraphSettings,fromVersion:number):boolean {
  if(fromVersion>=17)return false;
  const stripForce=(force:BeautifulGraphSettings["forces"]|undefined)=>{if(force)delete (force as unknown as {stretchiness?:unknown}).stretchiness};
  const stripDisplay=(display:BeautifulGraphSettings["display"]|undefined)=>{if(display)delete (display as unknown as {iconMode?:unknown}).iconMode};
  stripForce(settings.forces);for(const preset of Object.values(settings.forcePresets??{}))stripForce(preset);
  stripDisplay(settings.display);for(const preset of Object.values(settings.displayPresets??{}))stripDisplay(preset);
  return true;
}

export function migrateRevision25Settings(settings:BeautifulGraphSettings,fromVersion:number):boolean {
  if(fromVersion>=20)return false;
  const normalize=(force:BeautifulGraphSettings["forces"]|undefined)=>{if(force&&(force.rootLinkForce===undefined||!Number.isFinite(force.rootLinkForce)))force.rootLinkForce=1};
  normalize(settings.forces);for(const preset of Object.values(settings.forcePresets??{}))normalize(preset);
  const legacy=settings as unknown as {savedNodeCount?:number};legacy.savedNodeCount=Math.max(0,Math.min(5000,Math.round(Number.isFinite(legacy.savedNodeCount)?legacy.savedNodeCount!:100)));
  return true;
}

export function migrateRevision29Settings(settings:BeautifulGraphSettings,fromVersion:number):boolean {
  if(fromVersion>=21)return false;
  const legacy=settings as unknown as {savedNodeCount?:number};legacy.savedNodeCount=Math.max(5,Math.min(100,Math.round(Number.isFinite(legacy.savedNodeCount)?legacy.savedNodeCount!:100)));
  return true;
}

export function migrateRevision15Glow(display:{glow:number},fromVersion:number):boolean {
  if(fromVersion>=12||Math.abs(display.glow-.59056)>.000001)return false;
  display.glow=.679144;
  return true;
}

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

export function migrateAdaptivePanelDefaults(panels:Record<string,PanelState>,fromVersion:number):void {
  if(fromVersion>=10)return;
  const oldHeights:Record<string,number>={groups:.48,forces:.30,display:.40};
  for(const [id,state] of Object.entries(panels)){
    if(state.width!==undefined&&Math.abs(state.width-.18)<.005)state.width=.13;
    const oldHeight=oldHeights[id];
    if(state.pinned!==false&&oldHeight!==undefined&&(state.height===undefined||Math.abs(state.height-oldHeight)<.015)){
      state.autoHeight=true;
      delete state.height;
    }else if(state.autoHeight===undefined)state.autoHeight=state.height===undefined;
  }
}
