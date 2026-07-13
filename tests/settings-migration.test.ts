import test from "node:test";
import assert from "node:assert/strict";
import { migrateRevision10Panels } from "../src/settings-migration.ts";

test("known obsolete panel signatures migrate",()=>{
  const panels={groups:{visible:true,collapsed:false,width:245,height:638},display:{visible:true,collapsed:false,width:247,height:474,x:900,y:48}};
  migrateRevision10Panels(panels,7);
  assert.equal(panels.groups.height,520);
  assert.equal(panels.display.x,undefined);
  assert.equal(panels.display.y,undefined);
});

test("customized panel geometry is preserved",()=>{
  const panels={groups:{visible:true,collapsed:false,width:310,height:638},display:{visible:true,collapsed:false,width:247,height:474,x:900,y:48,z:22}};
  migrateRevision10Panels(panels,7);
  assert.deepEqual(panels,{groups:{visible:true,collapsed:false,width:310,height:638},display:{visible:true,collapsed:false,width:247,height:474,x:900,y:48,z:22}});
});
