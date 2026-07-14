import test from "node:test";
import assert from "node:assert/strict";
import { migrateResponsivePanels, migrateRevision10Panels, resolveLegacyPanelGeometry } from "../src/settings-migration.ts";

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
