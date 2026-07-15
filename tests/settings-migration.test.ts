import test from "node:test";
import assert from "node:assert/strict";
import { migrateAdaptivePanelDefaults, migrateNamedDefaults, migrateResponsivePanels, migrateRevision10Panels, migrateRevision15Glow, migrateRevision19Settings, migrateRevision20Settings, migrateRevision25Settings, migrateRevision29Settings, resolveLegacyPanelGeometry } from "../src/settings-migration.ts";
import type { BeautifulGraphSettings } from "../src/types.ts";

test("known obsolete panel signatures migrate",()=>{
  const panels={groups:{visible:true,collapsed:false,width:245,height:638},display:{visible:true,collapsed:false,width:247,height:474,x:900,y:48}};
  migrateRevision10Panels(panels,7);
  assert.equal(panels.groups.height,520);
  assert.equal(panels.display.x,undefined);
  assert.equal(panels.display.y,undefined);
});

test("pixel panel geometry waits for a measurable leaf before normalization",()=>{
  const panels={groups:{visible:true,collapsed:false,x:30,y:40,width:245,height:520}};
  migrateResponsivePanels(panels,8);
  assert.deepEqual(panels.groups,{visible:true,collapsed:false,legacyPixels:{x:30,y:40,width:245,height:520}});
  assert.equal(resolveLegacyPanelGeometry(panels.groups,0,900),false);
  assert.equal(resolveLegacyPanelGeometry(panels.groups,1000,800),true);
  assert.deepEqual(panels.groups,{visible:true,collapsed:false,x:.03,y:.05,width:.245,height:.65});
});

test("normalized panel geometry is idempotent",()=>{
  const panels={display:{visible:true,collapsed:false,x:.79,y:.57,width:.18,height:.4}};
  migrateResponsivePanels(panels,9);
  assert.deepEqual(panels.display,{visible:true,collapsed:false,x:.79,y:.57,width:.18,height:.4});
});

test("customized panel geometry is preserved",()=>{
  const panels={groups:{visible:true,collapsed:false,width:310,height:638},display:{visible:true,collapsed:false,width:247,height:474,x:900,y:48,z:22}};
  migrateRevision10Panels(panels,7);
  assert.deepEqual(panels,{groups:{visible:true,collapsed:false,width:310,height:638},display:{visible:true,collapsed:false,width:247,height:474,x:900,y:48,z:22}});
});

test("revision 9 default panels become narrower and content-height driven",()=>{
  const panels={groups:{visible:true,collapsed:false,pinned:true,width:.18,height:.48},forces:{visible:true,collapsed:false,pinned:true,width:.18,height:.30},display:{visible:true,collapsed:false,pinned:true,width:.18,height:.40}};
  migrateAdaptivePanelDefaults(panels,9);
  for(const state of Object.values(panels)){assert.equal(state.width,.13);assert.equal(state.height,undefined);assert.equal(state.autoHeight,true)}
});

test("revision 9 custom free panel geometry remains explicit",()=>{
  const panels={groups:{visible:true,collapsed:false,pinned:false,width:.16,height:.55}};
  migrateAdaptivePanelDefaults(panels,9);
  assert.deepEqual(panels.groups,{visible:true,collapsed:false,pinned:false,width:.16,height:.55,autoHeight:false});
});

test("revision 15 glow migration changes only the verified live multiplier",()=>{
  const live={glow:.5905600000000002},custom={glow:.4};
  assert.equal(migrateRevision15Glow(live,11),true);
  assert.equal(live.glow,.679144);
  assert.equal(migrateRevision15Glow(custom,11),false);
  assert.equal(custom.glow,.4);
  assert.equal(migrateRevision15Glow({glow:.59056},12),false);
});

test("named force and display defaults promote independently and idempotently",()=>{
  const name="Make this the new defaults",settings={forces:{center:9},display:{glow:9},forcePresets:{[name]:{center:.5,repel:.3}},displayPresets:{[name]:{glow:.7},keep:{glow:.2}}} as unknown as BeautifulGraphSettings;
  assert.deepEqual(migrateNamedDefaults(settings,12),{forces:true,display:true});
  assert.deepEqual(settings.forces,{center:.5,repel:.3});assert.deepEqual(settings.display,{glow:.7});assert.equal(settings.forcePresets[name],undefined);assert.deepEqual(settings.displayPresets.keep,{glow:.2});
  assert.deepEqual(migrateNamedDefaults(settings,13),{forces:false,display:false});
});

test("missing named preset does not block promotion of the other domain",()=>{
  const name="Make this the new defaults",settings={forces:{center:1},display:{glow:1},forcePresets:{},displayPresets:{[name]:{glow:.6}}} as unknown as BeautifulGraphSettings;
  assert.deepEqual(migrateNamedDefaults(settings,12),{forces:false,display:true});assert.deepEqual(settings.forces,{center:1});assert.deepEqual(settings.display,{glow:.6});
});

