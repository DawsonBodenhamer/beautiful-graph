import test from "node:test";
import assert from "node:assert/strict";
import { migrateV2Settings, resolveLegacyPanelGeometry, storedNodeCount, V2_SETTINGS_VERSION } from "../src/settings-migration.ts";
import { DEFAULT_FORCES } from "../src/defaults.ts";
import type { BeautifulGraphSettings } from "../src/types.ts";

test("V1 upgrade resets physics, presets, and stored positions while preserving unrelated settings",()=>{
  const settings={forces:{center:9,repel:8,link:.7,distance:444,siblingLinkForce:2,rootLinkForce:.5,curvature:.4},forcePresets:{legacy:{center:2,repel:3,link:.2,distance:100,projection:true}},storedNodeCount:12,savedNodeCount:100,display:{nodeSize:3.25,glow:.4},groups:[{id:"manual:wiki",root:"wiki",visible:false}],panels:{forces:{visible:true,collapsed:true,x:.2,y:.3}},historyLimit:80,replaceUnderscores:false} as unknown as BeautifulGraphSettings;
  assert.equal(migrateV2Settings(settings,V2_SETTINGS_VERSION-1,DEFAULT_FORCES),true);
  assert.deepEqual(settings.forces,DEFAULT_FORCES);
  assert.deepEqual(settings.forcePresets,{});
  assert.equal(settings.storedNodeCount,0);
  assert.equal("savedNodeCount" in settings,false);
  assert.deepEqual(settings.display,{nodeSize:3.25,glow:.4});
  assert.deepEqual(settings.groups,[{id:"manual:wiki",root:"wiki",visible:false}]);
  assert.deepEqual(settings.panels,{forces:{visible:true,collapsed:true,x:.2,y:.3}});
  assert.equal(settings.historyLimit,80);
  assert.equal(settings.replaceUnderscores,false);
});

test("V2 settings retain compatible presets and strip dormant force fields",()=>{
  const settings={forces:{center:.2,repel:4,link:.3,distance:120,rootLinkForce:8},forcePresets:{clean:{center:.4,repel:6,link:.5,distance:180},mixed:{center:.6,repel:7,link:.2,distance:90,siblingLinkForce:3}},storedNodeCount:99} as unknown as BeautifulGraphSettings;
  assert.equal(migrateV2Settings(settings,V2_SETTINGS_VERSION,DEFAULT_FORCES),true);
  assert.deepEqual(settings.forces,{center:.2,repel:4,link:.3,distance:120});
  assert.deepEqual(settings.forcePresets,{clean:{center:.4,repel:6,link:.5,distance:180},mixed:{center:.6,repel:7,link:.2,distance:90}});
  assert.equal(settings.storedNodeCount,15);
  assert.equal(migrateV2Settings(settings,V2_SETTINGS_VERSION,DEFAULT_FORCES),false);
});

test("stored position count defaults to zero and clamps every boundary",()=>{assert.equal(storedNodeCount(undefined),0);assert.equal(storedNodeCount(-1),0);assert.equal(storedNodeCount(0),0);assert.equal(storedNodeCount(7.6),8);assert.equal(storedNodeCount(15),15);assert.equal(storedNodeCount(16),15)});

test("pixel panel geometry waits for a measurable leaf before normalization",()=>{const state={visible:true,collapsed:false,legacyPixels:{x:30,y:40,width:245,height:520}};assert.equal(resolveLegacyPanelGeometry(state,0,900),false);assert.equal(resolveLegacyPanelGeometry(state,1000,800),true);assert.deepEqual(state,{visible:true,collapsed:false,x:.03,y:.05,width:.245,height:.65})});