test("revision 19 promotes the exact lowercase presets and preserves them",()=>{const name="this preset to be new defaults",settings={
  forces:{center:.1,repel:.1,link:.1,distance:20,curvature:0,stretchiness:0,siblingLinkForce:false},display:{textFade:3,nodeSize:.3,linkThickness:.2,glow:.1,glowSize:.2,showSiblingLinks:true,showLinkedInSearch:false,lensOpacity:.1,lensRadius:.6,recenterOnFocus:false},
  forcePresets:{[name]:{center:1.23589544,repel:1,link:.041472,distance:362.874,curvature:0,stretchiness:.08224,siblingLinkForce:true}},displayPresets:{[name]:{textFade:24.748992,nodeSize:2.866074,linkThickness:1.25833,glow:.679144,glowSize:1.3,showSiblingLinks:false,showLinkedInSearch:false,lensOpacity:.26,lensRadius:1.74,recenterOnFocus:false}},groups:[],groupPalette:"Beautiful Default",other:{visible:true,color:"#65635d",icon:"📂"},groupPresets:{},
} as unknown as BeautifulGraphSettings;assert.equal(migrateRevision19Settings(settings,14),true);assert.equal(settings.forces.siblingLinkForce,1);assert.equal(settings.display.nodeSize,2.866074);assert.equal(settings.other.colorMode,"palette");assert.ok(settings.forcePresets[name]);assert.ok(settings.displayPresets[name]);assert.equal(migrateRevision19Settings(settings,15),false)});

test("revision 19 migrates sibling booleans in every preset",()=>{const settings={forces:{center:1,repel:1,link:.1,distance:100,curvature:0,stretchiness:-.4,siblingLinkForce:false},display:{textFade:20,nodeSize:1,linkThickness:1,glow:1,glowSize:1,lensOpacity:.2,lensRadius:1},forcePresets:{off:{center:1,repel:1,link:.1,distance:100,curvature:0,stretchiness:-.8,siblingLinkForce:false},on:{center:1,repel:1,link:.1,distance:100,curvature:0,stretchiness:.2,siblingLinkForce:true}},displayPresets:{},groups:[],groupPalette:"Beautiful Default",other:{visible:true,color:"#ffbb00",icon:"📂"},groupPresets:{}} as unknown as BeautifulGraphSettings;migrateRevision19Settings(settings,14);assert.equal(settings.forces.siblingLinkForce,0);assert.equal(settings.forcePresets.off?.siblingLinkForce,0);assert.equal(settings.forcePresets.on?.siblingLinkForce,1);assert.equal(settings.other.colorMode,"custom")});

test("revision 20 removes stretchiness and monochrome icon modes everywhere",()=>{const settings={forces:{center:1,repel:1,link:.1,distance:100,curvature:0,stretchiness:-.4,siblingLinkForce:1},display:{textFade:20,nodeSize:1,linkThickness:1,glow:1,glowSize:1,lensOpacity:.2,lensRadius:1,iconMode:"white"},forcePresets:{legacy:{center:1,repel:1,link:.1,distance:100,curvature:0,stretchiness:.8,siblingLinkForce:1}},displayPresets:{legacy:{textFade:20,nodeSize:1,linkThickness:1,glow:1,glowSize:1,lensOpacity:.2,lensRadius:1,iconMode:"black"}}} as unknown as BeautifulGraphSettings;assert.equal(migrateRevision20Settings(settings,16),true);assert.equal("stretchiness" in settings.forces,false);assert.equal("stretchiness" in settings.forcePresets.legacy!,false);assert.equal("iconMode" in settings.display,false);assert.equal("iconMode" in settings.displayPresets.legacy!,false);assert.equal(migrateRevision20Settings(settings,17),false)});

test("revision 25 adds neutral root force to live settings and every preset",()=>{const settings={forces:{center:1},forcePresets:{a:{center:2},b:{center:3,rootLinkForce:.4}},savedNodeCount:Number.NaN} as unknown as BeautifulGraphSettings;assert.equal(migrateRevision25Settings(settings,19),true);assert.equal(settings.forces.rootLinkForce,1);assert.equal(settings.forcePresets.a?.rootLinkForce,1);assert.equal(settings.forcePresets.b?.rootLinkForce,.4);assert.equal(settings.savedNodeCount,100);assert.equal(migrateRevision25Settings(settings,20),false)});
test("revision 29 clamps saved anchors to the new 5-100 range",()=>{const low={savedNodeCount:0} as BeautifulGraphSettings,high={savedNodeCount:5000} as BeautifulGraphSettings;assert.equal(migrateRevision29Settings(low,20),true);assert.equal(low.savedNodeCount,5);assert.equal(migrateRevision29Settings(high,20),true);assert.equal(high.savedNodeCount,100);assert.equal(migrateRevision29Settings(high,21),false)});
